import { storage } from './server/storage.ts';
import { updateCandidateInGHL } from './server/ghl-integration.ts';

/**
 * Test script to demonstrate updating candidate details from HireOS to GHL
 */
async function testCandidateGHLUpdate() {
  console.log('🧪 Testing HireOS to GHL candidate update...\n');

  try {
    // Get candidates that have GHL contact IDs
    const candidates = await storage.getCandidates({});
    const candidatesWithGHL = candidates.filter(c => c.ghlContactId);
    
    console.log(`📊 Found ${candidatesWithGHL.length} candidates with GHL contact IDs`);
    
    if (candidatesWithGHL.length === 0) {
      console.log('❌ No candidates found with GHL contact IDs. Run the sync first.');
      return;
    }
    
    // Test with the first candidate
    const testCandidate = candidatesWithGHL[0];
    console.log(`\n🎯 Testing update for candidate: ${testCandidate.name}`);
    console.log(`   - Email: ${testCandidate.email}`);
    console.log(`   - Phone: ${testCandidate.phone || 'N/A'}`);
    console.log(`   - Location: ${testCandidate.location || 'N/A'}`);
    console.log(`   - Status: ${testCandidate.status}`);
    console.log(`   - GHL Contact ID: ${testCandidate.ghlContactId}`);
    
    // Get job details if available
    if (testCandidate.jobId) {
      const job = await storage.getJob(testCandidate.jobId);
      if (job) {
        // Add job data to candidate object for tag generation
        testCandidate.job = job;
        console.log(`   - Job: ${job.title}`);
      }
    }
    
    // Update the candidate in GHL
    console.log('\n🔄 Updating candidate in GHL...');
    const result = await updateCandidateInGHL(testCandidate);
    
    console.log('\n✅ Update completed successfully!');
    console.log('Response:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('\n❌ Error during test:', error.message);
    if (error.response) {
      console.error('API Response:', error.response.data);
    }
  }
}

// Run the test
testCandidateGHLUpdate().catch(console.error);