import axios from "axios";
import { ghlFetch } from "./ghl/ghlApi";
import { getAccessToken } from "./ghl/ghlAuth";
const GHL_API_KEY = process.env.GHL_API_KEY;
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID!;
const GHL_BASE_URL = "https://rest.gohighlevel.com/v1";
const GHL_V2_BASE_URL = "https://services.leadconnectorhq.com";

interface GHLContactData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  location?: string;
  interview?: string | Date;
  score?: number | string;
  communicationSkills?: number | string;
  culturalFit?: number | string;
  expectedSalary?: number | string;
  experienceYears?: number | string;
  finalDecisionStatus?: string;
  hiPeopleAssessmentLink?: string;
  hiPeoplePercentile?: number | string;
  hiPeopleCompletedAt?: string | Date;
  leadershipInitiative?: number | string;
  resumeUrl?: string;
  status?: string;
  technicalProficiency?: number | string;
  problemSolving?: number | string;
  skills: string[];
  tags: string[];
}
const toGhlDate = (input?: string | Date | null): string | undefined => {
  if (!input) return undefined;
  const d = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString().slice(0, 10);
};

/**
 * Creates a contact in GoHighLevel
 * @param contactData Contact information to create in GHL
 * @returns Promise<any> GHL API response with contact ID
 */
export async function createGHLContact(
  contactData: GHLContactData,
): Promise<any> {
  if (!GHL_API_KEY) {
    throw new Error("GHL_API_KEY environment variable is not set");
  }

  // Build customFields array in the new format
  const customFields: any[] = [];
  if (contactData.interview)
    customFields.push({
      id: "P1PnG6PqDqPSOpxI85iN",
      key: "interview_date",
      field_value: toGhlDate(contactData.interview),
    });
  if (contactData.score)
    customFields.push({
      id: "P1fCAXatdJS0Q7KCR1vz",
      key: "score",
      field_value: contactData.score,
    });
  if (contactData.communicationSkills)
    customFields.push({
      id: "i5TsZMwxsL4zf1cpyOX6",
      key: "communication_skills",
      field_value: contactData.communicationSkills,
    });
  // … repeat for all your custom fields

  const payload = {
    locationId: GHL_LOCATION_ID,
    firstName: contactData.firstName,
    lastName: contactData.lastName,
    email: contactData.email,
    phone: contactData.phone || "",
    source: "HireOS",
    tags: contactData.tags,
    customFields, // ✅ array of objects
  };

  try {
    const response = await ghlFetch(`${GHL_V2_BASE_URL}/contacts/upsert`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Version: "2021-07-28",
      },
      body: JSON.stringify(payload),
    });

    const raw = await response.text();
    console.log("📩 Raw GHL response:", raw);

    if (!response.ok) {
      throw new Error(`GHL API Error: ${response.status} ${raw}`);
    }

    console.log("✅ GHL contact created successfully:", { payload });
    return JSON.parse(raw);
  } catch (error: any) {
    console.error("❌ Failed to create GHL contact:", {
      email: contactData.email,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Maps HireOS job title to GHL tag
 * @param jobTitle Job title from HireOS
 * @returns GHL tag for the job role
 */
export function mapJobTitleToGHLTag(jobTitle: string): string {
  const titleLower = jobTitle.toLowerCase();

  if (titleLower.includes("audit") && titleLower.includes("senior")) {
    return "c–role–aud–sr";
  }

  if (titleLower.includes("executive") && titleLower.includes("assistant")) {
    return "c–role–ea";
  }

  // Default tag for unmapped roles
  return "c–role–other";
}

/**
 * Maps HireOS candidate status to GHL tag
 * @param status Candidate status from HireOS
 * @returns GHL tag for the status
 */
export function mapStatusToGHLTag(status: string): string {
  const statusMappings: { [key: string]: string } = {
    new: "00_application_submitted",
    assessment_sent: "15_assessment_sent",
    assessment_completed: "30_assessment_completed",
    interview_scheduled: "45_1st_interview_sent",
    interview_completed: "60_1st_interview_completed",
    second_interview_scheduled: "75_2nd_interview_scheduled",
    second_interview_completed: "90_2nd_interview_completed",
    talent_pool: "95_talent_pool",
    rejected: "99_rejected",
    offer_sent: "85_offer_sent",
    hired: "100_hired",
  };

  return statusMappings[status] || "00_application_submitted";
}

/**
 * Updates a contact in GoHighLevel
 * @param contactId GHL contact ID
 * @param contactData Contact information to update
 * @returns Promise<any> GHL API response
 */

export async function updateGHLContact(
  contactId: string,
  contactData: Partial<GHLContactData>,
): Promise<any> {
  if (!GHL_API_KEY) {
    throw new Error("GHL_API_KEY environment variable is not set");
  }

  // 1) Build customFields first
  const customField: Record<string, string> = {};
  const capitalize = (s: string) =>
    s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s;

  if (contactData.finalDecisionStatus != null) {
    customField["oj1uqAxC9wGGJ7BRzUH3"] = capitalize(
      String(contactData.finalDecisionStatus).trim(),
    );
  }
  const interview = toGhlDate(contactData.interview);
  if (interview) customField["P1PnG6PqDqPSOpxI85iN"] = interview;
  if (contactData.score != null) {
    customField["P1fCAXatdJS0Q7KCR1vz"] = String(contactData.score);
  }
  if (contactData.communicationSkills != null) {
    customField["i5TsZMwxsL4zf1cpyOX6"] = String(
      contactData.communicationSkills,
    );
  }
  if (contactData.culturalFit != null) {
    customField["pmk0Nq5WCDlBX7CJ4cv8"] = String(contactData.culturalFit);
  }
  if (contactData.expectedSalary != null) {
    customField["RcjIIRzPgSf0Jg8z3vtG"] = String(contactData.expectedSalary);
  }
  if (contactData.experienceYears != null) {
    customField["RODD0qGo2oGxNBFgbkBK"] = String(contactData.experienceYears);
  }
  if (contactData.hiPeopleAssessmentLink != null) {
    customField["m7h2tz9JaXUukb2P4DM6"] = contactData.hiPeopleAssessmentLink;
  }
  if (contactData.hiPeoplePercentile != null) {
    customField["n4uIIQoNV9Kb5pCagkym"] = String(
      contactData.hiPeoplePercentile,
    );
  }
  if (contactData.problemSolving != null) {
    customField["fnSdWp8nbofgf6jaHIxA"] = String(contactData.problemSolving);
  }
  if (contactData.leadershipInitiative != null) {
    customField["YNpq6139B2eRhE3Aoexu"] = String(
      contactData.leadershipInitiative,
    );
  }
  if (contactData.technicalProficiency != null) {
    customField["scbqBrtEsihBxWmNpZyw"] = String(
      contactData.technicalProficiency,
    );
  }
  if (contactData.skills != null) {
    customField["xjnAKyMcQF6fTMdl0uPf"] = contactData.skills.join(", ");
  }

  // 2) Build payload via conditional spreads
  const payload = {
    ...(contactData.firstName && { firstName: contactData.firstName }),
    ...(contactData.lastName && { lastName: contactData.lastName }),
    ...(contactData.email && { email: contactData.email }),
    ...(contactData.phone && { phone: contactData.phone }),
    ...(contactData.tags?.length ? { tags: contactData.tags } : {}),
    ...(contactData.location && { location: contactData.location }),
    // Include only when we actually have custom fields to update
    ...(Object.keys(customField).length ? { customField } : {}),
  };

  try {
    const response = await axios.put(
      `${GHL_BASE_URL}/contacts/${contactId}`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${GHL_API_KEY}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      },
    );

    console.log("✅ GHL contact updated successfully:", { payload });
    return response.data;
  } catch (error: any) {
    console.error("❌ Failed to update GHL contact:", {
      contactId,
      error: error.response?.data || error.message,
    });
    throw new Error(
      `GHL API Error: ${error.response?.data?.message || error.message}`,
    );
  }
}

/**
 * Retrieves a contact from GoHighLevel
 * @param contactId GHL contact ID
 * @returns Promise<any> GHL API response
 */
export async function getGHLContact(contactId: string): Promise<any> {
  if (!GHL_API_KEY) {
    throw new Error("GHL_API_KEY environment variable is not set");
  }

  try {
    const response = await axios.get(`${GHL_BASE_URL}/contacts/${contactId}`, {
      headers: {
        Authorization: `Bearer ${GHL_API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    return response.data;
  } catch (error: any) {
    console.error("❌ Failed to get GHL contact:", {
      contactId,
      error: error.response?.data || error.message,
    });

    throw new Error(
      `GHL API Error: ${error.response?.data?.message || error.message}`,
    );
  }
}

/**
 * Parses full name into first and last name
 * @param fullName Full name string
 * @returns Object with firstName and lastName
 */
export function parseFullName(fullName: string): {
  firstName: string;
  lastName: string;
} {
  const nameParts = fullName.trim().split(" ");

  if (nameParts.length === 1) {
    return {
      firstName: nameParts[0],
      lastName: "",
    };
  }

  return {
    firstName: nameParts[0],
    lastName: nameParts.slice(1).join(" "),
  };
}

/**
 * Updates a candidate's details from HireOS to GoHighLevel
 * @param candidate Candidate object from HireOS database
 * @returns Promise<any> GHL API response
 */

export async function updateCandidateInGHL(candidate: any): Promise<any> {
  if (!candidate.ghlContactId) {
    throw new Error("Candidate must have a GHL contact ID to update");
  }

  if (!GHL_API_KEY) {
    throw new Error("GHL_API_KEY environment variable is not set");
  }

  // Parse the full name into first and last name
  const { firstName, lastName } = parseFullName(candidate.name);

  // Extract job title from candidate's job data (JSONB field)
  let jobTitle = "Unknown Role";
  if (candidate.job && typeof candidate.job === "object") {
    jobTitle =
      candidate.job.title || candidate.job.suggestedTitle || "Unknown Role";
  }

  // Generate tags based on job role and status
  const roleTag = mapJobTitleToGHLTag(jobTitle);
  const statusTag = mapStatusToGHLTag(candidate.status);
  const tags = [roleTag, statusTag];

  // Build update payload
  const updateData = {
    firstName,
    lastName,
    phone: candidate.phone || "",
    location: candidate.location || "",
    interview: candidate.lastInterviewDate
      ? new Date(candidate.lastInterviewDate)
      : undefined,
    score: candidate.hiPeopleScore || undefined,
    communicationSkills: candidate.communicationSkills || undefined,
    culturalFit: candidate.culturalFit || undefined,
    expectedSalary: candidate.expectedSalary || undefined,
    experienceYears: candidate.experienceYears || undefined,
    finalDecisionStatus: candidate.finalDecisionStatus || undefined,
    hiPeopleAssessmentLink: candidate.hiPeopleAssessmentLink || undefined,
    hiPeoplePercentile: candidate.hiPeoplePercentile || undefined,
    hiPeopleCompletedAt: candidate.hiPeopleCompletedAt
      ? new Date(candidate.hiPeopleCompletedAt)
      : undefined,
    leadershipInitiative: candidate.leadershipInitiative || undefined,
    resumeUrl: candidate.resumeUrl || undefined,
    status: candidate.status,
    technicalProficiency: candidate.technicalProficiency || undefined,
    skills: candidate.skills || [],
    problemSolving: candidate.problemSolving || undefined,
    tags,
  };

  try {
    const response = await updateGHLContact(candidate.ghlContactId, updateData);

    console.log("✅ Successfully updated candidate in GHL:", {
      updateData,
    });

    return response;
  } catch (error: any) {
    console.error("❌ Failed to update candidate in GHL:", {
      candidateId: candidate.id,
      candidateName: candidate.name,
      ghlContactId: candidate.ghlContactId,
      error: error.message,
    });

    throw error;
  }
}
