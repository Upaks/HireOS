import { storage } from './server/storage.js';
import axios from 'axios';

const GHL_API_KEY = process.env.GHL_API_KEY;
const GHL_BASE_URL = 'https://rest.gohighlevel.com/v1';

function normalizeName(name) {
  if (!name) return '';
  return name.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ').trim();
}

async function analyzeNameDifferences() {
  console.log('🔍 Analyzing name differences between GHL and candidates\n');
  
  try {
    // Get unique GHL contacts (first 50 unique names)
    const response = await axios.get(`${GHL_BASE_URL}/contacts/`, {
      headers: {
        Authorization: `Bearer ${GHL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      params: { limit: 50 }
    });

    const ghlContacts = response.data.contacts || [];
    const uniqueGHLNames = [...new Set(ghlContacts.map(c => c.contactName).filter(Boolean))];
    
    // Get candidates without GHL IDs
    const candidates = await storage.getCandidates({});
    const candidatesWithoutGHL = candidates.filter(c => !c.ghlContactId);
    
    console.log(`📊 Found ${uniqueGHLNames.length} unique GHL contact names`);
    console.log(`📊 Found ${candidatesWithoutGHL.length} candidates without GHL IDs\n`);
    
    console.log('🎯 GHL Contact Names (first 20):');
    uniqueGHLNames.slice(0, 20).forEach((name, i) => {
      console.log(`   ${i + 1}. "${name}" → normalized: "${normalizeName(name)}"`);
    });
    
    console.log('\n👥 Candidates without GHL IDs (first 20):');
    candidatesWithoutGHL.slice(0, 20).forEach((candidate, i) => {
      console.log(`   ${i + 1}. "${candidate.name}" → normalized: "${normalizeName(candidate.name)}"`);
    });
    
    // Look for potential matches with fuzzy matching
    console.log('\n🔍 Looking for potential matches...\n');
    
    let potentialMatches = 0;
    for (const candidate of candidatesWithoutGHL.slice(0, 10)) {
      const normalizedCandidate = normalizeName(candidate.name);
      
      // Check for exact match first
      const exactMatch = uniqueGHLNames.find(ghlName => 
        normalizeName(ghlName) === normalizedCandidate
      );
      
      if (exactMatch) {
        console.log(`✅ EXACT MATCH: "${candidate.name}" ↔ "${exactMatch}"`);
        potentialMatches++;
      } else {
        // Check for partial matches (first or last name)
        const partialMatches = uniqueGHLNames.filter(ghlName => {
          const normalizedGHL = normalizeName(ghlName);
          const candidateWords = normalizedCandidate.split(' ');
          const ghlWords = normalizedGHL.split(' ');
          
          // Check if any word matches
          return candidateWords.some(cWord => 
            ghlWords.some(gWord => 
              cWord.length > 2 && gWord.length > 2 && 
              (cWord.includes(gWord) || gWord.includes(cWord))
            )
          );
        });
        
        if (partialMatches.length > 0) {
          console.log(`🔍 PARTIAL MATCH for "${candidate.name}":`);
          partialMatches.forEach(match => {
            console.log(`   → "${match}"`);
          });
        } else {
          console.log(`❌ NO MATCH: "${candidate.name}"`);
        }
      }
    }
    
    console.log(`\n📊 Analysis Summary:`);
    console.log(`   Exact matches found: ${potentialMatches}`);
    console.log(`   This suggests the names in GHL don't match the candidates table`);
    console.log(`   Consider checking if contacts were imported with different name formats`);
    
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
  }
}

analyzeNameDifferences();