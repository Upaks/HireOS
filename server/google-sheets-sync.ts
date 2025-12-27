import { storage } from "./storage";
import {
  fetchGoogleSheetsContacts,
  getGoogleSheetsCredentials,
  getGoogleSheetsFieldValue,
  getGoogleSheetsFieldName,
  findRowByEmail,
  createOrUpdateGoogleSheetsContact,
  type GoogleSheetsFieldMappings,
} from "./google-sheets-integration";

interface SyncResult {
  success: boolean;
  totalCRMContacts: number;
  totalCandidates: number;
  matched: number;
  updated: number;
  created: number;
  skipped: number;
  errors: string[];
  details: {
    contactId: string;
    crmName: string;
    candidateName: string;
    action: 'updated' | 'skipped' | 'error' | 'created';
    reason?: string;
  }[];
}

/**
 * Normalizes a name for matching by capitalizing first letters
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
 * Syncs Google Sheets contacts with candidates table
 */
export async function syncGoogleSheetsContacts(
  dryRun: boolean = false,
  userId?: number,
  selectedContactIds?: string[],
  skipNewCandidates?: boolean,
): Promise<SyncResult> {
  const result: SyncResult = {
    success: false,
    totalCRMContacts: 0,
    totalCandidates: 0,
    matched: 0,
    updated: 0,
    created: 0,
    skipped: 0,
    errors: [],
    details: [],
  };

  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    // Fetch Google Sheets contacts
    const sheetsContacts = await fetchGoogleSheetsContacts(1000, userId);
    result.totalCRMContacts = sheetsContacts.length;

    if (sheetsContacts.length === 0) {
      result.success = true;
      return result;
    }

    // Get headers from first contact (all contacts have same headers)
    const headers = (sheetsContacts[0] as any).headers || [];

    // Fetch all candidates
    const candidates = await storage.getCandidates({});
    result.totalCandidates = candidates.length;

    // Get field mappings
    const credentials = await getGoogleSheetsCredentials(userId);
    const mappings = credentials?.fieldMappings;

    // Process each Google Sheets contact
    for (const sheetsContact of sheetsContacts) {
      try {
        const contactName = getGoogleSheetsFieldValue(sheetsContact.data, headers, "name", mappings) || '';
        const contactEmail = getGoogleSheetsFieldValue(sheetsContact.data, headers, "email", mappings) || '';

        // Skip contacts without names or emails
        if (!contactName && !contactEmail) {
          result.skipped++;
          result.details.push({
            contactId: sheetsContact.id,
            crmName: 'No name',
            candidateName: 'N/A',
            action: 'skipped',
            reason: 'No name or email in Google Sheets row',
          });
          continue;
        }

        // Try to find matching candidate by email first (most reliable)
        let matchingCandidate = null;
        if (contactEmail) {
          matchingCandidate = candidates.find(
            candidate => candidate.email && candidate.email.toLowerCase() === contactEmail.toLowerCase()
          );
        }

        // If no email match, try matching by name
        if (!matchingCandidate && contactName) {
          const normalizedSheetsName = normalizeName(contactName);
          matchingCandidate = candidates.find(candidate => 
            normalizeName(candidate.name) === normalizedSheetsName
          );
        }

        if (!matchingCandidate) {
          // If skipNewCandidates is true, skip all new candidates
          if (skipNewCandidates) {
            result.skipped++;
            result.details.push({
              contactId: sheetsContact.id,
              crmName: contactName || contactEmail || 'Unknown',
              candidateName: 'N/A',
              action: 'skipped',
              reason: 'New candidate - will be processed separately with job assignment',
            });
            continue;
          }

          // New candidate from Google Sheets - only create if email exists
          if (!contactEmail) {
            result.skipped++;
            result.details.push({
              contactId: sheetsContact.id,
              crmName: contactName || 'Unknown',
              candidateName: 'N/A',
              action: 'skipped',
              reason: 'No email - cannot create candidate (email is required)',
            });
            continue;
          }

          // In preview mode, show what would be created
          if (dryRun) {
            result.created++;
            result.details.push({
              contactId: sheetsContact.id,
              crmName: contactName || contactEmail,
              candidateName: contactName || 'New Candidate',
              action: 'created',
              reason: 'Would create new candidate from Google Sheets',
            });
            continue;
          }

          // In execute mode: only create if selected
          if (selectedContactIds !== undefined) {
            if (!selectedContactIds.includes(sheetsContact.id)) {
              result.skipped++;
              result.details.push({
                contactId: sheetsContact.id,
                crmName: contactName || contactEmail,
                candidateName: 'N/A',
                action: 'skipped',
                reason: 'Not selected for import',
              });
              continue;
            }
          }

          // Actually create the candidate from Google Sheets
          try {
            // Check for duplicate by email first
            const existingCandidates = await storage.getCandidates({});
            const duplicateCandidate = existingCandidates.find(
              c => c.email && c.email.toLowerCase() === contactEmail.toLowerCase()
            );

            if (duplicateCandidate) {
              result.skipped++;
              result.details.push({
                contactId: sheetsContact.id,
                crmName: contactName || contactEmail,
                candidateName: duplicateCandidate.name,
                action: 'skipped',
                reason: `Duplicate email - candidate already exists (ID: ${duplicateCandidate.id})`,
              });
              continue;
            }

            // Get all field values from Google Sheets using mappings
            const sheetsPhone = getGoogleSheetsFieldValue(sheetsContact.data, headers, "phone", mappings);
            const sheetsLocation = getGoogleSheetsFieldValue(sheetsContact.data, headers, "location", mappings);
            const sheetsSalary = getGoogleSheetsFieldValue(sheetsContact.data, headers, "expectedSalary", mappings);
            const sheetsExp = getGoogleSheetsFieldValue(sheetsContact.data, headers, "experienceYears", mappings);
            const sheetsSkills = getGoogleSheetsFieldValue(sheetsContact.data, headers, "skills", mappings);
            
            // Convert skills to array if needed
            const skillsArray = sheetsSkills 
              ? (typeof sheetsSkills === 'string' 
                  ? sheetsSkills.split(',').map(s => s.trim()).filter(s => s)
                  : Array.isArray(sheetsSkills) ? sheetsSkills : [])
              : [];

            // Get first active job to assign (if available)
            const jobs = await storage.getJobs('active');
            const defaultJobId = jobs.length > 0 ? jobs[0].id : null;

            // Create new candidate from Google Sheets data
            const newCandidate = await storage.createCandidate({
              name: contactName || contactEmail,
              email: contactEmail,
              phone: sheetsPhone || null,
              location: sheetsLocation || null,
              expectedSalary: sheetsSalary ? String(parseFloat(sheetsSalary)) : null,
              experienceYears: sheetsExp ? (typeof sheetsExp === 'number' ? sheetsExp : parseInt(sheetsExp)) : null,
              skills: skillsArray.length > 0 ? skillsArray : null,
              status: 'new',
              jobId: defaultJobId,
            });

            result.created++;
            result.details.push({
              contactId: sheetsContact.id,
              crmName: contactName || contactEmail,
              candidateName: newCandidate.name,
              action: 'created',
              reason: 'Created new candidate from Google Sheets',
            });
          } catch (createError: any) {
            result.errors.push(`Failed to create candidate from Google Sheets: ${createError.message}`);
            result.details.push({
              contactId: sheetsContact.id,
              crmName: contactName || contactEmail || 'Unknown',
              candidateName: 'N/A',
              action: 'error',
              reason: `Create failed: ${createError.message}`,
            });
          }
          continue;
        }

        result.matched++;

        // Get field values for comparison (data comparison since Google Sheets doesn't provide timestamps)
        const sheetsPhoneValue = getGoogleSheetsFieldValue(sheetsContact.data, headers, "phone", mappings);
        const sheetsLocationValue = getGoogleSheetsFieldValue(sheetsContact.data, headers, "location", mappings);
        const sheetsSalaryValue = getGoogleSheetsFieldValue(sheetsContact.data, headers, "expectedSalary", mappings);
        const sheetsExpValue = getGoogleSheetsFieldValue(sheetsContact.data, headers, "experienceYears", mappings);
        const sheetsSkillsValue = getGoogleSheetsFieldValue(sheetsContact.data, headers, "skills", mappings);
        const sheetsNameValue = getGoogleSheetsFieldValue(sheetsContact.data, headers, "name", mappings);

        // Compare data to detect changes
        const hasChanges = 
          (sheetsNameValue && sheetsNameValue !== matchingCandidate.name) ||
          (sheetsPhoneValue !== (matchingCandidate.phone || null)) ||
          (sheetsLocationValue !== (matchingCandidate.location || null)) ||
          (sheetsSalaryValue !== (matchingCandidate.expectedSalary?.toString() || null)) ||
          (sheetsExpValue !== (matchingCandidate.experienceYears?.toString() || null)) ||
          (sheetsSkillsValue !== (Array.isArray(matchingCandidate.skills) ? matchingCandidate.skills.join(', ') : null));

        if (!hasChanges) {
          result.skipped++;
          result.details.push({
            contactId: sheetsContact.id,
            crmName: contactName || contactEmail,
            candidateName: matchingCandidate.name,
            action: 'skipped',
            reason: 'No changes detected - data is already in sync',
          });
          continue;
        }

        // In preview mode, show what would be updated
        if (dryRun) {
          result.updated++;
          result.details.push({
            contactId: sheetsContact.id,
            crmName: contactName || contactEmail,
            candidateName: matchingCandidate.name,
            action: 'updated',
            reason: 'Would update candidate from Google Sheets',
          });
          continue;
        }

        // Actually update the candidate
        try {
          const skillsArray = sheetsSkillsValue 
            ? (typeof sheetsSkillsValue === 'string' 
                ? sheetsSkillsValue.split(',').map(s => s.trim()).filter(s => s)
                : Array.isArray(sheetsSkillsValue) ? sheetsSkillsValue : [])
            : null;

          await storage.updateCandidate(matchingCandidate.id, {
            name: sheetsNameValue || matchingCandidate.name,
            phone: sheetsPhoneValue || matchingCandidate.phone,
            location: sheetsLocationValue || matchingCandidate.location,
            expectedSalary: sheetsSalaryValue ? String(parseFloat(sheetsSalaryValue)) : matchingCandidate.expectedSalary,
            experienceYears: sheetsExpValue ? parseInt(sheetsExpValue) : matchingCandidate.experienceYears,
            skills: skillsArray && skillsArray.length > 0 ? skillsArray : matchingCandidate.skills,
            updatedAt: new Date(), // Update timestamp for conflict resolution
          });

          result.updated++;
          result.details.push({
            contactId: sheetsContact.id,
            crmName: contactName || contactEmail,
            candidateName: matchingCandidate.name,
            action: 'updated',
            reason: 'Updated candidate from Google Sheets',
          });
        } catch (updateError: any) {
          result.errors.push(`Failed to update candidate: ${updateError.message}`);
          result.details.push({
            contactId: sheetsContact.id,
            crmName: contactName || contactEmail,
            candidateName: matchingCandidate.name,
            action: 'error',
            reason: `Update failed: ${updateError.message}`,
          });
        }
      } catch (error: any) {
        result.errors.push(`Error processing Google Sheets contact: ${error.message}`);
        result.details.push({
          contactId: sheetsContact.id,
          crmName: 'Unknown',
          candidateName: 'N/A',
          action: 'error',
          reason: error.message,
        });
      }
    }

    result.success = true;
    return result;
  } catch (error: any) {
    result.success = false;
    result.errors.push(`Sync failed: ${error.message}`);
    return result;
  }
}

/**
 * Preview Google Sheets sync (dry run)
 */
export async function previewGoogleSheetsSync(userId?: number): Promise<SyncResult> {
  return await syncGoogleSheetsContacts(true, userId);
}

/**
 * Execute Google Sheets sync
 */
export async function executeGoogleSheetsSync(
  userId?: number,
  selectedContactIds?: string[],
  skipNewCandidates?: boolean
): Promise<SyncResult> {
  return await syncGoogleSheetsContacts(false, userId, selectedContactIds, skipNewCandidates);
}

/**
 * Create new candidates from Google Sheets with specific job assignments
 */
export async function createGoogleSheetsCandidatesWithJobs(
  userId: number,
  assignments: { contactId: string; jobId: number | null }[]
): Promise<SyncResult> {
  const result: SyncResult = {
    success: false,
    totalCRMContacts: 0,
    totalCandidates: 0,
    matched: 0,
    updated: 0,
    created: 0,
    skipped: 0,
    errors: [],
    details: [],
  };

  try {
    // Fetch Google Sheets contacts for the assigned contact IDs
    const sheetsContacts = await fetchGoogleSheetsContacts(1000, userId);
    const contactMap = new Map(sheetsContacts.map(c => [c.id, c]));

    // Get headers from first contact
    const headers = sheetsContacts.length > 0 ? (sheetsContacts[0] as any).headers || [] : [];

    // Get field mappings
    const credentials = await getGoogleSheetsCredentials(userId);
    const mappings = credentials?.fieldMappings;

    // Get all existing candidates to check for duplicates
    const existingCandidates = await storage.getCandidates({});

    for (const assignment of assignments) {
      const sheetsContact = contactMap.get(assignment.contactId);
      if (!sheetsContact) {
        result.skipped++;
        result.details.push({
          contactId: assignment.contactId,
          crmName: 'Unknown',
          candidateName: 'N/A',
          action: 'skipped',
          reason: 'Google Sheets row not found',
        });
        continue;
      }

      try {
        const contactName = getGoogleSheetsFieldValue(sheetsContact.data, headers, "name", mappings) || '';
        const contactEmail = getGoogleSheetsFieldValue(sheetsContact.data, headers, "email", mappings) || '';

        if (!contactEmail) {
          result.skipped++;
          result.details.push({
            contactId: assignment.contactId,
            crmName: contactName || 'Unknown',
            candidateName: 'N/A',
            action: 'skipped',
            reason: 'No email - cannot create candidate',
          });
          continue;
        }

        // Check for duplicate
        const duplicate = existingCandidates.find(
          c => c.email && c.email.toLowerCase() === contactEmail.toLowerCase()
        );

        if (duplicate) {
          result.skipped++;
          result.details.push({
            contactId: assignment.contactId,
            crmName: contactName || contactEmail,
            candidateName: duplicate.name,
            action: 'skipped',
            reason: `Duplicate email - candidate already exists (ID: ${duplicate.id})`,
          });
          continue;
        }

        // Get field values
        const sheetsPhone = getGoogleSheetsFieldValue(sheetsContact.data, headers, "phone", mappings);
        const sheetsLocation = getGoogleSheetsFieldValue(sheetsContact.data, headers, "location", mappings);
        const sheetsSalary = getGoogleSheetsFieldValue(sheetsContact.data, headers, "expectedSalary", mappings);
        const sheetsExp = getGoogleSheetsFieldValue(sheetsContact.data, headers, "experienceYears", mappings);
        const sheetsSkills = getGoogleSheetsFieldValue(sheetsContact.data, headers, "skills", mappings);
        
        const skillsArray = sheetsSkills 
          ? (typeof sheetsSkills === 'string' 
              ? sheetsSkills.split(',').map(s => s.trim()).filter(s => s)
              : Array.isArray(sheetsSkills) ? sheetsSkills : [])
          : [];

        // Create candidate with assigned job
        const newCandidate = await storage.createCandidate({
          name: contactName || contactEmail,
          email: contactEmail,
          phone: sheetsPhone || null,
          location: sheetsLocation || null,
          expectedSalary: sheetsSalary ? String(parseFloat(sheetsSalary)) : null,
          experienceYears: sheetsExp ? (typeof sheetsExp === 'number' ? sheetsExp : parseInt(sheetsExp)) : null,
          skills: skillsArray.length > 0 ? skillsArray : null,
          status: 'new',
          jobId: assignment.jobId,
        });

        result.created++;
        result.details.push({
          contactId: assignment.contactId,
          crmName: contactName || contactEmail,
          candidateName: newCandidate.name,
          action: 'created',
          reason: `Created with job ID: ${assignment.jobId || 'none'}`,
        });
      } catch (error: any) {
        result.errors.push(`Failed to create candidate ${assignment.contactId}: ${error.message}`);
        result.details.push({
          contactId: assignment.contactId,
          crmName: 'Unknown',
          candidateName: 'N/A',
          action: 'error',
          reason: `Create failed: ${error.message}`,
        });
      }
    }

    result.success = true;
    result.totalCRMContacts = assignments.length;
    return result;
  } catch (error: any) {
    result.success = false;
    result.errors.push(`Failed to create candidates: ${error.message}`);
    return result;
  }
}

