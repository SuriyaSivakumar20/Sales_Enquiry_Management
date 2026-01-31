import { User, Customer, AnyPlan, Organization, Attachment, UserRole } from '../types';
import { db as firestore, auth, storage, firebaseConfig } from './firebaseConfig';
import { 
  collection, getDocs, doc, setDoc, updateDoc
} from 'firebase/firestore';
import { 
  ref, uploadString, getDownloadURL 
} from 'firebase/storage';
import { signInWithEmailAndPassword } from 'firebase/auth';

/**
 * DATABASE SERVICE
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
  private isOffline: boolean = false;

  constructor() {
    this.data = INITIAL_DATA;
  }

  async init() {
    if (this.initialized) return;

    // If config is missing entirely, go offline immediately
    if (!firebaseConfig || Object.keys(firebaseConfig).length === 0) {
        console.warn("No Firebase Config found. Starting in Offline Mode.");
        this.isOffline = true;
        this.loadFromLocal();
        this.initialized = true;
        this.ensureSuperAdmin();
        return;
    }

    try {
      console.log("Attempting to sync data from Cloud...");
      
      // Use Modular SDK getDocs
      const [orgsSnap, usersSnap, custSnap, plansSnap] = await Promise.all([
        getDocs(collection(firestore, 'organizations')),
        getDocs(collection(firestore, 'users')),
        getDocs(collection(firestore, 'customers')),
        getDocs(collection(firestore, 'plans'))
      ]);

      this.data.organizations = orgsSnap.docs.map(d => sanitizeDoc(d.data()) as Organization);
      this.data.users = usersSnap.docs.map(d => sanitizeDoc(d.data()) as User);
      this.data.customers = custSnap.docs.map(d => sanitizeDoc(d.data()) as Customer);
      this.data.plans = plansSnap.docs.map(d => sanitizeDoc(d.data()) as AnyPlan);

      this.isOffline = false;
      console.log("Cloud Sync Complete. Online Mode.");
    } catch (e: any) {
      console.warn("Cloud connection failed. Switching to Offline Mode.", e.message || e);
      this.isOffline = true;
      this.loadFromLocal();
    } finally {
      this.initialized = true;
      this.ensureSuperAdmin();
    }
  }

  public isOfflineMode(): boolean {
      return this.isOffline;
  }

  private ensureSuperAdmin() {
    const superEmail = 'keerthithiruvarasan@gmail.com';
    const altEmail = 'keerthithiruvarsan@gmail.com';
    
    const exists = this.data.users.find(u => 
        (u.email === superEmail || u.email === altEmail) && 
        u.role === UserRole.SUPER_ADMIN
    );

    if (!exists) {
        this.data.users.push({
            id: 'super_admin_session',
            name: 'Keerthi (Super Admin)',
            email: superEmail,
            password: '123456789@Asdf', 
            role: UserRole.SUPER_ADMIN,
            organizationId: 'system_global',
            organizationName: 'System',
            isApproved: true
        });
    }
  }

  private loadFromLocal() {
    const saved = localStorage.getItem('sales_tracker_offline_data');
    if (saved) {
      try {
        this.data = JSON.parse(saved);
      } catch (e) {
        console.error("Corrupt local data", e);
        this.seedOfflineData();
      }
    } else {
      this.seedOfflineData();
    }
  }

  private seedOfflineData() {
    this.data = {
      organizations: [],
      customers: [],
      plans: [],
      users: [] 
    };
    this.saveToLocal();
  }

  private saveToLocal() {
    if (this.isOffline) {
      try {
          localStorage.setItem('sales_tracker_offline_data', JSON.stringify(this.data));
      } catch (e) {
          console.error("Failed to save local data", e);
      }
    }
  }

  private async uploadAttachments(attachments?: Attachment[]): Promise<Attachment[]> {
    if (!attachments || attachments.length === 0) return [];
    if (this.isOffline) return attachments;

    const uploaded: Attachment[] = [];
    for (const file of attachments) {
      if (file.data.startsWith('http')) {
        uploaded.push(file);
        continue;
      }

      const path = `attachments/${Date.now()}_${file.name}`;
      // Use Modular SDK storage ref
      // @ts-ignore
      const storageRef = ref(storage, path);
      
      try {
        await uploadString(storageRef, file.data, 'data_url');
        const url = await getDownloadURL(storageRef);
        uploaded.push({ ...file, data: url });
      } catch (e) {
        console.error("File upload failed", e);
        uploaded.push(file); 
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
    this.data.organizations.push(org);
    if (this.isOffline) {
      this.saveToLocal();
    } else {
      try {
        await setDoc(doc(firestore, 'organizations', org.id), org);
      } catch (e) { this.isOffline = true; this.saveToLocal(); }
    }
  }

  async updateOrganization(id: string, updates: Partial<Organization>) {
    this.data.organizations = this.data.organizations.map(o => o.id === id ? { ...o, ...updates } : o);
    if (this.isOffline) {
      this.saveToLocal();
    } else {
      try {
        await updateDoc(doc(firestore, 'organizations', id), updates);
      } catch (e) { this.isOffline = true; this.saveToLocal(); }
    }
  }

  async addUser(user: User) {
    this.data.users.push(user);
    if (this.isOffline) {
      this.saveToLocal();
    } else {
      try {
        await setDoc(doc(firestore, 'users', user.id), user);
      } catch (e) { this.isOffline = true; this.saveToLocal(); }
    }
  }

  async updateUser(userId: string, updates: Partial<User>) {
    this.data.users = this.data.users.map(u => u.id === userId ? { ...u, ...updates } : u);
    if (this.isOffline) {
      this.saveToLocal();
    } else {
      try {
        await updateDoc(doc(firestore, 'users', userId), updates);
      } catch (e) { this.isOffline = true; this.saveToLocal(); }
    }
  }

  async addCustomer(customer: Customer) {
    this.data.customers.push(customer);
    if (this.isOffline) {
      this.saveToLocal();
    } else {
      try {
        await setDoc(doc(firestore, 'customers', customer.id), customer);
      } catch (e) { this.isOffline = true; this.saveToLocal(); }
    }
  }

  async addPlan(plan: AnyPlan) {
    const processedAttachments = await this.uploadAttachments(plan.attachments);
    const planToSave = { ...plan, attachments: processedAttachments };

    this.data.plans.push(planToSave);

    if (this.isOffline) {
      this.saveToLocal();
    } else {
      try {
        await setDoc(doc(firestore, 'plans', plan.id), planToSave);
      } catch (e) { this.isOffline = true; this.saveToLocal(); }
    }
  }

  async updatePlan(planId: string, updates: Partial<AnyPlan>) {
    if (updates.attachments) {
        updates.attachments = await this.uploadAttachments(updates.attachments);
    }
    this.data.plans = this.data.plans.map(p => 
      p.id === planId ? { ...p, ...updates } as AnyPlan : p
    );
    if (this.isOffline) {
      this.saveToLocal();
    } else {
      try {
        await updateDoc(doc(firestore, 'plans', planId), updates);
      } catch (e) { this.isOffline = true; this.saveToLocal(); }
    }
  }

  async login(email: string, pass: string) {
     if (this.isOffline) {
       return Promise.reject("Offline mode: Use local data validation");
     }
     return signInWithEmailAndPassword(auth, email, pass);
  }
}

export const db = new DatabaseService();