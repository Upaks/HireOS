import { google } from 'googleapis';
import { storage } from "./storage";

const GOOGLE_SHEETS_API_VERSION = 'v4';

/**
 * Google Sheets field mappings interface
 */
export interface GoogleSheetsFieldMappings {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  expectedSalary?: string;
  experienceYears?: string;
  skills?: string;
  status?: string;
  jobTitle?: string;
}

/**
 * Google Sheets credentials interface
 */
export interface GoogleSheetsCredentials {
  accessToken: string;
  refreshToken?: string;
  spreadsheetId: string;
  sheetName?: string; // Optional: specific sheet/tab name, defaults to first sheet
  fieldMappings?: GoogleSheetsFieldMappings;
}

/**
 * Get Google Sheets credentials for a user
 */
export async function getGoogleSheetsCredentials(userId: number): Promise<GoogleSheetsCredentials | null> {
  const integration = await storage.getPlatformIntegration('google-sheets', userId);
  if (!integration || integration.status !== 'connected' || !integration.credentials) {
    return null;
  }
  return integration.credentials as GoogleSheetsCredentials;
}

/**
 * Get authenticated Google Sheets client
 */
async function getSheetsClient(credentials: GoogleSheetsCredentials, userId: number) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  oauth2Client.setCredentials({
    access_token: credentials.accessToken,
    refresh_token: credentials.refreshToken,
  });

  // Refresh token if needed
  try {
    const tokenInfo = await oauth2Client.getAccessToken();
    if (!tokenInfo.token && credentials.refreshToken) {
      const { credentials: newCredentials } = await oauth2Client.refreshAccessToken();
      oauth2Client.setCredentials(newCredentials);
      
      // Note: Token refresh is handled automatically by googleapis library
      // We could update stored credentials here, but it requires userId which we have
      // For now, tokens will be refreshed on next API call if needed
    }
  } catch (error) {
    // Token refresh failed, will try with existing token
  }

  return google.sheets({ version: GOOGLE_SHEETS_API_VERSION, auth: oauth2Client });
}

/**
 * Get field name from mappings or use default
 */
export function getGoogleSheetsFieldName(hireOSField: string, mappings?: GoogleSheetsFieldMappings): string {
  if (!mappings) {
    // Default mappings
    const defaults: Record<string, string> = {
      name: 'Name',
      email: 'Email',
      phone: 'Phone',
      location: 'Location',
      expectedSalary: 'Expected Salary',
      experienceYears: 'Experience Years',
      skills: 'Skills',
      status: 'Status',
      jobTitle: 'Job Title',
    };
    return defaults[hireOSField] || hireOSField;
  }

  return mappings[hireOSField as keyof GoogleSheetsFieldMappings] || hireOSField;
}

/**
 * Get field value from Google Sheets row
 */
export function getGoogleSheetsFieldValue(
  row: any[],
  headers: string[],
  hireOSField: string,
  mappings?: GoogleSheetsFieldMappings
): string | null {
  const fieldName = getGoogleSheetsFieldName(hireOSField, mappings);
  const columnIndex = headers.findIndex(h => h.toLowerCase() === fieldName.toLowerCase());
  
  if (columnIndex === -1 || columnIndex >= row.length) {
    return null;
  }
  
  const value = row[columnIndex];
  return value !== undefined && value !== null && value !== '' ? String(value) : null;
}

/**
 * Fetch all contacts from Google Sheets
 */
export async function fetchGoogleSheetsContacts(
  maxRecords: number = 1000,
  userId?: number
): Promise<Array<{ id: string; rowNumber: number; data: any[] }>> {
  if (!userId) {
    throw new Error('User ID is required');
  }

  const credentials = await getGoogleSheetsCredentials(userId);
  if (!credentials) {
    throw new Error('Google Sheets credentials not found. Please connect your Google Sheets account.');
  }

  try {
    const sheets = await getSheetsClient(credentials, userId);
    const spreadsheetId = credentials.spreadsheetId;
    const sheetName = credentials.sheetName || 'Sheet1'; // Default to first sheet

    // First, get the headers (first row)
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!1:1`, // First row
    });

    const headers = (headerResponse.data.values?.[0] || []) as string[];
    if (headers.length === 0) {
      throw new Error('No headers found in Google Sheets. Please ensure the first row contains column names.');
    }

    // Get all data rows (skip header row)
    const dataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!2:${maxRecords + 1}`, // Start from row 2 (skip header)
    });

    const rows = (dataResponse.data.values || []) as any[][];
    
    // Return rows with their row numbers (2-indexed, since row 1 is headers)
    return rows.map((row, index) => ({
      id: `row_${index + 2}`, // Use row number as ID
      rowNumber: index + 2, // Actual row number in sheet (1-indexed, but row 1 is headers)
      data: row,
      headers, // Include headers for field mapping
    }));
  } catch (error: any) {
    throw new Error(`Google Sheets API Error: ${error.response?.data?.error?.message || error.message}`);
  }
}

/**
 * Get sheet schema (headers/columns)
 */
export async function getGoogleSheetsSchema(userId: number): Promise<{ fields: Array<{ name: string; type: string }> }> {
  const credentials = await getGoogleSheetsCredentials(userId);
  if (!credentials) {
    throw new Error('Google Sheets credentials not found');
  }

  try {
    const sheets = await getSheetsClient(credentials, userId);
    const spreadsheetId = credentials.spreadsheetId;
    const sheetName = credentials.sheetName || 'Sheet1';

    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!1:1`,
    });

    const headers = (headerResponse.data.values?.[0] || []) as string[];
    
    return {
      fields: headers.map(header => ({
        name: header,
        type: 'string', // Google Sheets doesn't have strict types like Airtable
      })),
    };
  } catch (error: any) {
    throw new Error(`Failed to fetch Google Sheets schema: ${error.message}`);
  }
}

/**
 * Create or update a contact in Google Sheets
 */
export async function createOrUpdateGoogleSheetsContact(
  candidate: {
    id: number;
    name: string;
    email: string;
    phone?: string | null;
    location?: string | null;
    expectedSalary?: number | null;
    experienceYears?: number | null;
    skills?: string[] | null;
    status?: string;
    jobTitle?: string;
  },
  userId: number,
  rowNumber?: number // If provided, update existing row; otherwise, append new row
): Promise<void> {
  const credentials = await getGoogleSheetsCredentials(userId);
  if (!credentials) {
    throw new Error('Google Sheets credentials not found');
  }

  const mappings = credentials.fieldMappings;

  try {
    const sheets = await getSheetsClient(credentials, userId);
    const spreadsheetId = credentials.spreadsheetId;
    const sheetName = credentials.sheetName || 'Sheet1';

    // Get headers first
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!1:1`,
    });

    const headers = (headerResponse.data.values?.[0] || []) as string[];

    // Build row data based on mappings
    const rowData: any[] = new Array(headers.length).fill('');
    
    // Map each HireOS field to the correct column
    const fieldMappings: Record<string, (candidate: any) => string> = {
      name: (c) => c.name || '',
      email: (c) => c.email || '',
      phone: (c) => c.phone || '',
      location: (c) => c.location || '',
      expectedSalary: (c) => c.expectedSalary?.toString() || '',
      experienceYears: (c) => c.experienceYears?.toString() || '',
      skills: (c) => (c.skills && Array.isArray(c.skills) ? c.skills.join(', ') : '') || '',
      status: (c) => c.status || '',
      jobTitle: (c) => c.jobTitle || '',
    };

    for (const [hireOSField, getValue] of Object.entries(fieldMappings)) {
      const columnName = getGoogleSheetsFieldName(hireOSField, mappings);
      const columnIndex = headers.findIndex(h => h.toLowerCase() === columnName.toLowerCase());
      
      if (columnIndex !== -1) {
        rowData[columnIndex] = getValue(candidate);
      }
    }

    if (rowNumber) {
      // Update existing row
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!${rowNumber}:${rowNumber}`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [rowData],
        },
      });
    } else {
      // Append new row
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${sheetName}!A:Z`, // Append to end
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: [rowData],
        },
      });
    }
  } catch (error: any) {
    throw new Error(`Failed to create/update Google Sheets contact: ${error.response?.data?.error?.message || error.message}`);
  }
}

/**
 * Find row number by email in Google Sheets
 */
export async function findRowByEmail(
  email: string,
  userId: number
): Promise<number | null> {
  const credentials = await getGoogleSheetsCredentials(userId);
  if (!credentials) {
    return null;
  }

  try {
    const sheets = await getSheetsClient(credentials, userId);
    const spreadsheetId = credentials.spreadsheetId;
    const sheetName = credentials.sheetName || 'Sheet1';
    const mappings = credentials.fieldMappings;

    // Get headers
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!1:1`,
    });

    const headers = (headerResponse.data.values?.[0] || []) as string[];
    const emailColumn = getGoogleSheetsFieldName('email', mappings);
    const emailColumnIndex = headers.findIndex(h => h.toLowerCase() === emailColumn.toLowerCase());

    if (emailColumnIndex === -1) {
      return null; // Email column not found
    }

    // Get all rows
    const dataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!2:1000`, // Start from row 2
    });

    const rows = (dataResponse.data.values || []) as any[][];
    
    // Find row with matching email
    for (let i = 0; i < rows.length; i++) {
      if (rows[i][emailColumnIndex]?.toLowerCase() === email.toLowerCase()) {
        return i + 2; // Return actual row number (1-indexed, row 1 is headers)
      }
    }

    return null;
  } catch (error: any) {
    return null;
  }
}

