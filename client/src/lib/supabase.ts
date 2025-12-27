import { createClient } from '@supabase/supabase-js';

// Extract Supabase URL from window location or use default
// The server should provide the correct URL, but for client-side we use a fallback
// In production, this should be set via environment variable or API endpoint
const getSupabaseUrl = (): string => {
  // Try to get from window config or use the correct project URL
  // Based on your DATABASE_URL, your project is: ubpfvxmzjdspzykfnjzs
  return (window as any).__SUPABASE_URL__ || 'https://ubpfvxmzjdspzykfnjzs.supabase.co';
};

const supabaseUrl = getSupabaseUrl();
// Get API key from Vite environment variable (must be prefixed with VITE_)
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseKey) {
  console.warn('⚠️ VITE_SUPABASE_ANON_KEY is not set. Resume uploads may fail.');
}

export const supabase = createClient(supabaseUrl, supabaseKey || 'placeholder');

export async function uploadResume(file: File, candidateId?: number) {
  const ext = file.name.split('.').pop(); // get file extension (pdf, docx, etc.)
  // Use candidateId if provided, otherwise use timestamp for temporary uploads
  const path = candidateId 
    ? `candidate-${candidateId}.${ext}`
    : `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;

  // Attempt upload directly (skip bucket check to avoid CORS issues)
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('resumes')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (uploadError) {
    // Provide more helpful error messages
    const errorMessage = uploadError.message || '';
    if (errorMessage.includes('new row violates row-level security') || 
        errorMessage.includes('permission denied') ||
        errorMessage.includes('row-level security policy')) {
      throw new Error("Storage bucket permissions issue. Please check that the 'resumes' bucket has public access enabled and the RLS policies are set correctly. See SUPABASE_STORAGE_SETUP.md for instructions.");
    }
    if (errorMessage.includes('Bucket not found') || 
        errorMessage.includes('does not exist')) {
      throw new Error("Storage bucket 'resumes' not found. Please create it in Supabase Storage settings and make it public.");
    }
    if (errorMessage.includes('CORS') || 
        errorMessage.includes('NetworkError')) {
      throw new Error("Network/CORS error. This might be a browser or network issue. Try refreshing the page or check your internet connection.");
    }
    
    throw new Error(`Upload failed: ${errorMessage || 'Unknown error'}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('resumes')
    .getPublicUrl(path);

  if (!urlData?.publicUrl) {
    throw new Error("Failed to generate public URL for uploaded file");
  }

  return urlData.publicUrl;
}
