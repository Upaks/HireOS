-- Add Slack integration columns to users table
-- Run this migration in your Supabase SQL editor

ALTER TABLE users
ADD COLUMN IF NOT EXISTS slack_webhook_url TEXT,
ADD COLUMN IF NOT EXISTS slack_notification_scope TEXT,
ADD COLUMN IF NOT EXISTS slack_notification_roles JSONB,
ADD COLUMN IF NOT EXISTS slack_notification_events JSONB;

-- Add comment for documentation
COMMENT ON COLUMN users.slack_webhook_url IS 'User''s Slack webhook URL for notifications';
COMMENT ON COLUMN users.slack_notification_scope IS 'Notification scope: "all_users" or "specific_roles"';
COMMENT ON COLUMN users.slack_notification_roles IS 'Array of role names to notify if scope is "specific_roles"';
COMMENT ON COLUMN users.slack_notification_events IS 'Array of event types to notify about: ["interview_scheduled", "offer_accepted", "offer_sent", "job_posted", "new_application"]';

