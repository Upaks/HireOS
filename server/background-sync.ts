import { storage } from "./storage";
import { executeGoogleSheetsSync } from "./google-sheets-sync";
import { executeAirtableSync } from "./airtable-sync";

/**
 * Background sync job that runs periodically to sync two-way integrations
 * This enables automatic Google Sheets → HireOS sync without manual triggering
 */
export class BackgroundSyncService {
  private syncInterval: NodeJS.Timeout | null = null;
  private isRunning = false;
  private syncIntervalMs = 5 * 60 * 1000; // Default: 5 minutes

  /**
   * Start the background sync service
   * @param intervalMs How often to check for changes (in milliseconds). Default: 5 minutes
   */
  start(intervalMs: number = 5 * 60 * 1000) {
    if (this.syncInterval) {
      this.stop();
    }

    this.syncIntervalMs = intervalMs;
    this.syncInterval = setInterval(() => {
      this.runSync();
    }, intervalMs);

    // Run immediately on start
    this.runSync();
  }

  /**
   * Stop the background sync service
   */
  stop() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.isRunning = false;
  }

  /**
   * Run sync for all users with two-way sync enabled
   */
  private async runSync() {
    if (this.isRunning) {
      return; // Prevent concurrent runs
    }

    this.isRunning = true;

    try {
      // Get all users (we'll need to sync per user since integrations are user-scoped)
      const users = await storage.getAllUsers();
      
      for (const user of users) {
        try {
          // Get all CRM integrations for this user
          const integrations = await storage.getCRMIntegrations(user.id);
          
          for (const integration of integrations) {
            // Only sync if:
            // 1. Integration is enabled and connected
            // 2. Sync direction is two-way
            if (
              integration.isEnabled &&
              integration.status === 'connected' &&
              integration.syncDirection === 'two-way'
            ) {
              try {
                if (integration.platformId === 'google-sheets') {
                  // Run Google Sheets sync (only updates, skip new candidates to avoid duplicates)
                  const result = await executeGoogleSheetsSync(user.id, undefined, true);
                  if (result.updated > 0) {
                    console.log(`[Background Sync] ${integration.platformName}: Updated ${result.updated} candidate(s)`);
                  }
                  if (result.errors.length > 0) {
                    console.error(`[Background Sync] ${integration.platformName} error:`, result.errors[0]);
                  }
                } else if (integration.platformId === 'airtable') {
                  // Run Airtable sync (only updates, skip new candidates)
                  const result = await executeAirtableSync(user.id, undefined, true);
                  if (result.updated > 0) {
                    console.log(`[Background Sync] ${integration.platformName}: Updated ${result.updated} candidate(s)`);
                  }
                  if (result.errors.length > 0) {
                    console.error(`[Background Sync] ${integration.platformName} error:`, result.errors[0]);
                  }
                }
              } catch (error: any) {
                console.error(`[Background Sync] ${integration.platformName} sync failed:`, error.message);
              }
            }
          }
        } catch (error: any) {
          // Silently handle user-level errors
        }
      }
    } catch (error: any) {
      // Silently handle service-level errors
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Manually trigger a sync (useful for testing)
   */
  async triggerSync() {
    await this.runSync();
  }
}

// Singleton instance
export const backgroundSyncService = new BackgroundSyncService();

