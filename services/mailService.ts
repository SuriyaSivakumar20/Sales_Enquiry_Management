
import CryptoJS from 'crypto-js';
import { User } from '../types';

// TODO: User must replace this with their own Google Cloud Client ID
const CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com'; 
const API_KEY = 'YOUR_GOOGLE_API_KEY'; 
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest';
const SCOPES = 'https://www.googleapis.com/auth/gmail.modify';

const APP_SECRET_KEY = 'SALES_TRACKER_SECURE_KEY_V1'; // In production, this should be derived or rotated
const SYNC_SUBJECT_PREFIX = '[ST_SYNC]';

export interface SyncPacket {
  type: 'PLAN' | 'CUSTOMER' | 'USER_REG';
  data: any;
  timestamp: string;
  sender: string;
}

class MailService {
  private tokenClient: any;
  private gapiInited = false;
  private gisInited = false;
  private accessToken: string | null = null;

  constructor() {
    this.loadGapi();
  }

  // --- 1. INITIALIZATION ---

  private loadGapi() {
    if (typeof window === 'undefined') return;
    
    // Load GAPI
    (window as any).gapi.load('client', async () => {
      await (window as any).gapi.client.init({
        apiKey: API_KEY,
        discoveryDocs: [DISCOVERY_DOC],
      });
      this.gapiInited = true;
    });

    // Load GIS
    this.tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: (resp: any) => {
        if (resp.error !== undefined) {
          throw (resp);
        }
        this.accessToken = resp.access_token;
        localStorage.setItem('g_access_token', resp.access_token);
      },
    });
    this.gisInited = true;
  }

  public async signIn(): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.gisInited) {
        // Fallback for demo if scripts haven't loaded yet
        setTimeout(() => this.signIn().then(resolve), 500);
        return;
      }
      
      // Request token
      this.tokenClient.callback = async (resp: any) => {
        if (resp.error) reject(resp);
        this.accessToken = resp.access_token;
        
        // Get Profile
        try {
            const profile = await (window as any).gapi.client.gmail.users.getProfile({ userId: 'me' });
            resolve({ 
                email: profile.result.emailAddress, 
                token: resp.access_token 
            });
        } catch (e) {
            reject(e);
        }
      };

      // Trigger popup
      this.tokenClient.requestAccessToken({ prompt: 'consent' });
    });
  }

  // --- 2. ENCRYPTION / DECRYPTION ---

  private encrypt(data: any): string {
    return CryptoJS.AES.encrypt(JSON.stringify(data), APP_SECRET_KEY).toString();
  }

  private decrypt(ciphertext: string): any {
    try {
        const bytes = CryptoJS.AES.decrypt(ciphertext, APP_SECRET_KEY);
        return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
    } catch (e) {
        console.error("Decryption failed", e);
        return null;
    }
  }

  // --- 3. SENDING DATA (SAVE) ---

  /**
   * Sends data to all relevant recipients based on hierarchy + self
   */
  public async broadcastData(packet: SyncPacket, user: User) {
    if (!this.accessToken) throw new Error("Not Authenticated");

    const recipients = new Set<string>();
    recipients.add(user.email); // Always send to self (to act as sent-items storage)

    // Add Hierarchy
    if (user.hierarchy) {
      if (user.hierarchy.rsmEmail) recipients.add(user.hierarchy.rsmEmail);
      if (user.hierarchy.seEmails) user.hierarchy.seEmails.forEach(e => recipients.add(e));
      if (user.hierarchy.dealerEmails) user.hierarchy.dealerEmails.forEach(e => recipients.add(e));
      if (user.hierarchy.dseEmails) user.hierarchy.dseEmails.forEach(e => recipients.add(e));
    }

    // Also add Org Admin if known (optional, omitted for specific hierarchy request)

    const encryptedBody = this.encrypt(packet);
    const subject = `${SYNC_SUBJECT_PREFIX} ${packet.type} ${packet.timestamp}`;
    
    // Send individual emails to avoid "Reply-All" storms or exposing lists unnecessarily
    // Or use BCC. Using BCC is cleaner.
    const recipientList = Array.from(recipients).filter(e => e && e.includes('@')); // Filter valid
    if (recipientList.length === 0) return;

    await this.sendEmail(recipientList, subject, encryptedBody);
  }

  private async sendEmail(to: string[], subject: string, body: string) {
    const emailContent = [
        `To: ${to[0]}`, // Primary to first (usually self)
        `Bcc: ${to.join(', ')}`,
        `Subject: ${subject}`,
        'Content-Type: text/plain; charset="UTF-8"',
        'Content-Transfer-Encoding: 7bit',
        '',
        body
    ].join('\n');

    const base64EncodedEmail = btoa(emailContent).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    await (window as any).gapi.client.gmail.users.messages.send({
        'userId': 'me',
        'resource': {
            'raw': base64EncodedEmail
        }
    });
  }

  // --- 4. RECEIVING DATA (LOAD) ---

  public async fetchLatestData(): Promise<SyncPacket[]> {
    if (!this.gapiInited || !this.accessToken) return [];

    console.log("Fetching emails...");
    try {
        // Search for emails with our tag
        const response = await (window as any).gapi.client.gmail.users.messages.list({
            'userId': 'me',
            'q': `subject:${SYNC_SUBJECT_PREFIX}`,
            'maxResults': 50 // In real app, manage pagination and 'since' query
        });

        const messages = response.result.messages;
        if (!messages || messages.length === 0) return [];

        const packets: SyncPacket[] = [];

        // Fetch details for each message
        // Optimization: In real app, check ID against local 'lastProcessedMsgId'
        for (const msg of messages) {
            const detail = await (window as any).gapi.client.gmail.users.messages.get({
                'userId': 'me',
                'id': msg.id
            });
            
            // Extract body (snippet or payload body)
            // Gmail API body extraction can be tricky (nested parts)
            let body = detail.result.snippet; // Fallback
            if (detail.result.payload && detail.result.payload.body && detail.result.payload.body.data) {
                 body = atob(detail.result.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
            }

            // Attempt Decrypt
            // Note: snippet might be partial, payload is better
            const data = this.decrypt(body);
            if (data) {
                packets.push(data);
            }
        }

        return packets;
    } catch (e) {
        console.error("Error fetching emails", e);
        return [];
    }
  }
}

export const mailService = new MailService();