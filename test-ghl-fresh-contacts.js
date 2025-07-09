import axios from 'axios';

const GHL_API_KEY = process.env.GHL_API_KEY;
const GHL_BASE_URL = 'https://rest.gohighlevel.com/v1';

/**
 * Test script to fetch fresh GHL contacts and test the update function
 */
async function testGHLFreshContacts() {
  console.log('🔍 Fetching fresh GHL contacts...\n');

  try {
    // Fetch fresh contacts from GHL
    const response = await axios.get(`${GHL_BASE_URL}/contacts/`, {
      headers: {
        Authorization: `Bearer ${GHL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      params: {
        limit: 10
      }
    });

    const contacts = response.data.contacts || [];
    console.log(`📊 Found ${contacts.length} fresh GHL contacts`);

    if (contacts.length === 0) {
      console.log('❌ No contacts found in GHL');
      return;
    }

    // Test with the first contact
    const testContact = contacts[0];
    console.log(`\n🎯 Testing with contact: ${testContact.contactName}`);
    console.log(`   - ID: ${testContact.id}`);
    console.log(`   - Email: ${testContact.email || 'N/A'}`);

    // Test updating this contact
    const updateData = {
      firstName: 'Test',
      lastName: 'Update',
      phone: '+1234567890',
      location: 'Test Location',
      tags: ['c–role–ea', '15_assessment_sent']
    };

    console.log('\n🔄 Testing update with fresh contact ID...');
    const updateResponse = await axios.put(`${GHL_BASE_URL}/contacts/${testContact.id}`, updateData, {
      headers: {
        Authorization: `Bearer ${GHL_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Update successful!');
    console.log('Response:', JSON.stringify(updateResponse.data, null, 2));

  } catch (error) {
    console.error('❌ Error during test:', error.message);
    if (error.response) {
      console.error('API Response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run the test
testGHLFreshContacts().catch(console.error);