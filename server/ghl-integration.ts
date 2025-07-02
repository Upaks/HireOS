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
 * @returns Promise<any> GHL API response
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