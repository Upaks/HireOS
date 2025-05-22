import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xrzblucvpnyknupragco.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhyemJsdWN2cG55a251cHJhZ2NvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM3OTUwMzAsImV4cCI6MjA1OTM3MTAzMH0.sOxPz-AnQzllUJ-nyx525butA--kCOpzmvSIAz2uG4A';

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function uploadResume(file: File, candidateId: number) {
  const ext = file.name.split('.').pop(); // get file extension (pdf, docx, etc.)
  const path = `candidate-${candidateId}.${ext}`;

  const { error } = await supabase.storage
    .from('resumes')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (error) {
    console.error("Supabase upload error:", error);
    throw error;
  }

  const { data } = supabase.storage
    .from('resumes')
    .getPublicUrl(path);

  return data.publicUrl;
}
