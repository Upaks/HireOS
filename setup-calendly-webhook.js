import axios from 'axios';

// ============================================
// CONFIGURATION - UPDATE THESE VALUES
// ============================================
const PERSONAL_ACCESS_TOKEN = 'eyJraWQiOiIxY2UxZTEzNjE3ZGNmNzY2YjNjZWJjY2Y4ZGM1YmFmYThhNjVlNjg0MDIzZjdjMzJiZTgzNDliMjM4MDEzNWI0IiwidHlwIjoiUEFUIiwiYWxnIjoiRVMyNTYifQ.eyJpc3MiOiJodHRwczovL2F1dGguY2FsZW5kbHkuY29tIiwiaWF0IjoxNzY2NzI4NjU4LCJqdGkiOiIzYjcxYTNjOC0wYmJhLTQ4OWYtODc3Yy0xYWUyOTkxMDcwZDAiLCJ1c2VyX3V1aWQiOiIxOTcyMWRlZC1hNGNmLTQxOWItYmU3Ny0zZmZlZTRkOTM2YTgifQ.wnWCJts1sBlLQY0WepM1Z2RXGSuTQay-3sx27UzIk7MgFh-T2e9kyggqg12h5B6ngY5G7On6i8QZj09XWGCZ1w';

// Replace with your ngrok URL (e.g., https://44f6aa89ead4.ngrok-free.app)
const NGROK_URL = 'https://44f6aa89ead4.ngrok-free.app';

// Replace with your user ID from HireOS (check in Settings > User Management)
const USER_ID = 1;

// ============================================
// SCRIPT - NO NEED TO MODIFY BELOW
// ============================================

const WEBHOOK_URL = `${NGROK_URL}/api/webhooks/calendar?provider=calendly&userId=${USER_ID}`;

async function setupWebhook() {
  try {
    console.log('🔍 Getting your Calendly user information...');
    
    // First, get your user info to get org UUID
    const userResponse = await axios.get('https://api.calendly.com/users/me', {
      headers: {
        'Authorization': `Bearer ${PERSONAL_ACCESS_TOKEN}`
      }
    });
    
    const orgUri = userResponse.data.resource.current_organization;
    const userUri = userResponse.data.resource.uri;
    
    console.log('✅ Found your information:');
    console.log('   Organization:', orgUri);
    console.log('   User:', userUri);
    console.log('');
    
    console.log('🔗 Creating webhook subscription...');
    console.log('   Webhook URL:', WEBHOOK_URL);
    console.log('   Events: invitee.created');
    console.log('');
    
    // Create webhook
    const webhookResponse = await axios.post(
      'https://api.calendly.com/webhook_subscriptions',
      {
        url: WEBHOOK_URL,
        events: ['invitee.created'],
        organization: orgUri,
        user: userUri,
        scope: 'user'
      },
      {
        headers: {
          'Authorization': `Bearer ${PERSONAL_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Webhook created successfully!');
    const webhook = webhookResponse.data.resource;
    console.log('   Full response:', JSON.stringify(webhookResponse.data, null, 2));
    console.log('   Webhook ID:', webhook?.uuid || webhook?.id || webhookResponse.data?.resource?.uuid || 'N/A');
    console.log('   Status:', webhook?.state || webhookResponse.data?.resource?.state || 'active');
    console.log('   Webhook URL:', webhook?.url || webhookResponse.data?.resource?.url || WEBHOOK_URL);
    console.log('   Events:', webhook?.events?.join(', ') || webhookResponse.data?.resource?.events?.join(', ') || 'invitee.created');
    console.log('');
    console.log('🎉 You can now test by booking a time on your Calendly calendar!');
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('   Details:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

setupWebhook();

