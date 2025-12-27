# HireOS Worker Service

This is a separate worker service that handles background jobs for HireOS, keeping your main Vercel app focused on user requests.

## What It Does

- **CRM Sync**: Automatically syncs Google Sheets and Airtable data every X minutes
- **Background Jobs**: Handles any long-running tasks that shouldn't block your main app

## Why Separate?

- **Vercel Limitations**: Vercel has 10-second timeout on free tier, 60s on Pro
- **Server Load**: Keeps your main app fast and responsive
- **Scalability**: Can scale workers independently from your main app
- **Cost**: Free tier options available (Railway, Render)

## Deployment Options

### Option 1: Railway (Recommended - Free Tier Available)

1. Go to [railway.app](https://railway.app)
2. Create new project
3. Connect your GitHub repo
4. Add new service → Select `worker` folder
5. Set environment variables (same as your main app):
   - `DATABASE_URL`
   - `CRM_SYNC_INTERVAL_MS` (optional, default: 60000 = 1 minute)
6. Deploy!

**Railway Free Tier**: $5/month credit (usually enough for a worker)

### Option 2: Render (Free Tier Available)

1. Go to [render.com](https://render.com)
2. New → Background Worker
3. Connect GitHub repo
4. Root Directory: `worker`
5. Build Command: `npm install`
6. Start Command: `npm start`
7. Add environment variables
8. Deploy!

**Render Free Tier**: 750 hours/month (enough for 24/7 worker)

### Option 3: Fly.io (Free Tier Available)

1. Install Fly CLI: `npm i -g @fly/cli`
2. In `worker` folder: `fly launch`
3. Follow prompts
4. Deploy: `fly deploy`

**Fly.io Free Tier**: 3 shared VMs (enough for workers)

## Environment Variables

Copy these from your main app's `.env`:

```env
DATABASE_URL=your_database_url
CRM_SYNC_INTERVAL_MS=60000  # 1 minute (optional)
```

## Local Development

```bash
cd worker
npm install
npm run dev
```

## How It Works

1. Worker connects to the same database as your main app
2. Reads which users have two-way sync enabled
3. Runs sync jobs on schedule
4. Updates database directly (no API calls needed)
5. Main app reads updated data from database

## Monitoring

- Check logs in Railway/Render dashboard
- Worker logs sync results to console
- Errors are logged for debugging

## Cost Comparison

| Service | Free Tier | Paid Tier |
|---------|-----------|-----------|
| Railway | $5/month credit | Pay as you go |
| Render | 750 hrs/month | $7/month |
| Fly.io | 3 shared VMs | $1.94/month per VM |

For a single worker, all free tiers should be sufficient!

