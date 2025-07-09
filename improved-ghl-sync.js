import { storage } from './server/storage.js';
import axios from 'axios';
import { pool } from './server/db.js';

const GHL_API_KEY = process.env.GHL_API_KEY;
const GHL_BASE_URL = 'https://rest.gohighlevel.com/v1';

function normalizeName(name) {
  if (!name) return '';
  return name.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ').trim();
}

async function fetchGHLContacts(limit = 300) {
  try {
    console.log(`🔄 Fetching up to ${limit} GHL contacts...`);
    
    const allContacts = [];
    let pageCount = 0;
    let hasMore = true;
    const maxPages = Math.ceil(limit / 20);
    
    while (hasMore && pageCount < maxPages) {
      pageCount++;
      
      // Add a small delay to avoid rate limiting
      if (pageCount > 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      const response = await axios.get(`${GHL_BASE_URL}/contacts/`, {
        headers: {
          Authorization: `Bearer ${GHL_API_KEY}`,
          'Content-Type': 'application/json'
        },
        params: {
          limit: 20,
          offset: (pageCount - 1) * 20
        }
      });

      const contactsToAdd = response.data.contacts || [];
      allContacts.push(...contactsToAdd);
      
      console.log(`   Page ${pageCount}/${maxPages}: Found ${contactsToAdd.length} contacts (Total: ${allContacts.length})`);
      
      // Check if we have more pages
      hasMore = contactsToAdd.length === 20 && allContacts.length < limit;
    }

    console.log(`✅ Fetched ${allContacts.length} total contacts from GHL`);
    return allContacts;
  } catch (error) {
    console.error('❌ Error fetching GHL contacts:', error.response?.data || error.message);
    throw error;
  }
}

async function improvedGHLSync() {
  console.log('🚀 Starting Improved GHL Contact Sync');
  console.log('========================================\n');
  
  let totalUpdated = 0;
  let totalMatched = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  
  try {
    // Fetch GHL contacts
    const ghlContacts = await fetchGHLContacts(300);
    
    // Get candidates without GHL IDs
    const allCandidates = await storage.getCandidates({});
    const candidatesWithoutGHL = allCandidates.filter(c => !c.ghlContactId);
    
    console.log(`📊 Analysis:`);
    console.log(`   Total GHL contacts: ${ghlContacts.length}`);
    console.log(`   Total candidates: ${allCandidates.length}`);
    console.log(`   Candidates without GHL ID: ${candidatesWithoutGHL.length}\n`);
    
    // Process each GHL contact
    for (const ghlContact of ghlContacts) {
      if (!ghlContact.contactName) continue;
      
      const normalizedGHLName = normalizeName(ghlContact.contactName);
      const matchingCandidate = allCandidates.find(candidate => 
        normalizeName(candidate.name) === normalizedGHLName
      );
      
      if (matchingCandidate) {
        totalMatched++;
        
        if (!matchingCandidate.ghlContactId) {
          try {
            // Use direct database query to avoid connection issues
            const result = await pool.query(
              'UPDATE candidates SET ghl_contact_id = $1 WHERE id = $2',
              [ghlContact.id, matchingCandidate.id]
            );
            
            if (result.rowCount > 0) {
              totalUpdated++;
              console.log(`✅ Updated "${matchingCandidate.name}" with GHL ID: ${ghlContact.id}`);
            } else {
              totalErrors++;
              console.log(`❌ Failed to update "${matchingCandidate.name}" - no rows affected`);
            }
          } catch (error) {
            totalErrors++;
            console.error(`❌ Error updating "${matchingCandidate.name}":`, error.message);
          }
        } else {
          totalSkipped++;
          console.log(`⏭️  Skipped "${matchingCandidate.name}" - already has GHL ID`);
        }
      }
    }
    
    console.log('\n🎉 Sync Complete!');
    console.log('========================================');
    console.log(`✅ Total matches found: ${totalMatched}`);
    console.log(`📝 Candidates updated: ${totalUpdated}`);
    console.log(`⏭️  Candidates skipped: ${totalSkipped}`);
    console.log(`❌ Errors: ${totalErrors}`);
    
  } catch (error) {
    console.error('❌ Sync failed:', error.message);
  } finally {
    // Clean up database connection
    await pool.end();
  }
}

improvedGHLSync();