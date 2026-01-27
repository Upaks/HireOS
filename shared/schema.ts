import {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  jsonb,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Accounts Table (Multi-tenant)
export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Account Members Table (Links users to accounts)
export const accountMembers = pgTable("account_members", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").references(() => accounts.id, { onDelete: "cascade" }).notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  role: text("role").notNull().default("hiringManager"),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  invitedById: integer("invited_by_id").references(() => users.id),
});

// Users Table
// NOTE: OpenRouter API key, Slack settings, and Email templates have been moved to 
// platform_integrations table (account-scoped) instead of user-scoped
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  role: text("role").notNull().default("hiringManager"),
  // Calendar settings remain user-personal (each interviewer has their own calendar)
  calendarLink: text("calendar_link"), // Optional: User's personal calendar scheduling link
  calendarProvider: text("calendar_provider"), // Optional: "calendly", "cal.com", "google", "custom"
  calendlyToken: text("calendly_token"), // Optional: Encrypted Calendly Personal Access Token
  calendlyWebhookId: text("calendly_webhook_id"), // Optional: Calendly webhook subscription ID
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  fullName: true,
  email: true,
  role: true,
});

// Job Postings Table
export const jobs = pgTable("jobs", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").references(() => accounts.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  suggestedTitle: text("suggested_title"),
  description: text("description").notNull(),
  type: text("type").notNull(), // Full-time, Contract, etc.
  department: text("department"),
  urgency: text("urgency"),
  skills: text("skills"),
  teamContext: text("team_context"),
  status: text("status").notNull().default("draft"), // draft, pending, active, closed
  hiPeopleLink: text("hi_people_link"),
  expressReview: boolean("express_review"),
  submitterId: integer("submitter_id").references(() => users.id),
  postedDate: timestamp("posted_date"),
  formTemplateId: integer("form_template_id").references(() => formTemplates.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  candidateCount: integer("candidate_count"), // Virtual field for memory storage
});

export const insertJobSchema = createInsertSchema(jobs)
  .pick({
    title: true,
    type: true,
    department: true,
    urgency: true,
    skills: true,
    teamContext: true,
    submitterId: true,
    status: true,
  })
  .extend({
    // Adding status field with default value of 'draft'
    status: z.enum(["draft", "review", "active", "closed"]).default("draft"),
    // Make expressReview optional to avoid type issues
    expressReview: z.boolean().optional(),
  });

// Job Posting Platforms
export const jobPlatforms = pgTable("job_platforms", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").references(() => accounts.id, { onDelete: "cascade" }).notNull(),
  jobId: integer("job_id")
    .references(() => jobs.id)
    .notNull(),
  platform: text("platform").notNull(), // LinkedIn, onlinejobs.ph, etc
  platformJobId: text("platform_job_id"),
  postUrl: text("post_url"),
  status: text("status").notNull(), // pending, posted, failed
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Platform Integrations (API Credentials & Connections)
export const platformIntegrations = pgTable("platform_integrations", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").references(() => accounts.id, { onDelete: "cascade" }), // Multi-tenant: NULL for system-wide integrations
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }), // For user-scoped integrations (CRM/ATS). NULL for system-wide (job posting platforms)
  platformId: text("platform_id").notNull(), // "linkedin", "onlinejobs", "ghl", "hubspot", etc.
  platformName: text("platform_name").notNull(), // Display name: "LinkedIn", "onlinejobs.ph", "GoHighLevel", etc.
  platformType: text("platform_type").notNull().default("builtin"), // "builtin", "custom", "crm", "ats"
  status: text("status").notNull().default("disconnected"), // "connected", "disconnected", "error"
  // Credentials stored as JSON (encrypted in production)
  credentials: jsonb("credentials"), // { apiKey, apiSecret, accessToken, refreshToken, locationId, etc. }
  // Custom platform settings
  apiEndpoint: text("api_endpoint"), // For custom platforms
  apiMethod: text("api_method").default("POST"), // POST, PUT, etc.
  // OAuth fields
  oauthToken: text("oauth_token"),
  oauthRefreshToken: text("oauth_refresh_token"),
  oauthExpiresAt: timestamp("oauth_expires_at"),
  // Sync direction for CRM/ATS integrations
  syncDirection: text("sync_direction").default("one-way"), // "one-way" (HireOS → CRM) or "two-way" (bidirectional)
  // Error tracking
  lastError: text("last_error"),
  lastErrorAt: timestamp("last_error_at"),
  // Metadata
  isEnabled: boolean("is_enabled").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Comments Table
export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").references(() => accounts.id, { onDelete: "cascade" }).notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  entityType: text("entity_type").notNull(), // "candidate" or "job"
  entityId: integer("entity_id").notNull(), // ID of the candidate or job
  content: text("content").notNull(),
  mentions: jsonb("mentions"), // Array of user IDs mentioned in the comment: [1, 2, 3]
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Application Form Templates
export const formTemplates = pgTable("form_templates", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").references(() => accounts.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(), // "Default Application Form", "Developer Application Form", etc.
  description: text("description"),
  fields: jsonb("fields").notNull(), // Array of field definitions
  isDefault: boolean("is_default").default(false).notNull(),
  settings: jsonb("settings").default({}), // allowAttachments, allowComments, successMessage, redirectUrl, expiryDate, submissionLimit, notifyOnSubmit
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Candidates Table
export const candidates = pgTable("candidates", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").references(() => accounts.id, { onDelete: "cascade" }).notNull(),
  jobId: integer("job_id").references(() => jobs.id),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  location: text("location"),
  resumeUrl: text("resume_url"),
  source: text("source"), // Where they applied from
  status: text("status").notNull().default("new"), // new, assessment_sent, assessment_completed, interview_scheduled, talent_pool, rejected, offer_sent, hired
  finalDecisionStatus: text("final_decision_status"), // ✅ <-- Add this line
  lastInterviewDate: timestamp("last_interview_date"), // New field for last interview date
  ghlContactId: text("ghl_contact_id"), // GoHighLevel contact ID for sync
  hiPeopleScore: integer("hi_people_score"),
  hiPeoplePercentile: integer("hi_people_percentile"),
  hiPeopleCompletedAt: timestamp("hi_people_completed_at"),
  hiPeopleAssessmentLink: text("hipeople_assessment_link"),
  // Evaluation criteria scores (0-5)
  technicalProficiency: integer("technical_proficiency"),
  leadershipInitiative: integer("leadership_initiative"),
  problemSolving: integer("problem_solving"),
  communicationSkills: integer("communication_skills"),
  culturalFit: integer("cultural_fit"),
  skills: jsonb("skills"),
  experienceYears: integer("experience_years"),
  expectedSalary: text("expected_salary"),
  notes: text("notes"),
  applicationData: jsonb("application_data"), // Stores custom form field answers
  matchScore: integer("match_score"), // AI-generated match score (0-100) against job requirements
  parsedResumeData: jsonb("parsed_resume_data"), // Extracted data from resume parsing (education, experience details, etc.)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  job: jsonb("job"), // Virtual field for memory storage - job relation
});

export const insertCandidateSchema = createInsertSchema(candidates).omit({
  id: true,
  accountId: true, // Added server-side, not from client
  createdAt: true,
  updatedAt: true,
});

// Interviews Table
export const interviews = pgTable("interviews", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").references(() => accounts.id, { onDelete: "cascade" }).notNull(),
  candidateId: integer("candidate_id")
    .references(() => candidates.id)
    .notNull(),
  scheduledDate: timestamp("scheduled_date"),
  conductedDate: timestamp("conducted_date"),
  interviewerId: integer("interviewer_id").references(() => users.id),
  type: text("type").notNull(), // phone, video, onsite
  videoUrl: text("video_url"),
  status: text("status").notNull().default("scheduled"), // scheduled, completed, no_show
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Interview Evaluations
export const evaluations = pgTable("evaluations", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").references(() => accounts.id, { onDelete: "cascade" }).notNull(),
  interviewId: integer("interview_id")
    .references(() => interviews.id)
    .notNull(),
  technicalScore: integer("technical_score"),
  communicationScore: integer("communication_score"),
  problemSolvingScore: integer("problem_solving_score"),
  culturalFitScore: integer("cultural_fit_score"),
  overallRating: text("overall_rating"), // Strong Hire, Hire, Neutral, Do Not Hire, Strong Do Not Hire
  technicalComments: text("technical_comments"),
  communicationComments: text("communication_comments"),
  problemSolvingComments: text("problem_solving_comments"),
  culturalFitComments: text("cultural_fit_comments"),
  overallComments: text("overall_comments"),
  evaluatorId: integer("evaluator_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Offers Table
export const offers = pgTable("offers", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").references(() => accounts.id, { onDelete: "cascade" }).notNull(),
  candidateId: integer("candidate_id")
    .references(() => candidates.id)
    .notNull(),
  offerType: text("offer_type").notNull(), // Full-time, Contract
  compensation: text("compensation").notNull(),
  startDate: timestamp("start_date"),
  notes: text("notes"),
  status: text("status").notNull().default("draft"), // draft, sent, accepted, declined, expired
  sentDate: timestamp("sent_date"),
  contractUrl: text("contract_url"),
  acceptanceToken: text("acceptance_token").unique(), // Unique token for public offer acceptance
  approvedById: integer("approved_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Activity Logs
export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").references(() => accounts.id, { onDelete: "cascade" }).notNull(),
  userId: integer("user_id").references(() => users.id),
  action: text("action").notNull(), // Created job, sent assessment, scheduled interview, etc.
  entityType: text("entity_type").notNull(), // job, candidate, interview, etc.
  entityId: integer("entity_id").notNull(),
  details: jsonb("details"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// Email Logs
export const emailLogs = pgTable("email_logs", {
  id: serial("id").primaryKey(),
  recipientEmail: text("recipient_email").notNull(),
  subject: text("subject").notNull(),
  template: text("template").notNull(),
  context: jsonb("context"),
  status: text("status").notNull().default("pending"), // pending, sent, failed
  error: text("error"),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// In-App Notifications
export const inAppNotifications = pgTable("in_app_notifications", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").references(() => accounts.id, { onDelete: "cascade" }).notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(), // Who triggered/is related to this notification
  type: text("type").notNull(), // "interview_scheduled", "offer_sent", "offer_accepted", "offer_rejected", "job_posted", "new_application", "candidate_status_changed", "interview_evaluated"
  title: text("title").notNull(),
  message: text("message").notNull(),
  read: boolean("read").default(false).notNull(), // Legacy field - kept for backwards compatibility
  link: text("link"), // URL to navigate to when clicked (e.g., "/candidates/123")
  metadata: jsonb("metadata"), // Additional data: { candidateId, jobId, interviewId, etc. }
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Per-user notification read status (for team-wide notifications)
// Tracks which users have read which notifications
export const notificationReads = pgTable("notification_reads", {
  id: serial("id").primaryKey(),
  notificationId: integer("notification_id").references(() => inAppNotifications.id, { onDelete: "cascade" }).notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  readAt: timestamp("read_at").defaultNow().notNull(),
});

// Notification Queue
export const notificationQueue = pgTable("notification_queue", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // email, slack
  payload: jsonb("payload").notNull(),
  status: text("status").notNull().default("pending"), // pending, processed, failed
  processAfter: timestamp("process_after").notNull(),
  processAttempts: integer("process_attempts").default(0).notNull(),
  lastAttemptAt: timestamp("last_attempt_at"),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// GHL_Tokens
export const ghlTokens = pgTable("ghl_tokens", {
  tokenId: serial("token_id").primaryKey(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  userType: text("user_type"), // e.g. "Company"
  companyId: text("company_id"), // optional: match GHL companyId if needed
  updatedAt: timestamp("updated_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
});

// Invitations Table - For inviting users to join an account
export const invitations = pgTable("invitations", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").references(() => accounts.id, { onDelete: "cascade" }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  role: text("role").notNull(), // The role the invited user will have
  token: varchar("token", { length: 255 }).unique().notNull(), // Unique invite token for the link
  invitedById: integer("invited_by_id").references(() => users.id).notNull(),
  status: text("status").notNull().default("pending"), // "pending", "accepted", "expired", "cancelled"
  expiresAt: timestamp("expires_at").notNull(), // When the invitation expires (72 hours default)
  acceptedAt: timestamp("accepted_at"), // When the invitation was accepted
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Type Exports
export type Account = typeof accounts.$inferSelect;
export type InsertAccount = typeof accounts.$inferInsert;
export type AccountMember = typeof accountMembers.$inferSelect;
export type InsertAccountMember = typeof accountMembers.$inferInsert;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Job = typeof jobs.$inferSelect;
export type InsertJob = z.infer<typeof insertJobSchema>;

export type JobPlatform = typeof jobPlatforms.$inferSelect;
export type PlatformIntegration = typeof platformIntegrations.$inferSelect;
export type InsertPlatformIntegration = typeof platformIntegrations.$inferInsert;

export type FormTemplate = typeof formTemplates.$inferSelect;
export type InsertFormTemplate = typeof formTemplates.$inferInsert;

export type Candidate = typeof candidates.$inferSelect;
export type InsertCandidate = z.infer<typeof insertCandidateSchema>;

export type Interview = typeof interviews.$inferSelect;
export type Evaluation = typeof evaluations.$inferSelect;
export type Offer = typeof offers.$inferSelect;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type EmailLog = typeof emailLogs.$inferSelect;
export type NotificationQueueItem = typeof notificationQueue.$inferSelect;
export type InAppNotification = typeof inAppNotifications.$inferSelect;
export type InsertInAppNotification = typeof inAppNotifications.$inferInsert;
export type NotificationRead = typeof notificationReads.$inferSelect;
export type InsertNotificationRead = typeof notificationReads.$inferInsert;
export type Comment = typeof comments.$inferSelect;
export type InsertComment = typeof comments.$inferInsert;

// Workflow types
export type Workflow = typeof workflows.$inferSelect;
export type InsertWorkflow = typeof workflows.$inferInsert;
export type WorkflowExecution = typeof workflowExecutions.$inferSelect;
export type InsertWorkflowExecution = typeof workflowExecutions.$inferInsert;
export type WorkflowExecutionStep = typeof workflowExecutionSteps.$inferSelect;
export type InsertWorkflowExecutionStep = typeof workflowExecutionSteps.$inferInsert;

// Role type
export const workflows = pgTable("workflows", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").references(() => accounts.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  triggerType: text("trigger_type").notNull(), // "candidate_status_change", "interview_scheduled", "interview_completed", "manual", "scheduled"
  triggerConfig: jsonb("trigger_config"), // { status: "interview_scheduled", jobId: 123, etc. }
  steps: jsonb("steps").notNull(), // Array of workflow steps with actions and conditions
  createdById: integer("created_by_id").references(() => users.id),
  executionCount: integer("execution_count").default(0).notNull(), // Track how many times workflow has run
  lastExecutedAt: timestamp("last_executed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Workflow Executions - Track each time a workflow runs
export const workflowExecutions = pgTable("workflow_executions", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").references(() => accounts.id, { onDelete: "cascade" }).notNull(),
  workflowId: integer("workflow_id").references(() => workflows.id, { onDelete: "cascade" }).notNull(),
  status: text("status").notNull().default("running"), // "running", "completed", "failed", "cancelled"
  triggerEntityType: text("trigger_entity_type"), // "candidate", "interview", "job"
  triggerEntityId: integer("trigger_entity_id"), // ID of the candidate/interview/job that triggered this
  executionData: jsonb("execution_data"), // Store context data (candidate info, interview info, etc.)
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Workflow Execution Steps - Track each step's execution within a workflow run
export const workflowExecutionSteps = pgTable("workflow_execution_steps", {
  id: serial("id").primaryKey(),
  executionId: integer("execution_id").references(() => workflowExecutions.id, { onDelete: "cascade" }).notNull(),
  stepIndex: integer("step_index").notNull(), // Which step in the workflow (0, 1, 2, etc.)
  actionType: text("action_type").notNull(), // "send_email", "update_status", "create_interview", "notify_slack", etc.
  actionConfig: jsonb("action_config").notNull(), // Configuration for this action
  status: text("status").notNull().default("pending"), // "pending", "running", "completed", "failed", "skipped"
  result: jsonb("result"), // Store action result (e.g., email sent, status updated, etc.)
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const UserRoles = {
  HIRING_MANAGER: "hiringManager",
  PROJECT_MANAGER: "projectManager",
  COO: "coo",
  CEO: "ceo",
  DIRECTOR: "director",
  ADMIN: "admin",
} as const;

export type UserRole = (typeof UserRoles)[keyof typeof UserRoles];

// Role Hierarchy Levels (lower number = higher power)
// Level 0 is reserved for Account Owner (checked separately via invitedById = null)
export const RoleHierarchy: Record<string, number> = {
  [UserRoles.ADMIN]: 1,
  [UserRoles.CEO]: 2,
  [UserRoles.COO]: 3,
  [UserRoles.DIRECTOR]: 3,
  [UserRoles.PROJECT_MANAGER]: 4,
  [UserRoles.HIRING_MANAGER]: 5,
};

// Helper: Get role level (lower = more power)
export function getRoleLevel(role: string): number {
  return RoleHierarchy[role] ?? 99; // Unknown roles get lowest priority
}

// Helper: Check if actor can manage target based on hierarchy
// Returns true if actor's role level is LOWER (more powerful) than target's
export function canManageRole(actorRole: string, targetRole: string): boolean {
  const actorLevel = getRoleLevel(actorRole);
  const targetLevel = getRoleLevel(targetRole);
  return actorLevel < targetLevel;
}

// Helper: Get roles that a given role can manage
export function getManageableRoles(role: string): string[] {
  const level = getRoleLevel(role);
  return Object.entries(RoleHierarchy)
    .filter(([_, roleLevel]) => roleLevel > level)
    .map(([roleName]) => roleName);
}

// Invitation types
export type Invitation = typeof invitations.$inferSelect;
export type InsertInvitation = typeof invitations.$inferInsert;
