import { syncGHLContacts } from './server/ghl-sync';

async function testGHLSync() {
  console.log('🔄 Testing GHL Sync functionality...\n');
  
  try {
    // First, run a dry run to preview changes
    console.log('=== DRY RUN PREVIEW ===');
    const previewResult = await syncGHLContacts(true);
    
    console.log('\n📊 Preview Results:');
    console.log(`   Success: ${previewResult.success}`);
    console.log(`   Total GHL contacts: ${previewResult.totalGHLContacts}`);
    console.log(`   Total candidates: ${previewResult.totalCandidates}`);
    console.log(`   Would match: ${previewResult.matched}`);
    console.log(`   Would update: ${previewResult.updated}`);
    console.log(`   Would skip: ${previewResult.skipped}`);
    console.log(`   Errors: ${previewResult.errors.length}`);
    
    if (previewResult.errors.length > 0) {
      console.log('\n❌ Errors:');
      previewResult.errors.forEach(error => console.log(`   - ${error}`));
    }
    
    // Show first 10 details
    console.log('\n📋 First 10 preview details:');
    previewResult.details.slice(0, 10).forEach(detail => {
      console.log(`   ${detail.action.toUpperCase()}: ${detail.ghlName} → ${detail.candidateName} (${detail.reason})`);
    });
    
    // Ask for confirmation before proceeding with actual sync
    console.log('\n=== ACTUAL SYNC ===');
    console.log('Would you like to proceed with the actual sync? (This will update the database)');
    
    // For testing, we'll just run the actual sync
    const syncResult = await syncGHLContacts(false);
    
    console.log('\n🎉 Sync Results:');
    console.log(`   Success: ${syncResult.success}`);
    console.log(`   Total GHL contacts: ${syncResult.totalGHLContacts}`);
    console.log(`   Total candidates: ${syncResult.totalCandidates}`);
    console.log(`   Matched: ${syncResult.matched}`);
    console.log(`   Updated: ${syncResult.updated}`);
    console.log(`   Skipped: ${syncResult.skipped}`);
    console.log(`   Errors: ${syncResult.errors.length}`);
    
    if (syncResult.errors.length > 0) {
      console.log('\n❌ Errors:');
      syncResult.errors.forEach(error => console.log(`   - ${error}`));
    }
    
    // Show successful updates
    const updates = syncResult.details.filter(d => d.action === 'updated');
    if (updates.length > 0) {
      console.log('\n✅ Successful updates:');
      updates.forEach(update => {
        console.log(`   Updated "${update.candidateName}" with GHL ID: ${update.contactId}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testGHLSync();