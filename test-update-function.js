import { updateCandidateInGHL, mapJobTitleToGHLTag, mapStatusToGHLTag, parseFullName } from './server/ghl-integration.ts';

/**
 * Test script to demonstrate the updateCandidateInGHL function
 */
async function testUpdateFunction() {
  console.log('🧪 Testing updateCandidateInGHL function...\n');

  // Create a mock candidate with a valid GHL contact ID
  const mockCandidate = {
    id: 999,
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+1234567890',
    location: 'New York, NY',
    status: 'assessment_sent',
    ghlContactId: 'UT0tS61EZ1hraJ7Jonlc', // Valid contact ID from previous test
    job: {
      title: 'Executive Assistant',
      suggestedTitle: 'Executive Assistant'
    }
  };

  console.log('📊 Test candidate data:');
  console.log(`   - Name: ${mockCandidate.name}`);
  console.log(`   - Email: ${mockCandidate.email}`);
  console.log(`   - Phone: ${mockCandidate.phone}`);
  console.log(`   - Location: ${mockCandidate.location}`);
  console.log(`   - Status: ${mockCandidate.status}`);
  console.log(`   - Job Title: ${mockCandidate.job.title}`);
  console.log(`   - GHL Contact ID: ${mockCandidate.ghlContactId}`);

  // Test the helper functions
  console.log('\n🔧 Testing helper functions:');
  const { firstName, lastName } = parseFullName(mockCandidate.name);
  console.log(`   - Parsed name: "${firstName}" + "${lastName}"`);
  
  const roleTag = mapJobTitleToGHLTag(mockCandidate.job.title);
  console.log(`   - Role tag: ${roleTag}`);
  
  const statusTag = mapStatusToGHLTag(mockCandidate.status);
  console.log(`   - Status tag: ${statusTag}`);

  try {
    console.log('\n🔄 Updating candidate in GHL...');
    const result = await updateCandidateInGHL(mockCandidate);
    
    console.log('\n✅ Update completed successfully!');
    console.log('GHL Response:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('\n❌ Error during update:', error.message);
  }
}

// Run the test
testUpdateFunction().catch(console.error);