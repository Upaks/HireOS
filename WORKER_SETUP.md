# Moving Background Jobs to a Separate Worker Service

## Why Do This?

Your main app (Vercel) handles user requests. Background jobs (like CRM sync) should run separately to:
- ✅ Avoid Vercel timeout limits (10s free, 60s Pro)
- ✅ Keep your main app fast and responsive
- ✅ Scale workers independently
- ✅ Use free tier services for workers

## Architecture

```
┌─────────────┐         ┌──────────────┐
│   Vercel    │         │   Railway    │
│  (Main App) │         │   (Worker)   │
│             │         │              │
│ - User API  │         │ - CRM Sync   │
│ - Frontend  │         │ - Background  │
│ - Fast!     │         │   Jobs       │
└──────┬──────┘         └──────┬───────┘
       │                       │
       └───────────┬───────────┘
                   │
            ┌──────▼──────┐
            │  Database   │
            │  (Shared)   │
            └─────────────┘
```

Both services connect to the same database. The worker reads/writes directly, no API calls needed.

## Quick Setup (Railway - 5 minutes)

### Step 1: Create Worker Service

I've created a `worker/` folder with everything needed.

### Step 2: Deploy to Railway

1. **Sign up**: Go to [railway.app](https://railway.app) (free $5/month credit)
2. **New Project**: Click "New Project"
3. **Deploy from GitHub**: Connect your GitHub repo
4. **Add Service**: Click "+ New" → "GitHub Repo"
5. **Select Worker**: 
   - Root Directory: Leave blank (deploy from repo root)
   - Build Command: `npm install` (installs from root package.json)
   - Start Command: `npx tsx worker/index.js` (tsx handles TypeScript imports)
6. **Environment Variables**: Add these (same as your main app):
   ```
   DATABASE_URL=your_database_connection_string
   CRM_SYNC_INTERVAL_MS=60000  # Optional: 1 minute
   ```
7. **Deploy**: Railway auto-deploys!

### Step 3: Update Main App

Remove background sync from `server/index.ts` since worker handles it now:

```typescript
// Remove or comment out:
// backgroundSyncService.start(syncInterval);
```

### Step 4: Test

1. Check Railway logs - you should see: "🚀 HireOS Worker Service Starting..."
2. Make a change in Google Sheets
3. Wait 1 minute
4. Check HireOS - changes should appear!

## Alternative: Render (Free Tier)

1. Go to [render.com](https://render.com)
2. New → Background Worker
3. Connect GitHub
4. Settings:
   - Root Directory: Leave blank (deploy from repo root)
   - Build: `npm install` (installs from root package.json)
   - Start: `npx tsx worker/index.js` (tsx handles TypeScript imports)
5. Add environment variables
6. Deploy!

**Free Tier**: 750 hours/month (enough for 24/7)

## How It Works

1. **Worker starts** → Connects to database
2. **Every 1 minute** → Checks for users with two-way sync enabled
3. **Runs sync** → Updates candidates in database
4. **Main app** → Reads updated data (no changes needed!)

## Benefits

- ✅ **No Vercel timeouts**: Worker runs continuously
- ✅ **Free tier available**: Railway/Render/Fly.io all have free options
- ✅ **Independent scaling**: Scale workers separately
- ✅ **Better performance**: Main app stays fast

## Monitoring

- **Railway Dashboard**: View logs, metrics, restarts
- **Console logs**: Worker logs sync results
- **Database**: Check `updatedAt` timestamps on candidates

## Cost

- **Railway**: $5/month credit (usually free for 1 worker)
- **Render**: 750 hrs/month free (enough for 24/7)
- **Fly.io**: 3 shared VMs free

For a single worker, you'll likely stay in free tier!

## Troubleshooting

**Worker not starting?**
- Check environment variables are set
- Verify `DATABASE_URL` is correct
- Check Railway/Render logs

**Sync not working?**
- Verify two-way sync is enabled in Settings
- Check worker logs for errors
- Ensure database connection works

**Want to test locally?**
```bash
# From repo root (not worker folder)
npm install  # Install all dependencies
npx tsx worker/index.js  # Run worker (tsx handles TypeScript)
```

## Next Steps

1. Deploy worker to Railway/Render
2. Remove background sync from main app
3. Test sync works
4. Monitor logs for a few days
5. Adjust sync interval if needed

That's it! Your background jobs now run separately, keeping your main app fast. 🚀

