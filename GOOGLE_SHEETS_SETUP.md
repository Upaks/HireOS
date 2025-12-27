# Google Sheets Integration Setup Guide

## Overview
The Google Sheets integration allows you to sync candidate data between HireOS and Google Sheets using OAuth 2.0 authentication.

**IMPORTANT:** This setup is done ONCE by the app administrator. Once configured, all users can connect their own Google accounts without any technical setup.

## For App Administrators (One-Time Setup)

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google Sheets API**:
   - Navigate to "APIs & Services" → "Library"
   - Search for "Google Sheets API"
   - Click "Enable"

### Step 2: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Configure the OAuth consent screen:
   - **User Type: EXTERNAL** ← Choose this! (Your app will be for all users, not just your organization)
   - App name: "HireOS"
   - User support email: Your email
   - Developer contact: Your email
   - Scopes: Add `https://www.googleapis.com/auth/spreadsheets.readonly` and `https://www.googleapis.com/auth/spreadsheets`
   - Save and continue
   
   **Note:** Choose "External" because your app will be used by multiple users from different organizations. "Internal" is only for Google Workspace apps used within a single organization.
4. Create OAuth Client ID:
   - Application type: "Web application"
   - Name: "HireOS Web Client"
   - Authorized JavaScript origins: 
     - `http://localhost:5000` (for local development)
     - Your production URL (e.g., `https://yourapp.com`)
   - Authorized redirect URIs:
     - `http://localhost:5000/api/crm-integrations/google-sheets/callback` (for local development)
     - `https://yourapp.com/api/crm-integrations/google-sheets/callback` (for production)
   - Click "Create"
5. Copy the **Client ID** and **Client Secret**
   
   **Important Notes:**
   - After creating the OAuth client, your app will be in "Testing" mode initially
   - You'll need to add test users in the OAuth consent screen (APIs & Services → OAuth consent screen → Test users)
   - Add yourself and any users who will test the integration
   - Once ready for production, you can submit your app for verification to make it available to all users

### Step 3: Configure Environment Variables

Add these to your `.env` file (app-level, not per-user):

```env
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_REDIRECT_URI=http://localhost:5000/api/crm-integrations/google-sheets/callback
```

For production, update `GOOGLE_REDIRECT_URI` to your production URL.

**That's it!** Once these are set, all users can connect their Google accounts.

## For End Users (Simple - No Technical Setup Required!)

Once the app administrator has configured OAuth (see above), users can connect their Google Sheets:

1. Go to **Settings** → **CRM & ATS Integrations**
2. Find **Google Sheets** card
3. Click **Connect**
4. Click **Sign in with Google** button
5. You'll be redirected to Google's permission screen
6. Review the permissions and click **Allow**
7. You'll be redirected back to HireOS
8. Enter your **Spreadsheet ID**:
   - Open your Google Sheet
   - Copy the ID from the URL: `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`
   - Example: If your URL is `https://docs.google.com/spreadsheets/d/1a2b3c4d5e6f7g8h9i0j/edit`, then `1a2b3c4d5e6f7g8h9i0j` is your Spreadsheet ID
9. (Optional) Enter the **Sheet Name** (defaults to "Sheet1" if left blank)
10. Click **Save Configuration**

**That's it!** No Google Cloud Console knowledge needed. Each user connects their own Google account.

## Step 5: Configure Field Mapping

1. Click **Settings** on the Google Sheets card
2. Go to the **Field Mapping** tab
3. Map HireOS fields to your Google Sheets column headers
4. Click **Save Field Mappings**

## Step 6: Test the Integration

1. Go to **CRM Sync** page
2. Select **Google Sheets** from the dropdown
3. Click **Preview Changes** to see what would sync
4. Click **Execute Sync** to perform the sync

## Troubleshooting

### "Failed to get authorization URL"
- Check that `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set correctly
- Verify the redirect URI matches exactly in Google Cloud Console

### "Invalid redirect URI"
- Make sure the redirect URI in `.env` matches exactly what's configured in Google Cloud Console
- Check for trailing slashes or protocol mismatches (http vs https)

### "Access denied" or "Permission denied"
- Make sure the Google Sheets API is enabled in your GCP project
- Verify the OAuth consent screen is configured
- Check that the scopes are added correctly

### "Spreadsheet not found"
- Verify the Spreadsheet ID is correct
- Make sure the Google account you connected has access to the spreadsheet
- Check that the sheet name (if specified) exists in the spreadsheet

### "No columns found"
- Make sure the first row of your sheet contains headers
- Verify the sheet name is correct (case-sensitive)

## Notes

- The integration uses OAuth 2.0, so you only need to connect once
- Access tokens are automatically refreshed when they expire
- Each user can connect their own Google account
- The integration supports both one-way and two-way sync

