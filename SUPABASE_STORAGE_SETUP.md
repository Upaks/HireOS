# Supabase Storage Setup for Resume Uploads

## Problem
You're getting a "NetworkError when attempting to fetch resource" when trying to upload resumes. This is because the Supabase storage bucket doesn't exist or isn't configured properly.

## Solution: Create the Storage Bucket

### Step 1: Go to Supabase Dashboard
1. Open your Supabase project: https://supabase.com/dashboard
2. Select your project
3. Go to **Storage** in the left sidebar

### Step 2: Create the "resumes" Bucket
1. Click **"New bucket"** button
2. Name it: `resumes`
3. **Important Settings:**
   - **Public bucket**: ✅ **Enable this** (check the box)
   - This allows public access to uploaded files via URLs
4. Click **"Create bucket"**

### Step 3: Configure Bucket Policies (REQUIRED for Uploads)
The bucket needs proper policies to allow uploads. Here's how to set them up:

1. Click on the `resumes` bucket
2. Go to **"Policies"** tab
3. You need to create policies for different operations:

   **Policy 1: Allow Public Uploads (INSERT)**
   - Click **"New Policy"**
   - Policy name: `Allow public uploads`
   - Allowed operation: `INSERT`
   - Policy definition:
     ```sql
     (bucket_id = 'resumes')
     ```
   - Click **"Save policy"**

   **Policy 2: Allow Public Reads (SELECT)**
   - Click **"New Policy"** again
   - Policy name: `Allow public reads`
   - Allowed operation: `SELECT`
   - Policy definition:
     ```sql
     (bucket_id = 'resumes')
     ```
   - Click **"Save policy"**

   **Policy 3: Allow Public Updates (UPDATE)**
   - Click **"New Policy"** again
   - Policy name: `Allow public updates`
   - Allowed operation: `UPDATE`
   - Policy definition:
     ```sql
     (bucket_id = 'resumes')
     ```
   - Click **"Save policy"**

   **Alternative: Use SQL Editor (Easier)**
   If the UI is confusing, you can run this SQL in the SQL Editor:
   ```sql
   -- Allow public uploads
   CREATE POLICY "Allow public uploads" ON storage.objects
   FOR INSERT
   TO public
   WITH CHECK (bucket_id = 'resumes');

   -- Allow public reads
   CREATE POLICY "Allow public reads" ON storage.objects
   FOR SELECT
   TO public
   USING (bucket_id = 'resumes');

   -- Allow public updates
   CREATE POLICY "Allow public updates" ON storage.objects
   FOR UPDATE
   TO public
   USING (bucket_id = 'resumes');
   ```

### Step 4: Test the Upload
After creating the bucket, try uploading a resume again through the application form.

## Alternative: Make Upload Optional

If you want to allow applications without resumes (for testing), you can modify the form to make the resume field optional. But it's better to set up the storage bucket properly.

## Troubleshooting

### If you still get errors:
1. **Check browser console** for more detailed error messages
2. **Verify bucket name** matches exactly: `resumes` (lowercase, no spaces)
3. **Check bucket is public**: Go to Storage → resumes → Settings → Make sure "Public bucket" is enabled
4. **Verify Supabase URL and key** in `client/src/lib/supabase.ts` are correct

### Common Issues:
- **Bucket not found**: Make sure the bucket name is exactly `resumes`
- **CORS error**: Make sure the bucket is set to public
- **Permission denied**: Check that the anon key has storage permissions

