import "dotenv/config";

// Import the background sync service from the parent server directory
// Note: This works because Railway/Render deploy from the repo root
// and we use tsx to handle TypeScript imports
// Make sure to run with: npx tsx worker/index.js
const { backgroundSyncService } = await import("../server/background-sync.ts");

/**
 * Standalone worker service for HireOS background jobs
 * 
 * This runs separately from your main app (Vercel) to handle:
 * - CRM sync jobs (Google Sheets, Airtable)
 * - Other background tasks
 * 
 * Deploy this to Railway, Render, or any service that supports long-running processes
 */

const SYNC_INTERVAL_MS = process.env.CRM_SYNC_INTERVAL_MS 
  ? parseInt(process.env.CRM_SYNC_INTERVAL_MS) 
  : 1 * 60 * 1000; // Default: 1 minute

console.log("HireOS Worker Service Starting...");
console.log(`Sync interval: ${SYNC_INTERVAL_MS / 1000} seconds`);

// Start the background sync service
backgroundSyncService.start(SYNC_INTERVAL_MS);

console.log("Worker service started successfully");
console.log("This service will run continuously to sync CRM data");

// Keep the process alive
process.on('SIGTERM', () => {
  console.log('SIGTERM received, stopping worker...');
  backgroundSyncService.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, stopping worker...');
  backgroundSyncService.stop();
  process.exit(0);
});

