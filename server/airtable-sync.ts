import { storage } from "./storage";
import { fetchAirtableContacts, getAirtableCredentials, getAirtableFieldValue, type AirtableFieldMappings } from "./airtable-integration";

interface SyncResult {
  success: boolean;
  totalCRMContacts: number;
  totalCandidates: number;
  matched: number;
  updated: number;
  created: number; // New candidates created from Airtable
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
 * Syncs Airtable contacts with candidates table
 */
export async function syncAirtableContacts(
  dryRun: boolean = false,
  userId?: number,
  selectedContactIds?: string[], // Optional: only create these contact IDs (undefined = create all, [] = create none)
  skipNewCandidates?: boolean, // If true, skip creating new candidates (only update existing)
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
    // Fetch Airtable contacts
    const airtableContacts = await fetchAirtableContacts(300, userId);
    result.totalCRMContacts = airtableContacts.length;

    // Fetch all candidates
    const candidates = await storage.getCandidates({});
    result.totalCandidates = candidates.length;

    // Get field mappings
    const credentials = await getAirtableCredentials(userId);
    const mappings = credentials?.fieldMappings;

    // Process each Airtable contact
    for (const airtableContact of airtableContacts) {
      try {
        // Get name and email from Airtable record using field mappings
        const contactName = getAirtableFieldValue(airtableContact, "name", mappings) || '';
        const contactEmail = getAirtableFieldValue(airtableContact, "email", mappings) || '';
        

        // Skip contacts without names or emails
        if (!contactName && !contactEmail) {
          result.skipped++;
          result.details.push({
            contactId: airtableContact.id,
            crmName: contactName || 'No name',
            candidateName: 'N/A',
            action: 'skipped',
            reason: 'No name or email in Airtable contact',
          });
          continue;
        }

        // Try to find matching candidate by email first (most reliable)
        let matchingCandidate = null;
        if (contactEmail) {
          matchingCandidate = candidates.find(
            candidate => candidate.email.toLowerCase() === contactEmail.toLowerCase()
          );
        }

        // If no email match, try matching by name
        if (!matchingCandidate && contactName) {
          const normalizedAirtableName = normalizeName(contactName);
          matchingCandidate = candidates.find(candidate => 
            normalizeName(candidate.name) === normalizedAirtableName
          );
        }

        if (!matchingCandidate) {
          // If skipNewCandidates is true, skip all new candidates (they'll be handled separately)
          if (skipNewCandidates) {
            result.skipped++;
            result.details.push({
              contactId: airtableContact.id,
              crmName: contactName || contactEmail || 'Unknown',
              candidateName: 'N/A',
              action: 'skipped',
              reason: 'New candidate - will be processed separately with job assignment',
            });
            continue;
          }

          // New candidate from Airtable - only create if email exists (required field)
          if (!contactEmail) {
            result.skipped++;
            result.details.push({
              contactId: airtableContact.id,
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
              contactId: airtableContact.id,
              crmName: contactName || contactEmail,
              candidateName: contactName || 'New Candidate',
              action: 'created',
              reason: 'Would create new candidate from Airtable',
            });
            continue;
          }

          // In execute mode: only create if selected
          // If selectedContactIds is provided (even if empty array), only create selected ones
          // If undefined, create all (backward compatibility for non-Airtable syncs)
          if (selectedContactIds !== undefined) {
            if (!selectedContactIds.includes(airtableContact.id)) {
              result.skipped++;
              result.details.push({
                contactId: airtableContact.id,
                crmName: contactName || contactEmail,
                candidateName: 'N/A',
                action: 'skipped',
                reason: 'Not selected for import',
              });
              continue;
            }
          }

          // Actually create the candidate from Airtable
          try {
            // Check for duplicate by email first
            const existingCandidates = await storage.getCandidates({});
            const duplicateCandidate = existingCandidates.find(
              c => c.email && c.email.toLowerCase() === contactEmail.toLowerCase()
            );

            if (duplicateCandidate) {
              result.skipped++;
              result.details.push({
                contactId: airtableContact.id,
                crmName: contactName || contactEmail,
                candidateName: duplicateCandidate.name,
                action: 'skipped',
                reason: `Duplicate email - candidate already exists (ID: ${duplicateCandidate.id})`,
              });
              continue;
            }

            // Get all field values from Airtable using mappings
            const airtablePhone = getAirtableFieldValue(airtableContact, "phone", mappings);
            const airtableLocation = getAirtableFieldValue(airtableContact, "location", mappings);
            const airtableSalary = getAirtableFieldValue(airtableContact, "expectedSalary", mappings);
            const airtableExp = getAirtableFieldValue(airtableContact, "experienceYears", mappings);
            const airtableSkills = getAirtableFieldValue(airtableContact, "skills", mappings);
            
            // Convert skills to array if needed
            const skillsArray = airtableSkills 
              ? (typeof airtableSkills === 'string' 
                  ? airtableSkills.split(',').map(s => s.trim()).filter(s => s)
                  : Array.isArray(airtableSkills) ? airtableSkills : [])
              : [];

            // Get first active job to assign (if available)
            const jobs = await storage.getJobs('active');
            const defaultJobId = jobs.length > 0 ? jobs[0].id : null;

            // Create new candidate from Airtable data
            const newCandidate = await storage.createCandidate({
              name: contactName || contactEmail,
              email: contactEmail,
              phone: airtablePhone || null,
              location: airtableLocation || null,
              expectedSalary: airtableSalary || null,
              experienceYears: airtableExp ? (typeof airtableExp === 'number' ? airtableExp : parseInt(airtableExp)) : null,
              skills: skillsArray.length > 0 ? skillsArray : null,
              status: 'new', // Default status for new candidates
              jobId: defaultJobId, // Assign to first active job if available
            });

            result.created++;
            result.details.push({
              contactId: airtableContact.id,
              crmName: contactName || contactEmail,
              candidateName: newCandidate.name,
              action: 'created',
              reason: 'Created new candidate from Airtable',
            });

          } catch (createError: any) {
            result.errors.push(`Failed to create candidate from Airtable: ${createError.message}`);
            result.details.push({
              contactId: airtableContact.id,
              crmName: contactName || contactEmail || 'Unknown',
              candidateName: 'N/A',
              action: 'error',
              reason: `Create failed: ${createError.message}`,
            });
          }
          continue;
        }

        result.matched++;

        // NOTE: Airtable API doesn't provide lastModifiedTime in the response
        // We can only get createdTime, which is not useful for conflict resolution
        // Instead, we'll check for actual data differences and update if different
        // For true "last modified wins", we'd need to store sync timestamps ourselves
        
        // Get field values for comparison
        const airtablePhoneValue = getAirtableFieldValue(airtableContact, "phone", mappings);
        const airtableLocationValue = getAirtableFieldValue(airtableContact, "location", mappings);
        const airtableSalaryValue = getAirtableFieldValue(airtableContact, "expectedSalary", mappings);
        const airtableExpValue = getAirtableFieldValue(airtableContact, "experienceYears", mappings);
        const airtableSkillsValue = getAirtableFieldValue(airtableContact, "skills", mappings);
        
        // Normalize skills for comparison
        const normalizedAirtableSkills = airtableSkillsValue 
          ? (typeof airtableSkillsValue === 'string' 
              ? airtableSkillsValue.split(',').map(s => s.trim()).filter(s => s).sort().join(',')
              : Array.isArray(airtableSkillsValue) ? airtableSkillsValue.sort().join(',') : '')
          : '';
        const normalizedCandidateSkills = matchingCandidate.skills
          ? (Array.isArray(matchingCandidate.skills) 
              ? matchingCandidate.skills.sort().join(',')
              : String(matchingCandidate.skills))
          : '';

        // Check if data has actually changed
        const hasChanges = 
          normalizeName(contactName) !== normalizeName(matchingCandidate.name) ||
          contactEmail.toLowerCase() !== matchingCandidate.email.toLowerCase() ||
          (airtablePhoneValue && airtablePhoneValue !== matchingCandidate.phone) ||
          (airtableLocationValue && airtableLocationValue !== matchingCandidate.location) ||
          (airtableSalaryValue && airtableSalaryValue !== matchingCandidate.expectedSalary) ||
          (airtableExpValue !== undefined && airtableExpValue !== null && 
            (typeof airtableExpValue === 'number' ? airtableExpValue : parseInt(airtableExpValue)) !== matchingCandidate.experienceYears) ||
          normalizedAirtableSkills !== normalizedCandidateSkills;

        // If no changes detected, skip update
        if (!hasChanges) {
          result.skipped++;
          result.details.push({
            contactId: airtableContact.id,
            crmName: contactName || contactEmail || 'Unknown',
            candidateName: matchingCandidate.name,
            action: 'skipped',
            reason: 'No changes detected - data is already in sync',
          });
          continue;
        }

        // For two-way sync: Update candidate data from Airtable using field mappings
        const updateData: any = {};
        
        // Update name if different (normalize for comparison)
        if (contactName && normalizeName(contactName) !== normalizeName(matchingCandidate.name)) {
          updateData.name = contactName.trim();
        }
        
        // Update email if different (but be careful - email is used for matching!)
        if (contactEmail && contactEmail.toLowerCase() !== matchingCandidate.email.toLowerCase()) {
          updateData.email = contactEmail.trim();
        }
        
        // Update phone if different (reuse values from earlier comparison)
        if (airtablePhoneValue && airtablePhoneValue !== matchingCandidate.phone) {
          updateData.phone = airtablePhoneValue;
        }
        
        // Update location if different
        if (airtableLocationValue && airtableLocationValue !== matchingCandidate.location) {
          updateData.location = airtableLocationValue;
        }
        
        // Update expected salary if different
        if (airtableSalaryValue && airtableSalaryValue !== matchingCandidate.expectedSalary) {
          updateData.expectedSalary = airtableSalaryValue;
        }
        
        // Update experience years if different
        if (airtableExpValue !== undefined && airtableExpValue !== null && 
            (typeof airtableExpValue === 'number' ? airtableExpValue : parseInt(airtableExpValue)) !== matchingCandidate.experienceYears) {
          updateData.experienceYears = typeof airtableExpValue === 'number' ? airtableExpValue : parseInt(airtableExpValue);
        }
        
        // Update skills if different
        if (airtableSkillsValue) {
          const skillsArray = typeof airtableSkillsValue === 'string' 
            ? airtableSkillsValue.split(',').map(s => s.trim()).filter(s => s)
            : Array.isArray(airtableSkillsValue) ? airtableSkillsValue : [];
          
          const currentSkills = Array.isArray(matchingCandidate.skills) 
            ? matchingCandidate.skills 
            : matchingCandidate.skills 
              ? [matchingCandidate.skills] 
              : [];
          
          // Only update if different
          if (JSON.stringify(skillsArray.sort()) !== JSON.stringify(currentSkills.sort())) {
            updateData.skills = skillsArray;
          }
        }

        // Only update if there are changes
        if (!dryRun && Object.keys(updateData).length > 0) {
          try {
            await storage.updateCandidate(matchingCandidate.id, updateData);
          } catch (updateError: any) {
            result.errors.push(`Failed to update candidate ${matchingCandidate.name}: ${updateError.message}`);
            result.details.push({
              contactId: airtableContact.id,
              crmName: contactName || contactEmail || 'Unknown',
              candidateName: matchingCandidate.name,
              action: 'error',
              reason: `Update failed: ${updateError.message}`,
            });
            continue;
          }
        }

        // Only count as updated if there were actual changes
        if (Object.keys(updateData).length > 0) {
          result.updated++;
        } else {
          result.skipped++;
        }
        
        result.details.push({
          contactId: airtableContact.id,
          crmName: contactName || contactEmail || 'Unknown',
          candidateName: matchingCandidate.name,
          action: Object.keys(updateData).length > 0 ? 'updated' : 'skipped',
          reason: dryRun 
            ? `Would update: ${Object.keys(updateData).length > 0 ? Object.keys(updateData).join(', ') : 'no changes'}` 
            : Object.keys(updateData).length > 0 
              ? `Updated: ${Object.keys(updateData).join(', ')}` 
              : 'No changes needed',
        });
      } catch (error: any) {
        result.errors.push(`Error processing Airtable contact ${airtableContact.id}: ${error.message}`);
        result.details.push({
          contactId: airtableContact.id,
          crmName: 'Unknown',
          candidateName: 'N/A',
          action: 'error',
          reason: error.message,
        });
        console.error(`❌ Error processing Airtable contact ${airtableContact.id}:`, error.message);
      }
    }

    result.success = true;

  } catch (error: any) {
    result.success = false;
    result.errors.push(`Sync failed: ${error.message}`);
    console.error('Airtable sync failed:', error.message);
  }

  return result;
}

/**
 * Preview Airtable sync (dry run)
 */
export async function previewAirtableSync(userId?: number): Promise<SyncResult> {
  return await syncAirtableContacts(true, userId);
}

/**
 * Execute Airtable sync
 */
export async function executeAirtableSync(userId?: number, selectedContactIds?: string[], skipNewCandidates?: boolean): Promise<SyncResult> {
  return await syncAirtableContacts(false, userId, selectedContactIds, skipNewCandidates);
}

/**
 * Create new candidates from Airtable with specific job assignments
 */
export async function createAirtableCandidatesWithJobs(
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
    // Fetch Airtable contacts for the assigned contact IDs
    const airtableContacts = await fetchAirtableContacts(300, userId);
    const contactMap = new Map(airtableContacts.map(c => [c.id, c]));

    // Get field mappings
    const credentials = await getAirtableCredentials(userId);
    const mappings = credentials?.fieldMappings;

    // Get all existing candidates to check for duplicates
    const existingCandidates = await storage.getCandidates({});

    for (const assignment of assignments) {
      const airtableContact = contactMap.get(assignment.contactId);
      if (!airtableContact) {
        result.skipped++;
        result.details.push({
          contactId: assignment.contactId,
          crmName: 'Unknown',
          candidateName: 'N/A',
          action: 'skipped',
          reason: 'Airtable contact not found',
        });
        continue;
      }

      try {
        const contactName = getAirtableFieldValue(airtableContact, "name", mappings) || '';
        const contactEmail = getAirtableFieldValue(airtableContact, "email", mappings) || '';

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
        const airtablePhone = getAirtableFieldValue(airtableContact, "phone", mappings);
        const airtableLocation = getAirtableFieldValue(airtableContact, "location", mappings);
        const airtableSalary = getAirtableFieldValue(airtableContact, "expectedSalary", mappings);
        const airtableExp = getAirtableFieldValue(airtableContact, "experienceYears", mappings);
        const airtableSkills = getAirtableFieldValue(airtableContact, "skills", mappings);
        
        const skillsArray = airtableSkills 
          ? (typeof airtableSkills === 'string' 
              ? airtableSkills.split(',').map(s => s.trim()).filter(s => s)
              : Array.isArray(airtableSkills) ? airtableSkills : [])
          : [];

        // Create candidate with assigned job
        const newCandidate = await storage.createCandidate({
          name: contactName || contactEmail,
          email: contactEmail,
          phone: airtablePhone || null,
          location: airtableLocation || null,
          expectedSalary: airtableSalary || null,
          experienceYears: airtableExp ? (typeof airtableExp === 'number' ? airtableExp : parseInt(airtableExp)) : null,
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

        console.log(`✅ Created candidate "${newCandidate.name}" with job ID ${assignment.jobId || 'none'}`);
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

