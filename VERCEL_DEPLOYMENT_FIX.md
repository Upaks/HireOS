# Vercel Deployment Issue - Fix Guide

## Problem
Even after pushing changes, Vercel is still using old code for Google Sheets redirects.

## Root Cause
Vercel might be:
1. Caching the old `api/index.js` file
2. Not running the build command correctly
3. Using a cached deployment

## Solution Steps

### Step 1: Force Rebuild on Vercel
1. Go to Vercel Dashboard → Your Project → Deployments
2. Click on the latest deployment
3. Click "Redeploy" → "Use existing Build Cache" = **OFF**
4. This forces a complete rebuild

### Step 2: Verify Build Command
Make sure Vercel is running:
```bash
npm run build:vercel
```

Which runs:
```bash
npm run build && npm run build:api
```

### Step 3: Check Build Logs
In Vercel Dashboard → Deployments → Latest → Build Logs:
- Look for: `📦 Bundling API function with all server code...`
- Look for: `✅ Bundled to api/index.js`
- If you see errors, fix them

### Step 4: Clear Vercel Cache (if needed)
1. Vercel Dashboard → Settings → General
2. Scroll to "Clear Build Cache"
3. Click "Clear Build Cache"
4. Redeploy

### Step 5: Verify Environment Variables
Make sure these are set in Vercel:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI` (should be one of your registered URIs)

## Verification

After redeploying, check:
1. Vercel Function Logs → Look for the redirect URI being used
2. Test Google Sheets connection
3. Should redirect to `/integrations` not `/settings`

## If Still Not Working

1. Check Vercel Function Logs for errors
2. Verify the built file has correct code:
   ```bash
   npm run build:api
   grep "google_sheets_connected" api/index.js
   ```
3. Make sure the file is committed:
   ```bash
   git add api/index.js
   git commit -m "Force update api/index.js"
   git push
   ```
