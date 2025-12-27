# Vercel Deployment Fix

## Problem
Vercel was serving the bundled server code (`dist/index.js`) as static files instead of executing it as a serverless function, causing the source code to be displayed in the browser.

## Solution
1. Created `vercel.json` to configure:
   - Static files served from `dist/public` (frontend build)
   - API routes handled by `/api/index.ts` serverless function
   - SPA routing (all routes serve `index.html`)

2. Created `/api/index.ts` as the Vercel serverless function handler

3. Updated `server/index.ts` to:
   - Export the Express app for Vercel
   - Skip static file serving on Vercel (Vercel handles this)
   - Only start the HTTP server when not on Vercel

4. Fixed `server/vite.ts` to look for static files in `dist/public`

## Next Steps
1. **Commit and push** these changes to your repository
2. **Redeploy on Vercel** - it should automatically detect the new `vercel.json`
3. **Check the deployment** - the app should now work correctly

## How It Works
- **Frontend**: Built by Vite → `dist/public/` → Served by Vercel as static files
- **API Routes**: Handled by `/api/index.ts` → Executes Express app as serverless function
- **SPA Routing**: All non-API routes serve `index.html` for client-side routing

