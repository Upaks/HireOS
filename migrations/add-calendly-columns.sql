-- Add Calendly integration columns to users table
-- Run this migration to add the calendly_token and calendly_webhook_id columns

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS calendly_token TEXT,
ADD COLUMN IF NOT EXISTS calendly_webhook_id TEXT;

-- Verify the columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('calendly_token', 'calendly_webhook_id');

