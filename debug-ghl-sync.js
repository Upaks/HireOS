import { storage } from './server/storage.js';
import axios from 'axios';

const GHL_API_KEY = process.env.GHL_API_KEY;
const GHL_BASE_URL = 'https://rest.gohighlevel.com/v1';

function normalizeName(name) {
  if (!name) return '';
  return name.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ').trim();
}

async function debugSync() {
  console.log('🔍 Debug GHL Sync - Finding exact issue\n');
  
  try {
    // Get first 20 GHL contacts
    const response = await axios.get(`${GHL_BASE_URL}/contacts/`, {
      headers: {
        Authorization: `Bearer ${GHL_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const ghlContacts = response.data.contacts || [];
    console.log(`📊 Found ${ghlContacts.length} GHL contacts`);
    
    // Get all candidates
    const candidates = await storage.getCandidates({});
    console.log(`👥 Found ${candidates.length} candidates`);
    
    // Check candidates without GHL IDs
    const candidatesWithoutGHL = candidates.filter(c => !c.ghlContactId);
    console.log(`🔍 Candidates without GHL ID: ${candidatesWithoutGHL.length}`);
    
    let matches = 0;
    let updates = 0;
    
    // Check first 10 GHL contacts for matches
    for (let i = 0; i < Math.min(10, ghlContacts.length); i++) {
      const ghlContact = ghlContacts[i];
      if (!ghlContact.contactName) continue;
      
      const normalizedGHLName = normalizeName(ghlContact.contactName);
      const matchingCandidate = candidates.find(candidate => 
        normalizeName(candidate.name) === normalizedGHLName
      );
      
      if (matchingCandidate) {
        matches++;
        console.log(`\n✅ MATCH FOUND:`);
        console.log(`   GHL: "${ghlContact.contactName}" (${ghlContact.id})`);
        console.log(`   Candidate: "${matchingCandidate.name}" (ID: ${matchingCandidate.id})`);
        console.log(`   Current GHL ID: ${matchingCandidate.ghlContactId || 'null'}`);
        
        if (!matchingCandidate.ghlContactId) {
          console.log(`   📝 WOULD UPDATE: Setting ghl_contact_id = '${ghlContact.id}'`);
          
          // Try to update this candidate
          try {
            await storage.updateCandidate(matchingCandidate.id, {
              ghlContactId: ghlContact.id
            });
            console.log(`   ✅ UPDATED successfully!`);
            updates++;
          } catch (error) {
            console.log(`   ❌ UPDATE FAILED: ${error.message}`);
          }
        } else {
          console.log(`   ⏭️  SKIPPED: Already has GHL ID`);
        }
      } else {
        console.log(`\n❌ NO MATCH: "${ghlContact.contactName}" (${ghlContact.id})`);
      }
    }
    
    console.log(`\n📊 DEBUG SUMMARY:`);
    console.log(`   Matches found: ${matches}`);
    console.log(`   Updates attempted: ${updates}`);
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugSync();