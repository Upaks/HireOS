# GHL Sync Setup Guide

## What's Already Set Up ✅

1. **Database Schema**
   - `candidates.ghl_contact_id` column exists (stores GHL contact ID for each candidate)
   - `ghl_tokens` table schema defined (stores OAuth tokens for GHL API)

2. **Backend Code**
   - GHL integration functions (`server/ghl-integration.ts`)
   - GHL sync functions (`server/ghl-sync.ts`)
   - GHL API wrapper (`server/ghl/ghlApi.ts`)
   - GHL OAuth token management (`server/ghl/ghlAuth.ts`)
   - API routes (`server/api/ghl-sync.ts` and `server/api/ghl-automation.ts`)

3. **Frontend Code**
   - GHL Sync page (`client/src/pages/GHLSyncPage.tsx`)
   - Route configured (`/ghl-sync`)
   - Sidebar navigation link (visible to COO, CEO, Director, Admin)

4. **Auto-Sync Features**
   - When candidates are created, they're automatically synced to GHL
   - When candidates are updated, they're automatically synced to GHL

---

## What You Need to Complete Setup

### Step 1: Create the `ghl_tokens` Table in Supabase

Run this SQL in your Supabase SQL Editor:

```sql
CREATE TABLE IF NOT EXISTS "ghl_tokens" (
  "token_id" serial PRIMARY KEY NOT NULL,
  "access_token" text NOT NULL,
  "refresh_token" text NOT NULL,
  "user_type" text,
  "company_id" text,
  "updated_at" timestamp DEFAULT now(),
  "expires_at" timestamp
);
```

### Step 2: Get Your GoHighLevel API Credentials

You need **4 pieces of information** from GoHighLevel:

1. **API Key** (Legacy method - simpler but less secure)
   - Go to: Settings → API → API Keys
   - Create a new API key or use an existing one
   - Copy the key (looks like: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

2. **Location ID**
   - Go to: Settings → Locations
   - Click on your location
   - Copy the Location ID from the URL or settings page
   - (Looks like: `X3noT1jMa6uCuHhrnTpe`)

3. **Client ID** (For OAuth - more secure, recommended)
   - Go to: Settings → Integrations → API
   - Create a new OAuth app or use existing
   - Copy the Client ID

4. **Client Secret** (For OAuth)
   - From the same OAuth app page
   - Copy the Client Secret

### Step 3: Set Environment Variables

Add these to your `.env` file in the `HireOS` directory:

```env
# GoHighLevel API Configuration
GHL_API_KEY=your_api_key_here
GHL_LOCATION_ID=your_location_id_here

# GoHighLevel OAuth (Optional - for token refresh)
GHL_CLIENT_ID=your_client_id_here
GHL_CLIENT_SECRET=your_client_secret_here
```

**Note:** 
- If you only have an API Key, you can skip `GHL_CLIENT_ID` and `GHL_CLIENT_SECRET` for now
- The OAuth credentials are needed for automatic token refresh (more secure long-term)

### Step 4: Initialize GHL Tokens (If Using OAuth)

If you're using OAuth (recommended), you need to seed the initial tokens in the database.

**Option A: Using API Key Only (Simpler)**
- Skip this step if you're only using `GHL_API_KEY`
- The code will use the API key directly

**Option B: Using OAuth (More Secure)**
1. You'll need to complete the OAuth flow to get initial `access_token` and `refresh_token`
2. Insert them into the `ghl_tokens` table:

```sql
INSERT INTO ghl_tokens (access_token, refresh_token, user_type, expires_at)
VALUES (
  'your_initial_access_token',
  'your_initial_refresh_token',
  'Location',
  NOW() + INTERVAL '1 hour'  -- Adjust based on token expiry
);
```

**How to get OAuth tokens:**
- Use GoHighLevel's OAuth authorization flow
- Or use their API to generate tokens with your Client ID/Secret
- The tokens will be automatically refreshed by the app

### Step 5: Test the Setup

1. **Restart your server** to load the new environment variables
2. **Navigate to** `/ghl-sync` in your app (as COO, CEO, Director, or Admin)
3. **Click "Preview Changes"** to test the connection
   - This will fetch contacts from GHL and match them with your candidates
   - It won't make any changes (dry run)
4. **Review the results** to see:
   - How many GHL contacts were found
   - How many candidates were matched
   - What would be updated
5. **Click "Execute Sync"** to actually link the candidates with GHL contacts

---

## How It Works

### Manual Sync (via UI)
1. Go to `/ghl-sync` page
2. Click "Preview Changes" → Shows what will be synced
3. Click "Execute Sync" → Actually links candidates to GHL contacts

### Automatic Sync
- **When a candidate is created:** Automatically creates a contact in GHL
- **When a candidate is updated:** Automatically updates the GHL contact
- **Matching:** Uses candidate name to match with GHL contacts

### What Gets Synced
- Candidate name → GHL contact name
- Email, phone, location
- Status → GHL tags
- Job title → GHL role tags
- Interview dates, scores, assessment links
- Skills and experience

---

## Troubleshooting

### Error: "GHL_API_KEY environment variable is not set"
- Make sure you added `GHL_API_KEY` to your `.env` file
- Restart your server after adding it

### Error: "No GHL tokens found in DB"
- If using OAuth, you need to seed initial tokens (Step 4)
- If using API key only, make sure `GHL_API_KEY` is set

### Error: "Refresh token invalid"
- Your OAuth refresh token expired
- Re-run the OAuth flow to get new tokens
- Update the `ghl_tokens` table

### No matches found during sync
- Check that candidate names in HireOS match contact names in GHL
- The matching is case-insensitive but must match exactly
- Example: "John Doe" in HireOS will match "john doe" or "John Doe" in GHL

### API Rate Limits
- GoHighLevel has rate limits
- The code includes automatic retry with backoff for 429 errors
- If you hit limits frequently, reduce sync frequency

---

## Next Steps

Once setup is complete:
1. Test with a few candidates first
2. Monitor the sync results
3. Adjust matching logic if needed (currently matches by name only)
4. Consider adding email matching as a fallback (future enhancement)

---

## Security Notes

- **Never commit** your `.env` file to git
- **API Keys** are simpler but less secure (single key, no expiration)
- **OAuth** is more secure (tokens expire, can be refreshed)
- Consider using OAuth for production environments

