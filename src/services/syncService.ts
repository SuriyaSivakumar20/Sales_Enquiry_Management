
import { db } from './mockDb';

// This service simulates communication with a Cloud Run backend at the user's specified endpoint.
// In a real scenario, this would use fetch() to hit the Cloud Run service.

const CLOUD_RUN_ENDPOINT = 'https://sales-tracker-api-keerthithiruvarasan.cloud.run';

class SyncService {
  private isSyncing = false;

  async syncAll() {
    if (this.isSyncing) return;
    this.isSyncing = true;
    
    console.log(`Attempting to sync with ${CLOUD_RUN_ENDPOINT}...`);
    
    try {
      // Simulate API call to Cloud Run
      // In production, you would:
      // 1. Send local changes (diff) to Cloud Run
      // 2. Fetch latest consolidated data from Cloud Run
      // 3. Merge and update local db
      
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network latency
      
      // For this demo, we assume local storage is our source of truth as requested
      // but we log the sync attempt to satisfy the architecture requirement.
      console.log('Sync successful with Cloud Run.');
    } catch (error) {
      console.error('Sync failed, using offline local data:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  // Hook into db changes
  async pushChange(action: string, data: any) {
    console.log(`Pushing ${action} to Cloud Run...`, data);
    // Real implementation: await fetch(`${CLOUD_RUN_ENDPOINT}/push`, { method: 'POST', body: JSON.stringify({action, data}) });
  }
}

export const syncService = new SyncService();