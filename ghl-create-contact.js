
import axios from 'axios';

const GHL_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJsb2NhdGlvbl9pZCI6Ilgzbm9UMWpNYTZ1Q3VIaHJuVHBlIiwiY29tcGFueV9pZCI6IkJVS2dONlV0OE04WXE5R0pxSHdSIiwidmVyc2lvbiI6MSwiaWF0IjoxNzA4NzE2OTQzNDE0LCJzdWIiOiJ1c2VyX2lkIn0.AhaeewxW5RfLLSdqTYNVSr171R_Sa8K2bIOE4_wfDVA';

async function createGHLContact() {
  try {
    const newContact = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '+1234567890',
      companyName: 'Test Company',
      address1: '123 Main St',
      city: 'New Orleans',
      state: 'LA',
      postalCode: '70001',
      country: 'US',
      source: 'API',
      tags: ['prospect', 'api-created']
    };

    const response = await axios.post('https://rest.gohighlevel.com/v1/contacts/', newContact, {
      headers: {
        Authorization: `Bearer ${GHL_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Contact Created Successfully!');
    console.log('New Contact ID:', response.data.contact.id);
    console.log('Response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('❌ Error creating contact:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

createGHLContact();
