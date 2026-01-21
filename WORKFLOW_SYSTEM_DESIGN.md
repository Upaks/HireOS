# Workflow System Design - HireOS

## Overview
A powerful, Zapier/Make.com-rivaling workflow automation system that integrates seamlessly with existing HireOS infrastructure without breaking anything.

## Architecture Principles

### 1. **Non-Breaking Integration**
- Workflows are **additive** - they enhance existing functionality, don't replace it
- All existing manual actions continue to work exactly as before
- Workflows run **in parallel** with existing code, not instead of it
- Uses **event hooks** to trigger workflows without modifying core business logic

### 2. **Trigger System**
Workflows can be triggered by:
- **Candidate Status Change** - When candidate moves from one status to another
- **Interview Scheduled** - When an interview is created/scheduled
- **Interview Completed** - When interview status changes to "completed"
- **Manual Trigger** - User can manually run a workflow
- **Scheduled** - Run on a schedule (daily, weekly, etc.)
- **Custom Events** - Future extensibility

### 3. **Action Library**
Each workflow step can perform actions:
- **Send Email** - Using Gmail integration or SMTP
- **Update Candidate Status** - Move candidate to next stage
- **Create Interview** - Auto-schedule interviews
- **Notify Slack** - Send notifications to Slack channels
- **Update CRM** - Sync to Google Sheets/Airtable
- **Create Task** - Create follow-up tasks
- **Wait/Delay** - Pause workflow for X hours/days
- **Conditional Logic** - If/Then branches
- **Send Assessment** - Auto-send coding tests
- **Update Google Calendar** - Create calendar events

### 4. **Workflow Structure**
```json
{
  "name": "Auto Interview Workflow",
  "trigger": {
    "type": "candidate_status_change",
    "config": {
      "fromStatus": "assessment_completed",
      "toStatus": "interview_scheduled"
    }
  },
  "steps": [
    {
      "type": "send_email",
      "config": {
        "template": "interview_confirmation",
        "to": "{{candidate.email}}"
      }
    },
    {
      "type": "notify_slack",
      "config": {
        "channel": "#hiring",
        "message": "New interview scheduled for {{candidate.name}}"
      }
    },
    {
      "type": "update_crm",
      "config": {
        "platform": "google_sheets",
        "action": "update_row",
        "data": {
          "status": "Interview Scheduled"
        }
      }
    }
  ]
}
```

## Database Schema

### Tables Added:
1. **workflows** - Main workflow definitions
2. **workflow_executions** - Track each workflow run
3. **workflow_execution_steps** - Track each step's execution

## Integration Points

### Existing Code Hooks (Non-Breaking)

#### 1. Candidate Status Changes
**File**: `server/api/candidate.ts`
**Hook Point**: After `updateCandidate` status change
```typescript
// After existing status update logic
await triggerWorkflows('candidate_status_change', {
  candidateId: candidate.id,
  fromStatus: oldStatus,
  toStatus: newStatus,
  accountId
});
```

#### 2. Interview Creation
**File**: `server/api/interview.ts` or `server/api/google-calendar.ts`
**Hook Point**: After interview is created
```typescript
// After interview creation
await triggerWorkflows('interview_scheduled', {
  interviewId: interview.id,
  candidateId: interview.candidateId,
  accountId
});
```

#### 3. Interview Completion
**File**: `server/api/interview.ts`
**Hook Point**: When interview status changes to "completed"
```typescript
// After interview completion
await triggerWorkflows('interview_completed', {
  interviewId: interview.id,
  candidateId: interview.candidateId,
  accountId
});
```

## UI/UX Design

### Workflow Builder Page (`/workflows`)

#### Main View:
- **List of Workflows** (left sidebar or top)
  - Active/Inactive toggle
  - Execution count
  - Last run time
  - Quick actions (Run, Edit, Duplicate, Delete)

#### Workflow Builder (Visual):
- **Drag-and-Drop Interface** (like Zapier/Make.com)
  - Trigger block (always first)
  - Action blocks (can add multiple)
  - Conditional blocks (if/then branches)
  - Connection lines between blocks

#### Block Types:
1. **Trigger Block** (Blue)
   - Shows trigger type and configuration
   - Click to edit trigger settings

2. **Action Block** (Green)
   - Shows action type and preview
   - Click to configure action

3. **Condition Block** (Yellow)
   - Shows condition logic
   - Has "Yes" and "No" branches

4. **Wait Block** (Gray)
   - Shows delay duration

#### Configuration Panels:
- **Trigger Configuration**:
  - Dropdown: Trigger type
  - Dynamic fields based on trigger type
  - Example: For "Candidate Status Change" → Select "From Status" and "To Status"

- **Action Configuration**:
  - Dropdown: Action type
  - Dynamic fields based on action type
  - Variable picker: `{{candidate.name}}`, `{{interview.date}}`, etc.
  - Template selector for emails

### Workflow Templates
Pre-built workflows users can start with:
1. **"New Application Received"**
   - Trigger: Candidate status = "new"
   - Actions: Send welcome email, notify team, add to CRM

2. **"Interview Scheduled"**
   - Trigger: Interview created
   - Actions: Send calendar invite, notify interviewer, update CRM

3. **"Assessment Completed"**
   - Trigger: Candidate status = "assessment_completed"
   - Actions: If score > 80, move to interview; else, send rejection

4. **"Offer Accepted"**
   - Trigger: Candidate status = "offer_accepted"
   - Actions: Start background check, send onboarding email, notify HR

## Implementation Plan

### Phase 1: Foundation (Week 1)
- [x] Database schema
- [ ] Workflow API endpoints (CRUD)
- [ ] Workflow execution engine
- [ ] Basic trigger hooks in existing code

### Phase 2: Core Actions (Week 2)
- [ ] Send email action
- [ ] Update status action
- [ ] Notify Slack action
- [ ] Update CRM action

### Phase 3: UI Builder (Week 3)
- [ ] Workflow list page
- [ ] Visual workflow builder
- [ ] Block configuration panels
- [ ] Variable picker

### Phase 4: Advanced Features (Week 4)
- [ ] Conditional logic
- [ ] Wait/delay actions
- [ ] Workflow templates
- [ ] Execution history/logs

### Phase 5: Polish (Week 5)
- [ ] Error handling & retries
- [ ] Workflow testing mode
- [ ] Performance optimization
- [ ] Documentation

## Technical Details

### Workflow Execution Engine
- **Async execution** - Workflows run in background
- **Error handling** - Failed steps don't break entire workflow
- **Retry logic** - Automatic retries for transient failures
- **Logging** - Full execution logs for debugging

### Variable System
Workflows can use variables like:
- `{{candidate.name}}`
- `{{candidate.email}}`
- `{{interview.scheduledDate}}`
- `{{job.title}}`
- `{{user.fullName}}`

### Security
- Workflows are account-scoped (multi-tenant)
- Users can only create/edit workflows for their account
- Execution logs are private to account

## Future Enhancements
- **Webhooks** - Trigger workflows from external systems
- **API Actions** - Custom API calls as workflow steps
- **AI Actions** - Use AI to generate emails, scores, etc.
- **Workflow Marketplace** - Share workflows between accounts
- **Advanced Scheduling** - Complex cron-like schedules
