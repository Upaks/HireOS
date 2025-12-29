-- Add in-app notifications table
CREATE TABLE IF NOT EXISTS in_app_notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- "interview_scheduled", "offer_sent", "offer_accepted", "offer_rejected", "job_posted", "new_application", "candidate_status_changed", "interview_evaluated"
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  link TEXT, -- URL to navigate to when clicked (e.g., "/candidates/123")
  metadata JSONB, -- Additional data: { candidateId, jobId, interviewId, etc. }
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_in_app_notifications_user_id ON in_app_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_in_app_notifications_read ON in_app_notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_in_app_notifications_created_at ON in_app_notifications(created_at DESC);

-- Add comments for documentation
COMMENT ON TABLE in_app_notifications IS 'In-app notifications for users to stay updated on hiring activities';
COMMENT ON COLUMN in_app_notifications.type IS 'Type of notification: interview_scheduled, offer_sent, offer_accepted, offer_rejected, job_posted, new_application, candidate_status_changed, interview_evaluated';
COMMENT ON COLUMN in_app_notifications.link IS 'URL to navigate to when notification is clicked';
COMMENT ON COLUMN in_app_notifications.metadata IS 'Additional data: { candidateId, jobId, interviewId, etc. }';

