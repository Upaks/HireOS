-- Add comments table for collaborative comments with @mentions
CREATE TABLE IF NOT EXISTS comments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL, -- "candidate" or "job"
  entity_id INTEGER NOT NULL, -- ID of the candidate or job
  content TEXT NOT NULL,
  mentions JSONB, -- Array of user IDs mentioned in the comment: [1, 2, 3]
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_comments_entity ON comments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);

-- Add comments for documentation
COMMENT ON TABLE comments IS 'Collaborative comments with @mentions for candidates and jobs';
COMMENT ON COLUMN comments.entity_type IS 'Type of entity: "candidate" or "job"';
COMMENT ON COLUMN comments.entity_id IS 'ID of the candidate or job';
COMMENT ON COLUMN comments.mentions IS 'Array of user IDs mentioned in the comment: [1, 2, 3]';

