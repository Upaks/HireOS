-- Migration: Add AI features support
-- Adds OpenRouter API key to users table
-- Adds match score and parsed resume data to candidates table

-- Add OpenRouter API key to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS openrouter_api_key TEXT;

-- Add match score and parsed resume data to candidates table
ALTER TABLE candidates 
ADD COLUMN IF NOT EXISTS match_score INTEGER,
ADD COLUMN IF NOT EXISTS parsed_resume_data JSONB;

-- Add index on match_score for faster sorting
CREATE INDEX IF NOT EXISTS idx_candidates_match_score ON candidates(match_score DESC);

-- Add comment for documentation
COMMENT ON COLUMN users.openrouter_api_key IS 'OpenRouter API key for AI features (resume parsing, candidate matching)';
COMMENT ON COLUMN candidates.match_score IS 'AI-generated match score (0-100) against job requirements';
COMMENT ON COLUMN candidates.parsed_resume_data IS 'Extracted data from resume parsing (education, experience details, etc.)';

