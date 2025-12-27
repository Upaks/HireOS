import axios from 'axios';
import { storage } from './storage';

const GHL_BASE_URL = 'https://rest.gohighlevel.com/v1';

// Helper function to get GHL credentials for a user
async function getGHLCredentials(userId?: number): Promise<{ apiKey: string; locationId?: string } | null> {
  if (!userId) {
    // Fallback to env for backward compatibility
    const envKey = process.env.GHL_API_KEY;
    const envLocationId = process.env.GHL_LOCATION_ID;
    if (envKey) {
      return { apiKey: envKey, locationId: envLocationId };
    }
    return null;
  }

  // Get user's GHL integration from database
  const integration = await storage.getPlatformIntegration("ghl", userId);
  if (!integration || !integration.credentials) {
    return null;
  }

  const credentials = integration.credentials as any;
  if (!credentials.apiKey) {
    return null;
  }

  return {
    apiKey: credentials.apiKey,
    locationId: credentials.locationId,
  };
}

interface GHLContact {
  id: string;
  contactName: string;
  email?: string;
  firstName?: string;
  lastName?: string;
}

interface SyncResult {
  success: boolean;
  totalGHLContacts: number;
  totalCandidates: number;
  matched: number;
  updated: number;
  skipped: number;
  errors: string[];
  details: {
    contactId: string;
    ghlName: string;
    candidateName: string;
    action: 'updated' | 'skipped' | 'error';
    reason?: string;
  }[];
}

/**
 * Normalizes a name for matching by capitalizing first letters
 * @param name Name to normalize
 * @returns Normalized name
 */
function normalizeName(name: string): string {
  if (!name) return '';
  
  return name
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    .trim();
}

/**
 * Fetches contacts from GHL API with improved efficiency
 * @param limit Maximum number of contacts to fetch (default: 500)
 * @param userId Optional user ID to get credentials from database
 * @returns Promise<GHLContact[]> Array of GHL contacts
 */
async function fetchGHLContacts(limit: number = 500, userId?: number): Promise<GHLContact[]> {
  // Get credentials for the user
  const credentials = await getGHLCredentials(userId);
  if (!credentials) {
    throw new Error('GHL credentials not found. Please connect your GHL account in Settings → Integrations.');
  }

  const allContacts: GHLContact[] = [];
  let startAfter = '';
  let hasMore = true;
  let pageCount = 0;
  const maxPages = Math.ceil(limit / 20); // Each page has ~20 contacts
  const timeout = 30000; // 30 second timeout per request

  try {
    while (hasMore && pageCount < maxPages && allContacts.length < limit) {
      const url = `${GHL_BASE_URL}/contacts/${startAfter ? `?startAfter=${startAfter}` : ''}`;
      
      console.log(`Fetching GHL contacts page ${pageCount + 1}/${maxPages}...`);
      
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${credentials.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: timeout
      });

      const contacts = response.data.contacts || [];
      
      // Add contacts but don't exceed the limit
      const contactsToAdd = contacts.slice(0, limit - allContacts.length);
      allContacts.push(...contactsToAdd);

      // Check if there are more pages and we haven't reached the limit
      hasMore = response.data.meta?.nextPageUrl && allContacts.length < limit;
      startAfter = response.data.meta?.startAfterId || '';
      
      pageCount++;
      
      console.log(`Page ${pageCount}: Found ${contactsToAdd.length} contacts (Total: ${allContacts.length})`);
      
      // If we've reached our limit, break
      if (allContacts.length >= limit) {
        console.log(`✅ Reached limit of ${limit} contacts`);
        break;
      }
    }

    console.log(`✅ Fetched ${allContacts.length} total contacts from GHL`);
    return allContacts;
  } catch (error: any) {
    console.error('❌ Error fetching GHL contacts:', error.response?.data || error.message);
    throw new Error(`GHL API Error: ${error.response?.data?.message || error.message}`);
  }
}

/**
 * Syncs GHL contacts with candidates table
 * @param dryRun If true, only previews changes without updating database
 * @param userId Optional user ID to get credentials from database
 * @returns Promise<SyncResult> Sync operation results
 */
export async function syncGHLContacts(dryRun: boolean = false, userId?: number): Promise<SyncResult> {
  const result: SyncResult = {
    success: false,
    totalGHLContacts: 0,
    totalCandidates: 0,
    matched: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    details: []
  };

  try {
    console.log(`🔄 Starting GHL contact sync ${dryRun ? '(DRY RUN)' : ''}...`);
    
    // Fetch GHL contacts (limited to 300 for better coverage)
    const ghlContacts = await fetchGHLContacts(300, userId);
    result.totalGHLContacts = ghlContacts.length;

    // Fetch all candidates
    const candidates = await storage.getCandidates({});
    result.totalCandidates = candidates.length;

    console.log(`📊 Found ${ghlContacts.length} GHL contacts and ${candidates.length} candidates`);

    // Process each GHL contact
    for (const ghlContact of ghlContacts) {
      try {
        // Skip contacts without names
        if (!ghlContact.contactName) {
          result.skipped++;
          result.details.push({
            contactId: ghlContact.id,
            ghlName: 'null',
            candidateName: 'N/A',
            action: 'skipped',
            reason: 'No contact name in GHL'
          });
          continue;
        }

        // Normalize the GHL contact name
        const normalizedGHLName = normalizeName(ghlContact.contactName);
        
        // Find matching candidate by name
        const matchingCandidate = candidates.find(candidate => 
          normalizeName(candidate.name) === normalizedGHLName
        );

        if (!matchingCandidate) {
          result.skipped++;
          result.details.push({
            contactId: ghlContact.id,
            ghlName: normalizedGHLName,
            candidateName: 'N/A',
            action: 'skipped',
            reason: 'No matching candidate found'
          });
          continue;
        }

        result.matched++;

        // Check if candidate already has a GHL contact ID
        if (matchingCandidate.ghlContactId) {
          result.skipped++;
          result.details.push({
            contactId: ghlContact.id,
            ghlName: normalizedGHLName,
            candidateName: matchingCandidate.name,
            action: 'skipped',
            reason: 'Candidate already has GHL contact ID'
          });
          continue;
        }

        // Update the candidate with GHL contact ID
        if (!dryRun) {
          await storage.updateCandidate(matchingCandidate.id, {
            ghlContactId: ghlContact.id
          });
        }

        result.updated++;
        result.details.push({
          contactId: ghlContact.id,
          ghlName: normalizedGHLName,
          candidateName: matchingCandidate.name,
          action: 'updated',
          reason: dryRun ? 'Would update (dry run)' : 'Updated successfully'
        });

        console.log(`✅ ${dryRun ? 'Would update' : 'Updated'} candidate "${matchingCandidate.name}" with GHL contact ID: ${ghlContact.id}`);

      } catch (error: any) {
        result.errors.push(`Error processing contact ${ghlContact.id}: ${error.message}`);
        result.details.push({
          contactId: ghlContact.id,
          ghlName: ghlContact.contactName || 'unknown',
          candidateName: 'N/A',
          action: 'error',
          reason: error.message
        });
        console.error(`❌ Error processing contact ${ghlContact.id}:`, error.message);
      }
    }

    result.success = true;
    
    console.log(`🎉 GHL sync completed ${dryRun ? '(DRY RUN)' : ''}:`);
    console.log(`   Total GHL contacts: ${result.totalGHLContacts}`);
    console.log(`   Total candidates: ${result.totalCandidates}`);
    console.log(`   Matched: ${result.matched}`);
    console.log(`   Updated: ${result.updated}`);
    console.log(`   Skipped: ${result.skipped}`);
    console.log(`   Errors: ${result.errors.length}`);

  } catch (error: any) {
    result.success = false;
    result.errors.push(`Sync failed: ${error.message}`);
    console.error('❌ GHL sync failed:', error.message);
  }

  return result;
}

/**
 * Runs a dry run of the GHL sync to preview changes
 * @param userId Optional user ID to get credentials from database
 * @returns Promise<SyncResult> Preview of sync operations
 */
export async function previewGHLSync(userId?: number): Promise<SyncResult> {
  return await syncGHLContacts(true, userId);
}

/**
 * Executes the actual GHL sync with database updates
 * @param userId Optional user ID to get credentials from database
 * @returns Promise<SyncResult> Results of sync operations
 */
export async function executeGHLSync(userId?: number): Promise<SyncResult> {
  return await syncGHLContacts(false, userId);
}