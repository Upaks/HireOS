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

// Users Table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  role: text("role").notNull().default("hiringManager"),
  calendarLink: text("calendar_link"), // Optional: User's personal calendar scheduling link
  calendarProvider: text("calendar_provider"), // Optional: "calendly", "cal.com", "google", "custom"
  calendlyToken: text("calendly_token"), // Optional: Encrypted Calendly Personal Access Token
  calendlyWebhookId: text("calendly_webhook_id"), // Optional: Calendly webhook subscription ID
  openRouterApiKey: text("openrouter_api_key"), // Optional: OpenRouter API key for AI features (resume parsing, matching)
  // Email templates (stored as JSONB for flexibility)
  emailTemplates: jsonb("email_templates"), // { interview: {subject, body}, offer: {subject, body}, ... }
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

// Application Form Templates
export const formTemplates = pgTable("form_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // "Default Application Form", "Developer Application Form", etc.
  description: text("description"),
  fields: jsonb("fields").notNull(), // Array of field definitions
  isDefault: boolean("is_default").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Candidates Table
export const candidates = pgTable("candidates", {
  id: serial("id").primaryKey(),
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
  createdAt: true,
  updatedAt: true,
});

// Interviews Table
export const interviews = pgTable("interviews", {
  id: serial("id").primaryKey(),
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

// Type Exports
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

// Role type
export const UserRoles = {
  HIRING_MANAGER: "hiringManager",
  PROJECT_MANAGER: "projectManager",
  COO: "coo",
  CEO: "ceo",
  DIRECTOR: "director",
  ADMIN: "admin",
} as const;

export type UserRole = (typeof UserRoles)[keyof typeof UserRoles];
