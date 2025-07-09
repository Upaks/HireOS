import { storage } from './server/storage.js';
import axios from 'axios';

const GHL_API_KEY = process.env.GHL_API_KEY;
const GHL_BASE_URL = 'https://rest.gohighlevel.com/v1';

function normalizeName(name) {
  if (!name) return '';
  return name.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ').trim();
}

async function fetchAllGHLContacts() {
  const allContacts = [];
  let page = 1;
  const pageSize = 50;
  
  while (true) {
    try {
      const response = await axios.get(`${GHL_BASE_URL}/contacts/`, {
        headers: {
          Authorization: `Bearer ${GHL_API_KEY}`,
          'Content-Type': 'application/json'
        },
        params: {
          limit: pageSize,
          offset: (page - 1) * pageSize
        }
      });

      const contacts = response.data.contacts || [];
      if (contacts.length === 0) break;
      
      allContacts.push(...contacts);
      console.log(`Fetched page ${page}: ${contacts.length} contacts (Total: ${allContacts.length})`);
      
      // Break if we got less than page size (last page)
      if (contacts.length < pageSize) break;
      
      page++;
      
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } catch (error) {
      console.error(`Error fetching page ${page}:`, error.message);
      break;
    }
  }
  
  return allContacts;
}

async function targetedSync() {
  console.log('🎯 Starting Targeted GHL Sync for Missing Matches\n');
  
  let updates = 0;
  let errors = 0;
  
  try {
    // Get all GHL contacts
    console.log('📥 Fetching all GHL contacts...');
    const allGHLContacts = await fetchAllGHLContacts();
    
    // Create a map of normalized names to GHL contact IDs
    const ghlNameMap = new Map();
    allGHLContacts.forEach(contact => {
      if (contact.contactName) {
        const normalized = normalizeName(contact.contactName);
        if (!ghlNameMap.has(normalized)) {
          ghlNameMap.set(normalized, contact.id);
        }
      }
    });
    
    console.log(`📊 Found ${allGHLContacts.length} total GHL contacts`);
    console.log(`📊 Created map with ${ghlNameMap.size} unique normalized names\n`);
    
    // Get candidates without GHL IDs
    const candidates = await storage.getCandidates({});
    const candidatesWithoutGHL = candidates.filter(c => !c.ghlContactId);
    
    console.log(`👥 Found ${candidatesWithoutGHL.length} candidates without GHL IDs\n`);
    
    // Find and update matches
    for (const candidate of candidatesWithoutGHL) {
      const normalizedCandidateName = normalizeName(candidate.name);
      const ghlContactId = ghlNameMap.get(normalizedCandidateName);
      
      if (ghlContactId) {
        try {
          console.log(`🔄 Updating "${candidate.name}" with GHL ID: ${ghlContactId}`);
          
          await storage.updateCandidate(candidate.id, {
            ghlContactId: ghlContactId
          });
          
          console.log(`✅ Successfully updated candidate ID ${candidate.id}`);
          updates++;
          
        } catch (error) {
          console.error(`❌ Failed to update "${candidate.name}":`, error.message);
          errors++;
        }
      }
    }
    
    console.log('\n🎉 Targeted Sync Complete!');
    console.log('=====================================');
    console.log(`📝 Total updates: ${updates}`);
    console.log(`❌ Errors: ${errors}`);
    
    // Show final stats
    const updatedCandidates = await storage.getCandidates({});
    const withGHLIds = updatedCandidates.filter(c => c.ghlContactId).length;
    const withoutGHLIds = updatedCandidates.filter(c => !c.ghlContactId).length;
    
    console.log(`\n📊 Final Database Stats:`);
    console.log(`   Total candidates: ${updatedCandidates.length}`);
    console.log(`   With GHL IDs: ${withGHLIds}`);
    console.log(`   Without GHL IDs: ${withoutGHLIds}`);
    
  } catch (error) {
    console.error('❌ Sync failed:', error.message);
  }
}

targetedSync();