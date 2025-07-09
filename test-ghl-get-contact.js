import { getGHLContact } from './server/ghl-integration.ts';
import { storage } from './server/storage.ts';

/**
 * Test script to check if we can retrieve a GHL contact
 */
async function testGHLGetContact() {
  console.log('🔍 Testing GHL contact retrieval...\n');

  try {
    // Get candidates with GHL contact IDs
    const candidates = await storage.getCandidates({});
    const candidatesWithGHL = candidates.filter(c => c.ghlContactId);
    
    if (candidatesWithGHL.length === 0) {
      console.log('❌ No candidates found with GHL contact IDs');
      return;
    }

    // Test the first few candidates
    for (let i = 0; i < Math.min(3, candidatesWithGHL.length); i++) {
      const candidate = candidatesWithGHL[i];
      console.log(`\n🎯 Testing candidate: ${candidate.name}`);
      console.log(`   - GHL Contact ID: ${candidate.ghlContactId}`);
      
      try {
        const contact = await getGHLContact(candidate.ghlContactId);
        console.log(`   ✅ Contact found in GHL`);
        console.log(`   - Name: ${contact.contact?.contactName || 'N/A'}`);
        console.log(`   - Email: ${contact.contact?.email || 'N/A'}`);
      } catch (error) {
        console.log(`   ❌ Contact not found: ${error.message}`);
        // Try to find a working contact ID
        continue;
      }
    }
    
  } catch (error) {
    console.error('❌ Error during test:', error.message);
  }
}

// Run the test
testGHLGetContact().catch(console.error);