import { createGHLContact, mapJobTitleToGHLTag, parseFullName } from './server/ghl-integration.js';

async function testGHLIntegration() {
  console.log('🧪 Testing GHL Integration...\n');
  
  // Test name parsing
  console.log('1. Testing name parsing:');
  console.log('  "John Doe" ->', parseFullName("John Doe"));
  console.log('  "Jane Mary Smith" ->', parseFullName("Jane Mary Smith"));
  console.log('  "SingleName" ->', parseFullName("SingleName"));
  
  // Test job title mapping
  console.log('\n2. Testing job title mapping:');
  console.log('  "Audit Senior" ->', mapJobTitleToGHLTag("Audit Senior"));
  console.log('  "Executive Assistant" ->', mapJobTitleToGHLTag("Executive Assistant"));
  console.log('  "Software Developer" ->', mapJobTitleToGHLTag("Software Developer"));
  
  // Test GHL contact creation
  console.log('\n3. Testing GHL contact creation:');
  try {
    const testContact = {
      firstName: 'Test',
      lastName: 'User',
      email: 'test.hireos@example.com',
      phone: '+1234567890',
      location: 'New York, NY',
      tags: ['00_application_submitted', 'c–role–aud–sr']
    };
    
    console.log('  Creating contact:', testContact);
    const result = await createGHLContact(testContact);
    console.log('  ✅ Contact created successfully!', result);
    
  } catch (error) {
    console.log('  ❌ Contact creation failed:', error.message);
  }
}

testGHLIntegration().catch(console.error);