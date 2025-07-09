import axios from 'axios';

const GHL_API_KEY = process.env.GHL_API_KEY;
const GHL_BASE_URL = 'https://rest.gohighlevel.com/v1';

interface GHLContactData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  location?: string;
  tags: string[];
}

/**
 * Creates a contact in GoHighLevel
 * @param contactData Contact information to create in GHL
 * @returns Promise<any> GHL API response with contact ID
 */
export async function createGHLContact(contactData: GHLContactData): Promise<any> {
  if (!GHL_API_KEY) {
    throw new Error('GHL_API_KEY environment variable is not set');
  }

  const payload = {
    firstName: contactData.firstName,
    lastName: contactData.lastName,
    email: contactData.email,
    phone: contactData.phone || '',
    location: contactData.location || '',
    source: 'HireOS',
    tags: contactData.tags
  };

  try {
    const response = await axios.post(
      `${GHL_BASE_URL}/contacts/`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${GHL_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ GHL contact created successfully:', {
      contactId: response.data.contact?.id,
      email: contactData.email,
      name: `${contactData.firstName} ${contactData.lastName}`,
      tags: contactData.tags
    });

    return response.data;
  } catch (error: any) {
    console.error('❌ Failed to create GHL contact:', {
      email: contactData.email,
      error: error.response?.data || error.message
    });
    
    // Re-throw the error so the calling code can handle it
    throw new Error(`GHL API Error: ${error.response?.data?.message || error.message}`);
  }
}

/**
 * Maps HireOS job title to GHL tag
 * @param jobTitle Job title from HireOS
 * @returns GHL tag for the job role
 */
export function mapJobTitleToGHLTag(jobTitle: string): string {
  const titleLower = jobTitle.toLowerCase();
  
  if (titleLower.includes('audit') && titleLower.includes('senior')) {
    return 'c–role–aud–sr';
  }
  
  if (titleLower.includes('executive') && titleLower.includes('assistant')) {
    return 'c–role–ea';
  }
  
  // Default tag for unmapped roles
  return 'c–role–other';
}

/**
 * Maps HireOS candidate status to GHL tag
 * @param status Candidate status from HireOS
 * @returns GHL tag for the status
 */
export function mapStatusToGHLTag(status: string): string {
  const statusMappings: { [key: string]: string } = {
    'new': '00_application_submitted',
    'assessment_sent': '15_assessment_sent',
    'assessment_completed': '30_assessment_completed',
    'interview_scheduled': '45_1st_interview_sent',
    'interview_completed': '60_1st_interview_completed',
    'second_interview_scheduled': '75_2nd_interview_scheduled',
    'second_interview_completed': '90_2nd_interview_completed',
    'talent_pool': '95_talent_pool',
    'rejected': '99_rejected',
    'offer_sent': '85_offer_sent',
    'hired': '100_hired'
  };
  
  return statusMappings[status] || '00_application_submitted';
}

/**
 * Updates a contact in GoHighLevel
 * @param contactId GHL contact ID
 * @param contactData Contact information to update
 * @returns Promise<any> GHL API response
 */
export async function updateGHLContact(contactId: string, contactData: Partial<GHLContactData>): Promise<any> {
  if (!GHL_API_KEY) {
    throw new Error('GHL_API_KEY environment variable is not set');
  }

  const payload = {
    ...(contactData.firstName && { firstName: contactData.firstName }),
    ...(contactData.lastName && { lastName: contactData.lastName }),
    ...(contactData.email && { email: contactData.email }),
    ...(contactData.phone && { phone: contactData.phone }),
    ...(contactData.location && { location: contactData.location }),
    ...(contactData.tags && { tags: contactData.tags })
  };

  try {
    const response = await axios.put(
      `${GHL_BASE_URL}/contacts/${contactId}`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${GHL_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ GHL contact updated successfully:', {
      contactId,
      email: contactData.email,
      tags: contactData.tags
    });

    return response.data;
  } catch (error: any) {
    console.error('❌ Failed to update GHL contact:', {
      contactId,
      error: error.response?.data || error.message
    });
    
    throw new Error(`GHL API Error: ${error.response?.data?.message || error.message}`);
  }
}

/**
 * Retrieves a contact from GoHighLevel
 * @param contactId GHL contact ID
 * @returns Promise<any> GHL API response
 */
export async function getGHLContact(contactId: string): Promise<any> {
  if (!GHL_API_KEY) {
    throw new Error('GHL_API_KEY environment variable is not set');
  }

  try {
    const response = await axios.get(
      `${GHL_BASE_URL}/contacts/${contactId}`,
      {
        headers: {
          Authorization: `Bearer ${GHL_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;
  } catch (error: any) {
    console.error('❌ Failed to get GHL contact:', {
      contactId,
      error: error.response?.data || error.message
    });
    
    throw new Error(`GHL API Error: ${error.response?.data?.message || error.message}`);
  }
}

/**
 * Parses full name into first and last name
 * @param fullName Full name string
 * @returns Object with firstName and lastName
 */
export function parseFullName(fullName: string): { firstName: string; lastName: string } {
  const nameParts = fullName.trim().split(' ');
  
  if (nameParts.length === 1) {
    return {
      firstName: nameParts[0],
      lastName: ''
    };
  }
  
  return {
    firstName: nameParts[0],
    lastName: nameParts.slice(1).join(' ')
  };
}

/**
 * Updates a candidate's details from HireOS to GoHighLevel
 * @param candidate Candidate object from HireOS database
 * @returns Promise<any> GHL API response
 */
export async function updateCandidateInGHL(candidate: any): Promise<any> {
  if (!candidate.ghlContactId) {
    throw new Error('Candidate must have a GHL contact ID to update');
  }
  
  if (!GHL_API_KEY) {
    throw new Error('GHL_API_KEY environment variable is not set');
  }

  // Parse the full name into first and last name
  const { firstName, lastName } = parseFullName(candidate.name);
  
  // Extract job title from candidate's job data (JSONB field)
  let jobTitle = 'Unknown Role';
  if (candidate.job && typeof candidate.job === 'object') {
    jobTitle = candidate.job.title || candidate.job.suggestedTitle || 'Unknown Role';
  }
  
  // Generate tags based on job role and status
  const roleTag = mapJobTitleToGHLTag(jobTitle);
  const statusTag = mapStatusToGHLTag(candidate.status);
  const tags = [roleTag, statusTag];
  
  // Build update payload
  const updateData = {
    firstName,
    lastName,
    phone: candidate.phone || '',
    location: candidate.location || '',
    tags
  };

  try {
    const response = await updateGHLContact(candidate.ghlContactId, updateData);
    
    console.log('✅ Successfully updated candidate in GHL:', {
      candidateId: candidate.id,
      candidateName: candidate.name,
      ghlContactId: candidate.ghlContactId,
      status: candidate.status,
      jobTitle,
      tags
    });
    
    return response;
  } catch (error: any) {
    console.error('❌ Failed to update candidate in GHL:', {
      candidateId: candidate.id,
      candidateName: candidate.name,
      ghlContactId: candidate.ghlContactId,
      error: error.message
    });
    
    throw error;
  }
}