import axios from "axios";
import { storage } from "./storage";

const AIRTABLE_API_BASE = "https://api.airtable.com/v0";

interface AirtableContactData {
  Name: string;
  Email: string;
  Phone?: string;
  Location?: string;
  Status?: string;
  "Job Title"?: string;
  "Interview Date"?: string;
  Score?: number;
  "Communication Skills"?: number;
  "Cultural Fit"?: number;
  "Expected Salary"?: string;
  "Experience Years"?: number;
  "Final Decision Status"?: string;
  Skills?: string;
  Tags?: string[];
}

/**
 * Field mapping interface
 */
export interface AirtableFieldMappings {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  expectedSalary?: string;
  experienceYears?: string;
  skills?: string;
  status?: string;
  jobTitle?: string;
  interviewDate?: string;
  score?: string;
  communicationSkills?: string;
  culturalFit?: string;
  finalDecisionStatus?: string;
}

/**
 * Airtable credentials with field mappings
 */
export interface AirtableCredentials {
  apiKey: string;
  baseId: string;
  tableName?: string;
  fieldMappings?: AirtableFieldMappings;
}

/**
 * Default field names (fallback if no mappings)
 */
const DEFAULT_FIELD_NAMES: AirtableFieldMappings = {
  name: "Name",
  email: "Email",
  phone: "Phone",
  location: "Location",
  expectedSalary: "Expected Salary",
  experienceYears: "Experience Years",
  skills: "Skills",
  status: "Status",
  jobTitle: "Job Title",
  interviewDate: "Interview Date",
  score: "Score",
  communicationSkills: "Communication Skills",
  culturalFit: "Cultural Fit",
  finalDecisionStatus: "Final Decision Status",
};

/**
 * Helper function to get Airtable credentials for a user
 */
export async function getAirtableCredentials(userId?: number): Promise<AirtableCredentials | null> {
  if (!userId) {
    return null;
  }

  const integration = await storage.getPlatformIntegration("airtable", userId);
  if (!integration || !integration.credentials) {
    return null;
  }

  const credentials = integration.credentials as any;
  if (!credentials.apiKey || !credentials.baseId) {
    return null;
  }

  return {
    apiKey: credentials.apiKey,
    baseId: credentials.baseId,
    tableName: credentials.tableName || "Candidates",
    fieldMappings: credentials.fieldMappings || {},
  };
}

/**
 * Get the Airtable field name for a HireOS field, using mappings or defaults
 */
function getAirtableFieldName(hireOSField: keyof AirtableFieldMappings, mappings?: AirtableFieldMappings): string {
  if (mappings && mappings[hireOSField]) {
    return mappings[hireOSField]!;
  }
  return DEFAULT_FIELD_NAMES[hireOSField] || hireOSField;
}

/**
 * Get value from Airtable record using field mappings
 */
export function getAirtableFieldValue(record: any, hireOSField: keyof AirtableFieldMappings, mappings?: AirtableFieldMappings): any {
  const fieldName = getAirtableFieldName(hireOSField, mappings);
  const fields = record.fields || {};
  
  // Try exact match first
  if (fields[fieldName] !== undefined) {
    return fields[fieldName];
  }
  
  // Try case-insensitive match
  const lowerFieldName = fieldName.toLowerCase();
  for (const key in fields) {
    if (key.toLowerCase() === lowerFieldName) {
      return fields[key];
    }
  }
  
  return undefined;
}

/**
 * Creates or updates a contact in Airtable
 */
export async function createOrUpdateAirtableContact(
  contactData: AirtableContactData,
  userId?: number,
): Promise<any> {
  const credentials = await getAirtableCredentials(userId);
  if (!credentials) {
    throw new Error("Airtable credentials not found. Please connect your Airtable account in Settings → Integrations.");
  }

  // Airtable table name (use from credentials or default)
  const tableName = credentials.tableName || "Candidates";

  try {
    // Get the email field name from mappings
    const emailFieldName = getAirtableFieldName("email", credentials.fieldMappings);
    // Access email using mapped field name (contactData may have custom field names from mappings)
    const emailValue = (contactData as any)[emailFieldName] || contactData.Email;
    
    if (!emailValue) {
      throw new Error("Email is required to find or create Airtable contact");
    }

    // First, try to find existing record by email using mapped field name
    const searchResponse = await axios.get(
      `${AIRTABLE_API_BASE}/${credentials.baseId}/${tableName}`,
      {
        headers: {
          Authorization: `Bearer ${credentials.apiKey}`,
          "Content-Type": "application/json",
        },
        params: {
          filterByFormula: `{${emailFieldName}} = "${emailValue}"`,
          maxRecords: 1,
        },
      }
    );

    const existingRecords = searchResponse.data.records || [];
    
    if (existingRecords.length > 0) {
      // Update existing record
      const existingRecord = existingRecords[0];
      const recordId = existingRecord.id;

      // LAST MODIFIED WINS: Check if Airtable has more recent changes
      const airtableLastModified = existingRecord.lastModifiedTime 
        ? new Date(existingRecord.lastModifiedTime)
        : existingRecord.createdTime 
          ? new Date(existingRecord.createdTime)
          : null;
      
      // Get HireOS's last modified time (passed in contactData)
      const hireOSLastModified = (contactData as any).updatedAt 
        ? new Date((contactData as any).updatedAt)
        : new Date();

      // If Airtable was modified more recently, skip the update
      if (airtableLastModified && airtableLastModified > hireOSLastModified) {
        return existingRecord; // Return existing record without updating
      }
      
      // Remove undefined/null/empty values before sending
      // Also, if Status field exists, we need to be careful with single select fields
      const cleanContactData: any = {};
      for (const [key, value] of Object.entries(contactData)) {
        if (value !== undefined && value !== null && value !== "") {
          // Special handling for Status - skip if it might cause issues
          // The user's Airtable Status field may not have all our mapped values
          if (key === "Status") {
            // Only include Status if it's a simple string (not a complex value)
            // Airtable will reject if the value doesn't match existing select options
            cleanContactData[key] = value;
          } else {
            cleanContactData[key] = value;
          }
        }
      }
      
      // Try to update, but catch errors related to Status field
      try {
        const updateResponse = await axios.patch(
          `${AIRTABLE_API_BASE}/${credentials.baseId}/${tableName}/${recordId}`,
          {
            fields: cleanContactData,
          },
          {
            headers: {
              Authorization: `Bearer ${credentials.apiKey}`,
              "Content-Type": "application/json",
            },
          }
        );
        return updateResponse.data;
      } catch (updateError: any) {
        // Handle field errors - retry without problematic fields
        if (updateError.response?.status === 422) {
          const errorType = updateError.response?.data?.error?.type;
          const errorMessage = updateError.response?.data?.error?.message || '';
          
          // If it's a field name error, remove that field and retry
          if (errorType === "UNKNOWN_FIELD_NAME") {
            const fieldMatch = errorMessage.match(/Unknown field name: "([^"]+)"/);
            if (fieldMatch && fieldMatch[1]) {
              const unknownField = fieldMatch[1];
              delete cleanContactData[unknownField];
              
              // Retry with remaining fields
              try {
                const retryResponse = await axios.patch(
                  `${AIRTABLE_API_BASE}/${credentials.baseId}/${tableName}/${recordId}`,
                  {
                    fields: cleanContactData,
                  },
                  {
                    headers: {
                      Authorization: `Bearer ${credentials.apiKey}`,
                      "Content-Type": "application/json",
                    },
                  }
                );
                return retryResponse.data;
              } catch (retryError: any) {
                // If still failing, try with only Name and Email
                const minimalData = {
                  Name: contactData.Name,
                  Email: contactData.Email,
                };
                const minimalResponse = await axios.patch(
                  `${AIRTABLE_API_BASE}/${credentials.baseId}/${tableName}/${recordId}`,
                  {
                    fields: minimalData,
                  },
                  {
                    headers: {
                      Authorization: `Bearer ${credentials.apiKey}`,
                      "Content-Type": "application/json",
                    },
                  }
                );
                return minimalResponse.data;
              }
            }
          }
          
          // If it's a Status field error, retry without Status
          if (errorType === "INVALID_MULTIPLE_CHOICE_OPTIONS" && cleanContactData.Status) {
            delete cleanContactData.Status;
            const retryResponse = await axios.patch(
              `${AIRTABLE_API_BASE}/${credentials.baseId}/${tableName}/${recordId}`,
              {
                fields: cleanContactData,
              },
              {
                headers: {
                  Authorization: `Bearer ${credentials.apiKey}`,
                  "Content-Type": "application/json",
                },
              }
            );
            return retryResponse.data;
          }
        }
        throw updateError;
      }
    } else {
      // Create new record
      // Remove undefined values from contactData
      const cleanContactData: any = {};
      for (const [key, value] of Object.entries(contactData)) {
        if (value !== undefined && value !== null && value !== "") {
          cleanContactData[key] = value;
        }
      }
      
      // Try to create, but catch errors related to Status field
      try {
        const createResponse = await axios.post(
          `${AIRTABLE_API_BASE}/${credentials.baseId}/${tableName}`,
          {
            fields: cleanContactData,
          },
          {
            headers: {
              Authorization: `Bearer ${credentials.apiKey}`,
              "Content-Type": "application/json",
            },
          }
        );
        return createResponse.data;
      } catch (createError: any) {
        // Handle field errors - retry without problematic fields
        if (createError.response?.status === 422) {
          const errorType = createError.response?.data?.error?.type;
          const errorMessage = createError.response?.data?.error?.message || '';
          
          // If it's a field name error, remove that field and retry
          if (errorType === "UNKNOWN_FIELD_NAME") {
            const fieldMatch = errorMessage.match(/Unknown field name: "([^"]+)"/);
            if (fieldMatch && fieldMatch[1]) {
              const unknownField = fieldMatch[1];
              delete cleanContactData[unknownField];
              
              // Retry with remaining fields
              try {
                const retryResponse = await axios.post(
                  `${AIRTABLE_API_BASE}/${credentials.baseId}/${tableName}`,
                  {
                    fields: cleanContactData,
                  },
                  {
                    headers: {
                      Authorization: `Bearer ${credentials.apiKey}`,
                      "Content-Type": "application/json",
                    },
                  }
                );
                return retryResponse.data;
              } catch (retryError: any) {
                // If still failing, try with only Name and Email
                const minimalData = {
                  Name: contactData.Name,
                  Email: contactData.Email,
                };
                const minimalResponse = await axios.post(
                  `${AIRTABLE_API_BASE}/${credentials.baseId}/${tableName}`,
                  {
                    fields: minimalData,
                  },
                  {
                    headers: {
                      Authorization: `Bearer ${credentials.apiKey}`,
                      "Content-Type": "application/json",
                    },
                  }
                );
                return minimalResponse.data;
              }
            }
          }
          
          // If it's a Status field error, retry without Status
          if (errorType === "INVALID_MULTIPLE_CHOICE_OPTIONS" && cleanContactData.Status) {
            delete cleanContactData.Status;
            const retryResponse = await axios.post(
              `${AIRTABLE_API_BASE}/${credentials.baseId}/${tableName}`,
              {
                fields: cleanContactData,
              },
              {
                headers: {
                  Authorization: `Bearer ${credentials.apiKey}`,
                  "Content-Type": "application/json",
                },
              }
            );
            return retryResponse.data;
          }
        }
        throw createError;
      }
    }
  } catch (error: any) {
    console.error("Failed to create/update Airtable contact:", error.response?.data || error.message);
    throw new Error(`Airtable API Error: ${error.response?.data?.message || error.message}`);
  }
}

/**
 * Updates a candidate in Airtable from HireOS
 */
export async function updateCandidateInAirtable(
  candidate: any,
  userId?: number,
): Promise<any> {
  if (!candidate.email) {
    throw new Error("Candidate must have an email to sync with Airtable");
  }

  // Parse full name
  const nameParts = candidate.name.trim().split(" ");
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || "";

  // Extract job title
  let jobTitle = "Unknown Role";
  if (candidate.job && typeof candidate.job === "object") {
    jobTitle = candidate.job.title || candidate.job.suggestedTitle || "Unknown Role";
  }

  // Map status - only include if Status field exists and value is valid
  // Note: Airtable single select fields require exact match to existing options
  // We'll use the raw status or a safe default
  const statusMap: { [key: string]: string } = {
    new: "New Application",
    assessment_sent: "Assessment Sent",
    assessment_completed: "Assessment Completed",
    interview_scheduled: "Interview Scheduled",
    interview_completed: "Interview Completed",
    offer_sent: "Offer Sent",
    talent_pool: "Talent Pool",
    rejected: "Rejected",
    hired: "Hired",
  };

  // Get credentials with field mappings
  const credentials = await getAirtableCredentials(userId);
  if (!credentials) {
    throw new Error("Airtable credentials not found. Please connect your Airtable account in Settings → Integrations.");
  }

  const mappings = credentials.fieldMappings || {};

  // Build contact data using field mappings
  const contactData: any = {};
  contactData[getAirtableFieldName("name", mappings)] = candidate.name;
  contactData[getAirtableFieldName("email", mappings)] = candidate.email;
  // Store updatedAt for last modified wins conflict resolution
  contactData.updatedAt = candidate.updatedAt || new Date();

  // Add optional fields only if they have values
  if (candidate.phone) contactData[getAirtableFieldName("phone", mappings)] = candidate.phone;
  if (candidate.location) contactData[getAirtableFieldName("location", mappings)] = candidate.location;
  if (jobTitle && jobTitle !== "Unknown Role") contactData[getAirtableFieldName("jobTitle", mappings)] = jobTitle;
  
  // Only add Status if we have a valid mapped value
  const mappedStatus = statusMap[candidate.status];
  if (mappedStatus) {
    contactData[getAirtableFieldName("status", mappings)] = mappedStatus;
  }
  
  // Add other fields using mappings
  if (candidate.lastInterviewDate) {
    contactData[getAirtableFieldName("interviewDate", mappings)] = new Date(candidate.lastInterviewDate).toISOString().split("T")[0];
  }
  if (candidate.hiPeopleScore) contactData[getAirtableFieldName("score", mappings)] = candidate.hiPeopleScore;
  if (candidate.communicationSkills) contactData[getAirtableFieldName("communicationSkills", mappings)] = candidate.communicationSkills;
  if (candidate.culturalFit) contactData[getAirtableFieldName("culturalFit", mappings)] = candidate.culturalFit;
  if (candidate.expectedSalary) contactData[getAirtableFieldName("expectedSalary", mappings)] = candidate.expectedSalary;
  if (candidate.experienceYears) contactData[getAirtableFieldName("experienceYears", mappings)] = candidate.experienceYears;
  if (candidate.finalDecisionStatus) contactData[getAirtableFieldName("finalDecisionStatus", mappings)] = candidate.finalDecisionStatus;
  if (candidate.skills) {
    const skillsValue = Array.isArray(candidate.skills) 
      ? candidate.skills.join(", ") 
      : candidate.skills;
    contactData[getAirtableFieldName("skills", mappings)] = skillsValue;
  }

  try {
    const response = await createOrUpdateAirtableContact(contactData, userId);
    return response;
  } catch (error: any) {
    throw error;
  }
}

/**
 * Fetches contacts from Airtable
 */
export async function fetchAirtableContacts(
  limit: number = 100,
  userId?: number,
): Promise<any[]> {
  const credentials = await getAirtableCredentials(userId);
  if (!credentials) {
    throw new Error("Airtable credentials not found. Please connect your Airtable account in Settings → Integrations.");
  }

  const tableName = "Candidates";
  const allRecords: any[] = [];
  let offset: string | undefined = undefined;

  try {
    do {
      const params: any = {
        maxRecords: Math.min(limit - allRecords.length, 100), // Airtable max is 100 per request
      };
      if (offset) {
        params.offset = offset;
      }

      const response = await axios.get(
        `${AIRTABLE_API_BASE}/${credentials.baseId}/${tableName}`,
        {
          headers: {
            Authorization: `Bearer ${credentials.apiKey}`,
            "Content-Type": "application/json",
          },
          params,
        }
      );

      const records = response.data.records || [];
      allRecords.push(...records);

      offset = response.data.offset;
    } while (offset && allRecords.length < limit);

    return allRecords;
  } catch (error: any) {
    throw new Error(`Airtable API Error: ${error.response?.data?.message || error.message}`);
  }
}

