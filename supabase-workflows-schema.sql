-- =====================================================
-- WORKFLOW SYSTEM SCHEMA FOR SUPABASE
-- =====================================================
-- Run this SQL in your Supabase SQL Editor
-- This creates all tables needed for the workflow system

-- =====================================================
-- 1. WORKFLOWS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS workflows (
  id SERIAL PRIMARY KEY,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  trigger_type TEXT NOT NULL, -- 'candidate_status_change', 'interview_scheduled', 'interview_completed', 'manual', 'scheduled'
  trigger_config JSONB, -- { status: "interview_scheduled", jobId: 123, fromStatus: "new", toStatus: "interview_scheduled" }
  steps JSONB NOT NULL, -- Array of workflow steps: [{ type: "send_email", config: {...}, conditions: [...] }]
  created_by_id INTEGER REFERENCES users(id),
  execution_count INTEGER NOT NULL DEFAULT 0,
  last_executed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for workflows
CREATE INDEX IF NOT EXISTS idx_workflows_account_id ON workflows(account_id);
CREATE INDEX IF NOT EXISTS idx_workflows_trigger_type ON workflows(trigger_type);
CREATE INDEX IF NOT EXISTS idx_workflows_is_active ON workflows(is_active);
CREATE INDEX IF NOT EXISTS idx_workflows_account_active ON workflows(account_id, is_active);

-- =====================================================
-- 2. WORKFLOW EXECUTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS workflow_executions (
  id SERIAL PRIMARY KEY,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  workflow_id INTEGER NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'running', -- 'running', 'completed', 'failed', 'cancelled'
  trigger_entity_type TEXT, -- 'candidate', 'interview', 'job'
  trigger_entity_id INTEGER, -- ID of the candidate/interview/job that triggered this
  execution_data JSONB, -- Store context data: { candidate: {...}, interview: {...}, job: {...} }
  error_message TEXT,
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for workflow_executions
CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow_id ON workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_account_id ON workflow_executions(account_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON workflow_executions(status);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_trigger ON workflow_executions(trigger_entity_type, trigger_entity_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_started_at ON workflow_executions(started_at DESC);

-- =====================================================
-- 3. WORKFLOW EXECUTION STEPS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS workflow_execution_steps (
  id SERIAL PRIMARY KEY,
  execution_id INTEGER NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
  step_index INTEGER NOT NULL, -- Which step in the workflow (0, 1, 2, etc.)
  action_type TEXT NOT NULL, -- 'send_email', 'update_status', 'create_interview', 'notify_slack', 'update_crm', 'wait', 'condition'
  action_config JSONB NOT NULL, -- Configuration for this action
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed', 'skipped'
  result JSONB, -- Store action result: { emailSent: true, interviewId: 123, etc. }
  error_message TEXT,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for workflow_execution_steps
CREATE INDEX IF NOT EXISTS idx_workflow_execution_steps_execution_id ON workflow_execution_steps(execution_id);
CREATE INDEX IF NOT EXISTS idx_workflow_execution_steps_status ON workflow_execution_steps(status);
CREATE INDEX IF NOT EXISTS idx_workflow_execution_steps_execution_index ON workflow_execution_steps(execution_id, step_index);

-- =====================================================
-- 4. UPDATE TRIGGERS FOR updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_workflows_updated_at
  BEFORE UPDATE ON workflows
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================
-- NOTE: RLS is NOT enabled by default because your application uses
-- session-based authentication (not Supabase Auth). Your application
-- middleware already handles authentication and authorization at the API level.
--
-- If you want to enable RLS later (e.g., for direct database access security),
-- you'll need to create policies that work with your session-based auth system.
--
-- For now, security is handled by:
-- 1. Application-level authentication middleware
-- 2. Account-scoped queries in your API endpoints
-- 3. User role checks in your application code
--
-- To enable RLS in the future, uncomment these lines and create appropriate policies:
-- ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE workflow_execution_steps ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 6. COMMENTS FOR DOCUMENTATION
-- =====================================================
COMMENT ON TABLE workflows IS 'Main workflow definitions with triggers and steps';
COMMENT ON TABLE workflow_executions IS 'Tracks each time a workflow runs';
COMMENT ON TABLE workflow_execution_steps IS 'Tracks execution of each step within a workflow run';

COMMENT ON COLUMN workflows.trigger_type IS 'Type of trigger: candidate_status_change, interview_scheduled, interview_completed, manual, scheduled';
COMMENT ON COLUMN workflows.trigger_config IS 'JSON configuration for the trigger (status values, job IDs, etc.)';
COMMENT ON COLUMN workflows.steps IS 'Array of workflow steps with actions and conditions';
COMMENT ON COLUMN workflow_executions.execution_data IS 'Context data passed to workflow (candidate, interview, job info)';
COMMENT ON COLUMN workflow_execution_steps.action_type IS 'Type of action: send_email, update_status, create_interview, notify_slack, update_crm, wait, condition';
