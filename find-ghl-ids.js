import axios from 'axios';

const GHL_API_KEY = process.env.GHL_API_KEY;
const GHL_BASE_URL = 'https://rest.gohighlevel.com/v1';

async function findSpecificGHLIds() {
  console.log('🔍 Finding GHL contact IDs for specific candidates...\n');
  
  const targetNames = ['jaxon morse', 'ashlinn dumond', 'cole smith'];
  const foundContacts = [];
  
  try {
    // Search through multiple pages
    for (let page = 1; page <= 5; page++) {
      console.log(`Searching page ${page}...`);
      
      const response = await axios.get(`${GHL_BASE_URL}/contacts/`, {
        headers: {
          Authorization: `Bearer ${GHL_API_KEY}`,
          'Content-Type': 'application/json'
        },
        params: {
          limit: 20,
          offset: (page - 1) * 20
        }
      });
      
      const contacts = response.data.contacts || [];
      
      contacts.forEach(contact => {
        if (contact.contactName) {
          const normalizedName = contact.contactName.toLowerCase().trim();
          if (targetNames.includes(normalizedName)) {
            foundContacts.push({
              name: contact.contactName,
              id: contact.id,
              normalized: normalizedName
            });
            console.log(`✅ Found: "${contact.contactName}" -> ${contact.id}`);
          }
        }
      });
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`\n📊 Found ${foundContacts.length} matching contacts:`);
    foundContacts.forEach(contact => {
      console.log(`   "${contact.name}" -> ${contact.id}`);
    });
    
    // Generate SQL update commands
    console.log('\n📝 SQL Update Commands:');
    foundContacts.forEach(contact => {
      const candidateName = contact.name.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ');
      
      console.log(`UPDATE candidates SET ghl_contact_id = '${contact.id}' WHERE name = '${candidateName}' AND ghl_contact_id IS NULL;`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

findSpecificGHLIds();