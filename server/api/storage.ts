// Configure DNS and TLS BEFORE any imports
import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');

// SECURITY FIX: Only disable TLS validation in development for local testing
if (process.env.NODE_ENV !== 'production' && !process.env.NODE_TLS_REJECT_UNAUTHORIZED) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
} else if (process.env.NODE_ENV === 'production') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1';
}

import { Express } from "express";
import multer from 'multer';
import { createClient } from '@supabase/supabase-js';
import { handleApiError } from "./utils";
import { validateFile } from "../security/file-upload";
import { SecureLogger } from "../security/logger";

// Extract Supabase URL from DATABASE_URL if SUPABASE_URL is not set
function getSupabaseUrl(): string {
  if (process.env.SUPABASE_URL) {
    return process.env.SUPABASE_URL;
  }
  
  // Extract from DATABASE_URL (e.g., db.ubpfvxmzjdspzykfnjzs.supabase.co -> https://ubpfvxmzjdspzykfnjzs.supabase.co)
  // Also handles pooler URLs: aws-1-ap-south-1.pooler.supabase.com -> extract project ref from connection string
  const dbUrl = process.env.DATABASE_URL || '';
  
  // Try to extract project reference from database URL
  // Pattern 1: postgres.PROJECT_REF: (pooler connection) - e.g., postgresql://postgres.ubpfvxmzjdspzykfnjzs:password@...
  let match = dbUrl.match(/postgres\.([^:]+):/);
  if (match) {
    const projectRef = match[1];
    return `https://${projectRef}.supabase.co`;
  }
  
  // Pattern 2: db.PROJECT_REF.supabase.co (direct connection)
  match = dbUrl.match(/db\.([^.]+)\.supabase\.co/);
  if (match) {
    const projectRef = match[1];
    return `https://${projectRef}.supabase.co`;
  }
  
  // Fallback (should not be used)
  console.warn('⚠️  Could not determine Supabase URL from DATABASE_URL. Please set SUPABASE_URL in .env file.');
  return 'https://xrzblucvpnyknupragco.supabase.co';
}

const supabaseUrl = getSupabaseUrl();

// Get Supabase anon key from environment
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
if (!supabaseKey) {
  console.error('❌ SUPABASE_ANON_KEY is not set in .env file!');
}

// Use Supabase client on server (handles DNS/network better than direct axios)
// Note: Will fail with clear error if key is missing (checked in route handler)
const supabase = createClient(supabaseUrl, supabaseKey || 'placeholder-will-fail');

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

export function setupStorageRoutes(app: Express) {
  // Upload resume endpoint (public - no auth required for application form)
  app.post("/api/upload/resume", upload.single('resume'), async (req, res) => {
    try {
      if (!supabaseKey) {
        return res.status(500).json({ 
          message: "Supabase API key not configured. Please set SUPABASE_ANON_KEY in your .env file. See ENV_SETUP.md for instructions." 
        });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file provided" });
      }

      // SECURITY: Validate file before processing
      const validation = await validateFile(req.file, req);
      if (!validation.valid) {
        SecureLogger.warn("File upload rejected", { 
          reason: validation.error, 
          filename: req.file.originalname,
          size: req.file.size,
          ip: req.ip 
        });
        return res.status(400).json({ 
          message: validation.error || "File validation failed" 
        });
      }

      const { candidateId } = req.body;
      const file = req.file;
      const ext = file.originalname.split('.').pop();
      
      // Generate path
      const path = candidateId 
        ? `candidate-${candidateId}.${ext}`
        : `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;

      // Upload to Supabase storage using Supabase client
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(path, file.buffer, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.mimetype,
        });

      if (uploadError) {
        // Provide helpful error messages
        const errorMessage = uploadError.message || '';
        if (errorMessage.includes('new row violates row-level security') || 
            errorMessage.includes('permission denied') ||
            errorMessage.includes('row-level security policy')) {
          return res.status(403).json({ 
            message: "Storage bucket permissions issue. Please check that the 'resumes' bucket has public access enabled and the RLS policies are set correctly. See SUPABASE_STORAGE_SETUP.md for instructions." 
          });
        }
        if (errorMessage.includes('Bucket not found') || 
            errorMessage.includes('does not exist')) {
          return res.status(404).json({ 
            message: "Storage bucket 'resumes' not found. Please create it in Supabase Storage settings and make it public." 
          });
        }
        if (errorMessage.includes('ENOTFOUND') || 
            errorMessage.includes('getaddrinfo') ||
            errorMessage.includes('NetworkError')) {
          return res.status(503).json({ 
            message: "Cannot connect to Supabase storage. The Supabase project may be paused or there's a network issue. Please check: 1) Your Supabase project is active (not paused), 2) Your internet connection, 3) The SUPABASE_URL in your .env file matches your project URL." 
          });
        }
        
        return res.status(500).json({ 
          message: `Upload failed: ${errorMessage || 'Unknown error'}` 
        });
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('resumes')
        .getPublicUrl(path);

      if (!urlData?.publicUrl) {
        return res.status(500).json({ message: "Failed to generate public URL for uploaded file" });
      }

      res.json({
        url: urlData.publicUrl,
        path: path,
      });
    } catch (error) {
      handleApiError(error, res);
    }
  });
}

