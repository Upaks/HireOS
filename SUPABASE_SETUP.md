# Supabase Setup Guide for HireOS

**Simple explanation:** This guide helps you connect your HireOS app to a Supabase database (where all your data will be stored). Think of it like connecting your phone to WiFi - you need the right password and settings.

**What you'll do:**
1. Create tables in Supabase (like creating folders to organize your data)
2. Get a connection string (like getting the WiFi password)
3. Create a `.env` file (like saving the WiFi password in your phone)
4. Test that everything works

**Time needed:** About 10-15 minutes

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Fill in:
   - **Name**: HireOS (or your preferred name)
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose closest to you
4. Click "Create new project" and wait for it to provision (~2 minutes)

## Step 2: Get Your Database Connection String

**What is this?** Think of it like an address for your app to find your database. Your app needs to know where your Supabase database is located.

**Why do you need it?** Your HireOS app needs to connect to your Supabase database to save and retrieve data (jobs, candidates, etc.). Without this connection string, your app won't know where to look.

**How to get it (super simple):**

1. In your Supabase dashboard, click **Settings** (gear icon on the left)
2. Click **Database** in the settings menu
3. Scroll down until you see **Connection string** section
4. You'll see three tabs: **Direct Connection**, **Transaction Pooler**, and **Session Pooler**
5. **Click on "Direct Connection" tab** (this is the one you want!)
6. You'll see a long text that starts with `postgresql://postgres:[YOUR-PASSWORD]@...`
7. Click the **Copy** button next to it (or select all and copy)
8. **IMPORTANT:** In the copied text, find `[YOUR-PASSWORD]` and replace it with the actual password you created when you made the Supabase project
9. **ALSO IMPORTANT:** Make sure `?sslmode=require` is at the very end of the string. If it's not there, add it.

**Which connection type should I use?**
- ✅ **Direct Connection** - Use this one! It's the simplest and works perfectly for your app
- ⚠️ **If you get DNS/connection errors**: Try **Transaction Pooler** instead - it sometimes has better IPv4 support
- ❌ Session Pooler - Skip this (for serverless only, you're running a regular server)

**IMPORTANT - If you get "ENOTFOUND" or IPv6 errors:**
- Your network might not support IPv6
- Try using the **Transaction Pooler** connection string instead
- The Transaction Pooler uses a different hostname that may have IPv4 support

**Example of what it should look like:**
```
postgresql://postgres:MyPassword123@db.abcdefgh.supabase.co:5432/postgres?sslmode=require
```

**Save this somewhere safe** - you'll need it in Step 6!

## Step 3: Create Database Tables

1. In Supabase dashboard, go to **SQL Editor**
2. Click **New query**
3. Open the file `supabase-setup.sql` from this project
4. Copy and paste the entire SQL into the SQL Editor
5. Click **Run** (or press Ctrl+Enter)
6. You should see "Success. No rows returned" - this means all tables were created!

## Step 4: Verify Tables Were Created

1. In Supabase dashboard, go to **Table Editor**
2. You should see these tables:
   - `users`
   - `jobs`
   - `job_platforms`
   - `candidates`
   - `interviews`
   - `evaluations`
   - `offers`
   - `activity_logs`
   - `email_logs`
   - `notification_queue`
   - `ghl_tokens`

## Step 5: Get Supabase API Keys (OPTIONAL - for file storage)

**What is this?** These are only needed if you want to upload files (like resumes) to Supabase. You can skip this for now and add it later.

**If you want to set it up:**

1. In Supabase dashboard, click **Settings** → **API**
2. You'll see two things to copy:
   - **Project URL** - looks like `https://xxxxx.supabase.co`
   - **anon public key** - a long string of letters and numbers
3. Save these somewhere - you'll add them to your `.env` file later if needed

**For now, you can skip this step** and just continue to Step 6!

## Step 6: Create Your .env File

**What is this?** A `.env` file is where you store secret information (like passwords and API keys) that your app needs to run. Think of it like a safe where you keep your keys.

**How to create it:**

1. In your `HireOS` folder, create a new file called `.env` (yes, it starts with a dot!)
2. Open the `.env` file in any text editor (Notepad, VS Code, etc.)
3. Copy and paste this into the file:

```
DATABASE_URL=PASTE_YOUR_CONNECTION_STRING_FROM_STEP_2_HERE
SESSION_SECRET=just-any-random-text-here-like-my-secret-key-12345
NODE_ENV=development
```

4. Replace `PASTE_YOUR_CONNECTION_STRING_FROM_STEP_2_HERE` with the connection string you saved from Step 2
5. For `SESSION_SECRET`, just type any random text (like `my-super-secret-key-2024`). It doesn't have to be complicated, just something unique.

**That's it!** You now have the minimum needed to run your app. The other API keys (Supabase, Slack, etc.) are optional and you can add them later if needed.

## Step 7: Test Your Connection

Run the development server:
```bash
npm run dev
```

If everything is set up correctly, the server should start on port 5000 without database errors.

## Troubleshooting

### "DATABASE_URL must be set" error
- Make sure your `.env` file exists in the `HireOS` directory
- Check that `DATABASE_URL` is set correctly
- Restart your terminal/IDE after creating `.env`

### Connection refused errors
- Verify your `DATABASE_URL` has the correct password
- Make sure `?sslmode=require` is at the end of the connection string
- Check that your Supabase project is active (not paused)

### Table already exists errors
- If you see this when running the SQL, the tables already exist - that's fine!
- You can continue to the next step

## Next Steps

Once your database is set up, you can:
1. Create initial users using the `rebuild-users.ts` script
2. Start adding jobs and candidates through the UI
3. Configure additional integrations (Slack, HiPeople, etc.)

