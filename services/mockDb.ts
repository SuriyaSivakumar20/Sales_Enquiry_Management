import { User, Customer, AnyPlan, Organization, Attachment, UserRole } from '../types';
import { db as firestore, auth, storage, firebaseConfig } from './firebaseConfig';
import {
  collection, getDocs, doc, setDoc, updateDoc, onSnapshot
} from 'firebase/firestore';
import {
  ref, uploadString, getDownloadURL
} from 'firebase/storage';
import { signInWithEmailAndPassword } from 'firebase/auth';

/**
 * DATABASE SERVICE - ONLINE ONLY
 */

interface AppData {
  organizations: Organization[];
  users: User[];
  customers: Customer[];
  plans: AnyPlan[];
}

const INITIAL_DATA: AppData = {
  organizations: [],
  users: [],
  customers: [],
  plans: []
};

// Helper to sanitize Firestore data
const sanitizeDoc = (data: any): any => {
  if (!data) return data;
  if (typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map(sanitizeDoc);
  if (data.toDate && typeof data.toDate === 'function') {
    return data.toDate().toISOString();
  }
  if (data.firestore && data.path) {
    return data.path;
  }
  const clean: any = {};
  Object.keys(data).forEach(key => {
    clean[key] = sanitizeDoc(data[key]);
  });
  return clean;
};

class DatabaseService {
  private data: AppData;
  private initialized: boolean = false;

  // Track synchronization status
  public isOnline: boolean = false;

  private listeners: (() => void)[] = [];
  private subscribers: (() => void)[] = [];

  constructor() {
    this.data = INITIAL_DATA;
  }

  // Allow React components to listen for data changes
  public subscribe(callback: () => void): () => void {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  private notifySubscribers() {
    this.subscribers.forEach(cb => cb());
  }

  async init() {
    if (this.initialized) return;

    // Strict Online Check
    if (!firebaseConfig || Object.keys(firebaseConfig).length === 0) {
      this.isOnline = false;
      throw new Error("Missing Firebase Configuration. App cannot start in online mode.");
    }

    try {
      console.log("Connecting onto Cloud Database...");

      this.isOnline = true;

      // Set up real-time listeners
      const unsubOrgs = onSnapshot(collection(firestore, 'organizations'), (snap) => {
        this.data.organizations = snap.docs.map(d => sanitizeDoc(d.data()) as Organization);
        this.notifySubscribers();
      });

      const unsubUsers = onSnapshot(collection(firestore, 'users'), (snap) => {
        this.data.users = snap.docs.map(d => sanitizeDoc(d.data()) as User);
        this.notifySubscribers();
      });

      const unsubCust = onSnapshot(collection(firestore, 'customers'), (snap) => {
        this.data.customers = snap.docs.map(d => sanitizeDoc(d.data()) as Customer);
        this.notifySubscribers();
      });

      const unsubPlans = onSnapshot(collection(firestore, 'plans'), (snap) => {
        this.data.plans = snap.docs.map(d => sanitizeDoc(d.data()) as AnyPlan);
        this.notifySubscribers();
      });

      this.listeners.push(unsubOrgs, unsubUsers, unsubCust, unsubPlans);

      this.initialized = true;
      console.log("Online Sync Complete. Listening for changes...");
    } catch (e: any) {
      console.error("Cloud connection failed:", e);
      this.isOnline = false;
      throw new Error("Failed to connect to backend server. Please check internet connection.");
    }
  }

  private async uploadAttachments(attachments?: Attachment[]): Promise<Attachment[]> {
    if (!attachments || attachments.length === 0) return [];

    // Strict online check for uploads
    if (!this.isOnline) throw new Error("Cannot upload files while offline");

    const uploaded: Attachment[] = [];
    for (const file of attachments) {
      if (file.data.startsWith('http')) {
        uploaded.push(file);
        continue;
      }

      const path = `attachments/${Date.now()}_${file.name}`;
      // @ts-ignore
      const storageRef = ref(storage, path);

      try {
        await uploadString(storageRef, file.data, 'data_url');
        const url = await getDownloadURL(storageRef);
        uploaded.push({ ...file, data: url });
      } catch (e) {
        console.error("File upload failed", e);
        throw e; // Fail hard on upload error
      }
    }
    return uploaded;
  }

  // --- READ METHODS ---
  getOrganizations(): Organization[] { return this.data.organizations; }
  getUsers(): User[] { return this.data.users; }
  getCustomers(): Customer[] { return this.data.customers; }
  getPlans(): AnyPlan[] { return this.data.plans; }

  // --- WRITE METHODS ---

  async addOrganization(org: Organization) {
    // 1. Write to Cloud first
    await setDoc(doc(firestore, 'organizations', org.id), org);
    // 2. Update local state only on success
    this.data.organizations.push(org);
  }

  async updateOrganization(id: string, updates: Partial<Organization>) {
    await updateDoc(doc(firestore, 'organizations', id), updates);
    this.data.organizations = this.data.organizations.map(o => o.id === id ? { ...o, ...updates } : o);
  }

  async addUser(user: User) {
    await setDoc(doc(firestore, 'users', user.id), user);
    this.data.users.push(user);
  }

  async updateUser(userId: string, updates: Partial<User>) {
    await updateDoc(doc(firestore, 'users', userId), updates);
    this.data.users = this.data.users.map(u => u.id === userId ? { ...u, ...updates } : u);
  }

  async addCustomer(customer: Customer) {
    await setDoc(doc(firestore, 'customers', customer.id), customer);
    this.data.customers.push(customer);
  }

  async addPlan(plan: AnyPlan) {
    const processedAttachments = await this.uploadAttachments(plan.attachments);
    const planToSave = { ...plan, attachments: processedAttachments };

    await setDoc(doc(firestore, 'plans', plan.id), planToSave);
    this.data.plans.push(planToSave);
  }

  async updatePlan(planId: string, updates: Partial<AnyPlan>) {
    if (updates.attachments) {
      updates.attachments = await this.uploadAttachments(updates.attachments);
    }
    await updateDoc(doc(firestore, 'plans', planId), updates);
    this.data.plans = this.data.plans.map(p =>
      p.id === planId ? { ...p, ...updates } as AnyPlan : p
    );
  }

  async login(email: string, pass: string) {
    return signInWithEmailAndPassword(auth, email, pass);
  }
}

export const db = new DatabaseService();