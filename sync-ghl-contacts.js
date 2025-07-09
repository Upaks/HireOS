#!/usr/bin/env node

/**
 * GHL Contact Sync Script
 * 
 * This script automatically syncs contacts from GoHighLevel (GHL) with 
 * candidates in the HireOS database by matching names and updating 
 * the ghl_contact_id field.
 * 
 * Usage:
 *   node sync-ghl-contacts.js
 *   npm run sync-ghl
 * 
 * The script will:
 * 1. Fetch contacts from GHL API
 * 2. Match them with candidates by name
 * 3. Update candidates table with GHL contact IDs
 * 4. Provide detailed results
 */

import { executeGHLSync } from './server/ghl-sync.js';

async function main() {
  const startTime = Date.now();
  
  console.log('🔄 Starting GHL Contact Sync');
  console.log('=' .repeat(40));
  console.log(`📅 Started at: ${new Date().toISOString()}`);
  console.log('');
  
  try {
    const result = await executeGHLSync();
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('\n✅ Sync Completed Successfully!');
    console.log('=' .repeat(40));
    console.log(`⏱️  Duration: ${duration} seconds`);
    console.log(`📊 GHL Contacts Fetched: ${result.totalGHLContacts}`);
    console.log(`👥 Total Candidates: ${result.totalCandidates}`);
    console.log(`🔗 Matches Found: ${result.matched}`);
    console.log(`📝 Candidates Updated: ${result.updated}`);
    console.log(`⏭️  Candidates Skipped: ${result.skipped}`);
    console.log(`❌ Errors: ${result.errors.length}`);
    
    if (result.errors.length > 0) {
      console.log('\n❌ Errors:');
      result.errors.forEach((error, i) => console.log(`   ${i + 1}. ${error}`));
    }
    
    if (result.updated > 0) {
      console.log(`\n🎉 Successfully updated ${result.updated} candidates with GHL contact IDs`);
    }
    
    console.log('\n✨ Sync process completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Sync Failed:');
    console.error(`   Error: ${error.message}`);
    console.error(`   Duration: ${((Date.now() - startTime) / 1000).toFixed(2)} seconds`);
    process.exit(1);
  }
}

// Handle process interruption
process.on('SIGINT', () => {
  console.log('\n⚠️  Sync interrupted by user');
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\n⚠️  Sync terminated');
  process.exit(1);
});

main();