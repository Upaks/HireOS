import { executeGHLSync } from './server/ghl-sync.js';

async function runGHLSync() {
  console.log('🚀 Starting GHL Contact Sync...\n');
  
  try {
    const result = await executeGHLSync();
    
    console.log('\n🎉 GHL Sync Completed!');
    console.log('='.repeat(50));
    console.log(`✅ Success: ${result.success}`);
    console.log(`📊 Total GHL contacts: ${result.totalGHLContacts}`);
    console.log(`👥 Total candidates: ${result.totalCandidates}`);
    console.log(`🔗 Matched: ${result.matched}`);
    console.log(`📝 Updated: ${result.updated}`);
    console.log(`⏭️  Skipped: ${result.skipped}`);
    console.log(`❌ Errors: ${result.errors.length}`);
    
    if (result.errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      result.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }
    
    // Show successful updates
    const updates = result.details.filter(d => d.action === 'updated');
    if (updates.length > 0) {
      console.log('\n✅ Successfully updated candidates:');
      updates.forEach((update, index) => {
        console.log(`   ${index + 1}. "${update.candidateName}" → GHL ID: ${update.contactId}`);
      });
    }
    
    console.log('\n🔄 Sync process complete!');
    
  } catch (error) {
    console.error('❌ Sync failed:', error.message);
    process.exit(1);
  }
}

runGHLSync();