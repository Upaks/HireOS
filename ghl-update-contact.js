
import axios from 'axios';

const GHL_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJsb2NhdGlvbl9pZCI6Ilgzbm9UMWpNYTZ1Q3VIaHJuVHBlIiwiY29tcGFueV9pZCI6IkJVS2dONlV0OE04WXE5R0pxSHdSIiwidmVyc2lvbiI6MSwiaWF0IjoxNzA4NzE2OTQzNDE0LCJzdWIiOiJ1c2VyX2lkIn0.AhaeewxW5RfLLSdqTYNVSr171R_Sa8K2bIOE4_wfDVA';

async function updateGHLContact() {
  try {
    // Use one of the contact IDs from your test results
    const contactId = 'EpAORfPsu2D7lSg4ateB'; // Replace with actual contact ID
    
    const updateData = {
      firstName: 'Updated John',
      lastName: 'Updated Doe',
      email: 'updated.john@example.com',
      phone: '+1987654321',
      companyName: 'Updated Company',
      tags: ['updated', 'api-modified']
    };

    const response = await axios.put(`https://rest.gohighlevel.com/v1/contacts/${contactId}`, updateData, {
      headers: {
        Authorization: `Bearer ${GHL_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Contact Updated Successfully!');
    console.log('Updated Contact ID:', contactId);
    console.log('Response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('❌ Error updating contact:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

updateGHLContact();
