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
│   Vercel    │         │  Fly.io /    │
│  (Main App) │         │  Worker      │
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

## Quick Setup (Fly.io - Free Tier) ⭐ RECOMMENDED

### Step 1: Create Worker Service

I've created a `worker/` folder with everything needed.

### Step 2: Deploy to Fly.io

1. **Sign up**: Go to [fly.io](https://fly.io) (free account)
2. **Install CLI**: 
   ```bash
   npm install -g @fly/cli
   # or
   curl -L https://fly.io/install.sh | sh
   ```
3. **Login**: 
   ```bash
   fly auth login
   ```
4. **Initialize** (from your repo root):
   ```bash
   fly launch --no-deploy
   ```
   - When prompted, name your app (e.g., `hireos-worker`)
   - Choose a region close to you
   - Don't deploy yet (we'll configure first)

5. **Create `fly.toml`** (if not auto-generated):
   ```toml
   app = "hireos-worker"
   primary_region = "iad"  # Change to your preferred region
   
   [build]
   
   [env]
     NODE_ENV = "production"
   
   [[services]]
     internal_port = 8080
     protocol = "tcp"
   ```

6. **Set Start Command**: Edit `fly.toml` and add:
   ```toml
   [processes]
     worker = "npx tsx worker/index.js"
   ```

   Or use `fly.toml` with `[build]` section:
   ```toml
   [build]
     builder = "paketobuildpacks/builder:base"
   
   [deploy]
     release_command = "npm install"
   ```

7. **Set Environment Variables**:
   ```bash
   fly secrets set DATABASE_URL="your_database_connection_string"
   fly secrets set CRM_SYNC_INTERVAL_MS="60000"
   # Add any other env vars your worker needs
   ```

8. **Deploy**:
   ```bash
   fly deploy
   ```

9. **Check Logs**:
   ```bash
   fly logs
   ```
   You should see: "🚀 HireOS Worker Service Starting..."

### Step 3: Update Main App

Remove background sync from `server/index.ts` since worker handles it now:

```typescript
// Remove or comment out:
// backgroundSyncService.start(syncInterval);
```

### Step 4: Test

1. Check Fly.io logs (`fly logs`) - you should see: "🚀 HireOS Worker Service Starting..."
2. Make a change in Google Sheets
3. Wait 1 minute
4. Check HireOS - changes should appear!

## Alternative: GitHub Actions (Free for Public Repos)

If your repo is public, GitHub Actions is completely free! For private repos, you get 2000 minutes/month free.

1. Create `.github/workflows/worker.yml`:
   ```yaml
   name: CRM Sync Worker
   
   on:
     schedule:
       - cron: '*/1 * * * *'  # Every minute
     workflow_dispatch:  # Manual trigger
   
   jobs:
     sync:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - uses: actions/setup-node@v3
           with:
             node-version: '18'
         - run: npm install
         - run: npx tsx worker/index.js
           env:
             DATABASE_URL: ${{ secrets.DATABASE_URL }}
             CRM_SYNC_INTERVAL_MS: 60000
   ```

2. Add secrets in GitHub: Settings → Secrets → Actions
3. The workflow runs automatically every minute!

**Note**: GitHub Actions has a 6-hour timeout limit, but for periodic syncs this works great.

## Alternative: Railway (Paid - Trial Ended)

⚠️ **Note**: Railway's free trial has ended. It now requires a paid plan. Use Fly.io or GitHub Actions for free options.

If you still want to use Railway (paid):
1. Go to [railway.app](https://railway.app) and upgrade
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

## Alternative: Render (Paid - $7/month minimum)

⚠️ **Note**: Render's Background Workers require a paid plan (Starter starts at $7/month). The free tier only applies to Web Services, not Background Workers.

If you still want to use Render:
1. Go to [render.com](https://render.com)
2. New → Background Worker
3. Connect GitHub
4. Select "Starter" instance ($7/month - 512 MB RAM, 0.5 CPU)
5. Settings:
   - Root Directory: Leave blank (deploy from repo root)
   - Build: `npm install` (installs from root package.json)
   - Start: `npx tsx worker/index.js` (tsx handles TypeScript imports)
6. Add environment variables
7. Deploy!

## How It Works

1. **Worker starts** → Connects to database
2. **Every 1 minute** → Checks for users with two-way sync enabled
3. **Runs sync** → Updates candidates in database
4. **Main app** → Reads updated data (no changes needed!)

## Benefits

- ✅ **No Vercel timeouts**: Worker runs continuously
- ✅ **Free tier available**: Fly.io, GitHub Actions (public repos), and other free options
- ✅ **Independent scaling**: Scale workers separately
- ✅ **Better performance**: Main app stays fast

## Monitoring

- **Fly.io Dashboard**: `fly dashboard` or visit fly.io web dashboard - View logs, metrics, restarts
- **GitHub Actions**: View runs in Actions tab, see logs for each run
- **Console logs**: Worker logs sync results
- **Database**: Check `updatedAt` timestamps on candidates

## Cost

- **Fly.io** ⭐ **RECOMMENDED**: 3 shared VMs free (enough for 1 worker 24/7)
- **GitHub Actions**: Free for public repos, 2000 min/month for private repos
- **Render**: Background Workers start at $7/month (Starter plan)
- **Railway**: Paid only (trial ended)

**For free tier, use Fly.io or GitHub Actions!**

## Troubleshooting

**Worker not starting?**
- Check environment variables are set (`fly secrets list` for Fly.io)
- Verify `DATABASE_URL` is correct
- Check Fly.io logs (`fly logs`) or GitHub Actions logs

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

1. Deploy worker to Fly.io (free) or GitHub Actions (free for public repos)
2. Remove background sync from main app (`server/index.ts`)
3. Test sync works
4. Monitor logs for a few days
5. Adjust sync interval if needed

That's it! Your background jobs now run separately, keeping your main app fast. 🚀

