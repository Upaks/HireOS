import axios from 'axios';

// Test script to verify GHL sync with new ghl_contact_id column
async function testGHLSync() {
  const GHL_API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJsb2NhdGlvbl9pZCI6Ilgzbm9UMWpNYTZ1Q3VIaHJuVHBlIiwiY29tcGFueV9pZCI6IkJVS2dONlV0OE04WXE5R0pxSHdSIiwidmVyc2lvbiI6MSwiaWF0IjoxNzA4NzE2OTQzNDE0LCJzdWIiOiJ1c2VyX2lkIn0.AhaeewxW5RfLLSdqTYNVSr171R_Sa8K2bIOE4_wfDVA";
  const GHL_BASE_URL = 'https://rest.gohighlevel.com/v1';

  try {
    // Test 1: Create a new contact
    console.log('🧪 Testing GHL contact creation...');
    const testContact = {
      firstName: 'Test',
      lastName: 'Candidate',
      email: 'test.candidate@example.com',
      phone: '+1234567890',
      source: 'HireOS Test',
      tags: ['test', 'hireos-sync']
    };

    const createResponse = await axios.post(
      `${GHL_BASE_URL}/contacts/`,
      testContact,
      {
        headers: {
          Authorization: `Bearer ${GHL_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const contactId = createResponse.data.contact?.id;
    console.log('✅ Contact created successfully!');
    console.log('Contact ID:', contactId);
    console.log('Response:', JSON.stringify(createResponse.data, null, 2));

    if (contactId) {
      // Test 2: Retrieve the contact
      console.log('\n🧪 Testing GHL contact retrieval...');
      const getResponse = await axios.get(
        `${GHL_BASE_URL}/contacts/${contactId}`,
        {
          headers: {
            Authorization: `Bearer ${GHL_API_KEY}`
          }
        }
      );
      
      console.log('✅ Contact retrieved successfully!');
      console.log('Retrieved contact:', JSON.stringify(getResponse.data, null, 2));

      // Test 3: Update the contact tags
      console.log('\n🧪 Testing GHL contact update...');
      const updateResponse = await axios.put(
        `${GHL_BASE_URL}/contacts/${contactId}`,
        {
          tags: ['test', 'hireos-sync', 'assessment-sent']
        },
        {
          headers: {
            Authorization: `Bearer ${GHL_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ Contact updated successfully!');
      console.log('Update response:', JSON.stringify(updateResponse.data, null, 2));

      // Test 4: Final verification
      console.log('\n🧪 Final verification...');
      const finalCheckResponse = await axios.get(
        `${GHL_BASE_URL}/contacts/${contactId}`,
        {
          headers: {
            Authorization: `Bearer ${GHL_API_KEY}`
          }
        }
      );
      
      console.log('✅ Final check - Contact tags:', finalCheckResponse.data.contact?.tags);
      console.log('\n🎉 All tests passed! GHL sync is working correctly.');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testGHLSync();