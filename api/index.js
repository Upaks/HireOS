import { createRequire } from 'module'; const require = createRequire(import.meta.url);
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  UserRoles: () => UserRoles,
  accountMembers: () => accountMembers,
  accounts: () => accounts,
  activityLogs: () => activityLogs,
  candidates: () => candidates,
  comments: () => comments,
  emailLogs: () => emailLogs,
  evaluations: () => evaluations,
  formTemplates: () => formTemplates,
  ghlTokens: () => ghlTokens,
  inAppNotifications: () => inAppNotifications,
  insertCandidateSchema: () => insertCandidateSchema,
  insertJobSchema: () => insertJobSchema,
  insertUserSchema: () => insertUserSchema,
  interviews: () => interviews,
  jobPlatforms: () => jobPlatforms,
  jobs: () => jobs,
  notificationQueue: () => notificationQueue,
  offers: () => offers,
  platformIntegrations: () => platformIntegrations,
  users: () => users,
  workflowExecutionSteps: () => workflowExecutionSteps,
  workflowExecutions: () => workflowExecutions,
  workflows: () => workflows
});
import {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  jsonb,
  timestamp
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var accounts, accountMembers, users, insertUserSchema, jobs, insertJobSchema, jobPlatforms, platformIntegrations, comments, formTemplates, candidates, insertCandidateSchema, interviews, evaluations, offers, activityLogs, emailLogs, inAppNotifications, notificationQueue, ghlTokens, workflows, workflowExecutions, workflowExecutionSteps, UserRoles;
var init_schema = __esm({
  "shared/schema.ts"() {
    "use strict";
    accounts = pgTable("accounts", {
      id: serial("id").primaryKey(),
      name: text("name").notNull(),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    accountMembers = pgTable("account_members", {
      id: serial("id").primaryKey(),
      accountId: integer("account_id").references(() => accounts.id, { onDelete: "cascade" }).notNull(),
      userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
      role: text("role").notNull().default("hiringManager"),
      joinedAt: timestamp("joined_at").defaultNow().notNull(),
      invitedById: integer("invited_by_id").references(() => users.id)
    });
    users = pgTable("users", {
      id: serial("id").primaryKey(),
      username: text("username").notNull().unique(),
      password: text("password").notNull(),
      fullName: text("full_name").notNull(),
      email: text("email").notNull().unique(),
      role: text("role").notNull().default("hiringManager"),
      calendarLink: text("calendar_link"),
      // Optional: User's personal calendar scheduling link
      calendarProvider: text("calendar_provider"),
      // Optional: "calendly", "cal.com", "google", "custom"
      calendlyToken: text("calendly_token"),
      // Optional: Encrypted Calendly Personal Access Token
      calendlyWebhookId: text("calendly_webhook_id"),
      // Optional: Calendly webhook subscription ID
      openRouterApiKey: text("openrouter_api_key"),
      // Optional: OpenRouter API key for AI features (resume parsing, matching)
      slackWebhookUrl: text("slack_webhook_url"),
      // Optional: User's Slack webhook URL for notifications
      slackNotificationScope: text("slack_notification_scope"),
      // Optional: "all_users" or "specific_roles"
      slackNotificationRoles: jsonb("slack_notification_roles"),
      // Optional: Array of roles to notify if scope is "specific_roles"
      slackNotificationEvents: jsonb("slack_notification_events"),
      // Optional: Array of events to notify about ["interview_scheduled", "offer_accepted", "offer_sent", "job_posted", "new_application"]
      // Email templates (stored as JSONB for flexibility)
      emailTemplates: jsonb("email_templates"),
      // { interview: {subject, body}, offer: {subject, body}, ... }
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    insertUserSchema = createInsertSchema(users).pick({
      username: true,
      password: true,
      fullName: true,
      email: true,
      role: true
    });
    jobs = pgTable("jobs", {
      id: serial("id").primaryKey(),
      accountId: integer("account_id").references(() => accounts.id, { onDelete: "cascade" }).notNull(),
      title: text("title").notNull(),
      suggestedTitle: text("suggested_title"),
      description: text("description").notNull(),
      type: text("type").notNull(),
      // Full-time, Contract, etc.
      department: text("department"),
      urgency: text("urgency"),
      skills: text("skills"),
      teamContext: text("team_context"),
      status: text("status").notNull().default("draft"),
      // draft, pending, active, closed
      hiPeopleLink: text("hi_people_link"),
      expressReview: boolean("express_review"),
      submitterId: integer("submitter_id").references(() => users.id),
      postedDate: timestamp("posted_date"),
      formTemplateId: integer("form_template_id").references(() => formTemplates.id),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull(),
      candidateCount: integer("candidate_count")
      // Virtual field for memory storage
    });
    insertJobSchema = createInsertSchema(jobs).pick({
      title: true,
      type: true,
      department: true,
      urgency: true,
      skills: true,
      teamContext: true,
      submitterId: true,
      status: true
    }).extend({
      // Adding status field with default value of 'draft'
      status: z.enum(["draft", "review", "active", "closed"]).default("draft"),
      // Make expressReview optional to avoid type issues
      expressReview: z.boolean().optional()
    });
    jobPlatforms = pgTable("job_platforms", {
      id: serial("id").primaryKey(),
      accountId: integer("account_id").references(() => accounts.id, { onDelete: "cascade" }).notNull(),
      jobId: integer("job_id").references(() => jobs.id).notNull(),
      platform: text("platform").notNull(),
      // LinkedIn, onlinejobs.ph, etc
      platformJobId: text("platform_job_id"),
      postUrl: text("post_url"),
      status: text("status").notNull(),
      // pending, posted, failed
      errorMessage: text("error_message"),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    platformIntegrations = pgTable("platform_integrations", {
      id: serial("id").primaryKey(),
      accountId: integer("account_id").references(() => accounts.id, { onDelete: "cascade" }),
      // Multi-tenant: NULL for system-wide integrations
      userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
      // For user-scoped integrations (CRM/ATS). NULL for system-wide (job posting platforms)
      platformId: text("platform_id").notNull(),
      // "linkedin", "onlinejobs", "ghl", "hubspot", etc.
      platformName: text("platform_name").notNull(),
      // Display name: "LinkedIn", "onlinejobs.ph", "GoHighLevel", etc.
      platformType: text("platform_type").notNull().default("builtin"),
      // "builtin", "custom", "crm", "ats"
      status: text("status").notNull().default("disconnected"),
      // "connected", "disconnected", "error"
      // Credentials stored as JSON (encrypted in production)
      credentials: jsonb("credentials"),
      // { apiKey, apiSecret, accessToken, refreshToken, locationId, etc. }
      // Custom platform settings
      apiEndpoint: text("api_endpoint"),
      // For custom platforms
      apiMethod: text("api_method").default("POST"),
      // POST, PUT, etc.
      // OAuth fields
      oauthToken: text("oauth_token"),
      oauthRefreshToken: text("oauth_refresh_token"),
      oauthExpiresAt: timestamp("oauth_expires_at"),
      // Sync direction for CRM/ATS integrations
      syncDirection: text("sync_direction").default("one-way"),
      // "one-way" (HireOS → CRM) or "two-way" (bidirectional)
      // Error tracking
      lastError: text("last_error"),
      lastErrorAt: timestamp("last_error_at"),
      // Metadata
      isEnabled: boolean("is_enabled").default(true).notNull(),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    comments = pgTable("comments", {
      id: serial("id").primaryKey(),
      accountId: integer("account_id").references(() => accounts.id, { onDelete: "cascade" }).notNull(),
      userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
      entityType: text("entity_type").notNull(),
      // "candidate" or "job"
      entityId: integer("entity_id").notNull(),
      // ID of the candidate or job
      content: text("content").notNull(),
      mentions: jsonb("mentions"),
      // Array of user IDs mentioned in the comment: [1, 2, 3]
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    formTemplates = pgTable("form_templates", {
      id: serial("id").primaryKey(),
      accountId: integer("account_id").references(() => accounts.id, { onDelete: "cascade" }).notNull(),
      name: text("name").notNull(),
      // "Default Application Form", "Developer Application Form", etc.
      description: text("description"),
      fields: jsonb("fields").notNull(),
      // Array of field definitions
      isDefault: boolean("is_default").default(false).notNull(),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    candidates = pgTable("candidates", {
      id: serial("id").primaryKey(),
      accountId: integer("account_id").references(() => accounts.id, { onDelete: "cascade" }).notNull(),
      jobId: integer("job_id").references(() => jobs.id),
      name: text("name").notNull(),
      email: text("email").notNull(),
      phone: text("phone"),
      location: text("location"),
      resumeUrl: text("resume_url"),
      source: text("source"),
      // Where they applied from
      status: text("status").notNull().default("new"),
      // new, assessment_sent, assessment_completed, interview_scheduled, talent_pool, rejected, offer_sent, hired
      finalDecisionStatus: text("final_decision_status"),
      // ✅ <-- Add this line
      lastInterviewDate: timestamp("last_interview_date"),
      // New field for last interview date
      ghlContactId: text("ghl_contact_id"),
      // GoHighLevel contact ID for sync
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
      applicationData: jsonb("application_data"),
      // Stores custom form field answers
      matchScore: integer("match_score"),
      // AI-generated match score (0-100) against job requirements
      parsedResumeData: jsonb("parsed_resume_data"),
      // Extracted data from resume parsing (education, experience details, etc.)
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull(),
      job: jsonb("job")
      // Virtual field for memory storage - job relation
    });
    insertCandidateSchema = createInsertSchema(candidates).omit({
      id: true,
      accountId: true,
      // Added server-side, not from client
      createdAt: true,
      updatedAt: true
    });
    interviews = pgTable("interviews", {
      id: serial("id").primaryKey(),
      accountId: integer("account_id").references(() => accounts.id, { onDelete: "cascade" }).notNull(),
      candidateId: integer("candidate_id").references(() => candidates.id).notNull(),
      scheduledDate: timestamp("scheduled_date"),
      conductedDate: timestamp("conducted_date"),
      interviewerId: integer("interviewer_id").references(() => users.id),
      type: text("type").notNull(),
      // phone, video, onsite
      videoUrl: text("video_url"),
      status: text("status").notNull().default("scheduled"),
      // scheduled, completed, no_show
      notes: text("notes"),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    evaluations = pgTable("evaluations", {
      id: serial("id").primaryKey(),
      accountId: integer("account_id").references(() => accounts.id, { onDelete: "cascade" }).notNull(),
      interviewId: integer("interview_id").references(() => interviews.id).notNull(),
      technicalScore: integer("technical_score"),
      communicationScore: integer("communication_score"),
      problemSolvingScore: integer("problem_solving_score"),
      culturalFitScore: integer("cultural_fit_score"),
      overallRating: text("overall_rating"),
      // Strong Hire, Hire, Neutral, Do Not Hire, Strong Do Not Hire
      technicalComments: text("technical_comments"),
      communicationComments: text("communication_comments"),
      problemSolvingComments: text("problem_solving_comments"),
      culturalFitComments: text("cultural_fit_comments"),
      overallComments: text("overall_comments"),
      evaluatorId: integer("evaluator_id").references(() => users.id),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    offers = pgTable("offers", {
      id: serial("id").primaryKey(),
      accountId: integer("account_id").references(() => accounts.id, { onDelete: "cascade" }).notNull(),
      candidateId: integer("candidate_id").references(() => candidates.id).notNull(),
      offerType: text("offer_type").notNull(),
      // Full-time, Contract
      compensation: text("compensation").notNull(),
      startDate: timestamp("start_date"),
      notes: text("notes"),
      status: text("status").notNull().default("draft"),
      // draft, sent, accepted, declined, expired
      sentDate: timestamp("sent_date"),
      contractUrl: text("contract_url"),
      acceptanceToken: text("acceptance_token").unique(),
      // Unique token for public offer acceptance
      approvedById: integer("approved_by_id").references(() => users.id),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    activityLogs = pgTable("activity_logs", {
      id: serial("id").primaryKey(),
      accountId: integer("account_id").references(() => accounts.id, { onDelete: "cascade" }).notNull(),
      userId: integer("user_id").references(() => users.id),
      action: text("action").notNull(),
      // Created job, sent assessment, scheduled interview, etc.
      entityType: text("entity_type").notNull(),
      // job, candidate, interview, etc.
      entityId: integer("entity_id").notNull(),
      details: jsonb("details"),
      timestamp: timestamp("timestamp").defaultNow().notNull()
    });
    emailLogs = pgTable("email_logs", {
      id: serial("id").primaryKey(),
      recipientEmail: text("recipient_email").notNull(),
      subject: text("subject").notNull(),
      template: text("template").notNull(),
      context: jsonb("context"),
      status: text("status").notNull().default("pending"),
      // pending, sent, failed
      error: text("error"),
      sentAt: timestamp("sent_at"),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    inAppNotifications = pgTable("in_app_notifications", {
      id: serial("id").primaryKey(),
      accountId: integer("account_id").references(() => accounts.id, { onDelete: "cascade" }).notNull(),
      userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
      type: text("type").notNull(),
      // "interview_scheduled", "offer_sent", "offer_accepted", "offer_rejected", "job_posted", "new_application", "candidate_status_changed", "interview_evaluated"
      title: text("title").notNull(),
      message: text("message").notNull(),
      read: boolean("read").default(false).notNull(),
      link: text("link"),
      // URL to navigate to when clicked (e.g., "/candidates/123")
      metadata: jsonb("metadata"),
      // Additional data: { candidateId, jobId, interviewId, etc. }
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    notificationQueue = pgTable("notification_queue", {
      id: serial("id").primaryKey(),
      type: text("type").notNull(),
      // email, slack
      payload: jsonb("payload").notNull(),
      status: text("status").notNull().default("pending"),
      // pending, processed, failed
      processAfter: timestamp("process_after").notNull(),
      processAttempts: integer("process_attempts").default(0).notNull(),
      lastAttemptAt: timestamp("last_attempt_at"),
      error: text("error"),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    ghlTokens = pgTable("ghl_tokens", {
      tokenId: serial("token_id").primaryKey(),
      accessToken: text("access_token").notNull(),
      refreshToken: text("refresh_token").notNull(),
      userType: text("user_type"),
      // e.g. "Company"
      companyId: text("company_id"),
      // optional: match GHL companyId if needed
      updatedAt: timestamp("updated_at").defaultNow(),
      expiresAt: timestamp("expires_at")
    });
    workflows = pgTable("workflows", {
      id: serial("id").primaryKey(),
      accountId: integer("account_id").references(() => accounts.id, { onDelete: "cascade" }).notNull(),
      name: text("name").notNull(),
      description: text("description"),
      isActive: boolean("is_active").default(true).notNull(),
      triggerType: text("trigger_type").notNull(),
      // "candidate_status_change", "interview_scheduled", "interview_completed", "manual", "scheduled"
      triggerConfig: jsonb("trigger_config"),
      // { status: "interview_scheduled", jobId: 123, etc. }
      steps: jsonb("steps").notNull(),
      // Array of workflow steps with actions and conditions
      createdById: integer("created_by_id").references(() => users.id),
      executionCount: integer("execution_count").default(0).notNull(),
      // Track how many times workflow has run
      lastExecutedAt: timestamp("last_executed_at"),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    workflowExecutions = pgTable("workflow_executions", {
      id: serial("id").primaryKey(),
      accountId: integer("account_id").references(() => accounts.id, { onDelete: "cascade" }).notNull(),
      workflowId: integer("workflow_id").references(() => workflows.id, { onDelete: "cascade" }).notNull(),
      status: text("status").notNull().default("running"),
      // "running", "completed", "failed", "cancelled"
      triggerEntityType: text("trigger_entity_type"),
      // "candidate", "interview", "job"
      triggerEntityId: integer("trigger_entity_id"),
      // ID of the candidate/interview/job that triggered this
      executionData: jsonb("execution_data"),
      // Store context data (candidate info, interview info, etc.)
      errorMessage: text("error_message"),
      startedAt: timestamp("started_at").defaultNow().notNull(),
      completedAt: timestamp("completed_at"),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    workflowExecutionSteps = pgTable("workflow_execution_steps", {
      id: serial("id").primaryKey(),
      executionId: integer("execution_id").references(() => workflowExecutions.id, { onDelete: "cascade" }).notNull(),
      stepIndex: integer("step_index").notNull(),
      // Which step in the workflow (0, 1, 2, etc.)
      actionType: text("action_type").notNull(),
      // "send_email", "update_status", "create_interview", "notify_slack", etc.
      actionConfig: jsonb("action_config").notNull(),
      // Configuration for this action
      status: text("status").notNull().default("pending"),
      // "pending", "running", "completed", "failed", "skipped"
      result: jsonb("result"),
      // Store action result (e.g., email sent, status updated, etc.)
      errorMessage: text("error_message"),
      startedAt: timestamp("started_at"),
      completedAt: timestamp("completed_at"),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    UserRoles = {
      HIRING_MANAGER: "hiringManager",
      PROJECT_MANAGER: "projectManager",
      COO: "coo",
      CEO: "ceo",
      DIRECTOR: "director",
      ADMIN: "admin"
    };
  }
});

// server/email-validator.ts
function isLikelyInvalidEmail(email) {
  if (!email) return true;
  const suspiciousPatterns = [
    /nonexistent/i,
    /deleted(?:account)?/i,
    /test[0-9]+/i,
    // Match any test followed by numbers
    /fake/i,
    /example\./i,
    /invalid/i,
    /notreal/i,
    /donotexist/i,
    /dummy/i
  ];
  const knownTestEmails = [
    "nonexistent.user.582013@gmail.com",
    "deletedaccount.test.990199@gmail.com"
  ];
  if (knownTestEmails.includes(email)) {
    return true;
  }
  if (suspiciousPatterns.some((pattern) => pattern.test(email))) {
    return true;
  }
  const basicEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!basicEmailRegex.test(email)) {
    return true;
  }
  return false;
}
var init_email_validator = __esm({
  "server/email-validator.ts"() {
    "use strict";
  }
});

// server/db.ts
var db_exports = {};
__export(db_exports, {
  db: () => db,
  pool: () => pool
});
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
var dbUrl, isSupabase, pool, db;
var init_db = __esm({
  "server/db.ts"() {
    "use strict";
    init_schema();
    if (process.env.NODE_ENV !== "production" && !process.env.NODE_TLS_REJECT_UNAUTHORIZED) {
      console.warn("\u26A0\uFE0F  WARNING: TLS certificate validation disabled in development mode only");
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    } else if (process.env.NODE_ENV === "production") {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = "1";
      console.log("\u2705 TLS certificate validation enabled for production");
    }
    if (!process.env.DATABASE_URL) {
      throw new Error(
        "DATABASE_URL must be set. Did you forget to provision a database?"
      );
    }
    dbUrl = process.env.DATABASE_URL;
    if (!dbUrl.includes("supabase.co") && !dbUrl.includes("neon.tech") && !dbUrl.includes("postgresql://")) {
      console.warn("\u26A0\uFE0F  Warning: DATABASE_URL doesn't look like a valid PostgreSQL connection string");
    }
    isSupabase = dbUrl.includes("supabase.co") || dbUrl.includes("pooler.supabase.com");
    pool = new Pool({
      connectionString: dbUrl,
      // SECURITY FIX: Validate SSL certificates in production
      // Supabase uses valid SSL certificates - we should validate them
      ssl: isSupabase ? {
        rejectUnauthorized: process.env.NODE_ENV === "production"
        // Validate in production
      } : dbUrl.includes("sslmode=require") ? true : void 0,
      connectionTimeoutMillis: 15e3,
      idleTimeoutMillis: 3e4,
      max: 10
    });
    db = drizzle(pool, { schema: schema_exports });
    setTimeout(() => {
      pool.connect().then((client) => {
        client.query("SELECT 1").then(() => {
          console.log("\u2705 Database connection successful");
          client.release();
        }).catch((err) => {
          client.release();
          throw err;
        });
      }).catch((error) => {
        console.warn("\u26A0\uFE0F  Initial database connection test failed:", error.message);
        console.warn("   The app will continue - database queries will connect when needed.");
        if (error.message.includes("ENOTFOUND")) {
          console.warn("   Note: DNS resolution issue - queries may work when actually executed.");
        }
      });
    }, 2e3);
  }
});

// server/security/encryption.ts
import crypto from "crypto";
function encrypt(plaintext) {
  if (!ENCRYPTION_KEY) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Encryption disabled: ENCRYPTION_KEY not set");
      return plaintext;
    }
    throw new Error("ENCRYPTION_KEY must be set in production");
  }
  if (!plaintext) {
    return "";
  }
  try {
    const key = Buffer.from(ENCRYPTION_KEY, "hex");
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(plaintext, "utf8", "base64");
    encrypted += cipher.final("base64");
    const authTag = cipher.getAuthTag();
    return `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted}`;
  } catch (error) {
    console.error("Encryption error:", error);
    throw new Error("Failed to encrypt data");
  }
}
function isValidBase64(str) {
  try {
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    if (!base64Regex.test(str)) {
      return false;
    }
    Buffer.from(str, "base64");
    return true;
  } catch {
    return false;
  }
}
function decrypt(ciphertext) {
  if (!ENCRYPTION_KEY) {
    if (process.env.NODE_ENV !== "production") {
      return ciphertext;
    }
    throw new Error("ENCRYPTION_KEY must be set in production");
  }
  if (!ciphertext) {
    return ciphertext;
  }
  const parts = ciphertext.split(":");
  if (parts.length !== 3) {
    return ciphertext;
  }
  const [ivPart, authTagPart, encryptedPart] = parts;
  if (!isValidBase64(ivPart) || !isValidBase64(authTagPart) || !isValidBase64(encryptedPart)) {
    return ciphertext;
  }
  try {
    const iv = Buffer.from(ivPart, "base64");
    const authTag = Buffer.from(authTagPart, "base64");
    if (iv.length !== 16 || authTag.length !== 16) {
      return ciphertext;
    }
  } catch {
    return ciphertext;
  }
  try {
    const key = Buffer.from(ENCRYPTION_KEY, "hex");
    const iv = Buffer.from(parts[0], "base64");
    const authTag = Buffer.from(parts[1], "base64");
    const encrypted = parts[2];
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, "base64", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("Decryption failed, returning original value (may be legacy data):", error);
    }
    return ciphertext;
  }
}
var ENCRYPTION_KEY, ALGORITHM;
var init_encryption = __esm({
  "server/security/encryption.ts"() {
    "use strict";
    ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
    ALGORITHM = "aes-256-gcm";
    if (!ENCRYPTION_KEY) {
      console.warn("\u26A0\uFE0F  WARNING: ENCRYPTION_KEY not set. Sensitive data will not be encrypted.");
    }
    if (ENCRYPTION_KEY && ENCRYPTION_KEY.length !== 64) {
      console.warn("\u26A0\uFE0F  WARNING: ENCRYPTION_KEY should be 64 hex characters (32 bytes) for AES-256");
    }
  }
});

// server/api/utils.ts
import { z as z2 } from "zod";
function validateRequest(schema) {
  return (req, res, next) => {
    try {
      const result = schema.parse(req.body);
      req.body = result;
      next();
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({
          message: "Invalid request data",
          errors: error.errors.map((err) => ({
            path: err.path.join("."),
            message: err.message
          }))
        });
      }
      next(error);
    }
  };
}
function handleApiError(error, res) {
  console.error("API Error:", error);
  if (error instanceof z2.ZodError) {
    return res.status(400).json({
      message: "Invalid request data",
      errors: error.errors.map((err) => ({
        path: err.path.join("."),
        message: err.message
      }))
    });
  }
  if (error instanceof Error) {
    if (error.message === "Candidate email does not exist" || error.isNonExistentEmailError) {
      return res.status(422).json({
        message: "Candidate email does not exist",
        errorType: "non_existent_email"
      });
    }
    if (error.message.includes("not found") || error.message.includes("doesn't exist")) {
      return res.status(404).json({ message: error.message });
    }
    if (error.message.includes("unauthorized") || error.message.includes("not authenticated")) {
      return res.status(401).json({ message: error.message });
    }
    if (error.message.includes("forbidden") || error.message.includes("not allowed")) {
      return res.status(403).json({ message: error.message });
    }
    if (error.message.includes("already exists") || error.message.includes("duplicate")) {
      return res.status(409).json({ message: error.message });
    }
    return res.status(500).json({
      message: "An error occurred while processing your request",
      error: error.message
    });
  }
  return res.status(500).json({
    message: "An unexpected error occurred",
    error: String(error)
  });
}
function isAuthorized(req) {
  if (req.isAuthenticated()) {
    return true;
  }
  const apiKey = req.headers["x-api-key"] || req.headers["authorization"]?.replace("Bearer ", "");
  const validApiKey = process.env.HireOS_API_Key;
  return apiKey === validApiKey;
}
var init_utils = __esm({
  "server/api/utils.ts"() {
    "use strict";
  }
});

// server/api/gmail-integration.ts
var gmail_integration_exports = {};
__export(gmail_integration_exports, {
  sendGmailEmail: () => sendGmailEmail,
  setupGmailIntegrationRoutes: () => setupGmailIntegrationRoutes
});
import { google } from "googleapis";
import { eq } from "drizzle-orm";
function setupGmailIntegrationRoutes(app2) {
  app2.get("/api/gmail/auth", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const protocol = req.get("x-forwarded-proto") || req.protocol || (req.secure ? "https" : "http");
      const host = req.get("x-forwarded-host") || req.get("host") || "localhost:5000";
      let redirectUri = `${protocol}://${host}/api/gmail/callback`;
      const envRedirectUri = process.env.GOOGLE_REDIRECT_URI;
      if (envRedirectUri) {
        try {
          const envUrl = new URL(envRedirectUri);
          const currentUrl = new URL(redirectUri);
          if (envUrl.hostname === currentUrl.hostname || !host.includes("ngrok") && !host.includes("localhost")) {
            redirectUri = `${envUrl.protocol}//${envUrl.host}/api/gmail/callback`;
          }
        } catch (e) {
        }
      }
      redirectUri = redirectUri.replace(/\/$/, "");
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        redirectUri
      );
      const authUrl = oauth2Client.generateAuthUrl({
        access_type: "offline",
        // Get refresh token
        scope: [
          "https://www.googleapis.com/auth/gmail.send"
          // Send emails only
        ],
        prompt: "consent",
        // Force consent screen to get refresh token
        state: JSON.stringify({ userId: req.user.id })
        // Pass user ID in state
      });
      res.json({ authUrl });
    } catch (error) {
      handleApiError(error, res);
    }
  });
  app2.get("/api/gmail/callback", async (req, res) => {
    try {
      const { code, state } = req.query;
      if (!code) {
        return res.redirect(`/integrations?error=oauth_cancelled`);
      }
      let userId;
      try {
        const stateData = JSON.parse(state);
        userId = stateData.userId;
      } catch {
        return res.redirect(`/integrations?error=invalid_state`);
      }
      const protocol = req.get("x-forwarded-proto") || req.protocol || (req.secure ? "https" : "http");
      const host = req.get("x-forwarded-host") || req.get("host") || "localhost:5000";
      let redirectUri = `${protocol}://${host}/api/gmail/callback`;
      const envRedirectUri = process.env.GOOGLE_REDIRECT_URI;
      if (envRedirectUri) {
        try {
          const envUrl = new URL(envRedirectUri);
          const currentUrl = new URL(redirectUri);
          if (envUrl.hostname === currentUrl.hostname || !host.includes("ngrok") && !host.includes("localhost")) {
            redirectUri = `${envUrl.protocol}//${envUrl.host}/api/gmail/callback`;
          }
        } catch (e) {
        }
      }
      redirectUri = redirectUri.replace(/\/$/, "");
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        redirectUri
      );
      const { tokens: tokens2 } = await oauth2Client.getToken(code);
      if (!tokens2.access_token) {
        return res.redirect(`/integrations?error=no_access_token`);
      }
      const existing = await storage.getPlatformIntegration("gmail", userId);
      const credentials = {
        accessToken: tokens2.access_token,
        refreshToken: tokens2.refresh_token || null
      };
      if (existing) {
        const existingId = existing.id;
        if (existingId) {
          await db.delete(platformIntegrations).where(eq(platformIntegrations.id, existingId));
        }
        await storage.createPlatformIntegration({
          userId,
          platformId: "gmail",
          platformName: "Gmail",
          platformType: "communication",
          status: "connected",
          credentials,
          syncDirection: "one-way",
          isEnabled: true
        });
      } else {
        await storage.createPlatformIntegration({
          userId,
          platformId: "gmail",
          platformName: "Gmail",
          platformType: "communication",
          status: "connected",
          credentials,
          syncDirection: "one-way",
          isEnabled: true
        });
      }
      res.redirect(`/integrations?gmail_connected=true`);
    } catch (error) {
      console.error("Gmail OAuth callback error:", error);
      res.redirect(`/integrations?error=${encodeURIComponent(error.message)}`);
    }
  });
  app2.get("/api/gmail/status", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const userId = req.user.id;
      const integration = await storage.getPlatformIntegration("gmail", userId);
      res.json({
        connected: integration?.status === "connected" || false
      });
    } catch (error) {
      handleApiError(error, res);
    }
  });
  app2.post("/api/gmail/disconnect", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const userId = req.user.id;
      const integration = await storage.getPlatformIntegration("gmail", userId);
      if (!integration) {
        return res.status(404).json({ message: "Gmail integration not found" });
      }
      if (integration.id) {
        const { db: dbInstance } = await Promise.resolve().then(() => (init_db(), db_exports));
        const { platformIntegrations: platformIntegrationsTable } = await Promise.resolve().then(() => (init_schema(), schema_exports));
        const { eq: eq9 } = await import("drizzle-orm");
        await dbInstance.delete(platformIntegrationsTable).where(eq9(platformIntegrationsTable.id, integration.id));
      } else {
        const { db: dbInstance } = await Promise.resolve().then(() => (init_db(), db_exports));
        const { platformIntegrations: platformIntegrationsTable } = await Promise.resolve().then(() => (init_schema(), schema_exports));
        const { eq: eq9, and: and7 } = await import("drizzle-orm");
        await dbInstance.delete(platformIntegrationsTable).where(
          and7(
            eq9(platformIntegrationsTable.platformId, "gmail"),
            eq9(platformIntegrationsTable.userId, userId)
          )
        );
      }
      res.json({ message: "Gmail disconnected successfully" });
    } catch (error) {
      handleApiError(error, res);
    }
  });
  app2.post("/api/gmail/test", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const { to, subject, body } = req.body;
      if (!to || !subject || !body) {
        return res.status(400).json({ message: "to, subject, and body are required" });
      }
      const userId = req.user.id;
      await sendGmailEmail(userId, to, subject, body);
      res.json({ message: "Test email sent successfully" });
    } catch (error) {
      handleApiError(error, res);
    }
  });
}
async function sendGmailEmail(userId, to, subject, body, fromName) {
  try {
    const integration = await storage.getPlatformIntegration("gmail", userId);
    if (!integration || !integration.credentials) {
      throw new Error("Gmail integration not found. Please connect your Gmail account first.");
    }
    const credentials = integration.credentials;
    if (!credentials.accessToken) {
      throw new Error("Gmail access token not found. Please reconnect your Gmail account.");
    }
    const user = await storage.getUser(userId);
    const senderName = fromName || user?.fullName || "HireOS";
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    oauth2Client.setCredentials({
      access_token: credentials.accessToken,
      refresh_token: credentials.refreshToken
    });
    if (credentials.refreshToken) {
      try {
        const { credentials: newCredentials } = await oauth2Client.refreshAccessToken();
        if (newCredentials.access_token) {
          await storage.updatePlatformIntegration("gmail", {
            credentials: {
              ...credentials,
              accessToken: newCredentials.access_token,
              refreshToken: newCredentials.refresh_token || credentials.refreshToken
            }
          });
          oauth2Client.setCredentials(newCredentials);
        }
      } catch (refreshError) {
        console.warn("Failed to refresh Gmail token, using existing token:", refreshError);
      }
    }
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });
    const emailLines = [
      `From: ${senderName} <${user?.email || "noreply@hireos.com"}>`,
      `To: ${to}`,
      `Subject: ${subject}`,
      "Content-Type: text/html; charset=utf-8",
      "",
      body
    ];
    const email = emailLines.join("\r\n").trim();
    const encodedMessage = Buffer.from(email).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: encodedMessage
      }
    });
  } catch (error) {
    console.error("Error sending Gmail email:", error);
    throw new Error(`Failed to send email: ${error.message || "Unknown error"}`);
  }
}
var init_gmail_integration = __esm({
  "server/api/gmail-integration.ts"() {
    "use strict";
    init_storage();
    init_utils();
    init_db();
    init_schema();
  }
});

// server/storage.ts
import session from "express-session";
import connectPg from "connect-pg-simple";
import { and as and2, eq as eq2, or, isNull, desc, sql } from "drizzle-orm";
var PostgresSessionStore, DatabaseStorage, storage;
var init_storage = __esm({
  "server/storage.ts"() {
    "use strict";
    init_schema();
    init_email_validator();
    init_db();
    init_encryption();
    PostgresSessionStore = connectPg(session);
    DatabaseStorage = class {
      sessionStore;
      constructor() {
        this.sessionStore = new PostgresSessionStore({
          pool,
          createTableIfMissing: true
        });
      }
      // SECURITY: Helper to decrypt sensitive user fields
      decryptUserFields(user) {
        if (!user) return user;
        const decrypted = { ...user };
        if (decrypted.openRouterApiKey) {
          decrypted.openRouterApiKey = decrypt(decrypted.openRouterApiKey);
        }
        if (decrypted.calendlyToken) {
          decrypted.calendlyToken = decrypt(decrypted.calendlyToken);
        }
        if (decrypted.slackWebhookUrl) {
          decrypted.slackWebhookUrl = decrypt(decrypted.slackWebhookUrl);
        }
        return decrypted;
      }
      // SECURITY: Helper to encrypt sensitive user fields before saving
      encryptUserFields(data) {
        const encrypted = { ...data };
        if (encrypted.openRouterApiKey !== void 0 && encrypted.openRouterApiKey !== null) {
          encrypted.openRouterApiKey = encrypt(encrypted.openRouterApiKey);
        }
        if (encrypted.calendlyToken !== void 0 && encrypted.calendlyToken !== null) {
          encrypted.calendlyToken = encrypt(encrypted.calendlyToken);
        }
        if (encrypted.slackWebhookUrl !== void 0 && encrypted.slackWebhookUrl !== null) {
          encrypted.slackWebhookUrl = encrypt(encrypted.slackWebhookUrl);
        }
        return encrypted;
      }
      // Account operations
      async getUserAccountId(userId) {
        try {
          const [member] = await db.select({ accountId: accountMembers.accountId }).from(accountMembers).where(eq2(accountMembers.userId, userId)).limit(1);
          return member?.accountId || null;
        } catch (error) {
          console.error("Error getting user account ID:", error);
          return null;
        }
      }
      async createAccount(name, userId, role = UserRoles.ADMIN) {
        const [account] = await db.insert(accounts).values({
          name,
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        }).returning();
        await db.insert(accountMembers).values({
          accountId: account.id,
          userId,
          role,
          joinedAt: /* @__PURE__ */ new Date()
        });
        return account;
      }
      async getAccountMembers(accountId) {
        return await db.select().from(accountMembers).where(eq2(accountMembers.accountId, accountId));
      }
      // User operations
      async getUser(id) {
        try {
          const [user] = await db.select().from(users).where(eq2(users.id, id));
          if (!user) return void 0;
          return this.decryptUserFields(user);
        } catch (error) {
          console.error("Error getting user by ID:", error);
          return void 0;
        }
      }
      async getUserByUsername(username) {
        try {
          const [user] = await db.select().from(users).where(eq2(users.username, username));
          if (!user) return void 0;
          return this.decryptUserFields(user);
        } catch (error) {
          if (error instanceof Error) {
            console.error(`Error getting user by username "${username}":`, error.message);
            if (process.env.NODE_ENV === "development") {
              console.error("Stack:", error.stack);
            }
          } else {
            console.error("Error getting user by username:", String(error));
          }
          return void 0;
        }
      }
      async createUser(insertUser) {
        const role = insertUser.role || UserRoles.HIRING_MANAGER;
        const encryptedData = this.encryptUserFields(insertUser);
        const [user] = await db.insert(users).values({ ...encryptedData, role, createdAt: /* @__PURE__ */ new Date() }).returning();
        return this.decryptUserFields(user);
      }
      async getAllUsers(accountId) {
        let usersList;
        if (accountId) {
          usersList = await db.select({
            id: users.id,
            username: users.username,
            password: users.password,
            fullName: users.fullName,
            email: users.email,
            role: users.role,
            createdAt: users.createdAt,
            calendarLink: users.calendarLink,
            emailTemplates: users.emailTemplates,
            calendarProvider: users.calendarProvider,
            calendlyToken: users.calendlyToken,
            calendlyWebhookId: users.calendlyWebhookId,
            openRouterApiKey: users.openRouterApiKey,
            slackWebhookUrl: users.slackWebhookUrl,
            slackNotificationScope: users.slackNotificationScope,
            slackNotificationRoles: users.slackNotificationRoles,
            slackNotificationEvents: users.slackNotificationEvents
          }).from(users).innerJoin(accountMembers, eq2(users.id, accountMembers.userId)).where(eq2(accountMembers.accountId, accountId));
        } else {
          usersList = await db.select().from(users);
        }
        return usersList.map((user) => this.decryptUserFields(user));
      }
      async updateUser(id, data) {
        const encryptedData = this.encryptUserFields(data);
        const [updatedUser] = await db.update(users).set(encryptedData).where(eq2(users.id, id)).returning();
        return this.decryptUserFields(updatedUser);
      }
      async deleteUser(id) {
        await db.delete(users).where(eq2(users.id, id));
      }
      // Job operations
      async createJob(job) {
        const [newJob] = await db.insert(jobs).values({
          ...job,
          accountId: job.accountId,
          status: "draft",
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date(),
          postedDate: null,
          hiPeopleLink: job.hiPeopleLink || null,
          suggestedTitle: job.suggestedTitle || null,
          expressReview: job.expressReview || null,
          candidateCount: 0
        }).returning();
        return newJob;
      }
      async getJob(id, accountId) {
        const [job] = await db.select().from(jobs).where(and2(eq2(jobs.id, id), eq2(jobs.accountId, accountId)));
        return job || void 0;
      }
      async getJobs(accountId, status) {
        const conditions = [eq2(jobs.accountId, accountId)];
        if (status && status !== "all") {
          conditions.push(eq2(jobs.status, status));
        }
        return await db.select().from(jobs).where(and2(...conditions));
      }
      async updateJob(id, accountId, data) {
        const [updatedJob] = await db.update(jobs).set({
          ...data,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(and2(eq2(jobs.id, id), eq2(jobs.accountId, accountId))).returning();
        return updatedJob;
      }
      // Job platform operations
      async createJobPlatform(platform) {
        const [newPlatform] = await db.insert(jobPlatforms).values({
          accountId: platform.accountId,
          jobId: platform.jobId,
          platform: platform.platform,
          platformJobId: platform.platformJobId || "",
          postUrl: platform.postUrl || "",
          status: platform.status || "pending",
          errorMessage: platform.errorMessage || "",
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        }).returning();
        return newPlatform;
      }
      async getJobPlatforms(jobId, accountId) {
        return await db.select().from(jobPlatforms).where(and2(eq2(jobPlatforms.jobId, jobId), eq2(jobPlatforms.accountId, accountId)));
      }
      // Platform integration operations
      async getPlatformIntegrations(userId) {
        let integrations;
        if (userId) {
          integrations = await db.select().from(platformIntegrations).where(
            // User's integrations OR system-wide (user_id IS NULL)
            or(
              eq2(platformIntegrations.userId, userId),
              isNull(platformIntegrations.userId)
            )
          ).orderBy(platformIntegrations.platformName);
        } else {
          integrations = await db.select().from(platformIntegrations).orderBy(platformIntegrations.platformName);
        }
        return integrations.map((integration) => this.decryptIntegrationFields(integration));
      }
      // SECURITY: Helper to decrypt sensitive platform integration fields
      decryptIntegrationFields(integration) {
        if (!integration) return integration;
        const decrypted = { ...integration };
        if (decrypted.oauthToken) {
          decrypted.oauthToken = decrypt(decrypted.oauthToken);
        }
        if (decrypted.oauthRefreshToken) {
          decrypted.oauthRefreshToken = decrypt(decrypted.oauthRefreshToken);
        }
        if (decrypted.credentials && typeof decrypted.credentials === "object") {
          const creds = decrypted.credentials;
          if (typeof creds === "string") {
            try {
              decrypted.credentials = JSON.parse(decrypt(creds));
            } catch {
              decrypted.credentials = creds;
            }
          } else {
            const decryptedCreds = { ...creds };
            if (decryptedCreds.apiKey) {
              decryptedCreds.apiKey = decrypt(decryptedCreds.apiKey);
            }
            if (decryptedCreds.apiSecret) {
              decryptedCreds.apiSecret = decrypt(decryptedCreds.apiSecret);
            }
            if (decryptedCreds.accessToken) {
              decryptedCreds.accessToken = decrypt(decryptedCreds.accessToken);
            }
            decrypted.credentials = decryptedCreds;
          }
        }
        return decrypted;
      }
      // SECURITY: Helper to encrypt sensitive platform integration fields before saving
      encryptIntegrationFields(data) {
        const encrypted = { ...data };
        if (encrypted.oauthToken !== void 0 && encrypted.oauthToken !== null) {
          encrypted.oauthToken = encrypt(encrypted.oauthToken);
        }
        if (encrypted.oauthRefreshToken !== void 0 && encrypted.oauthRefreshToken !== null) {
          encrypted.oauthRefreshToken = encrypt(encrypted.oauthRefreshToken);
        }
        if (encrypted.credentials && typeof encrypted.credentials === "object") {
          const creds = encrypted.credentials;
          const encryptedCreds = { ...creds };
          if (encryptedCreds.apiKey) {
            encryptedCreds.apiKey = encrypt(encryptedCreds.apiKey);
          }
          if (encryptedCreds.apiSecret) {
            encryptedCreds.apiSecret = encrypt(encryptedCreds.apiSecret);
          }
          if (encryptedCreds.accessToken) {
            encryptedCreds.accessToken = encrypt(encryptedCreds.accessToken);
          }
          encrypted.credentials = encryptedCreds;
        }
        return encrypted;
      }
      async getPlatformIntegration(platformId, userId) {
        let integration;
        if (userId) {
          const [result] = await db.select().from(platformIntegrations).where(
            and2(
              eq2(platformIntegrations.platformId, platformId),
              eq2(platformIntegrations.userId, userId)
            )
          );
          integration = result || void 0;
        } else {
          const [result] = await db.select().from(platformIntegrations).where(eq2(platformIntegrations.platformId, platformId));
          integration = result || void 0;
        }
        if (!integration) return void 0;
        return this.decryptIntegrationFields(integration);
      }
      // Get CRM/ATS integrations for a user
      async getCRMIntegrations(userId) {
        const integrations = await db.select().from(platformIntegrations).where(
          and2(
            eq2(platformIntegrations.userId, userId),
            or(
              eq2(platformIntegrations.platformType, "crm"),
              eq2(platformIntegrations.platformType, "ats")
            )
          )
        ).orderBy(platformIntegrations.platformName);
        return integrations.map((integration) => this.decryptIntegrationFields(integration));
      }
      async createPlatformIntegration(integration) {
        const encryptedData = this.encryptIntegrationFields(integration);
        const [newIntegration] = await db.insert(platformIntegrations).values({
          ...encryptedData,
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        }).returning();
        return this.decryptIntegrationFields(newIntegration);
      }
      async updatePlatformIntegration(platformId, data) {
        const encryptedData = this.encryptIntegrationFields(data);
        const [updatedIntegration] = await db.update(platformIntegrations).set({
          ...encryptedData,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq2(platformIntegrations.platformId, platformId)).returning();
        return this.decryptIntegrationFields(updatedIntegration);
      }
      async deletePlatformIntegration(platformId) {
        await db.delete(platformIntegrations).where(eq2(platformIntegrations.platformId, platformId));
      }
      // Form template operations
      async getFormTemplates(accountId) {
        return await db.select().from(formTemplates).where(eq2(formTemplates.accountId, accountId)).orderBy(formTemplates.name);
      }
      async getFormTemplate(id, accountId) {
        const [template] = await db.select().from(formTemplates).where(and2(eq2(formTemplates.id, id), eq2(formTemplates.accountId, accountId)));
        return template || void 0;
      }
      async getDefaultFormTemplate(accountId) {
        const [template] = await db.select().from(formTemplates).where(and2(eq2(formTemplates.isDefault, true), eq2(formTemplates.accountId, accountId))).limit(1);
        return template || void 0;
      }
      async createFormTemplate(template) {
        const [newTemplate] = await db.insert(formTemplates).values({
          ...template,
          accountId: template.accountId,
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        }).returning();
        return newTemplate;
      }
      async updateFormTemplate(id, accountId, data) {
        const [updatedTemplate] = await db.update(formTemplates).set({
          ...data,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(and2(eq2(formTemplates.id, id), eq2(formTemplates.accountId, accountId))).returning();
        return updatedTemplate;
      }
      async deleteFormTemplate(id, accountId) {
        await db.delete(formTemplates).where(and2(eq2(formTemplates.id, id), eq2(formTemplates.accountId, accountId)));
      }
      // Candidate operations
      async createCandidate(candidate) {
        const [newCandidate] = await db.insert(candidates).values({
          ...candidate,
          accountId: candidate.accountId,
          status: candidate.status || "new",
          finalDecisionStatus: null,
          // Explicitly set to null for new candidates
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        }).returning();
        const job = newCandidate.jobId ? await this.getJob(newCandidate.jobId, candidate.accountId) : null;
        return { ...newCandidate, job: job || null };
      }
      async getCandidate(id, accountId) {
        const [candidate] = await db.select().from(candidates).where(and2(eq2(candidates.id, id), eq2(candidates.accountId, accountId)));
        if (!candidate) return void 0;
        const job = candidate.jobId ? await this.getJob(candidate.jobId, accountId) : null;
        return { ...candidate, job: job || null };
      }
      async getCandidates(accountId, filters) {
        const conditions = [eq2(candidates.accountId, accountId)];
        if (filters.jobId !== void 0) {
          conditions.push(eq2(candidates.jobId, filters.jobId));
        }
        if (filters.status && filters.status !== "all") {
          conditions.push(eq2(candidates.status, filters.status));
        }
        const candidatesList = await db.select().from(candidates).where(and2(...conditions));
        const jobIdsArray = candidatesList.map((c) => c.jobId);
        const uniqueJobIds = jobIdsArray.filter((id, index) => jobIdsArray.indexOf(id) === index && id !== null);
        const jobsMap = /* @__PURE__ */ new Map();
        if (uniqueJobIds.length > 0) {
          const jobsList = await Promise.all(
            uniqueJobIds.map((id) => this.getJob(id, accountId))
          );
          jobsList.forEach((job) => {
            if (job) {
              jobsMap.set(job.id, job);
            }
          });
        }
        return candidatesList.map((candidate) => ({
          ...candidate,
          job: jobsMap.get(candidate.jobId) || null
        }));
      }
      async getCandidateByNameAndEmail(name, email, accountId) {
        try {
          const result = await db.select().from(candidates).where(
            and2(
              eq2(candidates.name, name),
              eq2(candidates.email, email),
              eq2(candidates.accountId, accountId)
            )
          ).limit(1);
          return result[0];
        } catch (error) {
          console.error("Error fetching candidate by name and email:", error);
          return void 0;
        }
      }
      async getCandidateByGHLContactId(ghlContactId, accountId) {
        try {
          const result = await db.select().from(candidates).where(and2(eq2(candidates.ghlContactId, ghlContactId), eq2(candidates.accountId, accountId))).limit(1);
          if (!result[0]) return void 0;
          const job = result[0].jobId ? await this.getJob(result[0].jobId, accountId) : null;
          return { ...result[0], job: job || null };
        } catch (error) {
          console.error("Error fetching candidate by GHL contact ID:", error);
          return void 0;
        }
      }
      async updateCandidate(id, accountId, data) {
        const updatedData = { ...data };
        if (data.status === "200_rejected" && data.hasOwnProperty("finalDecisionStatus") && !data.finalDecisionStatus) {
          updatedData.finalDecisionStatus = "rejected";
        } else if (data.status === "95_offer_sent" && data.hasOwnProperty("finalDecisionStatus") && !data.finalDecisionStatus) {
          updatedData.finalDecisionStatus = "offer_sent";
        }
        if (data.finalDecisionStatus === "rejected" && !data.status) {
          updatedData.status = "200_rejected";
        } else if (data.finalDecisionStatus === "offer_sent" && !data.status) {
          updatedData.status = "95_offer_sent";
        }
        const updateData = {
          ...updatedData,
          updatedAt: /* @__PURE__ */ new Date()
        };
        const [updatedCandidate] = await db.update(candidates).set(updateData).where(and2(eq2(candidates.id, id), eq2(candidates.accountId, accountId))).returning();
        const job = updatedCandidate.jobId ? await this.getJob(updatedCandidate.jobId, accountId) : null;
        return { ...updatedCandidate, job: job || null };
      }
      // Interview operations
      async createInterview(interviewData) {
        const [interview] = await db.insert(interviews).values({
          accountId: interviewData.accountId,
          candidateId: interviewData.candidateId,
          type: interviewData.type || "video",
          status: interviewData.status || "scheduled",
          scheduledDate: interviewData.scheduledDate || null,
          conductedDate: interviewData.conductedDate || null,
          interviewerId: interviewData.interviewerId || null,
          videoUrl: interviewData.videoUrl || null,
          notes: interviewData.notes || null,
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        }).returning();
        return interview;
      }
      async getInterview(id, accountId) {
        const [interview] = await db.select().from(interviews).where(and2(eq2(interviews.id, id), eq2(interviews.accountId, accountId)));
        return interview || void 0;
      }
      async getInterviews(accountId, filters) {
        try {
          const conditions = [eq2(interviews.accountId, accountId)];
          if (filters?.candidateId) {
            conditions.push(eq2(interviews.candidateId, filters.candidateId));
          }
          if (filters?.interviewerId) {
            conditions.push(eq2(interviews.interviewerId, filters.interviewerId));
          }
          if (filters?.status) {
            conditions.push(eq2(interviews.status, filters.status));
          }
          let baseQuery = db.select({
            id: interviews.id,
            accountId: interviews.accountId,
            candidateId: interviews.candidateId,
            scheduledDate: interviews.scheduledDate,
            conductedDate: interviews.conductedDate,
            interviewerId: interviews.interviewerId,
            type: interviews.type,
            videoUrl: interviews.videoUrl,
            status: interviews.status,
            notes: interviews.notes,
            createdAt: interviews.createdAt,
            updatedAt: interviews.updatedAt,
            // Candidate info
            candidateName: candidates.name,
            candidateEmail: candidates.email,
            // Interviewer info
            interviewerName: users.fullName
          }).from(interviews).leftJoin(candidates, eq2(interviews.candidateId, candidates.id)).leftJoin(users, eq2(interviews.interviewerId, users.id));
          baseQuery = baseQuery.where(and2(...conditions));
          const results = await baseQuery;
          return results.map((row) => ({
            id: row.id,
            accountId: row.accountId,
            candidateId: row.candidateId,
            scheduledDate: row.scheduledDate,
            conductedDate: row.conductedDate,
            interviewerId: row.interviewerId,
            type: row.type,
            videoUrl: row.videoUrl,
            status: row.status,
            notes: row.notes,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
            candidate: row.candidateName ? {
              id: row.candidateId,
              name: row.candidateName,
              email: row.candidateEmail
            } : void 0,
            interviewer: row.interviewerName ? {
              id: row.interviewerId,
              fullName: row.interviewerName
            } : void 0
          }));
        } catch (error) {
          console.error("Error getting interviews:", error);
          return [];
        }
      }
      async updateInterview(id, accountId, data) {
        const [updatedInterview] = await db.update(interviews).set({
          ...data,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(and2(eq2(interviews.id, id), eq2(interviews.accountId, accountId))).returning();
        return updatedInterview;
      }
      async deleteInterview(id, accountId) {
        await db.delete(evaluations).where(and2(eq2(evaluations.interviewId, id), eq2(evaluations.accountId, accountId)));
        await db.delete(interviews).where(and2(eq2(interviews.id, id), eq2(interviews.accountId, accountId)));
      }
      // Evaluation operations
      async createEvaluation(evaluationData) {
        const { accountId, ...rest } = evaluationData;
        const [evaluation] = await db.insert(evaluations).values({
          accountId,
          interviewId: evaluationData.interviewId,
          evaluatorId: evaluationData.evaluatorId,
          overallRating: evaluationData.overallRating,
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date(),
          ...rest
        }).returning();
        return evaluation;
      }
      async getEvaluationByInterview(interviewId, accountId) {
        const [evaluation] = await db.select().from(evaluations).where(and2(eq2(evaluations.interviewId, interviewId), eq2(evaluations.accountId, accountId)));
        return evaluation || void 0;
      }
      async updateEvaluation(id, accountId, data) {
        const [updatedEvaluation] = await db.update(evaluations).set({
          ...data,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(and2(eq2(evaluations.id, id), eq2(evaluations.accountId, accountId))).returning();
        return updatedEvaluation;
      }
      // Activity logs
      async createActivityLog(log2) {
        const [activityLog] = await db.insert(activityLogs).values({
          ...log2,
          accountId: log2.accountId,
          timestamp: log2.timestamp || /* @__PURE__ */ new Date()
        }).returning();
        return activityLog;
      }
      // Notifications
      async createNotification(notification) {
        const [newNotification] = await db.insert(notificationQueue).values({
          type: notification.type,
          status: notification.status || "pending",
          payload: notification.payload,
          processAfter: notification.processAfter || /* @__PURE__ */ new Date(),
          createdAt: /* @__PURE__ */ new Date(),
          processAttempts: 0,
          lastAttemptAt: null,
          error: null
        }).returning();
        return newNotification;
      }
      // Offer operations
      async createOffer(offerData) {
        const crypto2 = await import("crypto");
        const acceptanceToken = crypto2.randomBytes(32).toString("hex");
        const [offer] = await db.insert(offers).values({
          accountId: offerData.accountId,
          candidateId: offerData.candidateId,
          offerType: offerData.offerType,
          compensation: offerData.compensation,
          startDate: offerData.startDate || null,
          notes: offerData.notes || null,
          status: offerData.status || "draft",
          sentDate: offerData.sentDate || null,
          contractUrl: offerData.contractUrl || null,
          acceptanceToken,
          approvedById: offerData.approvedById || null,
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        }).returning();
        return offer;
      }
      async getOfferByCandidate(candidateId, accountId) {
        const [offer] = await db.select().from(offers).where(and2(eq2(offers.candidateId, candidateId), eq2(offers.accountId, accountId))).limit(1);
        return offer || void 0;
      }
      async getOfferByToken(token) {
        const [offer] = await db.select().from(offers).where(eq2(offers.acceptanceToken, token));
        return offer || void 0;
      }
      async updateOffer(id, accountId, data) {
        const [updatedOffer] = await db.update(offers).set({
          ...data,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(and2(eq2(offers.id, id), eq2(offers.accountId, accountId))).returning();
        return updatedOffer;
      }
      // Direct email sending (bypasses notification queue)
      async sendDirectEmail(to, subject, body, userId) {
        if (isLikelyInvalidEmail(to)) {
          await db.insert(emailLogs).values({
            recipientEmail: to,
            subject,
            template: "direct",
            context: { body },
            status: "failed",
            error: "Candidate email does not exist",
            createdAt: /* @__PURE__ */ new Date()
          });
          const error = new Error("Candidate email does not exist");
          error.isNonExistentEmailError = true;
          throw error;
        }
        if (!userId) {
          const error = new Error("Gmail integration required. Please connect your Gmail account in Settings > Integrations to send emails.");
          await db.insert(emailLogs).values({
            recipientEmail: to,
            subject,
            template: "direct",
            context: { body },
            status: "failed",
            error: error.message,
            createdAt: /* @__PURE__ */ new Date()
          });
          throw error;
        }
        try {
          const { sendGmailEmail: sendGmailEmail2 } = await Promise.resolve().then(() => (init_gmail_integration(), gmail_integration_exports));
          await sendGmailEmail2(userId, to, subject, body);
          await db.insert(emailLogs).values({
            recipientEmail: to,
            subject,
            template: "direct",
            context: { body },
            status: "sent",
            sentAt: /* @__PURE__ */ new Date(),
            createdAt: /* @__PURE__ */ new Date()
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          const isNonExistentEmailError = errorMessage.includes("User doesn't exist") || errorMessage.includes("User unknown") || errorMessage.includes("550") || errorMessage.includes("No such user") || errorMessage.includes("recipient rejected") || errorMessage.includes("Invalid recipient");
          const errorType = isNonExistentEmailError ? "non_existent_email" : "email_error";
          const formattedError = isNonExistentEmailError ? "Candidate email does not exist" : errorMessage;
          await db.insert(emailLogs).values({
            recipientEmail: to,
            subject,
            template: "direct",
            context: { body },
            status: "failed",
            // Mark as failed
            error: formattedError,
            // Use standardized error message if applicable
            createdAt: /* @__PURE__ */ new Date()
          });
          const enhancedError = new Error(formattedError);
          enhancedError.isNonExistentEmailError = isNonExistentEmailError;
          enhancedError.originalError = errorMessage;
          throw enhancedError;
        }
      }
      // Direct Slack notification (no queue, immediate send)
      async sendSlackNotification(userId, message) {
        try {
          const user = await this.getUser(userId);
          if (!user || !user.slackWebhookUrl) {
            return;
          }
          const axios10 = await import("axios");
          await axios10.default.post(user.slackWebhookUrl, {
            text: message
          });
        } catch (error) {
          console.error(`Failed to send Slack notification to user ${userId}:`, error);
        }
      }
      // Get users who should receive Slack notifications based on scope
      async getUsersForSlackNotification(triggerUserId, eventType) {
        const triggerUser = await this.getUser(triggerUserId);
        if (!triggerUser) {
          return [];
        }
        const userEvents = triggerUser.slackNotificationEvents;
        if (!triggerUser.slackWebhookUrl || !userEvents?.includes(eventType)) {
          return [];
        }
        const scope = triggerUser.slackNotificationScope;
        if (scope === "all_users") {
          const allUsers = await db.select().from(users);
          const decryptedUsers = allUsers.map((user) => this.decryptUserFields(user));
          return decryptedUsers.filter((user) => {
            if (!user.slackWebhookUrl) return false;
            const events = user.slackNotificationEvents;
            return events?.includes(eventType) || false;
          });
        } else if (scope === "specific_roles") {
          const allowedRoles = triggerUser.slackNotificationRoles;
          if (!allowedRoles || allowedRoles.length === 0) {
            return [triggerUser];
          }
          const allUsers = await db.select().from(users);
          const decryptedUsers = allUsers.map((user) => this.decryptUserFields(user));
          return decryptedUsers.filter((user) => {
            if (!user.slackWebhookUrl) return false;
            if (!allowedRoles.includes(user.role)) return false;
            const events = user.slackNotificationEvents;
            return events?.includes(eventType) || false;
          });
        } else {
          return [triggerUser];
        }
      }
      // Comment operations
      async createComment(comment) {
        const [newComment] = await db.insert(comments).values({
          ...comment,
          accountId: comment.accountId,
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        }).returning();
        return newComment;
      }
      async getComments(entityType, entityId, accountId) {
        const commentsList = await db.select({
          id: comments.id,
          accountId: comments.accountId,
          userId: comments.userId,
          entityType: comments.entityType,
          entityId: comments.entityId,
          content: comments.content,
          mentions: comments.mentions,
          createdAt: comments.createdAt,
          updatedAt: comments.updatedAt,
          // Join with users to get author info
          userFullName: users.fullName,
          userEmail: users.email,
          userRole: users.role
        }).from(comments).leftJoin(users, eq2(comments.userId, users.id)).where(
          and2(
            eq2(comments.entityType, entityType),
            eq2(comments.entityId, entityId),
            eq2(comments.accountId, accountId)
          )
        ).orderBy(desc(comments.createdAt));
        return commentsList.map((row) => ({
          id: row.id,
          accountId: row.accountId,
          userId: row.userId,
          entityType: row.entityType,
          entityId: row.entityId,
          content: row.content,
          mentions: row.mentions,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          user: row.userFullName ? {
            id: row.userId,
            fullName: row.userFullName,
            email: row.userEmail,
            role: row.userRole
          } : void 0
        }));
      }
      async deleteComment(id, userId, accountId) {
        const [comment] = await db.select().from(comments).where(and2(eq2(comments.id, id), eq2(comments.accountId, accountId)));
        if (!comment) {
          throw new Error("Comment not found");
        }
        const user = await this.getUser(userId);
        const isAdmin = user?.role === "admin" || user?.role === "ceo" || user?.role === "coo";
        if (comment.userId !== userId && !isAdmin) {
          throw new Error("Unauthorized: You can only delete your own comments");
        }
        await db.delete(comments).where(and2(eq2(comments.id, id), eq2(comments.accountId, accountId)));
      }
      async getUsersForMentionAutocomplete(accountId, query) {
        const conditions = [eq2(accountMembers.accountId, accountId)];
        if (query && query.trim()) {
          const searchTerm = `%${query.trim().toLowerCase()}%`;
          conditions.push(
            or(
              sql`LOWER(${users.fullName}) LIKE ${searchTerm}`,
              sql`LOWER(${users.email}) LIKE ${searchTerm}`,
              sql`LOWER(${users.username}) LIKE ${searchTerm}`
            )
          );
        }
        const usersList = await db.select({
          id: users.id,
          username: users.username,
          password: users.password,
          fullName: users.fullName,
          email: users.email,
          role: users.role,
          createdAt: users.createdAt,
          calendarLink: users.calendarLink,
          emailTemplates: users.emailTemplates,
          calendarProvider: users.calendarProvider,
          calendlyToken: users.calendlyToken,
          calendlyWebhookId: users.calendlyWebhookId,
          openRouterApiKey: users.openRouterApiKey,
          slackWebhookUrl: users.slackWebhookUrl,
          slackNotificationScope: users.slackNotificationScope,
          slackNotificationRoles: users.slackNotificationRoles,
          slackNotificationEvents: users.slackNotificationEvents
        }).from(users).innerJoin(accountMembers, eq2(users.id, accountMembers.userId)).where(and2(...conditions)).limit(20);
        return usersList.map((user) => this.decryptUserFields(user));
      }
      // In-app notification operations
      async createInAppNotification(notification) {
        const [newNotification] = await db.insert(inAppNotifications).values({
          ...notification,
          createdAt: /* @__PURE__ */ new Date()
        }).returning();
        return newNotification;
      }
      async getInAppNotifications(accountId, userId, filters) {
        let conditions = [
          eq2(inAppNotifications.accountId, accountId),
          eq2(inAppNotifications.userId, userId)
        ];
        if (filters?.read !== void 0) {
          conditions.push(eq2(inAppNotifications.read, filters.read));
        }
        let query = db.select().from(inAppNotifications).where(and2(...conditions)).orderBy(desc(inAppNotifications.createdAt));
        if (filters?.limit) {
          query = query.limit(filters.limit);
        }
        return await query;
      }
      async markNotificationAsRead(id, accountId, userId) {
        const [notification] = await db.select().from(inAppNotifications).where(
          and2(
            eq2(inAppNotifications.id, id),
            eq2(inAppNotifications.accountId, accountId),
            eq2(inAppNotifications.userId, userId)
          )
        );
        if (!notification) {
          throw new Error("Notification not found or unauthorized");
        }
        await db.update(inAppNotifications).set({ read: true }).where(eq2(inAppNotifications.id, id));
      }
      async markAllNotificationsAsRead(accountId, userId) {
        await db.update(inAppNotifications).set({ read: true }).where(and2(
          eq2(inAppNotifications.accountId, accountId),
          eq2(inAppNotifications.userId, userId)
        ));
      }
      async getUnreadNotificationCount(accountId, userId) {
        const result = await db.select({ count: sql`count(*)` }).from(inAppNotifications).where(
          and2(
            eq2(inAppNotifications.accountId, accountId),
            eq2(inAppNotifications.userId, userId),
            eq2(inAppNotifications.read, false)
          )
        );
        return Number(result[0]?.count || 0);
      }
      // =====================================================
      // WORKFLOW OPERATIONS
      // =====================================================
      async createWorkflow(workflow) {
        const [newWorkflow] = await db.insert(workflows).values({
          accountId: workflow.accountId,
          name: workflow.name,
          description: workflow.description,
          isActive: workflow.isActive ?? true,
          triggerType: workflow.triggerType,
          triggerConfig: workflow.triggerConfig,
          steps: workflow.steps,
          createdById: workflow.createdById
        }).returning();
        return newWorkflow;
      }
      async getWorkflows(accountId) {
        return await db.select().from(workflows).where(eq2(workflows.accountId, accountId)).orderBy(desc(workflows.updatedAt));
      }
      async getWorkflow(id, accountId) {
        const [workflow] = await db.select().from(workflows).where(and2(eq2(workflows.id, id), eq2(workflows.accountId, accountId)));
        return workflow;
      }
      async updateWorkflow(id, accountId, data) {
        const [updated] = await db.update(workflows).set(data).where(and2(eq2(workflows.id, id), eq2(workflows.accountId, accountId))).returning();
        return updated;
      }
      async deleteWorkflow(id, accountId) {
        await db.delete(workflows).where(and2(eq2(workflows.id, id), eq2(workflows.accountId, accountId)));
      }
      async getActiveWorkflowsByTrigger(accountId, triggerType, triggerConfig) {
        const allWorkflows = await db.select().from(workflows).where(
          and2(
            eq2(workflows.accountId, accountId),
            eq2(workflows.isActive, true),
            eq2(workflows.triggerType, triggerType)
          )
        );
        if (triggerConfig) {
          return allWorkflows.filter((workflow) => {
            const config = workflow.triggerConfig;
            if (!config) return false;
            if (triggerConfig.fromStatus && config.fromStatus !== triggerConfig.fromStatus) {
              return false;
            }
            if (triggerConfig.toStatus && config.toStatus !== triggerConfig.toStatus) {
              return false;
            }
            if (triggerConfig.jobId && config.jobId && config.jobId !== triggerConfig.jobId) {
              return false;
            }
            return true;
          });
        }
        return allWorkflows;
      }
      async createWorkflowExecution(execution) {
        const [newExecution] = await db.insert(workflowExecutions).values({
          accountId: execution.accountId,
          workflowId: execution.workflowId,
          status: execution.status ?? "running",
          triggerEntityType: execution.triggerEntityType,
          triggerEntityId: execution.triggerEntityId,
          executionData: execution.executionData
        }).returning();
        return newExecution;
      }
      async updateWorkflowExecution(id, accountId, data) {
        const [updated] = await db.update(workflowExecutions).set(data).where(and2(eq2(workflowExecutions.id, id), eq2(workflowExecutions.accountId, accountId))).returning();
        return updated;
      }
      async createWorkflowExecutionStep(step) {
        const [newStep] = await db.insert(workflowExecutionSteps).values({
          executionId: step.executionId,
          stepIndex: step.stepIndex,
          actionType: step.actionType,
          actionConfig: step.actionConfig,
          status: step.status ?? "pending",
          result: step.result,
          errorMessage: step.errorMessage,
          startedAt: step.startedAt,
          completedAt: step.completedAt
        }).returning();
        return newStep;
      }
      async updateWorkflowExecutionStep(id, data) {
        const [updated] = await db.update(workflowExecutionSteps).set(data).where(eq2(workflowExecutionSteps.id, id)).returning();
        return updated;
      }
      async getWorkflowExecutions(workflowId, accountId, limit = 50) {
        return await db.select().from(workflowExecutions).where(
          and2(
            eq2(workflowExecutions.workflowId, workflowId),
            eq2(workflowExecutions.accountId, accountId)
          )
        ).orderBy(desc(workflowExecutions.startedAt)).limit(limit);
      }
      async getWorkflowExecutionSteps(executionId) {
        return await db.select().from(workflowExecutionSteps).where(eq2(workflowExecutionSteps.executionId, executionId)).orderBy(workflowExecutionSteps.stepIndex);
      }
      async incrementWorkflowExecutionCount(workflowId, accountId) {
        await db.update(workflows).set({
          executionCount: sql`${workflows.executionCount} + 1`,
          lastExecutedAt: sql`NOW()`
        }).where(and2(eq2(workflows.id, workflowId), eq2(workflows.accountId, accountId)));
      }
    };
    storage = new DatabaseStorage();
  }
});

// server/api/notifications.ts
var notifications_exports = {};
__export(notifications_exports, {
  createNotification: () => createNotification,
  setupNotificationRoutes: () => setupNotificationRoutes
});
import { z as z4 } from "zod";
function setupNotificationRoutes(app2) {
  app2.get("/api/notifications", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const accountId = await storage.getUserAccountId(req.user.id);
      if (!accountId) {
        return res.status(400).json({ message: "User is not associated with any account" });
      }
      const userId = req.user.id;
      const { read, limit } = req.query;
      const filters = {};
      if (read !== void 0) {
        filters.read = read === "true";
      }
      if (limit) {
        filters.limit = parseInt(limit);
      }
      const notifications = await storage.getInAppNotifications(accountId, userId, filters);
      res.json(notifications);
    } catch (error) {
      handleApiError(error, res);
    }
  });
  app2.get("/api/notifications/unread-count", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const accountId = await storage.getUserAccountId(req.user.id);
      if (!accountId) {
        return res.status(400).json({ message: "User is not associated with any account" });
      }
      const userId = req.user.id;
      const count3 = await storage.getUnreadNotificationCount(accountId, userId);
      res.json({ count: count3 });
    } catch (error) {
      handleApiError(error, res);
    }
  });
  app2.patch("/api/notifications/:id/read", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const accountId = await storage.getUserAccountId(req.user.id);
      if (!accountId) {
        return res.status(400).json({ message: "User is not associated with any account" });
      }
      const { id } = req.params;
      const userId = req.user.id;
      await storage.markNotificationAsRead(parseInt(id), accountId, userId);
      res.json({ message: "Notification marked as read" });
    } catch (error) {
      handleApiError(error, res);
    }
  });
  app2.patch("/api/notifications/read-all", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const accountId = await storage.getUserAccountId(req.user.id);
      if (!accountId) {
        return res.status(400).json({ message: "User is not associated with any account" });
      }
      const userId = req.user.id;
      await storage.markAllNotificationsAsRead(accountId, userId);
      res.json({ message: "All notifications marked as read" });
    } catch (error) {
      handleApiError(error, res);
    }
  });
  app2.post("/api/notifications", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const accountId = await storage.getUserAccountId(req.user.id);
      if (!accountId) {
        return res.status(400).json({ message: "User is not associated with any account" });
      }
      const validationResult = createNotificationSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          message: "Validation error",
          errors: validationResult.error.errors
        });
      }
      const data = validationResult.data;
      const notification = await storage.createInAppNotification({ ...data, accountId });
      res.status(201).json(notification);
    } catch (error) {
      handleApiError(error, res);
    }
  });
}
async function createNotification(userId, type, title, message, link, metadata) {
  try {
    const accountId = await storage.getUserAccountId(userId);
    if (!accountId) {
      console.error(`[Notification] User ${userId} is not associated with any account`);
      return;
    }
    const notification = await storage.createInAppNotification({
      accountId,
      userId,
      type,
      title,
      message,
      link,
      metadata
    });
  } catch (error) {
    console.error(`[Notification] Failed to create notification for user ${userId}:`, error);
  }
}
var createNotificationSchema;
var init_notifications = __esm({
  "server/api/notifications.ts"() {
    "use strict";
    init_storage();
    init_utils();
    createNotificationSchema = z4.object({
      userId: z4.number().int().positive(),
      type: z4.enum([
        "interview_scheduled",
        "offer_sent",
        "offer_accepted",
        "offer_rejected",
        "job_posted",
        "new_application",
        "candidate_status_changed",
        "interview_evaluated"
      ]),
      title: z4.string().min(1).max(200),
      message: z4.string().min(1).max(1e3),
      link: z4.string().optional(),
      metadata: z4.record(z4.any()).optional()
    });
  }
});

// server/ghl-integration.ts
var ghl_integration_exports = {};
__export(ghl_integration_exports, {
  createGHLContact: () => createGHLContact,
  getGHLContact: () => getGHLContact,
  mapJobTitleToGHLTag: () => mapJobTitleToGHLTag,
  mapStatusToGHLTag: () => mapStatusToGHLTag,
  parseFullName: () => parseFullName,
  updateCandidateInGHL: () => updateCandidateInGHL,
  updateGHLContact: () => updateGHLContact
});
import axios2 from "axios";
async function getGHLCredentials(userId) {
  if (!userId) {
    const envKey = process.env.GHL_API_KEY;
    const envLocationId = process.env.GHL_LOCATION_ID;
    if (envKey) {
      return { apiKey: envKey, locationId: envLocationId };
    }
    return null;
  }
  const integration = await storage.getPlatformIntegration("ghl", userId);
  if (!integration || !integration.credentials) {
    return null;
  }
  const credentials = integration.credentials;
  if (!credentials.apiKey) {
    return null;
  }
  return {
    apiKey: credentials.apiKey,
    locationId: credentials.locationId
  };
}
async function createGHLContact(contactData, credentials, userId) {
  if (!credentials) {
    const creds = await getGHLCredentials(userId);
    if (!creds) {
      throw new Error("GHL credentials not found. Please connect your GHL account in Settings \u2192 Integrations.");
    }
    credentials = creds;
  }
  const customFields = [];
  if (contactData.interview)
    customFields.push({
      id: "P1PnG6PqDqPSOpxI85iN",
      key: "interview_date",
      field_value: toGhlDate(contactData.interview)
    });
  if (contactData.score)
    customFields.push({
      id: "P1fCAXatdJS0Q7KCR1vz",
      key: "score",
      field_value: contactData.score
    });
  if (contactData.communicationSkills)
    customFields.push({
      id: "i5TsZMwxsL4zf1cpyOX6",
      key: "communication_skills",
      field_value: contactData.communicationSkills
    });
  const payload = {
    locationId: credentials.locationId || void 0,
    firstName: contactData.firstName,
    lastName: contactData.lastName,
    email: contactData.email,
    phone: contactData.phone || "",
    source: "HireOS",
    tags: contactData.tags,
    customFields
    // ✅ array of objects
  };
  try {
    const response = await axios2.post(
      `${GHL_V2_BASE_URL}/contacts/upsert`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${credentials.apiKey}`,
          "Content-Type": "application/json",
          Version: "2021-07-28"
        }
      }
    );
    console.log("\u2705 GHL contact created successfully:", { payload });
    return response.data;
  } catch (error) {
    console.error("\u274C Failed to create GHL contact:", {
      email: contactData.email,
      error: error.message
    });
    throw error;
  }
}
function mapJobTitleToGHLTag(jobTitle) {
  const titleLower = jobTitle.toLowerCase();
  if (titleLower.includes("audit") && titleLower.includes("senior")) {
    return "c\u2013role\u2013aud\u2013sr";
  }
  if (titleLower.includes("executive") && titleLower.includes("assistant")) {
    return "c\u2013role\u2013ea";
  }
  return "c\u2013role\u2013other";
}
function mapStatusToGHLTag(status) {
  const statusMappings = {
    new: "00_application_submitted",
    assessment_sent: "15_assessment_sent",
    assessment_completed: "30_assessment_completed",
    interview_scheduled: "45_1st_interview_sent",
    interview_completed: "60_1st_interview_completed",
    second_interview_scheduled: "75_2nd_interview_scheduled",
    second_interview_completed: "90_2nd_interview_completed",
    talent_pool: "95_talent_pool",
    rejected: "99_rejected",
    offer_sent: "85_offer_sent",
    hired: "100_hired"
  };
  return statusMappings[status] || "00_application_submitted";
}
async function updateGHLContact(contactId, contactData, credentials, userId) {
  if (!credentials) {
    const creds = await getGHLCredentials(userId);
    if (!creds) {
      throw new Error("GHL credentials not found. Please connect your GHL account in Settings \u2192 Integrations.");
    }
    credentials = creds;
  }
  const customField = {};
  const capitalize = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s;
  if (contactData.finalDecisionStatus != null) {
    customField["oj1uqAxC9wGGJ7BRzUH3"] = capitalize(
      String(contactData.finalDecisionStatus).trim()
    );
  }
  const interview = toGhlDate(contactData.interview);
  if (interview) customField["P1PnG6PqDqPSOpxI85iN"] = interview;
  if (contactData.score != null) {
    customField["P1fCAXatdJS0Q7KCR1vz"] = String(contactData.score);
  }
  if (contactData.communicationSkills != null) {
    customField["i5TsZMwxsL4zf1cpyOX6"] = String(
      contactData.communicationSkills
    );
  }
  if (contactData.culturalFit != null) {
    customField["pmk0Nq5WCDlBX7CJ4cv8"] = String(contactData.culturalFit);
  }
  if (contactData.expectedSalary != null) {
    customField["RcjIIRzPgSf0Jg8z3vtG"] = String(contactData.expectedSalary);
  }
  if (contactData.experienceYears != null) {
    customField["RODD0qGo2oGxNBFgbkBK"] = String(contactData.experienceYears);
  }
  if (contactData.hiPeopleAssessmentLink != null) {
    customField["m7h2tz9JaXUukb2P4DM6"] = contactData.hiPeopleAssessmentLink;
  }
  if (contactData.hiPeoplePercentile != null) {
    customField["n4uIIQoNV9Kb5pCagkym"] = String(
      contactData.hiPeoplePercentile
    );
  }
  if (contactData.problemSolving != null) {
    customField["fnSdWp8nbofgf6jaHIxA"] = String(contactData.problemSolving);
  }
  if (contactData.leadershipInitiative != null) {
    customField["YNpq6139B2eRhE3Aoexu"] = String(
      contactData.leadershipInitiative
    );
  }
  if (contactData.technicalProficiency != null) {
    customField["scbqBrtEsihBxWmNpZyw"] = String(
      contactData.technicalProficiency
    );
  }
  if (contactData.skills != null) {
    customField["xjnAKyMcQF6fTMdl0uPf"] = contactData.skills.join(", ");
  }
  const payload = {
    ...contactData.firstName && { firstName: contactData.firstName },
    ...contactData.lastName && { lastName: contactData.lastName },
    ...contactData.email && { email: contactData.email },
    ...contactData.phone && { phone: contactData.phone },
    ...contactData.tags?.length ? { tags: contactData.tags } : {},
    ...contactData.location && { location: contactData.location },
    // Include only when we actually have custom fields to update
    ...Object.keys(customField).length ? { customField } : {}
  };
  try {
    const response = await axios2.put(
      `${GHL_BASE_URL}/contacts/${contactId}`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${credentials.apiKey}`,
          Accept: "application/json",
          "Content-Type": "application/json"
        }
      }
    );
    console.log("\u2705 GHL contact updated successfully:", { payload });
    return response.data;
  } catch (error) {
    console.error("\u274C Failed to update GHL contact:", {
      contactId,
      error: error.response?.data || error.message
    });
    throw new Error(
      `GHL API Error: ${error.response?.data?.message || error.message}`
    );
  }
}
async function getGHLContact(contactId, credentials, userId) {
  if (!credentials) {
    const creds = await getGHLCredentials(userId);
    if (!creds) {
      throw new Error("GHL credentials not found. Please connect your GHL account in Settings \u2192 Integrations.");
    }
    credentials = creds;
  }
  try {
    const response = await axios2.get(`${GHL_BASE_URL}/contacts/${contactId}`, {
      headers: {
        Authorization: `Bearer ${credentials.apiKey}`,
        "Content-Type": "application/json"
      }
    });
    return response.data;
  } catch (error) {
    console.error("\u274C Failed to get GHL contact:", {
      contactId,
      error: error.response?.data || error.message
    });
    throw new Error(
      `GHL API Error: ${error.response?.data?.message || error.message}`
    );
  }
}
function parseFullName(fullName) {
  const nameParts = fullName.trim().split(" ");
  if (nameParts.length === 1) {
    return {
      firstName: nameParts[0],
      lastName: ""
    };
  }
  return {
    firstName: nameParts[0],
    lastName: nameParts.slice(1).join(" ")
  };
}
async function updateCandidateInGHL(candidate, userId) {
  if (!candidate.ghlContactId) {
    throw new Error("Candidate must have a GHL contact ID to update");
  }
  const credentials = await getGHLCredentials(userId);
  if (!credentials) {
    throw new Error("GHL credentials not found. Please connect your GHL account in Settings \u2192 Integrations.");
  }
  const { firstName, lastName } = parseFullName(candidate.name);
  let jobTitle = "Unknown Role";
  if (candidate.job && typeof candidate.job === "object") {
    jobTitle = candidate.job.title || candidate.job.suggestedTitle || "Unknown Role";
  }
  const roleTag = mapJobTitleToGHLTag(jobTitle);
  const statusTag = mapStatusToGHLTag(candidate.status);
  const tags = [roleTag, statusTag];
  const updateData = {
    firstName,
    lastName,
    phone: candidate.phone || "",
    location: candidate.location || "",
    interview: candidate.lastInterviewDate ? new Date(candidate.lastInterviewDate) : void 0,
    score: candidate.hiPeopleScore || void 0,
    communicationSkills: candidate.communicationSkills || void 0,
    culturalFit: candidate.culturalFit || void 0,
    expectedSalary: candidate.expectedSalary || void 0,
    experienceYears: candidate.experienceYears || void 0,
    finalDecisionStatus: candidate.finalDecisionStatus || void 0,
    hiPeopleAssessmentLink: candidate.hiPeopleAssessmentLink || void 0,
    hiPeoplePercentile: candidate.hiPeoplePercentile || void 0,
    hiPeopleCompletedAt: candidate.hiPeopleCompletedAt ? new Date(candidate.hiPeopleCompletedAt) : void 0,
    leadershipInitiative: candidate.leadershipInitiative || void 0,
    resumeUrl: candidate.resumeUrl || void 0,
    status: candidate.status,
    technicalProficiency: candidate.technicalProficiency || void 0,
    skills: candidate.skills || [],
    problemSolving: candidate.problemSolving || void 0,
    tags
  };
  try {
    const response = await updateGHLContact(
      candidate.ghlContactId,
      updateData,
      credentials,
      userId
    );
    console.log("\u2705 Successfully updated candidate in GHL:", {
      updateData
    });
    return response;
  } catch (error) {
    console.error("\u274C Failed to update candidate in GHL:", {
      candidateId: candidate.id,
      candidateName: candidate.name,
      ghlContactId: candidate.ghlContactId,
      error: error.message
    });
    throw error;
  }
}
var GHL_BASE_URL, GHL_V2_BASE_URL, toGhlDate;
var init_ghl_integration = __esm({
  "server/ghl-integration.ts"() {
    "use strict";
    init_storage();
    GHL_BASE_URL = "https://rest.gohighlevel.com/v1";
    GHL_V2_BASE_URL = "https://services.leadconnectorhq.com";
    toGhlDate = (input) => {
      if (!input) return void 0;
      const d = typeof input === "string" ? new Date(input) : input;
      if (Number.isNaN(d.getTime())) return void 0;
      return d.toISOString().slice(0, 10);
    };
  }
});

// server/api/resume-parser.ts
var resume_parser_exports = {};
__export(resume_parser_exports, {
  parseResume: () => parseResume
});
import axios3 from "axios";
async function extractTextFromPDF(pdfBuffer) {
  try {
    const module = await import("module");
    const createRequire = module.createRequire || module.default.createRequire;
    if (!createRequire) {
      throw new Error("createRequire not found in module");
    }
    const require2 = createRequire(import.meta.url);
    const pdfParseModule = require2("pdf-parse");
    const PDFParse = pdfParseModule.PDFParse;
    if (!PDFParse || typeof PDFParse !== "function") {
      throw new Error("PDFParse class not found in pdf-parse module");
    }
    const parser = new PDFParse({ data: pdfBuffer });
    const result = await parser.getText();
    return result.text || "";
  } catch (error) {
    console.error("Error extracting text from PDF:", error);
    throw new Error("Failed to extract text from PDF. Please ensure the file is a valid PDF.");
  }
}
async function parseResume(resumeUrl, apiKey) {
  try {
    if (!apiKey) {
      throw new Error("OpenRouter API key is required");
    }
    const resumeResponse = await axios3.get(resumeUrl, {
      responseType: "arraybuffer"
    });
    const pdfBuffer = Buffer.from(resumeResponse.data);
    const resumeText = await extractTextFromPDF(pdfBuffer);
    if (!resumeText || resumeText.trim().length < 50) {
      throw new Error("Could not extract sufficient text from resume PDF");
    }
    const prompt = `Please parse the following resume text and extract structured information. Return ONLY valid JSON with this exact structure (no markdown, no code blocks, just JSON):

{
  "name": "Full Name",
  "email": "email@example.com",
  "phone": "+1234567890",
  "location": "City, Country",
  "skills": ["Skill1", "Skill2", "Skill3"],
  "experienceYears": 5,
  "experience": [
    {
      "company": "Company Name",
      "position": "Job Title",
      "duration": "Jan 2020 - Present",
      "description": "Job description"
    }
  ],
  "education": [
    {
      "institution": "University Name",
      "degree": "Bachelor of Science",
      "field": "Computer Science",
      "year": "2020"
    }
  ],
  "summary": "Professional summary"
}

Resume text:
${resumeText.substring(0, 8e3)}`;
    const url = "https://openrouter.ai/api/v1/chat/completions";
    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": "https://hireos.app",
      "X-Title": "HireOS Resume Parser"
    };
    const data = {
      model: "google/gemini-2.0-flash-001",
      // Cost-effective and fast
      messages: [
        {
          role: "system",
          content: "You are an expert resume parser. Extract structured data from resumes and return ONLY valid JSON. Do not include any markdown formatting, code blocks, or explanations - just the raw JSON object."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.1,
      // Low temperature for consistent parsing
      max_tokens: 2e3
    };
    const response = await axios3.post(url, data, { headers });
    const content = response.data.choices[0].message.content || "";
    let jsonText = content.trim();
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    } else if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/```\n?/g, "").trim();
    }
    const parsed = JSON.parse(jsonText);
    if (parsed.skills && Array.isArray(parsed.skills)) {
      parsed.skills = parsed.skills.filter((skill) => skill && typeof skill === "string");
    }
    return parsed;
  } catch (error) {
    const axiosError = error;
    const errorResponse = axiosError.response?.data;
    const errorMessage = errorResponse ? `${errorResponse.error?.message || JSON.stringify(errorResponse)}` : error instanceof Error ? error.message : String(error);
    console.error("Error parsing resume:", errorMessage);
    throw new Error(`Failed to parse resume: ${errorMessage}`);
  }
}
var init_resume_parser = __esm({
  "server/api/resume-parser.ts"() {
    "use strict";
  }
});

// server/api/ai-matching.ts
var ai_matching_exports = {};
__export(ai_matching_exports, {
  calculateMatchScore: () => calculateMatchScore
});
import axios4 from "axios";
async function calculateMatchScore(candidate, job, apiKey) {
  try {
    if (!apiKey) {
      throw new Error("OpenRouter API key is required");
    }
    const candidateSkills = candidate.skills || (candidate.parsedResumeData?.skills || []).map((s) => s.toLowerCase());
    const candidateExperience = candidate.experienceYears || candidate.parsedResumeData?.experienceYears || 0;
    const jobSkills = (job.skills || "").split(/[,;]/).map((s) => s.trim().toLowerCase()).filter((s) => s.length > 0);
    const prompt = `You are an expert recruiter. Analyze how well this candidate matches the job requirements and provide a match score (0-100).

JOB REQUIREMENTS:
Title: ${job.title}
Department: ${job.department || "Not specified"}
Type: ${job.type || "Not specified"}
Required Skills: ${jobSkills.length > 0 ? jobSkills.join(", ") : "Not specified"}
Description: ${job.description?.substring(0, 1e3) || "Not provided"}

CANDIDATE PROFILE:
Name: ${candidate.name}
Skills: ${candidateSkills.length > 0 ? candidateSkills.join(", ") : "Not specified"}
Years of Experience: ${candidateExperience}
${candidate.parsedResumeData?.summary ? `Summary: ${candidate.parsedResumeData.summary.substring(0, 500)}` : ""}

Please analyze the match and return ONLY valid JSON with this exact structure (no markdown, no code blocks, just JSON):

{
  "score": 85,
  "explanation": "Detailed explanation of why this score was given (2-3 sentences)",
  "strengths": ["Has React experience", "5+ years in software development"],
  "weaknesses": ["Missing Python skills", "No experience with cloud platforms"],
  "recommendations": ["Consider if Python can be learned on the job", "Assess cloud experience in interview"]
}

The score should be:
- 90-100: Excellent match, highly recommended
- 70-89: Good match, strong candidate
- 50-69: Moderate match, some gaps but viable
- 30-49: Weak match, significant gaps
- 0-29: Poor match, not recommended

Be honest and specific in your analysis.`;
    const url = "https://openrouter.ai/api/v1/chat/completions";
    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": "https://hireos.app",
      "X-Title": "HireOS AI Matching"
    };
    const data = {
      model: "google/gemini-2.0-flash-001",
      // Cost-effective and fast
      messages: [
        {
          role: "system",
          content: "You are an expert recruiter who analyzes candidate-job matches. Return ONLY valid JSON with the match analysis. Do not include any markdown formatting, code blocks, or explanations outside the JSON - just the raw JSON object."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      // Moderate temperature for balanced analysis
      max_tokens: 1500
    };
    const response = await axios4.post(url, data, { headers });
    const content = response.data.choices[0].message.content || "";
    let jsonText = content.trim();
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    } else if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/```\n?/g, "").trim();
    }
    const parsed = JSON.parse(jsonText);
    if (typeof parsed.score !== "number") {
      parsed.score = 0;
    } else {
      parsed.score = Math.max(0, Math.min(100, Math.round(parsed.score)));
    }
    parsed.strengths = parsed.strengths || [];
    parsed.weaknesses = parsed.weaknesses || [];
    parsed.recommendations = parsed.recommendations || [];
    return parsed;
  } catch (error) {
    const axiosError = error;
    const errorResponse = axiosError.response?.data;
    const errorMessage = errorResponse ? `${errorResponse.error?.message || JSON.stringify(errorResponse)}` : error instanceof Error ? error.message : String(error);
    console.error("Error calculating match score:", errorMessage);
    throw new Error(`Failed to calculate match score: ${errorMessage}`);
  }
}
var init_ai_matching = __esm({
  "server/api/ai-matching.ts"() {
    "use strict";
  }
});

// server/airtable-integration.ts
var airtable_integration_exports = {};
__export(airtable_integration_exports, {
  createOrUpdateAirtableContact: () => createOrUpdateAirtableContact,
  fetchAirtableContacts: () => fetchAirtableContacts,
  getAirtableCredentials: () => getAirtableCredentials,
  getAirtableFieldValue: () => getAirtableFieldValue,
  updateCandidateInAirtable: () => updateCandidateInAirtable
});
import axios5 from "axios";
async function getAirtableCredentials(userId) {
  if (!userId) {
    return null;
  }
  const integration = await storage.getPlatformIntegration("airtable", userId);
  if (!integration || !integration.credentials) {
    return null;
  }
  const credentials = integration.credentials;
  if (!credentials.apiKey || !credentials.baseId) {
    return null;
  }
  return {
    apiKey: credentials.apiKey,
    baseId: credentials.baseId,
    tableName: credentials.tableName || "Candidates",
    fieldMappings: credentials.fieldMappings || {}
  };
}
function getAirtableFieldName(hireOSField, mappings) {
  if (mappings && mappings[hireOSField]) {
    return mappings[hireOSField];
  }
  return DEFAULT_FIELD_NAMES[hireOSField] || hireOSField;
}
function getAirtableFieldValue(record, hireOSField, mappings) {
  const fieldName = getAirtableFieldName(hireOSField, mappings);
  const fields = record.fields || {};
  if (fields[fieldName] !== void 0) {
    return fields[fieldName];
  }
  const lowerFieldName = fieldName.toLowerCase();
  for (const key in fields) {
    if (key.toLowerCase() === lowerFieldName) {
      return fields[key];
    }
  }
  return void 0;
}
async function createOrUpdateAirtableContact(contactData, userId) {
  const credentials = await getAirtableCredentials(userId);
  if (!credentials) {
    throw new Error("Airtable credentials not found. Please connect your Airtable account in Settings \u2192 Integrations.");
  }
  const tableName = credentials.tableName || "Candidates";
  try {
    const emailFieldName = getAirtableFieldName("email", credentials.fieldMappings);
    const emailValue = contactData[emailFieldName] || contactData.Email;
    if (!emailValue) {
      throw new Error("Email is required to find or create Airtable contact");
    }
    const searchResponse = await axios5.get(
      `${AIRTABLE_API_BASE}/${credentials.baseId}/${tableName}`,
      {
        headers: {
          Authorization: `Bearer ${credentials.apiKey}`,
          "Content-Type": "application/json"
        },
        params: {
          filterByFormula: `{${emailFieldName}} = "${emailValue}"`,
          maxRecords: 1
        }
      }
    );
    const existingRecords = searchResponse.data.records || [];
    if (existingRecords.length > 0) {
      const existingRecord = existingRecords[0];
      const recordId = existingRecord.id;
      const airtableLastModified = existingRecord.lastModifiedTime ? new Date(existingRecord.lastModifiedTime) : existingRecord.createdTime ? new Date(existingRecord.createdTime) : null;
      const hireOSLastModified = contactData.updatedAt ? new Date(contactData.updatedAt) : /* @__PURE__ */ new Date();
      if (airtableLastModified && airtableLastModified > hireOSLastModified) {
        return existingRecord;
      }
      const cleanContactData = {};
      for (const [key, value] of Object.entries(contactData)) {
        if (value !== void 0 && value !== null && value !== "") {
          if (key === "Status") {
            cleanContactData[key] = value;
          } else {
            cleanContactData[key] = value;
          }
        }
      }
      try {
        const updateResponse = await axios5.patch(
          `${AIRTABLE_API_BASE}/${credentials.baseId}/${tableName}/${recordId}`,
          {
            fields: cleanContactData
          },
          {
            headers: {
              Authorization: `Bearer ${credentials.apiKey}`,
              "Content-Type": "application/json"
            }
          }
        );
        return updateResponse.data;
      } catch (updateError) {
        if (updateError.response?.status === 422) {
          const errorType = updateError.response?.data?.error?.type;
          const errorMessage = updateError.response?.data?.error?.message || "";
          if (errorType === "UNKNOWN_FIELD_NAME") {
            const fieldMatch = errorMessage.match(/Unknown field name: "([^"]+)"/);
            if (fieldMatch && fieldMatch[1]) {
              const unknownField = fieldMatch[1];
              delete cleanContactData[unknownField];
              try {
                const retryResponse = await axios5.patch(
                  `${AIRTABLE_API_BASE}/${credentials.baseId}/${tableName}/${recordId}`,
                  {
                    fields: cleanContactData
                  },
                  {
                    headers: {
                      Authorization: `Bearer ${credentials.apiKey}`,
                      "Content-Type": "application/json"
                    }
                  }
                );
                return retryResponse.data;
              } catch (retryError) {
                const minimalData = {
                  Name: contactData.Name,
                  Email: contactData.Email
                };
                const minimalResponse = await axios5.patch(
                  `${AIRTABLE_API_BASE}/${credentials.baseId}/${tableName}/${recordId}`,
                  {
                    fields: minimalData
                  },
                  {
                    headers: {
                      Authorization: `Bearer ${credentials.apiKey}`,
                      "Content-Type": "application/json"
                    }
                  }
                );
                return minimalResponse.data;
              }
            }
          }
          if (errorType === "INVALID_MULTIPLE_CHOICE_OPTIONS" && cleanContactData.Status) {
            delete cleanContactData.Status;
            const retryResponse = await axios5.patch(
              `${AIRTABLE_API_BASE}/${credentials.baseId}/${tableName}/${recordId}`,
              {
                fields: cleanContactData
              },
              {
                headers: {
                  Authorization: `Bearer ${credentials.apiKey}`,
                  "Content-Type": "application/json"
                }
              }
            );
            return retryResponse.data;
          }
        }
        throw updateError;
      }
    } else {
      const cleanContactData = {};
      for (const [key, value] of Object.entries(contactData)) {
        if (value !== void 0 && value !== null && value !== "") {
          cleanContactData[key] = value;
        }
      }
      try {
        const createResponse = await axios5.post(
          `${AIRTABLE_API_BASE}/${credentials.baseId}/${tableName}`,
          {
            fields: cleanContactData
          },
          {
            headers: {
              Authorization: `Bearer ${credentials.apiKey}`,
              "Content-Type": "application/json"
            }
          }
        );
        return createResponse.data;
      } catch (createError) {
        if (createError.response?.status === 422) {
          const errorType = createError.response?.data?.error?.type;
          const errorMessage = createError.response?.data?.error?.message || "";
          if (errorType === "UNKNOWN_FIELD_NAME") {
            const fieldMatch = errorMessage.match(/Unknown field name: "([^"]+)"/);
            if (fieldMatch && fieldMatch[1]) {
              const unknownField = fieldMatch[1];
              delete cleanContactData[unknownField];
              try {
                const retryResponse = await axios5.post(
                  `${AIRTABLE_API_BASE}/${credentials.baseId}/${tableName}`,
                  {
                    fields: cleanContactData
                  },
                  {
                    headers: {
                      Authorization: `Bearer ${credentials.apiKey}`,
                      "Content-Type": "application/json"
                    }
                  }
                );
                return retryResponse.data;
              } catch (retryError) {
                const minimalData = {
                  Name: contactData.Name,
                  Email: contactData.Email
                };
                const minimalResponse = await axios5.post(
                  `${AIRTABLE_API_BASE}/${credentials.baseId}/${tableName}`,
                  {
                    fields: minimalData
                  },
                  {
                    headers: {
                      Authorization: `Bearer ${credentials.apiKey}`,
                      "Content-Type": "application/json"
                    }
                  }
                );
                return minimalResponse.data;
              }
            }
          }
          if (errorType === "INVALID_MULTIPLE_CHOICE_OPTIONS" && cleanContactData.Status) {
            delete cleanContactData.Status;
            const retryResponse = await axios5.post(
              `${AIRTABLE_API_BASE}/${credentials.baseId}/${tableName}`,
              {
                fields: cleanContactData
              },
              {
                headers: {
                  Authorization: `Bearer ${credentials.apiKey}`,
                  "Content-Type": "application/json"
                }
              }
            );
            return retryResponse.data;
          }
        }
        throw createError;
      }
    }
  } catch (error) {
    console.error("Failed to create/update Airtable contact:", error.response?.data || error.message);
    throw new Error(`Airtable API Error: ${error.response?.data?.message || error.message}`);
  }
}
async function updateCandidateInAirtable(candidate, userId) {
  if (!candidate.email) {
    throw new Error("Candidate must have an email to sync with Airtable");
  }
  const nameParts = candidate.name.trim().split(" ");
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || "";
  let jobTitle = "Unknown Role";
  if (candidate.job && typeof candidate.job === "object") {
    jobTitle = candidate.job.title || candidate.job.suggestedTitle || "Unknown Role";
  }
  const statusMap = {
    new: "New Application",
    assessment_sent: "Assessment Sent",
    assessment_completed: "Assessment Completed",
    interview_scheduled: "Interview Scheduled",
    interview_completed: "Interview Completed",
    offer_sent: "Offer Sent",
    talent_pool: "Talent Pool",
    rejected: "Rejected",
    hired: "Hired"
  };
  const credentials = await getAirtableCredentials(userId);
  if (!credentials) {
    throw new Error("Airtable credentials not found. Please connect your Airtable account in Settings \u2192 Integrations.");
  }
  const mappings = credentials.fieldMappings || {};
  const contactData = {};
  contactData[getAirtableFieldName("name", mappings)] = candidate.name;
  contactData[getAirtableFieldName("email", mappings)] = candidate.email;
  contactData.updatedAt = candidate.updatedAt || /* @__PURE__ */ new Date();
  if (candidate.phone) contactData[getAirtableFieldName("phone", mappings)] = candidate.phone;
  if (candidate.location) contactData[getAirtableFieldName("location", mappings)] = candidate.location;
  if (jobTitle && jobTitle !== "Unknown Role") contactData[getAirtableFieldName("jobTitle", mappings)] = jobTitle;
  const mappedStatus = statusMap[candidate.status];
  if (mappedStatus) {
    contactData[getAirtableFieldName("status", mappings)] = mappedStatus;
  }
  if (candidate.lastInterviewDate) {
    contactData[getAirtableFieldName("interviewDate", mappings)] = new Date(candidate.lastInterviewDate).toISOString().split("T")[0];
  }
  if (candidate.hiPeopleScore) contactData[getAirtableFieldName("score", mappings)] = candidate.hiPeopleScore;
  if (candidate.communicationSkills) contactData[getAirtableFieldName("communicationSkills", mappings)] = candidate.communicationSkills;
  if (candidate.culturalFit) contactData[getAirtableFieldName("culturalFit", mappings)] = candidate.culturalFit;
  if (candidate.expectedSalary) contactData[getAirtableFieldName("expectedSalary", mappings)] = candidate.expectedSalary;
  if (candidate.experienceYears) contactData[getAirtableFieldName("experienceYears", mappings)] = candidate.experienceYears;
  if (candidate.finalDecisionStatus) contactData[getAirtableFieldName("finalDecisionStatus", mappings)] = candidate.finalDecisionStatus;
  if (candidate.skills) {
    const skillsValue = Array.isArray(candidate.skills) ? candidate.skills.join(", ") : candidate.skills;
    contactData[getAirtableFieldName("skills", mappings)] = skillsValue;
  }
  try {
    const response = await createOrUpdateAirtableContact(contactData, userId);
    return response;
  } catch (error) {
    throw error;
  }
}
async function fetchAirtableContacts(limit = 100, userId) {
  const credentials = await getAirtableCredentials(userId);
  if (!credentials) {
    throw new Error("Airtable credentials not found. Please connect your Airtable account in Settings \u2192 Integrations.");
  }
  const tableName = "Candidates";
  const allRecords = [];
  let offset = void 0;
  try {
    do {
      const params = {
        maxRecords: Math.min(limit - allRecords.length, 100)
        // Airtable max is 100 per request
      };
      if (offset) {
        params.offset = offset;
      }
      const response = await axios5.get(
        `${AIRTABLE_API_BASE}/${credentials.baseId}/${tableName}`,
        {
          headers: {
            Authorization: `Bearer ${credentials.apiKey}`,
            "Content-Type": "application/json"
          },
          params
        }
      );
      const records = response.data.records || [];
      allRecords.push(...records);
      offset = response.data.offset;
    } while (offset && allRecords.length < limit);
    return allRecords;
  } catch (error) {
    throw new Error(`Airtable API Error: ${error.response?.data?.message || error.message}`);
  }
}
var AIRTABLE_API_BASE, DEFAULT_FIELD_NAMES;
var init_airtable_integration = __esm({
  "server/airtable-integration.ts"() {
    "use strict";
    init_storage();
    AIRTABLE_API_BASE = "https://api.airtable.com/v0";
    DEFAULT_FIELD_NAMES = {
      name: "Name",
      email: "Email",
      phone: "Phone",
      location: "Location",
      expectedSalary: "Expected Salary",
      experienceYears: "Experience Years",
      skills: "Skills",
      status: "Status",
      jobTitle: "Job Title",
      interviewDate: "Interview Date",
      score: "Score",
      communicationSkills: "Communication Skills",
      culturalFit: "Cultural Fit",
      finalDecisionStatus: "Final Decision Status"
    };
  }
});

// server/google-sheets-integration.ts
var google_sheets_integration_exports = {};
__export(google_sheets_integration_exports, {
  createOrUpdateGoogleSheetsContact: () => createOrUpdateGoogleSheetsContact,
  fetchGoogleSheetsContacts: () => fetchGoogleSheetsContacts,
  findRowByEmail: () => findRowByEmail,
  getGoogleSheetsCredentials: () => getGoogleSheetsCredentials,
  getGoogleSheetsFieldName: () => getGoogleSheetsFieldName,
  getGoogleSheetsFieldValue: () => getGoogleSheetsFieldValue,
  getGoogleSheetsSchema: () => getGoogleSheetsSchema
});
import { google as google2 } from "googleapis";
async function getGoogleSheetsCredentials(userId) {
  const integration = await storage.getPlatformIntegration("google-sheets", userId);
  if (!integration || integration.status !== "connected" || !integration.credentials) {
    return null;
  }
  return integration.credentials;
}
async function getSheetsClient(credentials, userId) {
  const oauth2Client = new google2.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  oauth2Client.setCredentials({
    access_token: credentials.accessToken,
    refresh_token: credentials.refreshToken
  });
  try {
    const tokenInfo = await oauth2Client.getAccessToken();
    if (!tokenInfo.token && credentials.refreshToken) {
      const { credentials: newCredentials } = await oauth2Client.refreshAccessToken();
      oauth2Client.setCredentials(newCredentials);
    }
  } catch (error) {
  }
  return google2.sheets({ version: GOOGLE_SHEETS_API_VERSION, auth: oauth2Client });
}
function getGoogleSheetsFieldName(hireOSField, mappings) {
  if (!mappings) {
    const defaults = {
      name: "Name",
      email: "Email",
      phone: "Phone",
      location: "Location",
      expectedSalary: "Expected Salary",
      experienceYears: "Experience Years",
      skills: "Skills",
      status: "Status",
      jobTitle: "Job Title"
    };
    return defaults[hireOSField] || hireOSField;
  }
  return mappings[hireOSField] || hireOSField;
}
function getGoogleSheetsFieldValue(row, headers, hireOSField, mappings) {
  const fieldName = getGoogleSheetsFieldName(hireOSField, mappings);
  const columnIndex = headers.findIndex((h) => h.toLowerCase() === fieldName.toLowerCase());
  if (columnIndex === -1 || columnIndex >= row.length) {
    return null;
  }
  const value = row[columnIndex];
  return value !== void 0 && value !== null && value !== "" ? String(value) : null;
}
async function fetchGoogleSheetsContacts(maxRecords = 1e3, userId) {
  if (!userId) {
    throw new Error("User ID is required");
  }
  const credentials = await getGoogleSheetsCredentials(userId);
  if (!credentials) {
    throw new Error("Google Sheets credentials not found. Please connect your Google Sheets account.");
  }
  try {
    const sheets = await getSheetsClient(credentials, userId);
    const spreadsheetId = credentials.spreadsheetId;
    const sheetName = credentials.sheetName || "Sheet1";
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!1:1`
      // First row
    });
    const headers = headerResponse.data.values?.[0] || [];
    if (headers.length === 0) {
      throw new Error("No headers found in Google Sheets. Please ensure the first row contains column names.");
    }
    const dataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!2:${maxRecords + 1}`
      // Start from row 2 (skip header)
    });
    const rows = dataResponse.data.values || [];
    return rows.map((row, index) => ({
      id: `row_${index + 2}`,
      // Use row number as ID
      rowNumber: index + 2,
      // Actual row number in sheet (1-indexed, but row 1 is headers)
      data: row,
      headers
      // Include headers for field mapping
    }));
  } catch (error) {
    throw new Error(`Google Sheets API Error: ${error.response?.data?.error?.message || error.message}`);
  }
}
async function getGoogleSheetsSchema(userId) {
  const credentials = await getGoogleSheetsCredentials(userId);
  if (!credentials) {
    throw new Error("Google Sheets credentials not found");
  }
  try {
    const sheets = await getSheetsClient(credentials, userId);
    const spreadsheetId = credentials.spreadsheetId;
    const sheetName = credentials.sheetName || "Sheet1";
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!1:1`
    });
    const headers = headerResponse.data.values?.[0] || [];
    return {
      fields: headers.map((header) => ({
        name: header,
        type: "string"
        // Google Sheets doesn't have strict types like Airtable
      }))
    };
  } catch (error) {
    throw new Error(`Failed to fetch Google Sheets schema: ${error.message}`);
  }
}
async function createOrUpdateGoogleSheetsContact(candidate, userId, rowNumber) {
  const credentials = await getGoogleSheetsCredentials(userId);
  if (!credentials) {
    throw new Error("Google Sheets credentials not found");
  }
  const mappings = credentials.fieldMappings;
  try {
    const sheets = await getSheetsClient(credentials, userId);
    const spreadsheetId = credentials.spreadsheetId;
    const sheetName = credentials.sheetName || "Sheet1";
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!1:1`
    });
    const headers = headerResponse.data.values?.[0] || [];
    const rowData = new Array(headers.length).fill("");
    const fieldMappings = {
      name: (c) => c.name || "",
      email: (c) => c.email || "",
      phone: (c) => c.phone || "",
      location: (c) => c.location || "",
      expectedSalary: (c) => c.expectedSalary?.toString() || "",
      experienceYears: (c) => c.experienceYears?.toString() || "",
      skills: (c) => (c.skills && Array.isArray(c.skills) ? c.skills.join(", ") : "") || "",
      status: (c) => c.status || "",
      jobTitle: (c) => c.jobTitle || ""
    };
    for (const [hireOSField, getValue] of Object.entries(fieldMappings)) {
      const columnName = getGoogleSheetsFieldName(hireOSField, mappings);
      const columnIndex = headers.findIndex((h) => h.toLowerCase() === columnName.toLowerCase());
      if (columnIndex !== -1) {
        rowData[columnIndex] = getValue(candidate);
      }
    }
    if (rowNumber) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!${rowNumber}:${rowNumber}`,
        valueInputOption: "RAW",
        requestBody: {
          values: [rowData]
        }
      });
    } else {
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${sheetName}!A:Z`,
        // Append to end
        valueInputOption: "RAW",
        insertDataOption: "INSERT_ROWS",
        requestBody: {
          values: [rowData]
        }
      });
    }
  } catch (error) {
    throw new Error(`Failed to create/update Google Sheets contact: ${error.response?.data?.error?.message || error.message}`);
  }
}
async function findRowByEmail(email, userId) {
  const credentials = await getGoogleSheetsCredentials(userId);
  if (!credentials) {
    return null;
  }
  try {
    const sheets = await getSheetsClient(credentials, userId);
    const spreadsheetId = credentials.spreadsheetId;
    const sheetName = credentials.sheetName || "Sheet1";
    const mappings = credentials.fieldMappings;
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!1:1`
    });
    const headers = headerResponse.data.values?.[0] || [];
    const emailColumn = getGoogleSheetsFieldName("email", mappings);
    const emailColumnIndex = headers.findIndex((h) => h.toLowerCase() === emailColumn.toLowerCase());
    if (emailColumnIndex === -1) {
      return null;
    }
    const dataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!2:1000`
      // Start from row 2
    });
    const rows = dataResponse.data.values || [];
    for (let i = 0; i < rows.length; i++) {
      if (rows[i][emailColumnIndex]?.toLowerCase() === email.toLowerCase()) {
        return i + 2;
      }
    }
    return null;
  } catch (error) {
    return null;
  }
}
var GOOGLE_SHEETS_API_VERSION;
var init_google_sheets_integration = __esm({
  "server/google-sheets-integration.ts"() {
    "use strict";
    init_storage();
    GOOGLE_SHEETS_API_VERSION = "v4";
  }
});

// server/workflow-engine.ts
var workflow_engine_exports = {};
__export(workflow_engine_exports, {
  WorkflowActionLibrary: () => WorkflowActionLibrary,
  executeWorkflow: () => executeWorkflow,
  triggerWorkflows: () => triggerWorkflows
});
function replaceVariables(template, context) {
  let result = template;
  const variableRegex = /\{\{([^}]+)\}\}/g;
  result = result.replace(variableRegex, (match, path2) => {
    const keys = path2.trim().split(".");
    let value = context;
    for (const key of keys) {
      if (value && typeof value === "object" && key in value) {
        value = value[key];
      } else {
        return match;
      }
    }
    if (value instanceof Date) {
      return value.toLocaleString();
    }
    return value != null ? String(value) : match;
  });
  return result;
}
function evaluateCondition(condition, context) {
  try {
    let evalCondition = replaceVariables(condition, context);
    const varRegex = /\{\{([^}]+)\}\}/g;
    evalCondition = evalCondition.replace(varRegex, (match, path2) => {
      const keys = path2.trim().split(".");
      let value = context;
      for (const key of keys) {
        if (value && typeof value === "object" && key in value) {
          value = value[key];
        } else {
          return "null";
        }
      }
      return value != null ? String(value) : "null";
    });
    return new Function("return " + evalCondition)();
  } catch (error) {
    console.error("[Workflow Engine] Condition evaluation error:", error);
    return false;
  }
}
async function executeWorkflow(workflow, accountId, executionData = {}) {
  const execution = await storage.createWorkflowExecution({
    accountId,
    workflowId: workflow.id,
    status: "running",
    triggerEntityType: executionData.entityType,
    triggerEntityId: executionData.entityId,
    executionData
  });
  try {
    const context = {
      ...executionData,
      candidate: executionData.candidate,
      interview: executionData.interview,
      job: executionData.job,
      user: executionData.user
    };
    const steps = workflow.steps || [];
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const stepExecution = await storage.createWorkflowExecutionStep({
        executionId: execution.id,
        stepIndex: i,
        actionType: step.type,
        actionConfig: step.config,
        status: "running",
        startedAt: /* @__PURE__ */ new Date()
      });
      try {
        const result = await WorkflowActionLibrary.executeAction(
          step.type,
          step.config,
          context,
          accountId
        );
        await storage.updateWorkflowExecutionStep(stepExecution.id, {
          status: "completed",
          result,
          completedAt: /* @__PURE__ */ new Date()
        });
      } catch (error) {
        await storage.updateWorkflowExecutionStep(stepExecution.id, {
          status: "failed",
          errorMessage: error.message,
          completedAt: /* @__PURE__ */ new Date()
        });
        console.error(`[Workflow ${workflow.id}] Step ${i} failed:`, error);
      }
    }
    await storage.updateWorkflowExecution(execution.id, accountId, {
      status: "completed",
      completedAt: /* @__PURE__ */ new Date()
    });
    await storage.incrementWorkflowExecutionCount(workflow.id, accountId);
    return await storage.getWorkflowExecutions(workflow.id, accountId, 1).then((execs) => execs[0]);
  } catch (error) {
    await storage.updateWorkflowExecution(execution.id, accountId, {
      status: "failed",
      errorMessage: error.message,
      completedAt: /* @__PURE__ */ new Date()
    });
    throw error;
  }
}
async function triggerWorkflows(triggerType, triggerData, accountId) {
  try {
    const workflows3 = await storage.getActiveWorkflowsByTrigger(
      accountId,
      triggerType,
      triggerData
    );
    for (const workflow of workflows3) {
      executeWorkflow(workflow, accountId, triggerData).catch((error) => {
        console.error(`[Workflow ${workflow.id}] Execution error:`, error);
      });
    }
  } catch (error) {
    console.error("[Workflow Trigger] Error:", error);
  }
}
var WorkflowActionLibrary;
var init_workflow_engine = __esm({
  "server/workflow-engine.ts"() {
    "use strict";
    init_storage();
    init_gmail_integration();
    WorkflowActionLibrary = class {
      static getAvailableActions() {
        return [
          {
            type: "send_email",
            name: "Send Email",
            description: "Send an email to candidate or team member",
            icon: "\u{1F4E7}",
            configFields: [
              { name: "to", label: "To", type: "text", required: true, placeholder: "{{candidate.email}}" },
              { name: "subject", label: "Subject", type: "text", required: true },
              { name: "body", label: "Body", type: "textarea", required: true },
              { name: "template", label: "Email Template", type: "select", options: ["welcome", "interview_confirmation", "rejection", "offer"] }
            ]
          },
          {
            type: "update_status",
            name: "Update Candidate Status",
            description: "Change candidate's status in the pipeline",
            icon: "\u{1F504}",
            configFields: [
              { name: "status", label: "New Status", type: "select", required: true, options: [
                "new",
                "assessment_sent",
                "assessment_completed",
                "interview_scheduled",
                "interview_completed",
                "offer_sent",
                "offer_accepted",
                "rejected",
                "hired"
              ] }
            ]
          },
          {
            type: "create_interview",
            name: "Schedule Interview",
            description: "Automatically create an interview",
            icon: "\u{1F4C5}",
            configFields: [
              { name: "type", label: "Interview Type", type: "select", required: true, options: ["phone", "video", "onsite"] },
              { name: "interviewerId", label: "Interviewer", type: "user_select", required: true },
              { name: "scheduledDate", label: "Scheduled Date", type: "datetime", required: true }
            ]
          },
          {
            type: "notify_slack",
            name: "Notify Slack",
            description: "Send notification to Slack channel",
            icon: "\u{1F4AC}",
            configFields: [
              { name: "channel", label: "Channel", type: "text", required: true, placeholder: "#hiring" },
              { name: "message", label: "Message", type: "textarea", required: true }
            ]
          },
          {
            type: "update_crm",
            name: "Update CRM",
            description: "Sync data to Google Sheets or Airtable",
            icon: "\u{1F4CA}",
            configFields: [
              { name: "platform", label: "Platform", type: "select", required: true, options: ["google_sheets", "airtable"] },
              { name: "action", label: "Action", type: "select", required: true, options: ["create", "update"] },
              { name: "data", label: "Data", type: "json", required: true }
            ]
          },
          {
            type: "wait",
            name: "Wait/Delay",
            description: "Pause workflow for specified duration",
            icon: "\u23F3",
            configFields: [
              { name: "duration", label: "Duration (hours)", type: "number", required: true }
            ]
          },
          {
            type: "condition",
            name: "Conditional Logic",
            description: "Run different actions based on condition",
            icon: "\u{1F500}",
            configFields: [
              { name: "condition", label: "Condition", type: "text", required: true, placeholder: "{{candidate.hiPeopleScore}} >= 80" }
            ]
          }
        ];
      }
      static async executeAction(actionType, actionConfig, context, accountId) {
        switch (actionType) {
          case "send_email":
            return await this.sendEmail(actionConfig, context, accountId);
          case "update_status":
            return await this.updateStatus(actionConfig, context, accountId);
          case "create_interview":
            return await this.createInterview(actionConfig, context, accountId);
          case "notify_slack":
            return await this.notifySlack(actionConfig, context, accountId);
          case "update_crm":
            return await this.updateCRM(actionConfig, context, accountId);
          case "wait":
            return await this.wait(actionConfig);
          case "condition":
            return await this.condition(actionConfig, context, accountId);
          default:
            throw new Error(`Unknown action type: ${actionType}`);
        }
      }
      static async sendEmail(config, context, accountId) {
        let to = replaceVariables(config.to || "", context);
        let subject = replaceVariables(config.subject || "", context);
        let body = replaceVariables(config.body || "", context);
        if (config.template && context.user) {
          const user = await storage.getUser(context.user.id);
          const templates = user?.emailTemplates || {};
          const template = templates[config.template];
          if (template) {
            body = replaceVariables(template.body || "", context);
            const templateSubject = replaceVariables(template.subject || "", context);
            if (templateSubject) subject = templateSubject;
            if (template.to) {
              to = replaceVariables(template.to, context);
            }
          }
        }
        if (!to || !to.includes("@") || to.includes("{{") || to.includes("}}")) {
          throw new Error(`Invalid or missing email address: ${to}. Please ensure candidate email is provided.`);
        }
        try {
          if (context.user) {
            await sendGmailEmail(context.user.id, to, subject, body);
            return { success: true, method: "gmail" };
          }
        } catch (error) {
          console.error("[Workflow] Gmail send failed, trying direct email:", error);
        }
        await storage.sendDirectEmail(to, subject, body, context.user?.id);
        return { success: true, method: "direct" };
      }
      static async updateStatus(config, context, accountId) {
        if (!context.candidate) {
          throw new Error("Candidate context required for update_status action");
        }
        await storage.updateCandidate(context.candidate.id, accountId, {
          status: config.status
        });
        return { success: true, newStatus: config.status };
      }
      static async createInterview(config, context, accountId) {
        if (!context.candidate) {
          throw new Error("Candidate context required for create_interview action");
        }
        const interview = await storage.createInterview({
          accountId,
          candidateId: context.candidate.id,
          interviewerId: config.interviewerId,
          type: config.type || "video",
          scheduledDate: config.scheduledDate ? new Date(config.scheduledDate) : void 0,
          status: "scheduled"
        });
        return { success: true, interviewId: interview.id };
      }
      static async notifySlack(config, context, accountId) {
        const channel = config.channel || "#hiring";
        const message = replaceVariables(config.message || "", context);
        if (!message) {
          throw new Error("Slack message is required");
        }
        if (context.user) {
          await storage.sendSlackNotification(context.user.id, message);
        } else {
          throw new Error("User context required for Slack notification");
        }
        return { success: true, channel, message };
      }
      static async updateCRM(config, context, accountId) {
        return { success: true, platform: config.platform };
      }
      static async wait(config) {
        const hours = config.duration || 0;
        const ms = hours * 60 * 60 * 1e3;
        await new Promise((resolve) => setTimeout(resolve, ms));
        return { success: true, waitedHours: hours };
      }
      static async condition(config, context, accountId) {
        const conditionMet = evaluateCondition(config.condition, context);
        const stepsToExecute = conditionMet ? config.thenSteps : config.elseSteps;
        if (stepsToExecute && Array.isArray(stepsToExecute)) {
          for (const step of stepsToExecute) {
            await this.executeAction(step.type, step.config, context, accountId);
          }
        }
        return { success: true, conditionMet };
      }
    };
  }
});

// server/index.ts
import dns2 from "dns";
import "dotenv/config";
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// server/auth.ts
init_storage();
init_schema();
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session2 from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

// server/security/rate-limit.ts
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
var apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1e3,
  // 15 minutes
  max: 100,
  // 100 requests per window
  message: {
    error: "Too many requests from this IP, please try again later",
    retryAfter: "15 minutes"
  },
  standardHeaders: true,
  // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false,
  // Disable `X-RateLimit-*` headers
  // Skip rate limiting for authenticated users in some cases
  skip: (req) => {
    return false;
  }
});
var authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1e3,
  // 15 minutes
  max: 5,
  // 5 attempts per window
  message: {
    error: "Too many authentication attempts, please try again later",
    retryAfter: "15 minutes"
  },
  standardHeaders: true,
  legacyHeaders: false,
  // SECURITY: Use proper IP key generator for IPv6 support
  keyGenerator: (req) => {
    return ipKeyGenerator(req.ip || req.socket.remoteAddress || "unknown");
  }
});
var sensitiveRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1e3,
  // 15 minutes
  max: 20,
  // 20 requests per window
  message: {
    error: "Too many requests to this endpoint, please try again later",
    retryAfter: "15 minutes"
  },
  standardHeaders: true,
  legacyHeaders: false
});
var uploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1e3,
  // 1 hour
  max: 10,
  // 10 uploads per hour
  message: {
    error: "Too many file uploads, please try again later",
    retryAfter: "1 hour"
  },
  standardHeaders: true,
  legacyHeaders: false
});

// server/security/sanitize.ts
import sanitizeHtml from "sanitize-html";
function sanitizeTextInput(text2) {
  if (!text2 || typeof text2 !== "string") {
    return "";
  }
  return text2.replace(/[<>]/g, "").replace(/javascript:/gi, "").replace(/on\w+\s*=/gi, "").trim();
}
function sanitizeEmailContent(html) {
  return sanitizeHtml(html, {
    allowedTags: ["p", "br", "a", "b", "i", "u", "strong", "em", "ul", "ol", "li"],
    allowedAttributes: {
      "a": ["href"]
    },
    allowedSchemes: ["http", "https", "mailto"]
  });
}
function sanitizeForLogging(data) {
  if (!data || typeof data !== "object") {
    return data;
  }
  const sensitiveFields = [
    "password",
    "apiKey",
    "api_key",
    "token",
    "secret",
    "key",
    "openRouterApiKey",
    "calendlyToken",
    "oauthToken",
    "oauthRefreshToken",
    "credentials",
    "slackWebhookUrl"
  ];
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeForLogging(item));
  }
  const sanitized = { ...data };
  for (const key of Object.keys(sanitized)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveFields.some((field) => lowerKey.includes(field.toLowerCase()))) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof sanitized[key] === "object" && sanitized[key] !== null) {
      sanitized[key] = sanitizeForLogging(sanitized[key]);
    }
  }
  return sanitized;
}

// server/security/logger.ts
var SecureLogger = class {
  /**
   * Log info message (sanitized)
   */
  static info(message, data) {
    const sanitizedData = data ? sanitizeForLogging(data) : void 0;
    if (sanitizedData) {
      console.log(`[INFO] ${message}`, sanitizedData);
    } else {
      console.log(`[INFO] ${message}`);
    }
  }
  /**
   * Log error message (sanitized)
   */
  static error(message, error) {
    if (error) {
      const sanitizedError = sanitizeForLogging(error);
      if (process.env.NODE_ENV === "production") {
        console.error(`[ERROR] ${message}`, {
          message: error?.message || String(error)
          // Don't include stack in production
        });
      } else {
        console.error(`[ERROR] ${message}`, sanitizedError);
      }
    } else {
      console.error(`[ERROR] ${message}`);
    }
  }
  /**
   * Log warning message (sanitized)
   */
  static warn(message, data) {
    const sanitizedData = data ? sanitizeForLogging(data) : void 0;
    if (sanitizedData) {
      console.warn(`[WARN] ${message}`, sanitizedData);
    } else {
      console.warn(`[WARN] ${message}`);
    }
  }
  /**
   * Log debug message (only in development)
   */
  static debug(message, data) {
    if (process.env.NODE_ENV === "development") {
      const sanitizedData = data ? sanitizeForLogging(data) : void 0;
      if (sanitizedData) {
        console.debug(`[DEBUG] ${message}`, sanitizedData);
      } else {
        console.debug(`[DEBUG] ${message}`);
      }
    }
  }
};

// server/auth.ts
import { z as z3 } from "zod";
var scryptAsync = promisify(scrypt);
async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}
async function comparePasswords(supplied, stored) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = await scryptAsync(supplied, salt, 64);
  return timingSafeEqual(hashedBuf, suppliedBuf);
}
var passwordSchema = z3.string().min(12, "Password must be at least 12 characters").regex(/[A-Z]/, "Password must contain at least one uppercase letter").regex(/[a-z]/, "Password must contain at least one lowercase letter").regex(/[0-9]/, "Password must contain at least one number").regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");
function setupAuth(app2) {
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret || sessionSecret === "hireos-development-secret") {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET must be set to a strong random value in production");
    }
    SecureLogger.warn("Using default SESSION_SECRET - this is insecure for production!");
  }
  if (sessionSecret && sessionSecret.length < 32) {
    SecureLogger.warn("SESSION_SECRET should be at least 32 characters for security");
  }
  const sessionSettings = {
    secret: sessionSecret || "hireos-development-secret",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      // SECURITY: Prevent XSS access to cookies
      // Use 'lax' in development/ngrok to allow cross-browser access, 'strict' in production
      sameSite: process.env.NODE_ENV === "production" && !process.env.USE_NGROK ? "strict" : "lax",
      maxAge: 24 * 60 * 60 * 1e3
      // 24 hours
    }
  };
  app2.set("trust proxy", 1);
  app2.use(session2(sessionSettings));
  app2.use(passport.initialize());
  app2.use(passport.session());
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !await comparePasswords(password, user.password)) {
          return done(null, false, { message: "Invalid username or password" });
        } else {
          return done(null, user);
        }
      } catch (error) {
        return done(error);
      }
    })
  );
  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });
  app2.post("/api/register", authRateLimiter, async (req, res, next) => {
    try {
      if (!req.body.username || !req.body.password || !req.body.email || !req.body.fullName) {
        return res.status(400).json({
          message: "Missing required fields: username, password, email, and fullName are required"
        });
      }
      try {
        passwordSchema.parse(req.body.password);
      } catch (error) {
        if (error instanceof z3.ZodError) {
          return res.status(400).json({
            message: "Password does not meet security requirements",
            errors: error.errors.map((err) => err.message)
          });
        }
        return res.status(400).json({ message: "Invalid password format" });
      }
      const existingUserByUsername = await storage.getUserByUsername(req.body.username);
      if (existingUserByUsername) {
        return res.status(400).json({ message: "Username already exists" });
      }
      const allUsers = await storage.getAllUsers();
      const existingUserByEmail = allUsers.find((u) => u.email === req.body.email);
      if (existingUserByEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }
      if (!req.body.role) {
        req.body.role = UserRoles.ADMIN;
      }
      const user = await storage.createUser({
        ...req.body,
        password: await hashPassword(req.body.password)
      });
      const accountName = user.fullName ? `${user.fullName}'s Account` : "My Account";
      const account = await storage.createAccount(accountName, user.id, user.role);
      const { password, ...userWithoutPassword } = user;
      SecureLogger.info("User registered", {
        userId: user.id,
        username: user.username,
        email: user.email,
        accountId: account.id
      });
      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      SecureLogger.error("Registration error", { error: error.message });
      if (error.code === "23505") {
        if (error.constraint?.includes("username")) {
          return res.status(400).json({ message: "Username already exists" });
        }
        if (error.constraint?.includes("email")) {
          return res.status(400).json({ message: "Email already exists" });
        }
      }
      next(error);
    }
  });
  app2.post("/api/login", authRateLimiter, (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) {
        SecureLogger.error("Login error", { error: err.message });
        return next(err);
      }
      if (!user) {
        SecureLogger.warn("Failed login attempt", { username: req.body.username, ip: req.ip });
        return res.status(401).json({ message: info?.message || "Authentication failed" });
      }
      SecureLogger.info("User logged in", { userId: user.id, username: user.username });
      req.login(user, (err2) => {
        if (err2) return next(err2);
        const { password, ...userWithoutPassword } = user;
        res.status(200).json(userWithoutPassword);
      });
    })(req, res, next);
  });
  app2.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });
  app2.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { password, ...userWithoutPassword } = req.user;
    res.json(userWithoutPassword);
  });
  app2.use("/api/admin", (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userRole = req.user?.role;
    if (![UserRoles.ADMIN, UserRoles.CEO, UserRoles.COO].includes(userRole)) {
      return res.sendStatus(403);
    }
    next();
  });
  app2.use("/api/coo", (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userRole = req.user?.role;
    if (![UserRoles.COO, UserRoles.CEO, UserRoles.DIRECTOR, UserRoles.ADMIN].includes(userRole)) {
      return res.sendStatus(403);
    }
    next();
  });
  app2.use("/api/ceo", (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userRole = req.user?.role;
    if (![UserRoles.CEO, UserRoles.DIRECTOR, UserRoles.ADMIN].includes(userRole)) {
      return res.sendStatus(403);
    }
    next();
  });
  app2.use("/api/users", (req, res, next) => {
    if (req.path.includes("/public")) {
      return next();
    }
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userRole = req.user?.role;
    if (![UserRoles.COO, UserRoles.CEO, UserRoles.DIRECTOR, UserRoles.ADMIN].includes(userRole)) {
      return res.sendStatus(403);
    }
    next();
  });
}

// server/api/job.ts
init_storage();
init_schema();
init_utils();

// server/api/openai.ts
import axios from "axios";
async function generateJobDescription(jobData) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OpenAI API key is not configured");
    }
    const { title, type, skills, teamContext, department } = jobData;
    let prompt = `Please write a professional job description for a ${title} position`;
    if (type) {
      prompt += ` (${type})`;
    }
    if (department) {
      prompt += ` in the ${department} department`;
    }
    prompt += ".\n\n";
    prompt += "The job description should include the following sections:\n";
    prompt += "1. About the Company (keep this generic and professional)\n";
    prompt += "2. Job Overview\n";
    prompt += "3. Responsibilities\n";
    prompt += "4. Qualifications\n";
    prompt += "5. Benefits (keep these standard and professional)\n\n";
    if (skills) {
      prompt += `Required skills include: ${skills}.

`;
    }
    if (teamContext) {
      prompt += `Team context: ${teamContext}.

`;
    }
    prompt += "Format the job description using markdown syntax. Keep the tone professional and approachable.\n\n";
    prompt += "Additionally, if you think the job title could be improved or modernized, suggest a better title in a separate suggestion at the end of your response using the format: SUGGESTED_TITLE: [your title suggestion].";
    const url = "https://openrouter.ai/api/v1/chat/completions";
    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "HTTP-Referer": "https://replit.com",
      "X-Title": "HireOS Job Description Generator"
    };
    const data = {
      model: "google/gemini-2.0-flash-001",
      // Using Gemini model
      messages: [
        {
          role: "system",
          content: "You are an expert HR professional who specializes in writing compelling job descriptions."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1200
    };
    const response = await axios.post(url, data, { headers });
    const content = response.data.choices[0].message.content || "";
    let suggestedTitle;
    const suggestedTitleMatch = content.match(/SUGGESTED_TITLE:\s*(.+?)($|\n)/);
    let description = content;
    if (suggestedTitleMatch && suggestedTitleMatch[1]) {
      suggestedTitle = suggestedTitleMatch[1].trim();
      description = content.replace(/SUGGESTED_TITLE:\s*(.+?)($|\n)/, "").trim();
    }
    return { description, suggestedTitle };
  } catch (error) {
    const axiosError = error;
    const errorResponse = axiosError.response?.data;
    const errorMessage = errorResponse ? `${errorResponse.error?.message || JSON.stringify(errorResponse)}` : error instanceof Error ? error.message : String(error);
    console.error("Error generating job description:", errorMessage);
    throw new Error(errorMessage);
  }
}

// server/api/job.ts
init_db();
import { eq as eq3, and as and3 } from "drizzle-orm";
import { count } from "drizzle-orm";

// server/slack-notifications.ts
init_storage();
async function notifySlackUsers(triggerUserId, eventType, data) {
  const usersToNotify = await storage.getUsersForSlackNotification(triggerUserId, eventType);
  const getFirstSkill = (candidate) => {
    if (!candidate.skills) return "Candidate";
    if (Array.isArray(candidate.skills)) {
      return candidate.skills[0] || "Candidate";
    }
    if (typeof candidate.skills === "string") {
      return candidate.skills;
    }
    return "Candidate";
  };
  let message = "";
  switch (eventType) {
    case "interview_scheduled":
      if (data.candidate && data.job && data.interview) {
        const interviewDate = data.interview.scheduledDate ? new Date(data.interview.scheduledDate).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
          hour12: true
        }) : "TBD";
        message = `Interview scheduled: ${data.candidate.name} (${getFirstSkill(data.candidate)}) on ${interviewDate} for ${data.job.title} position`;
      }
      break;
    case "offer_accepted":
      if (data.candidate && data.job) {
        message = `${data.candidate.name} (${getFirstSkill(data.candidate)}) has accepted the offer for ${data.job.title} position!`;
      }
      break;
    case "offer_sent":
      if (data.candidate && data.job && data.user) {
        message = `Offer sent to ${data.candidate.name} (${getFirstSkill(data.candidate)}) for ${data.job.title} position by ${data.user.fullName}`;
      }
      break;
    case "job_posted":
      if (data.job && data.user) {
        message = `Job posted: ${data.job.title} (${data.job.type || "Full-time"}) by ${data.user.fullName}`;
      }
      break;
    case "new_application":
      if (data.candidate && data.job) {
        message = `New application: ${data.candidate.name} (${getFirstSkill(data.candidate)}) for ${data.job.title} position`;
      }
      break;
  }
  if (!message) {
    return;
  }
  await Promise.all(
    usersToNotify.map((user) => storage.sendSlackNotification(user.id, message))
  );
}

// server/api/job.ts
init_notifications();
function setupJobRoutes(app2) {
  app2.post("/api/jobs", validateRequest(insertJobSchema), async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const accountId = await storage.getUserAccountId(req.user.id);
      if (!accountId) {
        return res.status(400).json({ message: "User is not associated with any account" });
      }
      if (!req.body.submitterId) {
        req.body.submitterId = req.user?.id;
      }
      let generatedDescription = "";
      let suggestedTitle = req.body.title;
      try {
        const aiResult = await generateJobDescription({
          title: req.body.title,
          type: req.body.type,
          skills: req.body.skills,
          teamContext: req.body.teamContext,
          department: req.body.department
        });
        generatedDescription = aiResult.description;
        if (aiResult.suggestedTitle) {
          suggestedTitle = aiResult.suggestedTitle;
        }
      } catch (error) {
        console.error("Error generating job description:", error);
        generatedDescription = `# ${req.body.title}

We are looking for a talented ${req.body.title} to join our team.`;
      }
      const hiPeopleLink = `https://app.hipeople.io/assessment/${Math.random().toString(36).substring(2, 10)}`;
      const jobData = {
        ...req.body,
        description: generatedDescription,
        suggestedTitle,
        hiPeopleLink,
        accountId
      };
      const job = await storage.createJob(jobData);
      await storage.createActivityLog({
        accountId,
        userId: req.user?.id,
        action: "Created job draft",
        entityType: "job",
        entityId: job.id,
        details: { jobTitle: job.title },
        timestamp: /* @__PURE__ */ new Date()
      });
      res.status(201).json(job);
    } catch (error) {
      handleApiError(error, res);
    }
  });
  app2.get("/api/jobs", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const accountId = await storage.getUserAccountId(req.user.id);
      if (!accountId) {
        return res.status(400).json({ message: "User is not associated with any account" });
      }
      const status = req.query.status;
      const jobs3 = await storage.getJobs(accountId, status);
      const jobsWithCandidateCounts = await Promise.all(
        jobs3.map(async (job) => {
          const candidatesResult = await db.select({ count: count() }).from(candidates).where(and3(eq3(candidates.jobId, job.id), eq3(candidates.accountId, accountId)));
          const candidateCount = Number(candidatesResult[0].count);
          return {
            ...job,
            candidateCount
          };
        })
      );
      res.json(jobsWithCandidateCounts);
    } catch (error) {
      handleApiError(error, res);
    }
  });
  app2.get("/api/jobs/:id", async (req, res) => {
    try {
      const jobId = parseInt(req.params.id);
      if (isNaN(jobId)) {
        return res.status(400).json({ message: "Invalid job ID" });
      }
      if (req.isAuthenticated()) {
        const accountId = await storage.getUserAccountId(req.user.id);
        if (!accountId) {
          return res.status(400).json({ message: "User is not associated with any account" });
        }
        const job = await storage.getJob(jobId, accountId);
        if (!job) {
          return res.status(404).json({ message: "Job not found" });
        }
        res.json(job);
      } else {
        return res.status(401).json({ message: "Authentication required" });
      }
    } catch (error) {
      handleApiError(error, res);
    }
  });
  app2.patch("/api/jobs/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const accountId = await storage.getUserAccountId(req.user.id);
      if (!accountId) {
        return res.status(400).json({ message: "User is not associated with any account" });
      }
      const jobId = parseInt(req.params.id);
      if (isNaN(jobId)) {
        return res.status(400).json({ message: "Invalid job ID" });
      }
      const job = await storage.getJob(jobId, accountId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      const updatedJob = await storage.updateJob(jobId, accountId, req.body);
      await storage.createActivityLog({
        accountId,
        userId: req.user?.id,
        action: "Updated job",
        entityType: "job",
        entityId: job.id,
        details: { jobTitle: job.title },
        timestamp: /* @__PURE__ */ new Date()
      });
      res.json(updatedJob);
    } catch (error) {
      handleApiError(error, res);
    }
  });
  app2.post("/api/jobs/:id/approve", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const accountId = await storage.getUserAccountId(req.user.id);
      if (!accountId) {
        return res.status(400).json({ message: "User is not associated with any account" });
      }
      const jobId = parseInt(req.params.id);
      if (isNaN(jobId)) {
        return res.status(400).json({ message: "Invalid job ID" });
      }
      const job = await storage.getJob(jobId, accountId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      const updatedJob = await storage.updateJob(jobId, accountId, {
        status: "active",
        postedDate: /* @__PURE__ */ new Date()
      });
      await storage.createActivityLog({
        accountId,
        userId: req.user?.id,
        action: "Approved and activated job",
        entityType: "job",
        entityId: job.id,
        details: { jobTitle: job.title },
        timestamp: /* @__PURE__ */ new Date()
      });
      if (req.user?.id) {
        const user = await storage.getUser(req.user.id);
        if (user) {
          await notifySlackUsers(req.user.id, "job_posted", {
            job: updatedJob,
            user
          });
          try {
            await createNotification(
              req.user.id,
              "job_posted",
              "Job Posted",
              `${updatedJob.title} has been posted and is now accepting applications`,
              `/jobs`,
              { jobId: updatedJob.id }
            );
          } catch (error) {
            console.error("[Job] Failed to create job posted notification:", error);
          }
        }
      }
      res.json(updatedJob);
    } catch (error) {
      handleApiError(error, res);
    }
  });
  app2.post("/api/jobs/:id/close", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const accountId = await storage.getUserAccountId(req.user.id);
      if (!accountId) {
        return res.status(400).json({ message: "User is not associated with any account" });
      }
      const jobId = parseInt(req.params.id);
      if (isNaN(jobId)) {
        return res.status(400).json({ message: "Invalid job ID" });
      }
      const job = await storage.getJob(jobId, accountId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      const updatedJob = await storage.updateJob(jobId, accountId, {
        status: "closed"
      });
      await storage.createActivityLog({
        accountId,
        userId: req.user?.id,
        action: "Closed job",
        entityType: "job",
        entityId: job.id,
        details: { jobTitle: job.title },
        timestamp: /* @__PURE__ */ new Date()
      });
      res.json(updatedJob);
    } catch (error) {
      handleApiError(error, res);
    }
  });
  app2.get("/api/jobs/:id/platforms", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const accountId = await storage.getUserAccountId(req.user.id);
      if (!accountId) {
        return res.status(400).json({ message: "User is not associated with any account" });
      }
      const jobId = parseInt(req.params.id);
      if (isNaN(jobId)) {
        return res.status(400).json({ message: "Invalid job ID" });
      }
      const platforms = await storage.getJobPlatforms(jobId, accountId);
      res.json(platforms);
    } catch (error) {
      handleApiError(error, res);
    }
  });
}

// server/api/candidate.ts
init_storage();
init_schema();
init_utils();
init_email_validator();
init_ghl_integration();
import { z as z5 } from "zod";
init_notifications();

// server/security/authorization.ts
init_storage();
init_schema();
async function canAccessCandidate(userId, candidateId) {
  try {
    const user = await storage.getUser(userId);
    if (!user) return false;
    if ([UserRoles.ADMIN, UserRoles.CEO, UserRoles.COO, UserRoles.DIRECTOR].includes(user.role)) {
      return true;
    }
    const candidate = await storage.getCandidate(candidateId);
    if (!candidate) return false;
    return true;
  } catch (error) {
    return false;
  }
}
function canModifyCandidate(user, updateData) {
  if (!user) return false;
  const hasEvaluationFields = updateData.technicalProficiency !== void 0 || updateData.leadershipInitiative !== void 0 || updateData.problemSolving !== void 0 || updateData.communicationSkills !== void 0 || updateData.culturalFit !== void 0 || updateData.hiPeopleScore !== void 0 || updateData.hiPeoplePercentile !== void 0;
  if (hasEvaluationFields) {
    return [UserRoles.ADMIN, UserRoles.CEO, UserRoles.COO, UserRoles.DIRECTOR].includes(user.role);
  }
  return true;
}

// server/api/candidate.ts
function getCompanyName() {
  return process.env.COMPANY_NAME || "Company";
}
function getContractUrl(candidateId) {
  const baseUrl = process.env.CONTRACT_BASE_URL || "https://talent.firmos.app";
  const template = process.env.CONTRACT_URL_TEMPLATE || `${baseUrl}/web-manager-contract{candidateId}`;
  return template.replace("{candidateId}", candidateId.toString());
}
function sanitizeAndReplaceTemplate(template, candidateName, jobTitle, senderName, companyName, additionalReplacements) {
  const safeCandidateName = sanitizeTextInput(candidateName);
  const safeJobTitle = sanitizeTextInput(jobTitle);
  const safeSenderName = sanitizeTextInput(senderName);
  const safeCompanyName = sanitizeTextInput(companyName);
  let result = template.replace(/\{\{candidateName\}\}/g, safeCandidateName).replace(/\{\{jobTitle\}\}/g, safeJobTitle).replace(/\{\{senderName\}\}/g, safeSenderName).replace(/\{\{companyName\}\}/g, safeCompanyName);
  if (additionalReplacements) {
    for (const [key, value] of Object.entries(additionalReplacements)) {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
    }
  }
  return result;
}
function setupCandidateRoutes(app2) {
  app2.post(
    "/api/candidates",
    validateRequest(insertCandidateSchema),
    async (req, res) => {
      try {
        if (!isAuthorized(req)) {
          return res.status(401).json({ message: "Authentication or API key required" });
        }
        let accountId = null;
        if (req.isAuthenticated() && req.user?.id) {
          accountId = await storage.getUserAccountId(req.user.id);
          if (!accountId) {
            return res.status(400).json({ message: "User is not associated with any account" });
          }
        } else {
          return res.status(401).json({ message: "Authentication required for candidate creation" });
        }
        const existingCandidate = await storage.getCandidateByNameAndEmail(
          req.body.name,
          req.body.email,
          accountId
        );
        if (existingCandidate) {
          return res.status(409).json({
            message: "Candidate already exists",
            error: "A candidate with the same name and email already exists in the system",
            existingCandidateId: existingCandidate.id
          });
        }
        const candidate = await storage.createCandidate({ ...req.body, accountId });
        const userId = req.user?.id;
        if (userId && candidate.jobId) {
          const job2 = await storage.getJob(candidate.jobId, accountId);
          if (job2) {
            await notifySlackUsers(userId, "new_application", {
              candidate,
              job: job2
            });
          }
        }
        if (userId && candidate.resumeUrl) {
          try {
            const user = await storage.getUser(userId);
            if (user?.openRouterApiKey) {
              Promise.resolve().then(() => (init_resume_parser(), resume_parser_exports)).then(async ({ parseResume: parseResume2 }) => {
                try {
                  const parsedData = await parseResume2(candidate.resumeUrl, user.openRouterApiKey);
                  const updates = {
                    parsedResumeData: parsedData
                  };
                  if (parsedData.phone && !candidate.phone) {
                    updates.phone = parsedData.phone;
                  }
                  if (parsedData.location && !candidate.location) {
                    updates.location = parsedData.location;
                  }
                  if (parsedData.skills && parsedData.skills.length > 0) {
                    updates.skills = parsedData.skills;
                  }
                  if (parsedData.experienceYears) {
                    updates.experienceYears = parsedData.experienceYears;
                  }
                  await storage.updateCandidate(candidate.id, accountId, updates);
                  if (candidate.jobId) {
                    try {
                      const { calculateMatchScore: calculateMatchScore2 } = await Promise.resolve().then(() => (init_ai_matching(), ai_matching_exports));
                      const job2 = await storage.getJob(candidate.jobId, accountId);
                      if (job2) {
                        const matchResult = await calculateMatchScore2(
                          {
                            name: candidate.name,
                            skills: parsedData.skills || null,
                            experienceYears: parsedData.experienceYears || null,
                            parsedResumeData: parsedData
                          },
                          {
                            title: job2.title,
                            skills: job2.skills,
                            type: job2.type,
                            department: job2.department,
                            description: job2.description
                          },
                          user.openRouterApiKey
                        );
                        await storage.updateCandidate(candidate.id, accountId, { matchScore: matchResult.score });
                      }
                    } catch (matchError) {
                      console.error("Error auto-calculating match score:", matchError);
                    }
                  }
                } catch (parseError) {
                  console.error("Error auto-parsing resume:", parseError);
                }
              });
            }
          } catch (error) {
            console.error("Error setting up auto-parse:", error);
          }
        }
        if (userId && candidate.jobId !== null && candidate.jobId !== void 0) {
          try {
            const job2 = await storage.getJob(candidate.jobId, accountId);
            if (job2) {
              candidate.job = job2;
            }
            const crmIntegrations = await storage.getCRMIntegrations(userId);
            for (const integration of crmIntegrations) {
              if (!integration.isEnabled || integration.status !== "connected") {
                continue;
              }
              try {
                if (integration.platformId === "ghl") {
                  const { firstName, lastName } = parseFullName(candidate.name);
                  const tags = ["00_application_submitted"];
                  if (job2?.title) {
                    const roleTag = mapJobTitleToGHLTag(job2.title);
                    tags.push(roleTag);
                  }
                  const ghlResponse = await createGHLContact({
                    firstName,
                    lastName,
                    email: candidate.email,
                    phone: candidate.phone || void 0,
                    location: candidate.location || void 0,
                    tags,
                    score: candidate.hiPeopleScore || void 0,
                    expectedSalary: candidate.expectedSalary || void 0,
                    experienceYears: candidate.experienceYears || void 0,
                    hiPeopleAssessmentLink: candidate.hiPeopleAssessmentLink || void 0,
                    hiPeoplePercentile: candidate.hiPeoplePercentile || void 0,
                    skills: candidate.skills && Array.isArray(candidate.skills) ? candidate.skills : []
                  });
                  const ghlContactId = ghlResponse.contact?.id;
                  if (ghlContactId) {
                    await storage.updateCandidate(candidate.id, accountId, { ghlContactId });
                  }
                } else if (integration.platformId === "airtable") {
                  const { updateCandidateInAirtable: updateCandidateInAirtable2 } = await Promise.resolve().then(() => (init_airtable_integration(), airtable_integration_exports));
                  await updateCandidateInAirtable2(candidate, userId);
                } else if (integration.platformId === "google-sheets") {
                  const { createOrUpdateGoogleSheetsContact: createOrUpdateGoogleSheetsContact3 } = await Promise.resolve().then(() => (init_google_sheets_integration(), google_sheets_integration_exports));
                  await createOrUpdateGoogleSheetsContact3(
                    {
                      id: candidate.id,
                      name: candidate.name,
                      email: candidate.email,
                      phone: candidate.phone || null,
                      location: candidate.location || null,
                      expectedSalary: typeof candidate.expectedSalary === "number" ? candidate.expectedSalary : candidate.expectedSalary ? Number(candidate.expectedSalary) : null,
                      experienceYears: typeof candidate.experienceYears === "number" ? candidate.experienceYears : candidate.experienceYears ? Number(candidate.experienceYears) : null,
                      skills: Array.isArray(candidate.skills) ? candidate.skills : null,
                      status: candidate.status,
                      jobTitle: job2?.title || void 0
                    },
                    userId
                  );
                }
              } catch (syncError) {
                await storage.createActivityLog({
                  accountId,
                  userId: req.user?.id ?? null,
                  action: `${integration.platformName} sync failed`,
                  entityType: "candidate",
                  entityId: candidate.id,
                  details: {
                    candidateName: candidate.name,
                    error: syncError.message,
                    jobId: candidate.jobId
                  },
                  timestamp: /* @__PURE__ */ new Date()
                });
              }
            }
          } catch (error) {
          }
        }
        await storage.createActivityLog({
          accountId,
          userId: req.user?.id ?? null,
          action: "Added candidate",
          entityType: "candidate",
          entityId: candidate.id,
          details: { candidateName: candidate.name, jobId: candidate.jobId },
          timestamp: /* @__PURE__ */ new Date()
        });
        const job = candidate.jobId ? await storage.getJob(candidate.jobId, accountId) : null;
        const processAfter = job?.expressReview ? /* @__PURE__ */ new Date() : new Date(Date.now() + 3 * 60 * 60 * 1e3);
        await storage.createNotification({
          type: "email",
          payload: {
            recipientEmail: candidate.email,
            subject: `Your Assessment for ${job?.title}`,
            template: "assessment",
            context: {
              candidateName: candidate.name,
              jobTitle: job?.title,
              hiPeopleLink: job?.hiPeopleLink
            }
          },
          processAfter,
          status: "pending"
        });
        res.status(201).json(candidate);
      } catch (error) {
        handleApiError(error, res);
      }
    }
  );
  app2.get("/api/candidates", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const accountId = await storage.getUserAccountId(req.user.id);
      if (!accountId) {
        return res.status(400).json({ message: "User is not associated with any account" });
      }
      const jobId = req.query.jobId ? parseInt(req.query.jobId) : void 0;
      const status = req.query.status;
      const candidates2 = await storage.getCandidates(accountId, {
        jobId,
        status
      });
      res.json(candidates2);
    } catch (error) {
      handleApiError(error, res);
    }
  });
  app2.get("/api/candidates/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const accountId = await storage.getUserAccountId(req.user.id);
      if (!accountId) {
        return res.status(400).json({ message: "User is not associated with any account" });
      }
      const candidateId = parseInt(req.params.id);
      if (isNaN(candidateId)) {
        return res.status(400).json({ message: "Invalid candidate ID" });
      }
      const hasAccess = await canAccessCandidate(req.user.id, candidateId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied to this candidate" });
      }
      const candidate = await storage.getCandidate(candidateId, accountId);
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }
      res.json(candidate);
    } catch (error) {
      handleApiError(error, res);
    }
  });
  app2.patch("/api/candidates/:id", async (req, res) => {
    try {
      if (!isAuthorized(req)) {
        return res.status(401).json({ message: "Authentication or API key required" });
      }
      let accountId = null;
      if (req.isAuthenticated() && req.user?.id) {
        accountId = await storage.getUserAccountId(req.user.id);
        if (!accountId) {
          return res.status(400).json({ message: "User is not associated with any account" });
        }
      } else {
        return res.status(401).json({ message: "Authentication required for candidate updates" });
      }
      const candidateIdentifier = req.params.id;
      let candidate;
      if (!isNaN(Number(candidateIdentifier))) {
        candidate = await storage.getCandidate(parseInt(candidateIdentifier), accountId);
      } else {
        candidate = await storage.getCandidateByGHLContactId(candidateIdentifier, accountId);
      }
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }
      if (req.isAuthenticated()) {
        const hasAccess = await canAccessCandidate(req.user.id, candidate.id);
        if (!hasAccess) {
          return res.status(403).json({ message: "Access denied to this candidate" });
        }
      }
      const hasEvaluationFields = req.body.technicalProficiency !== void 0 || req.body.leadershipInitiative !== void 0 || req.body.problemSolving !== void 0 || req.body.communicationSkills !== void 0 || req.body.culturalFit !== void 0 || req.body.hiPeopleScore !== void 0 || req.body.hiPeoplePercentile !== void 0;
      if (hasEvaluationFields && req.user) {
        const canModify = canModifyCandidate(req.user, req.body);
        if (!canModify) {
          return res.status(403).json({
            message: "Only CEO, COO, Director, or Admin can update candidate evaluation criteria"
          });
        }
      }
      const updateData = { ...req.body };
      if (updateData.lastInterviewDate) {
        updateData.lastInterviewDate = new Date(updateData.lastInterviewDate);
      }
      const updatedCandidate = await storage.updateCandidate(
        candidate.id,
        accountId,
        updateData
      );
      const userId = req.user?.id;
      if (userId && req.body.resumeUrl && req.body.resumeUrl !== candidate.resumeUrl) {
        try {
          const user = await storage.getUser(userId);
          if (user?.openRouterApiKey) {
            Promise.resolve().then(() => (init_resume_parser(), resume_parser_exports)).then(async ({ parseResume: parseResume2 }) => {
              try {
                const parsedData = await parseResume2(req.body.resumeUrl, user.openRouterApiKey);
                const updates = {
                  parsedResumeData: parsedData
                };
                if (parsedData.phone && !updatedCandidate.phone) {
                  updates.phone = parsedData.phone;
                }
                if (parsedData.location && !updatedCandidate.location) {
                  updates.location = parsedData.location;
                }
                if (parsedData.skills && parsedData.skills.length > 0) {
                  const existingSkills = Array.isArray(updatedCandidate.skills) ? updatedCandidate.skills : [];
                  const skillsSet = /* @__PURE__ */ new Set([...existingSkills, ...parsedData.skills]);
                  updates.skills = Array.from(skillsSet);
                }
                if (parsedData.experienceYears && !updatedCandidate.experienceYears) {
                  updates.experienceYears = parsedData.experienceYears;
                }
                await storage.updateCandidate(updatedCandidate.id, accountId, updates);
                if (updatedCandidate.jobId) {
                  try {
                    const { calculateMatchScore: calculateMatchScore2 } = await Promise.resolve().then(() => (init_ai_matching(), ai_matching_exports));
                    const job = await storage.getJob(updatedCandidate.jobId, accountId);
                    if (job) {
                      const finalCandidate = await storage.getCandidate(updatedCandidate.id, accountId);
                      const matchResult = await calculateMatchScore2(
                        {
                          name: finalCandidate.name,
                          skills: finalCandidate.skills,
                          experienceYears: finalCandidate.experienceYears,
                          parsedResumeData: parsedData,
                          applicationData: finalCandidate.applicationData
                        },
                        {
                          title: job.title,
                          skills: job.skills,
                          type: job.type,
                          department: job.department,
                          description: job.description
                        },
                        user.openRouterApiKey
                      );
                      await storage.updateCandidate(updatedCandidate.id, accountId, { matchScore: matchResult.score });
                    }
                  } catch (matchError) {
                    console.error("Error auto-calculating match score:", matchError);
                  }
                }
              } catch (parseError) {
                console.error("Error auto-parsing resume:", parseError);
              }
            });
          }
        } catch (error) {
          console.error("Error setting up auto-parse:", error);
        }
      }
      if (userId) {
        try {
          const crmIntegrations = await storage.getCRMIntegrations(userId);
          for (const integration of crmIntegrations) {
            if (!integration.isEnabled || integration.status !== "connected") {
              continue;
            }
            try {
              if (integration.platformId === "airtable") {
                const { updateCandidateInAirtable: updateCandidateInAirtable2 } = await Promise.resolve().then(() => (init_airtable_integration(), airtable_integration_exports));
                if (updatedCandidate.jobId) {
                  const job = await storage.getJob(updatedCandidate.jobId, accountId);
                  if (job) {
                    updatedCandidate.job = job;
                  }
                }
                await updateCandidateInAirtable2(updatedCandidate, userId);
              } else if (integration.platformId === "ghl" && updatedCandidate.ghlContactId) {
                const { updateCandidateInGHL: updateCandidateInGHL2 } = await Promise.resolve().then(() => (init_ghl_integration(), ghl_integration_exports));
                if (updatedCandidate.jobId) {
                  const job = await storage.getJob(updatedCandidate.jobId, accountId);
                  if (job) {
                    updatedCandidate.job = job;
                  }
                }
                await updateCandidateInGHL2(updatedCandidate, userId);
              } else if (integration.platformId === "google-sheets") {
                const { createOrUpdateGoogleSheetsContact: createOrUpdateGoogleSheetsContact3, findRowByEmail: findRowByEmail3 } = await Promise.resolve().then(() => (init_google_sheets_integration(), google_sheets_integration_exports));
                if (updatedCandidate.jobId) {
                  const job = await storage.getJob(updatedCandidate.jobId, accountId);
                  if (job) {
                    updatedCandidate.job = job;
                  }
                }
                const rowNumber = await findRowByEmail3(updatedCandidate.email, userId);
                await createOrUpdateGoogleSheetsContact3(
                  {
                    id: updatedCandidate.id,
                    name: updatedCandidate.name,
                    email: updatedCandidate.email,
                    phone: updatedCandidate.phone || null,
                    location: updatedCandidate.location || null,
                    expectedSalary: typeof updatedCandidate.expectedSalary === "number" ? updatedCandidate.expectedSalary : updatedCandidate.expectedSalary ? Number(updatedCandidate.expectedSalary) : null,
                    experienceYears: typeof updatedCandidate.experienceYears === "number" ? updatedCandidate.experienceYears : updatedCandidate.experienceYears ? Number(updatedCandidate.experienceYears) : null,
                    skills: Array.isArray(updatedCandidate.skills) ? updatedCandidate.skills : null,
                    status: updatedCandidate.status,
                    jobTitle: updatedCandidate.job?.title || void 0
                  },
                  userId,
                  rowNumber || void 0
                );
              }
            } catch (syncError) {
            }
          }
        } catch (error) {
          console.error("Error syncing to CRMs:", error);
        }
      }
      if (req.body.status === "45_1st_interview_sent" && req.body.status !== candidate.status) {
        const job = candidate.jobId ? await storage.getJob(candidate.jobId, accountId) : null;
        if (job) {
          const user = req.user ? await storage.getUser(req.user.id) : null;
          const senderName = user?.fullName || "Team Member";
          const companyName = getCompanyName();
          const emailBody = sanitizeEmailContent(`
            Hi ${sanitizeTextInput(candidate.name)},<br><br>
            It's ${sanitizeTextInput(senderName)} from ${sanitizeTextInput(companyName)}. I came across your profile and would like to chat about your background and how you might fit in our <b>${sanitizeTextInput(job.title)}</b> position.<br><br>
            Feel free to grab a time on my calendar when you're available:<br>
            <a href="${user?.calendarLink || "#"}">Schedule your interview here</a><br><br>
            Looking forward to connecting!<br><br>
            Thanks,<br>
            ${sanitizeTextInput(senderName)}<br>
            ${sanitizeTextInput(companyName)}
          `.trim());
          await storage.createInAppNotification({
            accountId,
            userId: req.user?.id ?? null,
            type: "email",
            title: "Interview Invite Sent",
            message: `Interview invite sent to ${candidate.name}`,
            link: `/candidates/${candidate.id}`,
            metadata: { candidateId: candidate.id }
          });
        }
      }
      if (req.body.status === "95_offer_sent" && candidate.status !== "95_offer_sent" || req.body.finalDecisionStatus === "offer" && candidate.finalDecisionStatus !== "offer") {
        const job = candidate.jobId ? await storage.getJob(candidate.jobId, accountId) : null;
        let offer = await storage.getOfferByCandidate(candidate.id, accountId);
        if (!offer) {
          offer = await storage.createOffer({
            accountId,
            candidateId: candidate.id,
            offerType: "Full-time",
            compensation: "Competitive",
            status: "sent",
            sentDate: /* @__PURE__ */ new Date(),
            approvedById: req.user?.id,
            contractUrl: getContractUrl(candidate.id)
            // SECURITY: From environment variable
          });
        }
        await storage.createActivityLog({
          accountId,
          userId: req.user?.id ?? null,
          action: "Sent offer to candidate",
          entityType: "candidate",
          entityId: candidate.id,
          details: { candidateName: candidate.name, jobTitle: job?.title },
          timestamp: /* @__PURE__ */ new Date()
        });
        const user = req.user ? await storage.getUser(req.user.id) : null;
        const senderName = user?.fullName || "Team Member";
        const companyName = getCompanyName();
        const emailSubject = sanitizeTextInput(`Excited to Offer You the ${job?.title || "Position"} Position`);
        const emailBody = sanitizeEmailContent(`
          <p>Hi ${sanitizeTextInput(candidate.name)},</p>
          <p>Great news \u2014 we'd love to bring you on board for the ${sanitizeTextInput(job?.title || "position")} position at ${sanitizeTextInput(companyName)}. After reviewing your experience, we're confident you'll make a strong impact on our team.</p>
          <p>Here's the link to your engagement contract:
          <a href="${getContractUrl(candidate.id)}">[Contract Link]</a></p>
          <p>To kick things off, please schedule your onboarding call here:
          <a href="${user?.calendarLink || "#"}">[Onboarding Calendar Link]</a></p>
          <p>If anything's unclear or you'd like to chat, don't hesitate to reach out.</p>
          <p>Welcome aboard \u2014 we're excited to get started!</p>
          <p>Best regards,<br>
          ${sanitizeTextInput(senderName)}<br>
          ${sanitizeTextInput(companyName)}</p>
        `);
        await storage.sendDirectEmail(candidate.email, emailSubject, emailBody, req.user?.id);
      }
      if (req.body.status && req.body.status !== candidate.status) {
        const interviewStatuses = ["45_1st_interview_sent", "60_1st_interview_scheduled", "75_2nd_interview_scheduled"];
        const wasInterviewStatus = interviewStatuses.includes(candidate.status);
        const isNoLongerInterviewStatus = !interviewStatuses.includes(req.body.status);
        if (wasInterviewStatus && isNoLongerInterviewStatus) {
          const existingInterviews = await storage.getInterviews(accountId, { candidateId: candidate.id });
          for (const interview of existingInterviews) {
            if (interview.status === "scheduled" || interview.status === "pending") {
              await storage.updateInterview(interview.id, accountId, {
                status: "cancelled",
                notes: interview.notes ? `${interview.notes}

Cancelled: Candidate status changed to ${req.body.status}` : `Cancelled: Candidate status changed to ${req.body.status}`,
                updatedAt: /* @__PURE__ */ new Date()
              });
            }
          }
        }
        await storage.createActivityLog({
          accountId,
          userId: req.user?.id ?? null,
          action: `Updated candidate status to ${req.body.status}`,
          entityType: "candidate",
          entityId: candidate.id,
          details: {
            candidateName: candidate.name,
            previousStatus: candidate.status,
            newStatus: req.body.status
          },
          timestamp: /* @__PURE__ */ new Date()
        });
      }
      if (hasEvaluationFields) {
        await storage.createActivityLog({
          accountId,
          userId: req.user?.id ?? null,
          action: "Updated candidate evaluation",
          entityType: "candidate",
          entityId: candidate.id,
          details: {
            candidateName: candidate.name,
            updates: Object.keys(req.body).filter(
              (key) => [
                "technicalProficiency",
                "leadershipInitiative",
                "problemSolving",
                "communicationSkills",
                "culturalFit",
                "hiPeopleScore",
                "hiPeoplePercentile"
              ].includes(key)
            )
          },
          timestamp: /* @__PURE__ */ new Date()
        });
      }
      if (req.body.status && req.body.status !== candidate.status) {
        try {
          const { triggerWorkflows: triggerWorkflows2 } = await Promise.resolve().then(() => (init_workflow_engine(), workflow_engine_exports));
          const job = candidate.jobId ? await storage.getJob(candidate.jobId, accountId) : null;
          await triggerWorkflows2("candidate_status_change", {
            entityType: "candidate",
            entityId: candidate.id,
            candidate: updatedCandidate,
            job,
            user: req.user,
            fromStatus: candidate.status,
            toStatus: req.body.status
          }, accountId);
        } catch (error) {
          console.error("[Candidate Update] Workflow trigger error:", error);
        }
      }
      res.json(updatedCandidate);
    } catch (error) {
      handleApiError(error, res);
    }
  });
  app2.post("/api/candidates/:id/invite-to-interview", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const accountId = await storage.getUserAccountId(req.user.id);
      if (!accountId) {
        return res.status(400).json({ message: "User is not associated with any account" });
      }
      const candidateId = parseInt(req.params.id);
      if (isNaN(candidateId)) {
        return res.status(400).json({ message: "Invalid candidate ID" });
      }
      const candidate = await storage.getCandidate(candidateId, accountId);
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }
      const job = candidate.jobId ? await storage.getJob(candidate.jobId, accountId) : null;
      if (isLikelyInvalidEmail(candidate.email)) {
        console.error(
          `\u274C Rejected likely non-existent email: ${candidate.email}`
        );
        await storage.createActivityLog({
          accountId,
          userId: req.user?.id ?? null,
          action: "Interview invite failed - invalid email",
          entityType: "candidate",
          entityId: candidate.id,
          details: {
            candidateName: candidate.name,
            jobTitle: job?.title,
            email: candidate.email
          },
          timestamp: /* @__PURE__ */ new Date()
        });
        return res.status(422).json({
          message: "Email invalid",
          errorType: "non_existent_email"
        });
      }
      const updatedCandidate = await storage.updateCandidate(candidateId, accountId, {
        status: "45_1st_interview_sent"
      });
      await storage.createActivityLog({
        accountId,
        userId: req.user?.id,
        action: "Invited candidate to interview",
        entityType: "candidate",
        entityId: candidate.id,
        details: { candidateName: candidate.name, jobTitle: job?.title },
        timestamp: /* @__PURE__ */ new Date()
      });
      const user = req.user ? await storage.getUser(req.user.id) : null;
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      if (!user.calendarLink || user.calendarLink.trim() === "") {
        return res.status(400).json({
          message: "Calendar link not configured",
          errorType: "missing_calendar_link",
          details: "Please set your calendar scheduling link in Settings > User Management before sending interview invitations."
        });
      }
      let calendarLink = user.calendarLink;
      if (user.calendarProvider === "google" && calendarLink) {
        const url = new URL(calendarLink);
        url.searchParams.set("candidateId", candidateId.toString());
        if (candidate.jobId) {
          url.searchParams.set("jobId", candidate.jobId.toString());
        }
        calendarLink = url.toString();
      }
      const senderName = user.fullName || "Team Member";
      const companyName = getCompanyName();
      const defaultSubject = `{{candidateName}}, Let's Discuss Your Fit for Our {{jobTitle}} Position`;
      const defaultBody = `
      <p>Hi {{candidateName}},</p>
      
      <p>It's {{senderName}} from {{companyName}}. I came across your profile and would like to chat about your background and how you might fit in our <b>{{jobTitle}}</b> position.</p>
      
      <p>Feel free to grab a time on my calendar when you're available:<br>
      <a href="{{calendarLink}}">Schedule your interview here</a></p>
      
      <p>Looking forward to connecting!</p>
      
      <p>Thanks,<br>
      {{senderName}}<br>
      {{companyName}}</p>
      `;
      const userTemplates = user.emailTemplates || {};
      const interviewTemplate = userTemplates.interview || {};
      const subjectTemplate = interviewTemplate.subject || defaultSubject;
      const bodyTemplate = interviewTemplate.body || defaultBody;
      const safeCandidateName = sanitizeTextInput(candidate.name);
      const safeJobTitle = sanitizeTextInput(job?.title || "the position");
      const safeSenderName = sanitizeTextInput(senderName);
      const safeCompanyName = sanitizeTextInput(companyName);
      const emailSubject = subjectTemplate.replace(/\{\{candidateName\}\}/g, safeCandidateName).replace(/\{\{jobTitle\}\}/g, safeJobTitle).replace(/\{\{senderName\}\}/g, safeSenderName).replace(/\{\{companyName\}\}/g, safeCompanyName);
      let emailBody = bodyTemplate.replace(/\{\{candidateName\}\}/g, safeCandidateName).replace(/\{\{jobTitle\}\}/g, safeJobTitle).replace(/\{\{senderName\}\}/g, safeSenderName).replace(/\{\{companyName\}\}/g, safeCompanyName).replace(/\{\{calendarLink\}\}/g, calendarLink);
      emailBody = sanitizeEmailContent(emailBody);
      await storage.sendDirectEmail(candidate.email, emailSubject, emailBody, req.user?.id);
      try {
        await createNotification(
          req.user.id,
          "interview_scheduled",
          // Using interview_scheduled type for invite sent
          "Interview Invite Sent",
          `Interview invite sent to ${candidate.name} for ${job?.title || "a position"}`,
          `/candidates`,
          { candidateId: candidate.id, jobId: job?.id }
        );
      } catch (error) {
        console.error("[Candidate] Failed to create interview invite sent notification:", error);
      }
      const existingInterviews = await storage.getInterviews(accountId, { candidateId: candidate.id });
      const existingScheduledInterview = existingInterviews.find((i) => i.status === "scheduled" || i.status === "pending");
      if (!existingScheduledInterview) {
        await storage.createInterview({
          accountId,
          candidateId: candidate.id,
          interviewerId: req.user?.id ?? null,
          type: "video",
          // Default to video interview
          status: "scheduled",
          // Will be updated when candidate books
          scheduledDate: null,
          // Will be set when candidate books on calendar
          notes: "Interview invitation sent - awaiting candidate to book via calendar link"
        });
      } else {
        await storage.updateInterview(existingScheduledInterview.id, accountId, {
          status: "scheduled",
          notes: "Interview invitation sent - awaiting candidate to book via calendar link",
          updatedAt: /* @__PURE__ */ new Date()
        });
      }
      res.json(updatedCandidate);
    } catch (error) {
      handleApiError(error, res);
    }
  });
  app2.post("/api/candidates/:id/talent-pool", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const accountId = await storage.getUserAccountId(req.user.id);
      if (!accountId) {
        return res.status(400).json({ message: "User is not associated with any account" });
      }
      const candidateId = parseInt(req.params.id);
      if (isNaN(candidateId)) {
        return res.status(400).json({ message: "Invalid candidate ID" });
      }
      const candidate = await storage.getCandidate(candidateId, accountId);
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }
      const job = candidate.jobId ? await storage.getJob(candidate.jobId, accountId) : null;
      if (isLikelyInvalidEmail(candidate.email)) {
        console.error(
          `\u274C Rejected likely non-existent email: ${candidate.email}`
        );
        await storage.createActivityLog({
          accountId,
          userId: req.user?.id ?? null,
          action: "Talent pool add failed - invalid email",
          entityType: "candidate",
          entityId: candidate.id,
          details: {
            candidateName: candidate.name,
            jobTitle: job?.title,
            email: candidate.email
          },
          timestamp: /* @__PURE__ */ new Date()
        });
        return res.status(422).json({
          message: "Email invalid",
          errorType: "non_existent_email"
        });
      }
      const updatedCandidate = await storage.updateCandidate(candidateId, accountId, {
        status: "90_talent_pool",
        finalDecisionStatus: "talent_pool"
        // Also keep final decision status in sync
      });
      await storage.createActivityLog({
        accountId,
        userId: req.user?.id,
        action: "Added candidate to talent pool",
        entityType: "candidate",
        entityId: candidate.id,
        details: { candidateName: candidate.name, jobTitle: job?.title },
        timestamp: /* @__PURE__ */ new Date()
      });
      const user = req.user ? await storage.getUser(req.user.id) : null;
      const senderName = user?.fullName || "Team Member";
      const companyName = getCompanyName();
      const defaultSubject = `Thank you for your application to {{jobTitle}}`;
      const defaultBody = `
      <p>Hi {{candidateName}},</p>
      
      <p>Thank you for your interest in the {{jobTitle}} position at {{companyName}}.</p>
      
      <p>While we've decided to move forward with other candidates for this specific role, we were impressed with your background and would like to keep you in our talent pool for future opportunities.</p>
      
      <p>We'll reach out if a position opens up that matches your skills and experience.</p>
      
      <p>Thanks again for your interest!</p>
      
      <p>Best regards,<br>
      {{senderName}}<br>
      {{companyName}}</p>
      `;
      const userTemplates = user?.emailTemplates || {};
      const talentPoolTemplate = userTemplates.talentPool || userTemplates.talent_pool || {};
      const subjectTemplate = talentPoolTemplate.subject || defaultSubject;
      const bodyTemplate = talentPoolTemplate.body || defaultBody;
      const emailSubject = sanitizeAndReplaceTemplate(
        subjectTemplate,
        candidate.name,
        job?.title || "the position",
        senderName,
        companyName
      );
      let emailBody = sanitizeAndReplaceTemplate(
        bodyTemplate,
        candidate.name,
        job?.title || "the position",
        senderName,
        companyName
      );
      emailBody = sanitizeEmailContent(emailBody);
      try {
        await storage.sendDirectEmail(candidate.email, emailSubject, emailBody, req.user?.id);
      } catch (emailError) {
      }
      res.json(updatedCandidate);
    } catch (error) {
      handleApiError(error, res);
    }
  });
  app2.post("/api/candidates/:id/reject", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const accountId = await storage.getUserAccountId(req.user.id);
      if (!accountId) {
        return res.status(400).json({ message: "User is not associated with any account" });
      }
      const candidateId = parseInt(req.params.id);
      if (isNaN(candidateId)) {
        return res.status(400).json({ message: "Invalid candidate ID" });
      }
      const candidate = await storage.getCandidate(candidateId, accountId);
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }
      const job = candidate.jobId ? await storage.getJob(candidate.jobId, accountId) : null;
      const nodemailer = await import("nodemailer");
      if (isLikelyInvalidEmail(candidate.email)) {
        console.error(
          `\u274C Rejected likely non-existent email: ${candidate.email}`
        );
        await storage.createActivityLog({
          accountId,
          userId: req.user?.id ?? null,
          action: "Rejection failed - invalid email",
          entityType: "candidate",
          entityId: candidate.id,
          details: {
            candidateName: candidate.name,
            jobTitle: job?.title,
            email: candidate.email
          },
          timestamp: /* @__PURE__ */ new Date()
        });
        return res.status(422).json({
          message: "Email invalid",
          errorType: "non_existent_email"
        });
      }
      const updatedCandidate = await storage.updateCandidate(candidateId, accountId, {
        status: "200_rejected",
        finalDecisionStatus: "rejected"
      });
      await storage.createActivityLog({
        accountId,
        userId: req.user?.id,
        action: "Rejected candidate",
        entityType: "candidate",
        entityId: candidate.id,
        details: { candidateName: candidate.name, jobTitle: job?.title },
        timestamp: /* @__PURE__ */ new Date()
      });
      const user = req.user ? await storage.getUser(req.user.id) : null;
      const senderName = user?.fullName || "Team Member";
      const companyName = getCompanyName();
      const defaultSubject = `Update on Your {{jobTitle}} Application`;
      const defaultBody = `
      <p>Hi {{candidateName}},</p>
      
      <p>Thanks for taking the time to interview for the {{jobTitle}} role with us. I really enjoyed our conversation and learning about your background and experience.</p>
      
      <p>After careful consideration, we've decided to move forward with another candidate for this position.</p>
      
      <p>I'd love to keep you in mind for future opportunities at {{companyName}}, as your skills and experience would be a great fit for our team. Feel free to stay connected, and I'll reach out if anything opens up that matches your background.</p>
      
      <p>Thanks again for your interest, and I wish you all the best!</p>
      
      <p>Best regards,<br>
      {{senderName}}<br>
      {{companyName}}</p>
      `;
      const userTemplates = user?.emailTemplates || {};
      const rejectionTemplate = userTemplates.rejection || userTemplates.reject || {};
      const subjectTemplate = rejectionTemplate.subject || defaultSubject;
      const bodyTemplate = rejectionTemplate.body || defaultBody;
      const emailSubject = sanitizeAndReplaceTemplate(
        subjectTemplate,
        candidate.name,
        job?.title || "the position",
        senderName,
        companyName
      );
      let emailBody = sanitizeAndReplaceTemplate(
        bodyTemplate,
        candidate.name,
        job?.title || "the position",
        senderName,
        companyName
      );
      emailBody = sanitizeEmailContent(emailBody);
      try {
        await storage.sendDirectEmail(candidate.email, emailSubject, emailBody, req.user?.id);
      } catch (emailError) {
      }
      res.json(updatedCandidate);
    } catch (error) {
      handleApiError(error, res);
    }
  });
  app2.post(
    "/api/candidates/:id/send-offer",
    validateRequest(
      z5.object({
        offerType: z5.string(),
        compensation: z5.string(),
        startDate: z5.string().optional(),
        notes: z5.string().optional()
      })
    ),
    async (req, res) => {
      try {
        if (!req.isAuthenticated()) {
          return res.status(401).json({ message: "Authentication required" });
        }
        const accountId = await storage.getUserAccountId(req.user.id);
        if (!accountId) {
          return res.status(400).json({ message: "User is not associated with any account" });
        }
        const candidateId = parseInt(req.params.id);
        if (isNaN(candidateId)) {
          return res.status(400).json({ message: "Invalid candidate ID" });
        }
        const candidate = await storage.getCandidate(candidateId, accountId);
        if (!candidate) {
          return res.status(404).json({ message: "Candidate not found" });
        }
        const job = candidate.jobId ? await storage.getJob(candidate.jobId, accountId) : null;
        try {
          if (isLikelyInvalidEmail(candidate.email)) {
            await storage.createActivityLog({
              accountId,
              userId: req.user?.id ?? null,
              action: "Offer send failed - invalid email",
              entityType: "candidate",
              entityId: candidate.id,
              details: {
                candidateName: candidate.name,
                jobTitle: job?.title,
                email: candidate.email,
                error: "Invalid or non-existent email address"
              },
              timestamp: /* @__PURE__ */ new Date()
            });
            return res.status(422).json({
              message: "Email invalid",
              errorType: "non_existent_email"
            });
          }
          const updatedCandidate = await storage.updateCandidate(candidateId, accountId, {
            status: "95_offer_sent",
            finalDecisionStatus: "offer_sent"
            // Also update final decision status
          });
          const startDate = req.body.startDate ? new Date(req.body.startDate) : void 0;
          const offer = await storage.createOffer({
            accountId,
            candidateId,
            offerType: req.body.offerType,
            compensation: req.body.compensation,
            startDate,
            notes: req.body.notes,
            status: "sent",
            sentDate: /* @__PURE__ */ new Date(),
            approvedById: req.user?.id,
            contractUrl: `https://firmos.ai/contracts/${candidateId}-${Date.now()}.pdf`
          });
          if (req.user?.id) {
            const user2 = await storage.getUser(req.user.id);
            const job2 = candidate.jobId ? await storage.getJob(candidate.jobId, accountId) : null;
            if (user2 && job2) {
              await notifySlackUsers(req.user.id, "offer_sent", {
                candidate: updatedCandidate,
                job: job2,
                offer,
                user: user2
              });
            }
          }
          await storage.createActivityLog({
            accountId,
            userId: req.user?.id ?? null,
            action: "Sent offer to candidate",
            entityType: "candidate",
            entityId: candidate.id,
            details: {
              candidateName: candidate.name,
              jobTitle: job?.title,
              offerType: req.body.offerType,
              compensation: req.body.compensation
            },
            timestamp: /* @__PURE__ */ new Date()
          });
          const user = req.user ? await storage.getUser(req.user.id) : null;
          const senderName = user?.fullName || "Team Member";
          const companyName = "Ready CPA";
          const publicBaseUrl = process.env.PUBLIC_BASE_URL;
          let baseUrl;
          if (publicBaseUrl) {
            baseUrl = publicBaseUrl.replace(/\/$/, "");
          } else {
            const protocol = req.protocol || (req.secure ? "https" : "http");
            const host = req.get("host") || "localhost:5000";
            baseUrl = `${protocol}://${host}`;
          }
          const acceptanceUrl = `${baseUrl}/accept-offer/${offer.acceptanceToken}`;
          const defaultSubject = `Excited to Offer You the {{jobTitle}} Position`;
          const defaultBody = `
          <p>Hi {{candidateName}},</p>
          
          <p>Great news \u2014 we'd love to bring you on board for the {{jobTitle}} position at {{companyName}}. After reviewing your experience, we're confident you'll make a strong impact on our team.</p>
          
          <p>Here's the link to your engagement contract: <a href="{{contractLink}}">[Contract Link]</a></p>
          
          <p>Please review and accept your offer here: <a href="{{acceptanceUrl}}">Accept Offer</a></p>
          
          <p>If anything's unclear or you'd like to chat, don't hesitate to reach out.</p>
          
          <p>Welcome aboard \u2014 we're excited to get started!</p>
          
          <p>Best regards,<br>
          {{senderName}}<br>
          {{companyName}}</p>
          `;
          const userTemplates = user?.emailTemplates || {};
          const offerTemplate = userTemplates.offer || {};
          const subjectTemplate = offerTemplate.subject || defaultSubject;
          const bodyTemplate = offerTemplate.body || defaultBody;
          const emailSubject = sanitizeAndReplaceTemplate(
            subjectTemplate,
            candidate.name,
            job?.title || "the position",
            senderName,
            companyName
          );
          let emailBody = sanitizeAndReplaceTemplate(
            bodyTemplate,
            candidate.name,
            job?.title || "the position",
            senderName,
            companyName,
            { contractLink: offer.contractUrl || "#", acceptanceUrl }
          );
          emailBody = sanitizeEmailContent(emailBody);
          await storage.sendDirectEmail(
            candidate.email,
            emailSubject,
            emailBody,
            req.user?.id
          );
          res.json({
            candidate: updatedCandidate,
            offer
          });
        } catch (error) {
          if (error.isNonExistentEmailError) {
            console.error("API Error:", error);
            return res.status(422).json({
              message: "Candidate email does not exist",
              errorType: "non_existent_email",
              candidate
              // Return the original candidate without updates
            });
          }
          throw error;
        }
      } catch (error) {
        handleApiError(error, res);
      }
    }
  );
  app2.post("/api/candidates/:id/accept-offer", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const accountId = await storage.getUserAccountId(req.user.id);
      if (!accountId) {
        return res.status(400).json({ message: "User is not associated with any account" });
      }
      const candidateId = parseInt(req.params.id);
      if (isNaN(candidateId)) {
        return res.status(400).json({ message: "Invalid candidate ID" });
      }
      const candidate = await storage.getCandidate(candidateId, accountId);
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }
      const updatedCandidate = await storage.updateCandidate(candidateId, accountId, {
        status: "100_offer_accepted"
      });
      const offer = await storage.getOfferByCandidate(candidateId, accountId);
      if (offer) {
        await storage.updateOffer(offer.id, accountId, {
          status: "accepted"
        });
      }
      const job = candidate.jobId ? await storage.getJob(candidate.jobId, accountId) : null;
      await storage.createActivityLog({
        accountId,
        userId: req.user?.id,
        action: "Candidate accepted offer",
        entityType: "candidate",
        entityId: candidate.id,
        details: { candidateName: candidate.name, jobTitle: job?.title },
        timestamp: /* @__PURE__ */ new Date()
      });
      if (offer && offer.approvedById) {
        const user = await storage.getUser(offer.approvedById);
        if (user && job) {
          await notifySlackUsers(offer.approvedById, "offer_accepted", {
            candidate,
            job,
            offer,
            user
          });
          try {
            await createNotification(
              offer.approvedById,
              "offer_accepted",
              "Offer Accepted",
              `${candidate.name} accepted the offer for ${job.title}`,
              `/candidates`,
              { candidateId: candidate.id, jobId: job.id, offerId: offer.id }
            );
          } catch (error) {
            console.error("[Candidate] Failed to create offer accepted notification:", error);
          }
        }
      }
      await storage.createNotification({
        type: "email",
        payload: {
          recipientEmail: candidate.email,
          subject: `Welcome to FirmOS - Onboarding Information`,
          template: "onboarding",
          context: {
            candidateName: candidate.name,
            jobTitle: job?.title,
            startDate: offer?.startDate ? new Date(offer.startDate).toLocaleDateString() : "To be determined",
            contractUrl: offer?.contractUrl
          }
        },
        processAfter: /* @__PURE__ */ new Date(),
        status: "pending"
      });
      res.json(updatedCandidate);
    } catch (error) {
      handleApiError(error, res);
    }
  });
  app2.get("/api/offers/:token", async (req, res) => {
    try {
      const token = req.params.token;
      if (!token) {
        return res.status(400).json({ message: "Token is required" });
      }
      const offer = await storage.getOfferByToken(token);
      if (!offer) {
        return res.status(404).json({ message: "Offer not found or invalid token" });
      }
      if (offer.status === "accepted") {
        return res.status(400).json({ message: "This offer has already been accepted" });
      }
      if (offer.status === "declined") {
        return res.status(400).json({ message: "This offer has already been declined" });
      }
      if (offer.status !== "sent") {
        return res.status(400).json({ message: "This offer is not available for acceptance" });
      }
      const candidate = await storage.getCandidate(offer.candidateId, offer.accountId);
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }
      const job = candidate.jobId ? await storage.getJob(candidate.jobId, offer.accountId) : null;
      res.json({
        offer: {
          id: offer.id,
          offerType: offer.offerType,
          compensation: offer.compensation,
          startDate: offer.startDate,
          notes: offer.notes,
          contractUrl: offer.contractUrl
        },
        candidate: {
          name: candidate.name,
          email: candidate.email
        },
        job: job ? {
          title: job.title,
          type: job.type
        } : null
      });
    } catch (error) {
      handleApiError(error, res);
    }
  });
  app2.post("/api/offers/:token/respond", async (req, res) => {
    try {
      const token = req.params.token;
      const { action } = req.body;
      if (!token) {
        return res.status(400).json({ message: "Token is required" });
      }
      if (!action || action !== "accept" && action !== "decline") {
        return res.status(400).json({ message: "Action must be 'accept' or 'decline'" });
      }
      const offer = await storage.getOfferByToken(token);
      if (!offer) {
        return res.status(404).json({ message: "Offer not found or invalid token" });
      }
      if (offer.status === "accepted") {
        return res.status(400).json({ message: "This offer has already been accepted" });
      }
      if (offer.status === "declined") {
        return res.status(400).json({ message: "This offer has already been declined" });
      }
      const candidate = await storage.getCandidate(offer.candidateId, offer.accountId);
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }
      const job = candidate.jobId ? await storage.getJob(candidate.jobId, offer.accountId) : null;
      if (action === "accept") {
        await storage.updateOffer(offer.id, offer.accountId, {
          status: "accepted"
        });
        await storage.updateCandidate(offer.candidateId, offer.accountId, {
          status: "100_offer_accepted"
        });
        const approvingUser = offer.approvedById ? await storage.getUser(offer.approvedById) : null;
        const senderName = approvingUser?.fullName || "Team Member";
        const companyName = getCompanyName();
        const onboardingLink = approvingUser?.calendarLink || "#";
        const defaultOnboardingSubject = `Welcome to {{companyName}}!`;
        const defaultOnboardingBody = `
        <p>Hi {{candidateName}},</p>
        
        <p>Welcome to {{companyName}}! We're thrilled to have you join our team as {{jobTitle}}.</p>
        
        <p>To get started, please complete the onboarding checklist and schedule your first day.</p>
        
        <p>Schedule your onboarding call here: <a href="{{onboardingLink}}">Schedule Onboarding</a></p>
        
        <p>If you have any questions before your start date, don't hesitate to reach out.</p>
        
        <p>Looking forward to working with you!</p>
        
        <p>Best regards,<br>
        {{senderName}}<br>
        {{companyName}}</p>
        `;
        const userTemplates = approvingUser?.emailTemplates || {};
        const onboardingTemplate = userTemplates.onboarding || {};
        const onboardingSubjectTemplate = onboardingTemplate.subject || defaultOnboardingSubject;
        const onboardingBodyTemplate = onboardingTemplate.body || defaultOnboardingBody;
        const onboardingSubject = onboardingSubjectTemplate.replace(/\{\{candidateName\}\}/g, candidate.name).replace(/\{\{jobTitle\}\}/g, job?.title || "the position").replace(/\{\{senderName\}\}/g, senderName).replace(/\{\{companyName\}\}/g, companyName);
        const onboardingBody = onboardingBodyTemplate.replace(/\{\{candidateName\}\}/g, candidate.name).replace(/\{\{jobTitle\}\}/g, job?.title || "the position").replace(/\{\{senderName\}\}/g, senderName).replace(/\{\{companyName\}\}/g, companyName).replace(/\{\{onboardingLink\}\}/g, onboardingLink);
        try {
          await storage.sendDirectEmail(candidate.email, onboardingSubject, onboardingBody, req.user?.id);
        } catch (emailError) {
          console.error("Error sending onboarding email:", emailError);
        }
        try {
          await storage.createNotification({
            type: "slack",
            payload: {
              channel: "onboarding",
              message: `${candidate.name} has accepted the offer for ${job?.title} position!`,
              candidateId: candidate.id,
              jobId: candidate.jobId
            },
            processAfter: /* @__PURE__ */ new Date(),
            status: "pending"
          });
        } catch (slackError) {
          console.error("Error creating Slack notification:", slackError);
        }
        await storage.createActivityLog({
          accountId: offer.accountId,
          userId: offer.approvedById ?? null,
          action: "Candidate accepted offer",
          entityType: "candidate",
          entityId: candidate.id,
          details: { candidateName: candidate.name, jobTitle: job?.title },
          timestamp: /* @__PURE__ */ new Date()
        });
        res.json({
          success: true,
          message: "Offer accepted successfully. Onboarding email has been sent."
        });
      } else {
        await storage.updateOffer(offer.id, offer.accountId, {
          status: "declined"
        });
        await storage.updateCandidate(offer.candidateId, offer.accountId, {
          status: "200_rejected",
          finalDecisionStatus: "rejected"
        });
        await storage.createActivityLog({
          accountId: offer.accountId,
          userId: offer.approvedById ?? null,
          action: "Candidate declined offer",
          entityType: "candidate",
          entityId: candidate.id,
          details: { candidateName: candidate.name, jobTitle: job?.title },
          timestamp: /* @__PURE__ */ new Date()
        });
        res.json({
          success: true,
          message: "Offer declined successfully."
        });
      }
    } catch (error) {
      handleApiError(error, res);
    }
  });
}

// server/api/interview.ts
init_storage();
init_utils();
init_notifications();
import { z as z6 } from "zod";

// server/api/google-calendar.ts
init_storage();
init_utils();
init_db();
init_schema();
import { google as google3 } from "googleapis";
import { eq as eq4 } from "drizzle-orm";
function setupGoogleCalendarRoutes(app2) {
  app2.get("/api/google-calendar/auth", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const protocol = req.get("x-forwarded-proto") || req.protocol || (req.secure ? "https" : "http");
      const host = req.get("x-forwarded-host") || req.get("host") || "localhost:5000";
      let redirectUri = `${protocol}://${host}/api/google-calendar/callback`;
      const envRedirectUri = process.env.GOOGLE_REDIRECT_URI;
      if (envRedirectUri) {
        try {
          const envUrl = new URL(envRedirectUri);
          const currentUrl = new URL(redirectUri);
          if (envUrl.hostname === currentUrl.hostname || !host.includes("ngrok") && !host.includes("localhost")) {
            redirectUri = `${envUrl.protocol}//${envUrl.host}/api/google-calendar/callback`;
          }
        } catch (e) {
        }
      }
      redirectUri = redirectUri.replace(/\/$/, "");
      const oauth2Client = new google3.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        redirectUri
      );
      console.log("[Google Calendar Auth] Using redirect URI:", redirectUri);
      const authUrl = oauth2Client.generateAuthUrl({
        access_type: "offline",
        // Get refresh token
        scope: [
          "https://www.googleapis.com/auth/calendar.events",
          // Create/update/delete calendar events
          "https://www.googleapis.com/auth/calendar.readonly"
          // Read calendar to check availability
        ],
        prompt: "consent",
        // Force consent screen to get refresh token
        state: JSON.stringify({ userId: req.user.id })
        // Pass user ID in state
      });
      res.json({ authUrl });
    } catch (error) {
      handleApiError(error, res);
    }
  });
  app2.get("/api/google-calendar/callback", async (req, res) => {
    let redirectUri = "";
    try {
      const { code, state } = req.query;
      if (!code) {
        return res.redirect(`/integrations?error=oauth_cancelled`);
      }
      let userId;
      try {
        const stateData = JSON.parse(state);
        userId = stateData.userId;
      } catch {
        return res.redirect(`/integrations?error=invalid_state`);
      }
      const protocol = req.get("x-forwarded-proto") || req.protocol || (req.secure ? "https" : "http");
      const host = req.get("x-forwarded-host") || req.get("host") || "localhost:5000";
      redirectUri = `${protocol}://${host}/api/google-calendar/callback`;
      const envRedirectUri = process.env.GOOGLE_REDIRECT_URI;
      if (envRedirectUri) {
        try {
          const envUrl = new URL(envRedirectUri);
          const currentUrl = new URL(redirectUri);
          if (envUrl.hostname === currentUrl.hostname || !host.includes("ngrok") && !host.includes("localhost")) {
            redirectUri = `${envUrl.protocol}//${envUrl.host}/api/google-calendar/callback`;
          }
        } catch (e) {
        }
      }
      redirectUri = redirectUri.replace(/\/$/, "");
      const oauth2Client = new google3.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        redirectUri
      );
      console.log("[Google Calendar Callback] Using redirect URI:", redirectUri);
      const { tokens: tokens2 } = await oauth2Client.getToken(code);
      if (!tokens2.access_token) {
        console.error("[Google Calendar Callback] No access token received");
        return res.redirect(`/integrations?error=no_access_token`);
      }
      const existing = await storage.getPlatformIntegration("google-calendar", userId);
      const credentials = {
        accessToken: tokens2.access_token,
        refreshToken: tokens2.refresh_token || null
      };
      if (existing) {
        const existingId = existing.id;
        if (existingId) {
          await db.delete(platformIntegrations).where(eq4(platformIntegrations.id, existingId));
        }
        await storage.createPlatformIntegration({
          userId,
          platformId: "google-calendar",
          platformName: "Google Calendar",
          platformType: "communication",
          status: "connected",
          credentials,
          syncDirection: "one-way",
          isEnabled: true
        });
      } else {
        await storage.createPlatformIntegration({
          userId,
          platformId: "google-calendar",
          platformName: "Google Calendar",
          platformType: "communication",
          status: "connected",
          credentials,
          syncDirection: "one-way",
          isEnabled: true
        });
      }
      res.redirect(`/integrations?google_calendar_connected=true`);
    } catch (error) {
      console.error("[Google Calendar Callback] Error details:", {
        message: error.message,
        redirectUri,
        code: req.query.code ? "present" : "missing",
        state: req.query.state ? "present" : "missing"
      });
      if (error.message && error.message.includes("redirect_uri_mismatch")) {
        console.error("[Google Calendar Callback] Redirect URI mismatch detected!");
        console.error("[Google Calendar Callback] Expected redirect URI:", redirectUri);
        console.error("[Google Calendar Callback] Make sure this exact URI is registered in Google Cloud Console");
      }
      res.redirect(`/integrations?error=${encodeURIComponent(error.message)}`);
    }
  });
  app2.get("/api/google-calendar/status", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const userId = req.user.id;
      const integration = await storage.getPlatformIntegration("google-calendar", userId);
      const credentials = integration?.credentials;
      const syncWithCalendly = credentials?.syncWithCalendly || false;
      res.json({
        connected: integration?.status === "connected" || false,
        syncWithCalendly
      });
    } catch (error) {
      handleApiError(error, res);
    }
  });
  app2.post("/api/google-calendar/sync-settings", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const userId = req.user.id;
      const { syncWithCalendly } = req.body;
      const integration = await storage.getPlatformIntegration("google-calendar", userId);
      if (!integration) {
        return res.status(404).json({ message: "Google Calendar integration not found" });
      }
      const currentCredentials = integration.credentials || {};
      const updatedCredentials = {
        ...currentCredentials,
        syncWithCalendly: syncWithCalendly === true
      };
      await storage.updatePlatformIntegration("google-calendar", {
        credentials: updatedCredentials
      });
      res.json({
        message: "Sync settings updated successfully",
        syncWithCalendly: syncWithCalendly === true
      });
    } catch (error) {
      handleApiError(error, res);
    }
  });
  app2.get("/api/google-calendar/availability", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const userId = req.user.id;
      const integration = await storage.getPlatformIntegration("google-calendar", userId);
      if (!integration) {
        return res.status(404).json({ message: "Google Calendar integration not found" });
      }
      const credentials = integration.credentials;
      const availability = credentials?.availability || {
        daysOfWeek: [1, 2, 3, 4, 5],
        // Monday to Friday
        startTime: "09:00",
        endTime: "17:00",
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        slotDuration: 30
        // minutes
      };
      res.json(availability);
    } catch (error) {
      handleApiError(error, res);
    }
  });
  app2.post("/api/google-calendar/availability", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const userId = req.user.id;
      const { daysOfWeek, startTime, endTime, timeZone, slotDuration } = req.body;
      const integration = await storage.getPlatformIntegration("google-calendar", userId);
      if (!integration) {
        return res.status(404).json({ message: "Google Calendar integration not found" });
      }
      const currentCredentials = integration.credentials || {};
      const updatedCredentials = {
        ...currentCredentials || {},
        availability: {
          daysOfWeek: daysOfWeek || [1, 2, 3, 4, 5],
          startTime: startTime || "09:00",
          endTime: endTime || "17:00",
          timeZone: timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone,
          slotDuration: slotDuration || 30
        }
      };
      await storage.updatePlatformIntegration("google-calendar", {
        credentials: updatedCredentials
      });
      res.json({ message: "Availability settings updated successfully" });
    } catch (error) {
      handleApiError(error, res);
    }
  });
  app2.options("/api/google-calendar/available-slots", (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.sendStatus(200);
  });
  app2.get("/api/google-calendar/available-slots", async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    try {
      const { userId, startDate, endDate } = req.query;
      if (!userId) {
        return res.status(400).json({ message: "userId is required" });
      }
      const integration = await storage.getPlatformIntegration("google-calendar", parseInt(userId));
      if (!integration || integration.status !== "connected") {
        return res.status(404).json({ message: "Google Calendar integration not found or not connected" });
      }
      const credentials = integration.credentials;
      const availability = credentials?.availability || {
        daysOfWeek: [1, 2, 3, 4, 5],
        startTime: "09:00",
        endTime: "17:00",
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        slotDuration: 30
      };
      const oauth2Client = await getGoogleCalendarClient(parseInt(userId));
      const calendar = google3.calendar({ version: "v3", auth: oauth2Client });
      const start = startDate ? new Date(startDate) : /* @__PURE__ */ new Date();
      const end = endDate ? new Date(endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1e3);
      const busyResponse = await calendar.freebusy.query({
        requestBody: {
          timeMin: start.toISOString(),
          timeMax: end.toISOString(),
          items: [{ id: "primary" }]
        }
      });
      const busyTimes = (busyResponse.data.calendars?.primary?.busy || []).map((busy) => ({
        start: busy.start ?? void 0,
        end: busy.end ?? void 0
      }));
      const availableSlots = generateAvailableSlots(
        start,
        end,
        availability,
        busyTimes
      );
      res.json({ availableSlots });
    } catch (error) {
      handleApiError(error, res);
    }
  });
  app2.options("/api/google-calendar/book", (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.sendStatus(200);
  });
  app2.post("/api/google-calendar/book", async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    try {
      const { userId, candidateName, candidateEmail, scheduledDate, jobId, candidateId } = req.body;
      if (!userId || !candidateName || !candidateEmail || !scheduledDate) {
        return res.status(400).json({ message: "userId, candidateName, candidateEmail, and scheduledDate are required" });
      }
      const integration = await storage.getPlatformIntegration("google-calendar", userId);
      if (!integration || integration.status !== "connected") {
        return res.status(404).json({ message: "Google Calendar integration not found or not connected" });
      }
      const accountId = await storage.getUserAccountId(userId);
      if (!accountId) {
        return res.status(400).json({ message: "User is not associated with any account" });
      }
      const scheduledDateTime = new Date(scheduledDate);
      const slotEndTime = new Date(scheduledDateTime.getTime() + 60 * 60 * 1e3);
      const oauth2Client = await getGoogleCalendarClient(userId);
      const calendar = google3.calendar({ version: "v3", auth: oauth2Client });
      const busyCheck = await calendar.freebusy.query({
        requestBody: {
          timeMin: scheduledDateTime.toISOString(),
          timeMax: slotEndTime.toISOString(),
          items: [{ id: "primary" }]
        }
      });
      const isSlotBusy = busyCheck.data.calendars?.primary?.busy && busyCheck.data.calendars.primary.busy.length > 0;
      if (isSlotBusy) {
        return res.status(409).json({
          message: "This time slot is no longer available. Please select another time."
        });
      }
      const timeWindow = 5 * 60 * 1e3;
      const existingInterviews = await storage.getInterviews(accountId, { interviewerId: userId });
      const conflictingInterview = existingInterviews.find((interview2) => {
        if (!interview2.scheduledDate) return false;
        const interviewTime = new Date(interview2.scheduledDate).getTime();
        const scheduledTime = scheduledDateTime.getTime();
        return Math.abs(interviewTime - scheduledTime) < timeWindow;
      });
      if (conflictingInterview) {
        return res.status(409).json({
          message: "An interview is already scheduled at this time. Please select another time."
        });
      }
      const user = await storage.getUser(userId);
      const job = jobId ? await storage.getJob(jobId, accountId) : null;
      const eventTitle = `Interview: ${candidateName}${job ? ` - ${job.title}` : ""}`;
      const eventDescription = `Interview scheduled via HireOS

Candidate: ${candidateName}
Email: ${candidateEmail}${job ? `
Position: ${job.title}` : ""}

View in HireOS: ${process.env.FRONTEND_URL || "https://hireos.com"}/candidates${candidateId ? `/${candidateId}` : ""}`;
      const event = {
        summary: eventTitle,
        description: eventDescription,
        start: {
          dateTime: scheduledDateTime.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        end: {
          dateTime: slotEndTime.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        // Organizer is automatically set to the authenticated user (userId)
        // Both the interviewer (user) and candidate are added as attendees
        attendees: [
          { email: candidateEmail, displayName: candidateName },
          ...user?.email ? [{ email: user.email, displayName: user.fullName }] : []
        ],
        reminders: {
          useDefault: false,
          overrides: [
            { method: "email", minutes: 24 * 60 },
            { method: "popup", minutes: 60 }
          ]
        }
      };
      const calendarEvent = await calendar.events.insert({
        calendarId: "primary",
        requestBody: event,
        sendUpdates: "all"
      });
      let interview;
      if (candidateId) {
        const candidate = await storage.getCandidate(candidateId, accountId);
        if (candidate) {
          const existingInterviews2 = await storage.getInterviews(accountId, { candidateId: candidate.id });
          const existingInterview = existingInterviews2.find(
            (inv) => inv.status === "scheduled" || inv.status === "pending"
          );
          if (existingInterview) {
            interview = await storage.updateInterview(existingInterview.id, accountId, {
              scheduledDate: scheduledDateTime,
              interviewerId: userId,
              status: "scheduled",
              notes: existingInterview.notes ? `${existingInterview.notes}

Rescheduled via Google Calendar booking page on ${(/* @__PURE__ */ new Date()).toISOString()}` : `Rescheduled via Google Calendar booking page on ${(/* @__PURE__ */ new Date()).toISOString()}`
            });
          } else {
            interview = await storage.createInterview({
              accountId,
              candidateId: candidate.id,
              scheduledDate: scheduledDateTime,
              interviewerId: userId,
              type: "video",
              status: "scheduled",
              notes: `Booked via Google Calendar booking page on ${(/* @__PURE__ */ new Date()).toISOString()}`
            });
          }
          if (candidate.status !== "60_1st_interview_scheduled") {
            await storage.updateCandidate(candidate.id, accountId, {
              status: "60_1st_interview_scheduled"
            });
          }
        }
      } else {
        const newCandidate = await storage.createCandidate({
          accountId,
          name: candidateName,
          email: candidateEmail,
          status: "60_1st_interview_scheduled",
          jobId: jobId || null
        });
        interview = await storage.createInterview({
          accountId,
          candidateId: newCandidate.id,
          scheduledDate: scheduledDateTime,
          interviewerId: userId,
          type: "video",
          status: "scheduled",
          notes: `Booked via Google Calendar booking page on ${(/* @__PURE__ */ new Date()).toISOString()}`
        });
      }
      if (interview && user) {
        try {
          const { createNotification: createNotification2 } = await Promise.resolve().then(() => (init_notifications(), notifications_exports));
          await createNotification2(
            userId,
            "interview_scheduled",
            "Interview Scheduled",
            `Interview scheduled: ${candidateName}${job ? ` (${job.title})` : ""} on ${scheduledDateTime.toLocaleDateString()} at ${scheduledDateTime.toLocaleTimeString()}`,
            `/candidates`,
            { candidateId: interview.candidateId, jobId: job?.id, interviewId: interview.id }
          );
        } catch (error) {
          console.error("[Google Calendar Book] Failed to create notification:", error);
        }
      }
      res.json({
        message: "Interview booked successfully",
        interview,
        calendarEventId: calendarEvent.data.id
      });
    } catch (error) {
      handleApiError(error, res);
    }
  });
  app2.post("/api/google-calendar/disconnect", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const userId = req.user.id;
      const integration = await storage.getPlatformIntegration("google-calendar", userId);
      if (!integration) {
        return res.status(404).json({ message: "Google Calendar integration not found" });
      }
      if (integration.id) {
        const { db: dbInstance } = await Promise.resolve().then(() => (init_db(), db_exports));
        const { platformIntegrations: platformIntegrationsTable } = await Promise.resolve().then(() => (init_schema(), schema_exports));
        const { eq: eq9 } = await import("drizzle-orm");
        await dbInstance.delete(platformIntegrationsTable).where(eq9(platformIntegrationsTable.id, integration.id));
      } else {
        const { db: dbInstance } = await Promise.resolve().then(() => (init_db(), db_exports));
        const { platformIntegrations: platformIntegrationsTable } = await Promise.resolve().then(() => (init_schema(), schema_exports));
        const { eq: eq9, and: and7 } = await import("drizzle-orm");
        await dbInstance.delete(platformIntegrationsTable).where(
          and7(
            eq9(platformIntegrationsTable.platformId, "google-calendar"),
            eq9(platformIntegrationsTable.userId, userId)
          )
        );
      }
      res.json({ message: "Google Calendar disconnected successfully" });
    } catch (error) {
      handleApiError(error, res);
    }
  });
}
async function getGoogleCalendarClient(userId) {
  try {
    const integration = await storage.getPlatformIntegration("google-calendar", userId);
    if (!integration || !integration.credentials) {
      throw new Error("Google Calendar integration not found. Please connect your Google Calendar account first.");
    }
    const credentials = integration.credentials;
    if (!credentials.accessToken) {
      throw new Error("Google Calendar access token not found. Please reconnect your Google Calendar account.");
    }
    const oauth2Client = new google3.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    oauth2Client.setCredentials({
      access_token: credentials.accessToken,
      refresh_token: credentials.refreshToken
    });
    if (credentials.refreshToken) {
      try {
        const { credentials: newCredentials } = await oauth2Client.refreshAccessToken();
        if (newCredentials.access_token) {
          await storage.updatePlatformIntegration("google-calendar", {
            credentials: {
              ...credentials,
              accessToken: newCredentials.access_token,
              refreshToken: newCredentials.refresh_token || credentials.refreshToken
            }
          });
          oauth2Client.setCredentials(newCredentials);
        }
      } catch (refreshError) {
        console.warn("Failed to refresh Google Calendar token, using existing token:", refreshError);
      }
    }
    return oauth2Client;
  } catch (error) {
    console.error("Error getting Google Calendar client:", error);
    throw new Error(`Failed to get Google Calendar client: ${error.message || "Unknown error"}`);
  }
}
async function createGoogleCalendarEvent(userId, interview) {
  try {
    const oauth2Client = await getGoogleCalendarClient(userId);
    const calendar = google3.calendar({ version: "v3", auth: oauth2Client });
    const user = await storage.getUser(userId);
    const organizerEmail = user?.email || "";
    const organizerName = user?.fullName || "HireOS User";
    const candidateName = interview.candidate?.name || "Candidate";
    const jobTitle = interview.job?.title || "Position";
    const eventTitle = `Interview: ${candidateName} - ${jobTitle}`;
    let description = `Interview scheduled via HireOS

`;
    description += `Candidate: ${candidateName}
`;
    description += `Position: ${jobTitle}
`;
    description += `Type: ${interview.type}
`;
    if (interview.videoUrl) {
      description += `Video Link: ${interview.videoUrl}
`;
    }
    description += `
View in HireOS: ${process.env.FRONTEND_URL || "https://hireos.com"}/candidates/${interview.candidateId}`;
    const attendees = [];
    if (interview.candidate?.email) {
      attendees.push({
        email: interview.candidate.email,
        displayName: interview.candidate.name
      });
    }
    if (interview.interviewer?.email && interview.interviewer.email !== organizerEmail) {
      attendees.push({
        email: interview.interviewer.email,
        displayName: interview.interviewer.fullName
      });
    }
    const event = {
      summary: eventTitle,
      description,
      start: {
        dateTime: interview.scheduledDate.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      end: {
        dateTime: new Date(interview.scheduledDate.getTime() + 60 * 60 * 1e3).toISOString(),
        // 1 hour default
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      attendees,
      reminders: {
        useDefault: false,
        overrides: [
          { method: "email", minutes: 24 * 60 },
          // 1 day before
          { method: "popup", minutes: 60 }
          // 1 hour before
        ]
      },
      ...interview.videoUrl && {
        location: interview.videoUrl
      }
    };
    const response = await calendar.events.insert({
      calendarId: "primary",
      requestBody: event,
      sendUpdates: "all"
      // Send email notifications to attendees
    });
    return response.data.id || null;
  } catch (error) {
    console.error("Error creating Google Calendar event:", error);
    return null;
  }
}
function generateAvailableSlots(startDate, endDate, availability, busyTimes) {
  const slots = [];
  const currentDate = new Date(startDate);
  const slotDurationMs = availability.slotDuration * 60 * 1e3;
  const [startHour, startMinute] = availability.startTime.split(":").map(Number);
  const [endHour, endMinute] = availability.endTime.split(":").map(Number);
  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay();
    const dayOfWeekMondayBased = dayOfWeek === 0 ? 7 : dayOfWeek;
    if (availability.daysOfWeek.includes(dayOfWeekMondayBased)) {
      const dayStart = new Date(currentDate);
      dayStart.setHours(startHour, startMinute, 0, 0);
      const dayEnd = new Date(currentDate);
      dayEnd.setHours(endHour, endMinute, 0, 0);
      let slotStart = new Date(dayStart);
      while (slotStart < dayEnd) {
        const slotEnd = new Date(slotStart.getTime() + slotDurationMs);
        const isBusy = busyTimes.some((busy) => {
          if (!busy.start || !busy.end) return false;
          const busyStart = new Date(busy.start);
          const busyEnd = new Date(busy.end);
          return slotStart < busyEnd && slotEnd > busyStart;
        });
        if (!isBusy && slotStart > /* @__PURE__ */ new Date()) {
          slots.push({
            start: slotStart.toISOString(),
            end: slotEnd.toISOString()
          });
        }
        slotStart = new Date(slotStart.getTime() + slotDurationMs);
      }
    }
    currentDate.setDate(currentDate.getDate() + 1);
    currentDate.setHours(0, 0, 0, 0);
  }
  return slots;
}

// server/api/interview.ts
function setupInterviewRoutes(app2) {
  app2.post("/api/interviews", validateRequest(
    z6.object({
      candidateId: z6.number(),
      scheduledDate: z6.string().optional(),
      interviewerId: z6.number().optional(),
      type: z6.string(),
      videoUrl: z6.string().optional(),
      notes: z6.string().optional()
    })
  ), async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const accountId = await storage.getUserAccountId(req.user.id);
      if (!accountId) {
        return res.status(400).json({ message: "User is not associated with any account" });
      }
      const scheduledDate = req.body.scheduledDate ? new Date(req.body.scheduledDate) : void 0;
      const interview = await storage.createInterview({
        accountId,
        candidateId: req.body.candidateId,
        scheduledDate,
        interviewerId: req.body.interviewerId || req.user?.id,
        type: req.body.type,
        videoUrl: req.body.videoUrl,
        notes: req.body.notes,
        status: "scheduled"
      });
      const candidate = await storage.getCandidate(req.body.candidateId, accountId);
      if (candidate && candidate.status !== "interview_scheduled") {
        await storage.updateCandidate(req.body.candidateId, accountId, {
          status: "interview_scheduled"
        });
      }
      if (req.user?.id && candidate && scheduledDate) {
        try {
          const job = candidate.jobId ? await storage.getJob(candidate.jobId, accountId) : null;
          const jobTitle = job?.title || "position";
          await createNotification(
            req.user.id,
            "interview_scheduled",
            "Interview Scheduled",
            `Interview scheduled: ${candidate.name} (${jobTitle}) on ${scheduledDate.toLocaleDateString()} at ${scheduledDate.toLocaleTimeString()}`,
            `/candidates`,
            { candidateId: candidate.id, jobId: job?.id, interviewId: interview.id }
          );
        } catch (error) {
          console.error("[Interview] Failed to create notification:", error);
        }
      }
      try {
        const { triggerWorkflows: triggerWorkflows2 } = await Promise.resolve().then(() => (init_workflow_engine(), workflow_engine_exports));
        const job = candidate?.jobId ? await storage.getJob(candidate.jobId, accountId) : null;
        await triggerWorkflows2("interview_scheduled", {
          entityType: "interview",
          entityId: interview.id,
          interview,
          candidate,
          job,
          user: req.user
        }, accountId);
      } catch (error) {
        console.error("[Interview Create] Workflow trigger error:", error);
      }
      if (req.user?.id && scheduledDate && candidate) {
        try {
          const job = candidate.jobId ? await storage.getJob(candidate.jobId, accountId) : null;
          const interviewer = interview.interviewerId ? await storage.getUser(interview.interviewerId) : null;
          await createGoogleCalendarEvent(req.user.id, {
            id: interview.id,
            candidateId: candidate.id,
            scheduledDate,
            type: interview.type,
            videoUrl: interview.videoUrl || void 0,
            candidate: {
              name: candidate.name,
              email: candidate.email
            },
            job: job ? { title: job.title } : void 0,
            interviewer: interviewer ? {
              fullName: interviewer.fullName,
              email: interviewer.email
            } : void 0
          });
        } catch (error) {
          console.error("[Interview] Failed to create Google Calendar event:", error);
        }
      }
      await storage.createActivityLog({
        accountId,
        userId: req.user?.id,
        action: "Scheduled interview",
        entityType: "interview",
        entityId: interview.id,
        details: {
          candidateId: req.body.candidateId,
          candidateName: candidate?.name,
          scheduledDate: scheduledDate?.toISOString()
        },
        timestamp: /* @__PURE__ */ new Date()
      });
      res.status(201).json(interview);
    } catch (error) {
      handleApiError(error, res);
    }
  });
  app2.get("/api/interviews", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const accountId = await storage.getUserAccountId(req.user.id);
      if (!accountId) {
        return res.status(400).json({ message: "User is not associated with any account" });
      }
      const candidateId = req.query.candidateId ? parseInt(req.query.candidateId) : void 0;
      const interviewerId = req.query.interviewerId ? parseInt(req.query.interviewerId) : void 0;
      const status = req.query.status;
      const interviews3 = await storage.getInterviews(accountId, {
        candidateId,
        interviewerId,
        status
      });
      res.json(interviews3);
    } catch (error) {
      handleApiError(error, res);
    }
  });
  app2.get("/api/interviews/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const accountId = await storage.getUserAccountId(req.user.id);
      if (!accountId) {
        return res.status(400).json({ message: "User is not associated with any account" });
      }
      const interviewId = parseInt(req.params.id);
      if (isNaN(interviewId)) {
        return res.status(400).json({ message: "Invalid interview ID" });
      }
      const interview = await storage.getInterview(interviewId, accountId);
      if (!interview) {
        return res.status(404).json({ message: "Interview not found" });
      }
      res.json(interview);
    } catch (error) {
      handleApiError(error, res);
    }
  });
  app2.patch("/api/interviews/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const accountId = await storage.getUserAccountId(req.user.id);
      if (!accountId) {
        return res.status(400).json({ message: "User is not associated with any account" });
      }
      const interviewId = parseInt(req.params.id);
      if (isNaN(interviewId)) {
        return res.status(400).json({ message: "Invalid interview ID" });
      }
      const interview = await storage.getInterview(interviewId, accountId);
      if (!interview) {
        return res.status(404).json({ message: "Interview not found" });
      }
      if (req.body.scheduledDate) {
        req.body.scheduledDate = new Date(req.body.scheduledDate);
      }
      if (req.body.conductedDate) {
        req.body.conductedDate = new Date(req.body.conductedDate);
      }
      const updatedInterview = await storage.updateInterview(interviewId, accountId, req.body);
      if (req.user?.id && req.body.scheduledDate && updatedInterview) {
        try {
          const candidate = await storage.getCandidate(updatedInterview.candidateId, accountId);
          const job = candidate?.jobId ? await storage.getJob(candidate.jobId, accountId) : null;
          const interviewer = updatedInterview.interviewerId ? await storage.getUser(updatedInterview.interviewerId) : null;
        } catch (error) {
          console.error("[Interview] Failed to update Google Calendar event:", error);
        }
      }
      await storage.createActivityLog({
        accountId,
        userId: req.user?.id,
        action: "Updated interview",
        entityType: "interview",
        entityId: interview.id,
        details: { candidateId: interview.candidateId },
        timestamp: /* @__PURE__ */ new Date()
      });
      res.json(updatedInterview);
    } catch (error) {
      handleApiError(error, res);
    }
  });
  app2.post("/api/interviews/:id/complete", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const accountId = await storage.getUserAccountId(req.user.id);
      if (!accountId) {
        return res.status(400).json({ message: "User is not associated with any account" });
      }
      const interviewId = parseInt(req.params.id);
      if (isNaN(interviewId)) {
        return res.status(400).json({ message: "Invalid interview ID" });
      }
      const interview = await storage.getInterview(interviewId, accountId);
      if (!interview) {
        return res.status(404).json({ message: "Interview not found" });
      }
      const updatedInterview = await storage.updateInterview(interviewId, accountId, {
        status: "completed",
        conductedDate: /* @__PURE__ */ new Date()
      });
      try {
        const { triggerWorkflows: triggerWorkflows2 } = await Promise.resolve().then(() => (init_workflow_engine(), workflow_engine_exports));
        const candidate = await storage.getCandidate(interview.candidateId, accountId);
        const job = candidate?.jobId ? await storage.getJob(candidate.jobId, accountId) : null;
        await triggerWorkflows2("interview_completed", {
          entityType: "interview",
          entityId: interview.id,
          interview: updatedInterview,
          candidate,
          job,
          user: req.user
        }, accountId);
      } catch (error) {
        console.error("[Interview Complete] Workflow trigger error:", error);
      }
      await storage.createActivityLog({
        accountId,
        userId: req.user?.id,
        action: "Completed interview",
        entityType: "interview",
        entityId: interview.id,
        details: { candidateId: interview.candidateId },
        timestamp: /* @__PURE__ */ new Date()
      });
      res.json(updatedInterview);
    } catch (error) {
      handleApiError(error, res);
    }
  });
  app2.post("/api/interviews/:id/evaluate", validateRequest(
    z6.object({
      technicalScore: z6.number().min(1).max(5).optional(),
      communicationScore: z6.number().min(1).max(5).optional(),
      problemSolvingScore: z6.number().min(1).max(5).optional(),
      culturalFitScore: z6.number().min(1).max(5).optional(),
      overallRating: z6.string(),
      technicalComments: z6.string().optional(),
      communicationComments: z6.string().optional(),
      problemSolvingComments: z6.string().optional(),
      culturalFitComments: z6.string().optional(),
      overallComments: z6.string().optional()
    })
  ), async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const accountId = await storage.getUserAccountId(req.user.id);
      if (!accountId) {
        return res.status(400).json({ message: "User is not associated with any account" });
      }
      const interviewId = parseInt(req.params.id);
      if (isNaN(interviewId)) {
        return res.status(400).json({ message: "Invalid interview ID" });
      }
      const interview = await storage.getInterview(interviewId, accountId);
      if (!interview) {
        return res.status(404).json({ message: "Interview not found" });
      }
      const existingEvaluation = await storage.getEvaluationByInterview(interviewId, accountId);
      let evaluation;
      if (existingEvaluation) {
        evaluation = await storage.updateEvaluation(existingEvaluation.id, accountId, {
          ...req.body,
          evaluatorId: req.user?.id,
          updatedAt: /* @__PURE__ */ new Date()
        });
      } else {
        evaluation = await storage.createEvaluation({
          accountId,
          interviewId,
          ...req.body,
          evaluatorId: req.user?.id
        });
      }
      if (interview.status !== "completed") {
        const updatedInterview = await storage.updateInterview(interviewId, accountId, {
          status: "completed",
          conductedDate: interview.conductedDate || /* @__PURE__ */ new Date()
        });
        try {
          const { triggerWorkflows: triggerWorkflows2 } = await Promise.resolve().then(() => (init_workflow_engine(), workflow_engine_exports));
          const candidate = await storage.getCandidate(interview.candidateId, accountId);
          const job = candidate?.jobId ? await storage.getJob(candidate.jobId, accountId) : null;
          await triggerWorkflows2("interview_completed", {
            entityType: "interview",
            entityId: interview.id,
            interview: updatedInterview,
            candidate,
            job,
            user: req.user
          }, accountId);
        } catch (error) {
          console.error("[Interview Evaluation] Workflow trigger error:", error);
        }
      }
      await storage.createActivityLog({
        accountId,
        userId: req.user?.id,
        action: "Submitted interview evaluation",
        entityType: "evaluation",
        entityId: evaluation.id,
        details: {
          interviewId,
          candidateId: interview.candidateId,
          overallRating: req.body.overallRating
        },
        timestamp: /* @__PURE__ */ new Date()
      });
      res.status(201).json(evaluation);
    } catch (error) {
      handleApiError(error, res);
    }
  });
  app2.get("/api/interviews/:id/evaluation", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const accountId = await storage.getUserAccountId(req.user.id);
      if (!accountId) {
        return res.status(400).json({ message: "User is not associated with any account" });
      }
      const interviewId = parseInt(req.params.id);
      if (isNaN(interviewId)) {
        return res.status(400).json({ message: "Invalid interview ID" });
      }
      const evaluation = await storage.getEvaluationByInterview(interviewId, accountId);
      if (!evaluation) {
        return res.status(404).json({ message: "Evaluation not found" });
      }
      res.json(evaluation);
    } catch (error) {
      handleApiError(error, res);
    }
  });
  app2.delete("/api/interviews/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const accountId = await storage.getUserAccountId(req.user.id);
      if (!accountId) {
        return res.status(400).json({ message: "User is not associated with any account" });
      }
      const interviewId = parseInt(req.params.id);
      if (isNaN(interviewId)) {
        return res.status(400).json({ message: "Invalid interview ID" });
      }
      const interview = await storage.getInterview(interviewId, accountId);
      if (!interview) {
        return res.status(404).json({ message: "Interview not found" });
      }
      await storage.deleteInterview(interviewId, accountId);
      await storage.createActivityLog({
        accountId,
        userId: req.user?.id,
        action: "Deleted interview",
        entityType: "interview",
        entityId: interviewId,
        details: { candidateId: interview.candidateId },
        timestamp: /* @__PURE__ */ new Date()
      });
      res.status(200).json({ message: "Interview deleted successfully" });
    } catch (error) {
      handleApiError(error, res);
    }
  });
}

// server/api/analytics.ts
init_storage();
init_utils();
init_db();
init_schema();
import { eq as eq5, inArray, and as and5, gte, desc as desc2 } from "drizzle-orm";
import { count as count2 } from "drizzle-orm";
function setupAnalyticsRoutes(app2) {
  app2.get("/api/analytics/dashboard", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const accountId = await storage.getUserAccountId(req.user.id);
      if (!accountId) {
        return res.status(400).json({ message: "User is not associated with any account" });
      }
      const activeJobsCountResult = await db.select({ count: count2() }).from(jobs).where(and5(eq5(jobs.status, "active"), eq5(jobs.accountId, accountId)));
      const activeJobs = Number(activeJobsCountResult[0].count);
      const totalCandidatesResult = await db.select({ count: count2() }).from(candidates).where(eq5(candidates.accountId, accountId));
      const totalCandidates = Number(totalCandidatesResult[0].count);
      const scheduledInterviewsResult = await db.select({ count: count2() }).from(candidates).where(and5(
        eq5(candidates.accountId, accountId),
        inArray(candidates.status, ["60_1st_interview_scheduled", "75_2nd_interview_scheduled"])
      ));
      const scheduledInterviews = Number(scheduledInterviewsResult[0].count);
      const offersSentResult = await db.select({ count: count2() }).from(candidates).where(and5(
        eq5(candidates.accountId, accountId),
        eq5(candidates.status, "95_offer_sent")
      ));
      const offersSent = Number(offersSentResult[0].count);
      const recentActivityLogs = await db.select().from(activityLogs).where(eq5(activityLogs.accountId, accountId)).orderBy(desc2(activityLogs.timestamp)).limit(10);
      res.json({
        stats: {
          activeJobs,
          totalCandidates,
          scheduledInterviews,
          offersSent
        },
        recentActivity: recentActivityLogs
      });
    } catch (error) {
      handleApiError(error, res);
    }
  });
  app2.get("/api/analytics/funnel", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const accountId = await storage.getUserAccountId(req.user.id);
      if (!accountId) {
        return res.status(400).json({ message: "User is not associated with any account" });
      }
      const jobId = req.query.jobId ? parseInt(req.query.jobId) : void 0;
      const dateRange = req.query.dateRange || "30";
      const buildConditions = (...conditions) => {
        const allConditions = [eq5(candidates.accountId, accountId)];
        if (dateRange !== "all") {
          const days = parseInt(dateRange);
          const startDate = /* @__PURE__ */ new Date();
          startDate.setDate(startDate.getDate() - days);
          allConditions.push(gte(candidates.createdAt, startDate));
        }
        if (jobId) {
          allConditions.push(eq5(candidates.jobId, jobId));
        }
        allConditions.push(...conditions);
        return allConditions.length > 0 ? and5(...allConditions) : void 0;
      };
      const applicationsResult = await db.select({ count: count2() }).from(candidates).where(buildConditions());
      const applications = Number(applicationsResult[0]?.count || 0);
      const assessmentsResult = await db.select({ count: count2() }).from(candidates).where(buildConditions(eq5(candidates.status, "30_assessment_completed")));
      const assessments = Number(assessmentsResult[0]?.count || 0);
      const qualifiedStatuses = [
        "30_assessment_completed",
        "45_1st_interview_sent",
        "60_1st_interview_scheduled",
        "75_2nd_interview_scheduled",
        "95_offer_sent",
        "100_offer_accepted"
      ];
      const qualifiedResult = await db.select({ count: count2() }).from(candidates).where(buildConditions(inArray(candidates.status, qualifiedStatuses)));
      const qualified = Number(qualifiedResult[0]?.count || 0);
      const interviewStatuses = [
        "45_1st_interview_sent",
        "60_1st_interview_scheduled",
        "75_2nd_interview_scheduled"
      ];
      const interviewsResult = await db.select({ count: count2() }).from(candidates).where(buildConditions(inArray(candidates.status, interviewStatuses)));
      const interviews3 = Number(interviewsResult[0]?.count || 0);
      const offersResult = await db.select({ count: count2() }).from(candidates).where(buildConditions(eq5(candidates.status, "95_offer_sent")));
      const offers2 = Number(offersResult[0]?.count || 0);
      const hiresResult = await db.select({ count: count2() }).from(candidates).where(buildConditions(eq5(candidates.status, "100_offer_accepted")));
      const hires = Number(hiresResult[0]?.count || 0);
      const conversionRate = applications > 0 ? Number((hires / applications * 100).toFixed(1)) : 0;
      const funnelData = {
        applications,
        assessments,
        qualified,
        interviews: interviews3,
        offers: offers2,
        hires,
        conversionRate
      };
      res.json(funnelData);
    } catch (error) {
      handleApiError(error, res);
    }
  });
  app2.get("/api/analytics/job-performance", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const accountId = await storage.getUserAccountId(req.user.id);
      if (!accountId) {
        return res.status(400).json({ message: "User is not associated with any account" });
      }
      const allJobs = await storage.getJobs(accountId);
      const jobPerformance = [];
      for (const job of allJobs) {
        const allCandidatesResult = await db.select({ count: count2() }).from(candidates).where(and5(
          eq5(candidates.accountId, accountId),
          eq5(candidates.jobId, job.id)
        ));
        const applications = Number(allCandidatesResult[0].count);
        const assessmentsResult = await db.select({ count: count2() }).from(candidates).where(and5(
          eq5(candidates.accountId, accountId),
          eq5(candidates.jobId, job.id),
          eq5(candidates.status, "30_assessment_completed")
        ));
        const assessments = Number(assessmentsResult[0].count);
        const interviewStatuses = [
          "45_1st_interview_sent",
          "60_1st_interview_scheduled",
          "75_2nd_interview_scheduled"
        ];
        const interviewsResult = await db.select({ count: count2() }).from(candidates).where(and5(
          eq5(candidates.accountId, accountId),
          eq5(candidates.jobId, job.id),
          inArray(candidates.status, interviewStatuses)
        ));
        const interviews3 = Number(interviewsResult[0].count);
        const offersResult = await db.select({ count: count2() }).from(candidates).where(and5(
          eq5(candidates.accountId, accountId),
          eq5(candidates.jobId, job.id),
          eq5(candidates.status, "95_offer_sent")
        ));
        const offers2 = Number(offersResult[0].count);
        const hiresResult = await db.select({ count: count2() }).from(candidates).where(and5(
          eq5(candidates.accountId, accountId),
          eq5(candidates.jobId, job.id),
          eq5(candidates.status, "100_offer_accepted")
        ));
        const hires = Number(hiresResult[0].count);
        const conversionRate = applications > 0 ? Number((hires / applications * 100).toFixed(1)) : 0;
        jobPerformance.push({
          id: job.id,
          title: job.title,
          type: job.type,
          department: job.department,
          status: job.status,
          postedDate: job.postedDate,
          metrics: {
            applications,
            assessments,
            interviews: interviews3,
            offers: offers2,
            hires,
            conversionRate
          }
        });
      }
      res.json(jobPerformance);
    } catch (error) {
      handleApiError(error, res);
    }
  });
  app2.get("/api/analytics/time-to-hire", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const accountId = await storage.getUserAccountId(req.user.id);
      if (!accountId) {
        return res.status(400).json({ message: "User is not associated with any account" });
      }
      const hiredCandidates = await storage.getCandidates(accountId, { status: "100_offer_accepted" });
      const candidatesWithData = hiredCandidates.length;
      const sampleData = {
        averageTimeToHire: 22.5,
        totalHires: candidatesWithData || 5,
        hires: hiredCandidates.length > 0 ? hiredCandidates.map((candidate) => ({
          id: candidate.id,
          name: candidate.name,
          jobId: candidate.jobId,
          hireDate: candidate.updatedAt,
          applicationDate: candidate.createdAt,
          timeToHire: 22.5
        })) : [{ id: 1, name: "Sample Hire", jobId: 1, timeToHire: 25 }]
      };
      res.json(sampleData);
    } catch (error) {
      handleApiError(error, res);
    }
  });
  app2.get("/api/analytics/activity", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const sampleActivityLogs = [
        {
          id: 1,
          userId: 1,
          action: "Created job posting",
          entityType: "job",
          entityId: 1,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        },
        {
          id: 2,
          userId: 2,
          action: "Approved candidate",
          entityType: "candidate",
          entityId: 1,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        }
      ];
      res.json(sampleActivityLogs);
    } catch (error) {
      handleApiError(error, res);
    }
  });
}

// server/api/hipeople.ts
init_storage();
init_utils();
import axios6 from "axios";
var HIPEOPLE_SCRAPER_URL = "https://firmos-hipeople-scraper-899783477192.europe-west1.run.app/scrape_hipeople";
async function scrapeHipeople(assessmentUrl, testData) {
  try {
    const candidateName = testData?.applicant_name || "Sample Candidate";
    const candidateEmail = testData?.applicant_email || "sample@example.com";
    const response = await axios6.post(HIPEOPLE_SCRAPER_URL, null, {
      params: {
        applicant_name: candidateName,
        applicant_email: candidateEmail
      },
      timeout: 3e4
    });
    return response.data;
  } catch (error) {
    console.error("\u274C HiPeople scraping error:", error);
    if (axios6.isAxiosError(error)) {
      if (error.response) {
        throw new Error(`HiPeople scraper error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        throw new Error("HiPeople scraper service is not responding. Please try again later.");
      }
    }
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred during scraping";
    throw new Error(`Failed to scrape HiPeople assessment: ${errorMessage}`);
  }
}
function setupHiPeopleRoutes(app2) {
  app2.post("/api/jobs/:id/update-assessments", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const jobId = parseInt(req.params.id);
      if (isNaN(jobId)) {
        return res.status(400).json({ message: "Invalid job ID" });
      }
      const job = await storage.getJob(jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      if (!job.hiPeopleLink) {
        return res.status(400).json({ message: "No HiPeople link found for this job" });
      }
      const candidates2 = await storage.getCandidates({ jobId });
      if (!candidates2.length) {
        return res.status(400).json({ message: "No candidates found for this job" });
      }
      try {
        const candidateTestData = candidates2.map((candidate) => ({
          applicant_name: candidate.name,
          applicant_email: candidate.email
        }));
        const hiPeopleResults = await scrapeHipeople(job.hiPeopleLink, candidateTestData[0]);
        if (!hiPeopleResults.length) {
          return res.status(404).json({ message: "No assessment results found" });
        }
        let updatedCount = 0;
        for (const candidate of candidates2) {
          const result = hiPeopleResults.find(
            (r) => r.email.toLowerCase() === candidate.email.toLowerCase()
          );
          if (result) {
            await storage.updateCandidate(candidate.id, {
              hiPeopleScore: result.score,
              hiPeoplePercentile: result.percentile,
              hiPeopleCompletedAt: new Date(result.completed_at),
              status: "assessment_completed",
              // Store skills from the feedback
              skills: result.feedback.map((f) => f.category)
            });
            updatedCount++;
          }
        }
        await storage.createActivityLog({
          userId: req.user?.id,
          action: "Updated candidate assessments",
          entityType: "job",
          entityId: job.id,
          details: {
            jobTitle: job.title,
            candidatesUpdated: updatedCount,
            totalCandidates: candidates2.length
          },
          timestamp: /* @__PURE__ */ new Date()
        });
        res.json({
          message: "HiPeople assessments updated",
          updatedCandidates: updatedCount,
          results: hiPeopleResults
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("Error updating HiPeople assessments:", errorMessage);
        return res.status(500).json({ message: "Failed to update assessments", error: errorMessage });
      }
    } catch (error) {
      handleApiError(error, res);
    }
  });
  app2.post("/api/candidates/:id/fetch-assessment", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const candidateId = parseInt(req.params.id);
      if (isNaN(candidateId)) {
        return res.status(400).json({ message: "Invalid candidate ID" });
      }
      const candidate = await storage.getCandidate(candidateId);
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }
      const job = await storage.getJob(candidate.jobId);
      if (!job || !job.hiPeopleLink) {
        return res.status(400).json({ message: "No HiPeople link found for this candidate's job" });
      }
      try {
        let hiPeopleResults = [];
        try {
          hiPeopleResults = await scrapeHipeople(job.hiPeopleLink, {
            applicant_name: candidate.name,
            applicant_email: candidate.email
          });
        } catch (error) {
          console.error("Error scraping HiPeople:", error);
          return res.status(500).json({
            message: "Failed to scrape HiPeople assessment results",
            error: error instanceof Error ? error.message : "Unknown error"
          });
        }
        const result = hiPeopleResults.find(
          (r) => r.email.toLowerCase() === candidate.email.toLowerCase()
        );
        if (!result) {
          return res.status(404).json({
            message: "No assessment results found for this candidate",
            candidateEmail: candidate.email
          });
        }
        const updatedCandidate = await storage.updateCandidate(candidateId, {
          hiPeopleScore: result.score,
          hiPeoplePercentile: result.percentile,
          hiPeopleCompletedAt: new Date(result.completed_at),
          status: "assessment_completed",
          // Store skills from the feedback
          skills: result.feedback.map((f) => f.category)
        });
        await storage.createActivityLog({
          userId: req.user?.id,
          action: "Manually fetched candidate assessment",
          entityType: "candidate",
          entityId: candidate.id,
          details: {
            candidateName: candidate.name,
            hiPeopleScore: result.score,
            hiPeoplePercentile: result.percentile
          },
          timestamp: /* @__PURE__ */ new Date()
        });
        res.json({
          message: "Assessment results fetched successfully",
          candidate: updatedCandidate,
          assessmentResults: {
            score: result.score,
            percentile: result.percentile,
            completedAt: result.completed_at,
            feedback: result.feedback
          }
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("Error fetching HiPeople assessment:", errorMessage);
        return res.status(500).json({ message: "Failed to fetch assessment", error: errorMessage });
      }
    } catch (error) {
      handleApiError(error, res);
    }
  });
}

// server/api/users.ts
init_storage();
init_schema();
init_utils();
import { z as z7 } from "zod";
var passwordSchema2 = z7.string().min(12, "Password must be at least 12 characters").regex(/[A-Z]/, "Password must contain at least one uppercase letter").regex(/[a-z]/, "Password must contain at least one lowercase letter").regex(/[0-9]/, "Password must contain at least one number").regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");
var updateUserSchema = z7.object({
  username: z7.string().min(3, "Username must be at least 3 characters").optional(),
  fullName: z7.string().min(2, "Full name is required").optional(),
  email: z7.string().email("Invalid email address").optional(),
  role: z7.enum([
    UserRoles.HIRING_MANAGER,
    UserRoles.PROJECT_MANAGER,
    UserRoles.COO,
    UserRoles.CEO,
    UserRoles.DIRECTOR,
    UserRoles.ADMIN
  ]).optional(),
  password: passwordSchema2.optional(),
  calendarLink: z7.string().url("Invalid calendar URL").optional().or(z7.literal("")),
  calendarProvider: z7.enum(["calendly", "cal.com", "google", "custom"]).optional(),
  calendlyToken: z7.string().optional(),
  calendlyWebhookId: z7.string().optional(),
  openRouterApiKey: z7.string().optional(),
  slackWebhookUrl: z7.string().url("Invalid Slack webhook URL").optional().or(z7.literal("")),
  slackNotificationScope: z7.enum(["all_users", "specific_roles"]).optional(),
  slackNotificationRoles: z7.array(z7.string()).optional(),
  slackNotificationEvents: z7.array(z7.string()).optional(),
  emailTemplates: z7.record(z7.any()).optional()
  // JSONB field for all email templates
});
function setupUserRoutes(app2) {
  app2.get("/api/users", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const accountId = await storage.getUserAccountId(req.user.id);
      if (!accountId) {
        return res.status(400).json({ message: "User is not associated with any account" });
      }
      const users2 = await storage.getAllUsers(accountId);
      const sanitizedUsers = users2.map((user) => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      res.json(sanitizedUsers);
    } catch (error) {
      handleApiError(error, res);
    }
  });
  app2.get("/api/users/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      handleApiError(error, res);
    }
  });
  app2.post("/api/users", validateRequest(insertUserSchema), async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      try {
        passwordSchema2.parse(req.body.password);
      } catch (error) {
        if (error instanceof z7.ZodError) {
          return res.status(400).json({
            message: "Password does not meet security requirements",
            errors: error.errors.map((err) => err.message)
          });
        }
      }
      const hashedPassword = await hashPassword(req.body.password);
      const user = await storage.createUser({
        ...req.body,
        password: hashedPassword
      });
      const { password, ...userWithoutPassword } = user;
      const accountId = await storage.getUserAccountId(req.user.id);
      SecureLogger.info("User created", { userId: user.id, username: user.username, role: user.role });
      if (accountId) {
        await storage.createActivityLog({
          accountId,
          userId: req.user?.id,
          action: "Created user",
          entityType: "user",
          entityId: user.id,
          details: {
            username: user.username,
            role: user.role
          },
          timestamp: /* @__PURE__ */ new Date()
        });
      }
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      handleApiError(error, res);
    }
  });
  app2.patch("/api/users/:id", validateRequest(updateUserSchema), async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      let updateData = { ...req.body };
      if (updateData.password) {
        try {
          passwordSchema2.parse(updateData.password);
        } catch (error) {
          if (error instanceof z7.ZodError) {
            return res.status(400).json({
              message: "Password does not meet security requirements",
              errors: error.errors.map((err) => err.message)
            });
          }
        }
        updateData.password = await hashPassword(updateData.password);
      }
      const updatedUser = await storage.updateUser(userId, updateData);
      const accountId = await storage.getUserAccountId(req.user.id);
      if (accountId) {
        await storage.createActivityLog({
          accountId,
          userId: req.user?.id,
          action: "Updated user",
          entityType: "user",
          entityId: userId,
          details: {
            username: user.username,
            fieldsUpdated: Object.keys(req.body)
          },
          timestamp: /* @__PURE__ */ new Date()
        });
      }
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      handleApiError(error, res);
    }
  });
  app2.delete("/api/users/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      if (userId === req.user?.id) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      await storage.deleteUser(userId);
      const accountId = await storage.getUserAccountId(req.user.id);
      if (accountId) {
        await storage.createActivityLog({
          accountId,
          userId: req.user?.id,
          action: "Deleted user",
          entityType: "user",
          entityId: userId,
          details: {
            username: user.username,
            role: user.role
          },
          timestamp: /* @__PURE__ */ new Date()
        });
      }
      res.status(204).send();
    } catch (error) {
      handleApiError(error, res);
    }
  });
  app2.options("/api/users/:id/public", (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.sendStatus(200);
  });
  app2.get("/api/users/:id/public", async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const integration = await storage.getPlatformIntegration("google-calendar", userId);
      if (!integration) {
        return res.status(404).json({ message: "Google Calendar not connected for this user" });
      }
      const status = integration.status?.toLowerCase();
      if (status !== "connected") {
        return res.status(404).json({ message: "Google Calendar not connected for this user" });
      }
      res.json({
        id: user.id,
        fullName: user.fullName,
        email: user.email
      });
    } catch (error) {
      handleApiError(error, res);
    }
  });
  app2.get("/api/users/me/permissions", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const isAdmin = req.user?.role === UserRoles.ADMIN;
      const isCEO = req.user?.role === UserRoles.CEO;
      const isCOO = req.user?.role === UserRoles.COO;
      const isDirector = req.user?.role === UserRoles.DIRECTOR;
      const isProjectManager = req.user?.role === UserRoles.PROJECT_MANAGER;
      const isHiringManager = req.user?.role === UserRoles.HIRING_MANAGER;
      const permissions = {
        canCreateUsers: isAdmin || isCEO || isCOO || isDirector,
        canUpdateUsers: isAdmin || isCEO || isCOO || isDirector,
        canDeleteUsers: isAdmin || isCEO || isCOO || isDirector,
        canViewAnalytics: isAdmin || isCEO || isCOO || isDirector || isProjectManager,
        canApproveJobs: isAdmin || isCEO || isCOO || isDirector || isProjectManager,
        canApproveOffers: isAdmin || isCEO || isCOO || isDirector,
        canManageRoles: isAdmin || isCEO || isCOO || isDirector,
        isSystemAdmin: isAdmin,
        role: req.user?.role
      };
      res.json(permissions);
    } catch (error) {
      handleApiError(error, res);
    }
  });
}

// server/ghl-sync.ts
init_storage();
import axios7 from "axios";
var GHL_BASE_URL2 = "https://rest.gohighlevel.com/v1";
async function getGHLCredentials2(userId) {
  if (!userId) {
    const envKey = process.env.GHL_API_KEY;
    const envLocationId = process.env.GHL_LOCATION_ID;
    if (envKey) {
      return { apiKey: envKey, locationId: envLocationId };
    }
    return null;
  }
  const integration = await storage.getPlatformIntegration("ghl", userId);
  if (!integration || !integration.credentials) {
    return null;
  }
  const credentials = integration.credentials;
  if (!credentials.apiKey) {
    return null;
  }
  return {
    apiKey: credentials.apiKey,
    locationId: credentials.locationId
  };
}
function normalizeName(name) {
  if (!name) return "";
  return name.toLowerCase().split(" ").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ").trim();
}
async function fetchGHLContacts(limit = 500, userId) {
  const credentials = await getGHLCredentials2(userId);
  if (!credentials) {
    throw new Error("GHL credentials not found. Please connect your GHL account in Settings \u2192 Integrations.");
  }
  const allContacts = [];
  let startAfter = "";
  let hasMore = true;
  let pageCount = 0;
  const maxPages = Math.ceil(limit / 20);
  const timeout = 3e4;
  try {
    while (hasMore && pageCount < maxPages && allContacts.length < limit) {
      const url = `${GHL_BASE_URL2}/contacts/${startAfter ? `?startAfter=${startAfter}` : ""}`;
      console.log(`Fetching GHL contacts page ${pageCount + 1}/${maxPages}...`);
      const response = await axios7.get(url, {
        headers: {
          Authorization: `Bearer ${credentials.apiKey}`,
          "Content-Type": "application/json"
        },
        timeout
      });
      const contacts = response.data.contacts || [];
      const contactsToAdd = contacts.slice(0, limit - allContacts.length);
      allContacts.push(...contactsToAdd);
      hasMore = response.data.meta?.nextPageUrl && allContacts.length < limit;
      startAfter = response.data.meta?.startAfterId || "";
      pageCount++;
      console.log(`Page ${pageCount}: Found ${contactsToAdd.length} contacts (Total: ${allContacts.length})`);
      if (allContacts.length >= limit) {
        console.log(`\u2705 Reached limit of ${limit} contacts`);
        break;
      }
    }
    console.log(`\u2705 Fetched ${allContacts.length} total contacts from GHL`);
    return allContacts;
  } catch (error) {
    console.error("\u274C Error fetching GHL contacts:", error.response?.data || error.message);
    throw new Error(`GHL API Error: ${error.response?.data?.message || error.message}`);
  }
}
async function syncGHLContacts(dryRun = false, userId) {
  const result = {
    success: false,
    totalGHLContacts: 0,
    totalCandidates: 0,
    matched: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    details: []
  };
  try {
    console.log(`\u{1F504} Starting GHL contact sync ${dryRun ? "(DRY RUN)" : ""}...`);
    const ghlContacts = await fetchGHLContacts(300, userId);
    result.totalGHLContacts = ghlContacts.length;
    const candidates2 = await storage.getCandidates({});
    result.totalCandidates = candidates2.length;
    console.log(`\u{1F4CA} Found ${ghlContacts.length} GHL contacts and ${candidates2.length} candidates`);
    for (const ghlContact of ghlContacts) {
      try {
        if (!ghlContact.contactName) {
          result.skipped++;
          result.details.push({
            contactId: ghlContact.id,
            ghlName: "null",
            candidateName: "N/A",
            action: "skipped",
            reason: "No contact name in GHL"
          });
          continue;
        }
        const normalizedGHLName = normalizeName(ghlContact.contactName);
        const matchingCandidate = candidates2.find(
          (candidate) => normalizeName(candidate.name) === normalizedGHLName
        );
        if (!matchingCandidate) {
          result.skipped++;
          result.details.push({
            contactId: ghlContact.id,
            ghlName: normalizedGHLName,
            candidateName: "N/A",
            action: "skipped",
            reason: "No matching candidate found"
          });
          continue;
        }
        result.matched++;
        if (matchingCandidate.ghlContactId) {
          result.skipped++;
          result.details.push({
            contactId: ghlContact.id,
            ghlName: normalizedGHLName,
            candidateName: matchingCandidate.name,
            action: "skipped",
            reason: "Candidate already has GHL contact ID"
          });
          continue;
        }
        if (!dryRun) {
          await storage.updateCandidate(matchingCandidate.id, {
            ghlContactId: ghlContact.id
          });
        }
        result.updated++;
        result.details.push({
          contactId: ghlContact.id,
          ghlName: normalizedGHLName,
          candidateName: matchingCandidate.name,
          action: "updated",
          reason: dryRun ? "Would update (dry run)" : "Updated successfully"
        });
        console.log(`\u2705 ${dryRun ? "Would update" : "Updated"} candidate "${matchingCandidate.name}" with GHL contact ID: ${ghlContact.id}`);
      } catch (error) {
        result.errors.push(`Error processing contact ${ghlContact.id}: ${error.message}`);
        result.details.push({
          contactId: ghlContact.id,
          ghlName: ghlContact.contactName || "unknown",
          candidateName: "N/A",
          action: "error",
          reason: error.message
        });
        console.error(`\u274C Error processing contact ${ghlContact.id}:`, error.message);
      }
    }
    result.success = true;
    console.log(`\u{1F389} GHL sync completed ${dryRun ? "(DRY RUN)" : ""}:`);
    console.log(`   Total GHL contacts: ${result.totalGHLContacts}`);
    console.log(`   Total candidates: ${result.totalCandidates}`);
    console.log(`   Matched: ${result.matched}`);
    console.log(`   Updated: ${result.updated}`);
    console.log(`   Skipped: ${result.skipped}`);
    console.log(`   Errors: ${result.errors.length}`);
  } catch (error) {
    result.success = false;
    result.errors.push(`Sync failed: ${error.message}`);
    console.error("\u274C GHL sync failed:", error.message);
  }
  return result;
}
async function previewGHLSync(userId) {
  return await syncGHLContacts(true, userId);
}
async function executeGHLSync(userId) {
  return await syncGHLContacts(false, userId);
}

// server/api/ghl-sync.ts
init_ghl_integration();
init_storage();
function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
}
function setupGHLSyncRoutes(app2) {
  app2.get("/api/ghl-sync/preview", requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id;
      const timeoutMs = 12e4;
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Request timeout")), timeoutMs);
      });
      const result = await Promise.race([
        previewGHLSync(userId),
        timeoutPromise
      ]);
      res.json(result);
    } catch (error) {
      console.error("Preview GHL sync error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to preview GHL sync",
        error: error.message
      });
    }
  });
  app2.post("/api/ghl-sync/execute", requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id;
      const result = await executeGHLSync(userId);
      res.json(result);
    } catch (error) {
      console.error("Execute GHL sync error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to execute GHL sync",
        error: error.message
      });
    }
  });
  app2.post("/api/ghl-sync/sync", requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id;
      const { dryRun = false } = req.body;
      const result = await syncGHLContacts(dryRun, userId);
      res.json(result);
    } catch (error) {
      console.error("Manual GHL sync error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to sync GHL contacts",
        error: error.message
      });
    }
  });
  app2.post("/api/ghl-sync/update-candidate/:candidateId", requireAuth, async (req, res) => {
    try {
      const candidateId = parseInt(req.params.candidateId);
      if (isNaN(candidateId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid candidate ID"
        });
      }
      const candidate = await storage.getCandidate(candidateId);
      if (!candidate) {
        return res.status(404).json({
          success: false,
          message: "Candidate not found"
        });
      }
      if (!candidate.ghlContactId) {
        return res.status(400).json({
          success: false,
          message: "Candidate does not have a GHL contact ID. Run sync first."
        });
      }
      if (candidate.jobId) {
        const job = await storage.getJob(candidate.jobId);
        if (job) {
          candidate.job = job;
        }
      }
      const userId = req.user?.id;
      const result = await updateCandidateInGHL(candidate, userId);
      res.json({
        success: true,
        message: "Candidate updated successfully in GHL",
        data: {
          candidateId: candidate.id,
          candidateName: candidate.name,
          ghlContactId: candidate.ghlContactId,
          result
        }
      });
    } catch (error) {
      console.error("Update candidate in GHL error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update candidate in GHL",
        error: error.message
      });
    }
  });
}

// server/airtable-sync.ts
init_storage();
init_airtable_integration();
function normalizeName2(name) {
  if (!name) return "";
  return name.toLowerCase().split(" ").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ").trim();
}
async function syncAirtableContacts(dryRun = false, userId, selectedContactIds, skipNewCandidates) {
  const result = {
    success: false,
    totalCRMContacts: 0,
    totalCandidates: 0,
    matched: 0,
    updated: 0,
    created: 0,
    skipped: 0,
    errors: [],
    details: []
  };
  try {
    const airtableContacts = await fetchAirtableContacts(300, userId);
    result.totalCRMContacts = airtableContacts.length;
    const accountId = userId ? await storage.getUserAccountId(userId) : null;
    const candidates2 = accountId ? await storage.getCandidates(accountId, {}) : [];
    result.totalCandidates = candidates2.length;
    const credentials = await getAirtableCredentials(userId);
    const mappings = credentials?.fieldMappings;
    for (const airtableContact of airtableContacts) {
      try {
        const contactName = getAirtableFieldValue(airtableContact, "name", mappings) || "";
        const contactEmail = getAirtableFieldValue(airtableContact, "email", mappings) || "";
        if (!contactName && !contactEmail) {
          result.skipped++;
          result.details.push({
            contactId: airtableContact.id,
            crmName: contactName || "No name",
            candidateName: "N/A",
            action: "skipped",
            reason: "No name or email in Airtable contact"
          });
          continue;
        }
        let matchingCandidate = null;
        if (contactEmail) {
          matchingCandidate = candidates2.find(
            (candidate) => candidate.email.toLowerCase() === contactEmail.toLowerCase()
          );
        }
        if (!matchingCandidate && contactName && contactEmail) {
          const normalizedAirtableName = normalizeName2(contactName);
          matchingCandidate = candidates2.find((candidate) => {
            const nameMatches = normalizeName2(candidate.name) === normalizedAirtableName;
            const emailSafe = !candidate.email || candidate.email.toLowerCase() === contactEmail.toLowerCase();
            return nameMatches && emailSafe;
          });
        }
        if (!matchingCandidate) {
          if (skipNewCandidates) {
            result.skipped++;
            result.details.push({
              contactId: airtableContact.id,
              crmName: contactName || contactEmail || "Unknown",
              candidateName: "N/A",
              action: "skipped",
              reason: "New candidate - will be processed separately with job assignment"
            });
            continue;
          }
          if (!contactEmail) {
            result.skipped++;
            result.details.push({
              contactId: airtableContact.id,
              crmName: contactName || "Unknown",
              candidateName: "N/A",
              action: "skipped",
              reason: "No email - cannot create candidate (email is required)"
            });
            continue;
          }
          if (dryRun) {
            result.created++;
            result.details.push({
              contactId: airtableContact.id,
              crmName: contactName || contactEmail,
              candidateName: contactName || "New Candidate",
              action: "created",
              reason: "Would create new candidate from Airtable"
            });
            continue;
          }
          if (selectedContactIds !== void 0) {
            if (!selectedContactIds.includes(airtableContact.id)) {
              result.skipped++;
              result.details.push({
                contactId: airtableContact.id,
                crmName: contactName || contactEmail,
                candidateName: "N/A",
                action: "skipped",
                reason: "Not selected for import"
              });
              continue;
            }
          }
          try {
            const existingCandidates = accountId ? await storage.getCandidates(accountId, {}) : [];
            const duplicateCandidate = existingCandidates.find(
              (c) => c.email && c.email.toLowerCase() === contactEmail.toLowerCase()
            );
            if (duplicateCandidate) {
              result.skipped++;
              result.details.push({
                contactId: airtableContact.id,
                crmName: contactName || contactEmail,
                candidateName: duplicateCandidate.name,
                action: "skipped",
                reason: `Duplicate email - candidate already exists (ID: ${duplicateCandidate.id})`
              });
              continue;
            }
            const airtablePhone = getAirtableFieldValue(airtableContact, "phone", mappings);
            const airtableLocation = getAirtableFieldValue(airtableContact, "location", mappings);
            const airtableSalary = getAirtableFieldValue(airtableContact, "expectedSalary", mappings);
            const airtableExp = getAirtableFieldValue(airtableContact, "experienceYears", mappings);
            const airtableSkills = getAirtableFieldValue(airtableContact, "skills", mappings);
            const skillsArray = airtableSkills ? typeof airtableSkills === "string" ? airtableSkills.split(",").map((s) => s.trim()).filter((s) => s) : Array.isArray(airtableSkills) ? airtableSkills : [] : [];
            const jobs3 = accountId ? await storage.getJobs(accountId, "active") : [];
            const defaultJobId = jobs3.length > 0 ? jobs3[0].id : null;
            if (!accountId) {
              result.skipped++;
              result.details.push({
                contactId: airtableContact.id,
                crmName: contactName || contactEmail,
                candidateName: "N/A",
                action: "skipped",
                reason: "Account ID not found - cannot create candidate"
              });
              continue;
            }
            const newCandidate = await storage.createCandidate({
              accountId,
              name: contactName || contactEmail,
              email: contactEmail,
              phone: airtablePhone || null,
              location: airtableLocation || null,
              expectedSalary: airtableSalary || null,
              experienceYears: airtableExp ? typeof airtableExp === "number" ? airtableExp : parseInt(airtableExp) : null,
              skills: skillsArray.length > 0 ? skillsArray : null,
              status: "new",
              // Default status for new candidates
              jobId: defaultJobId
              // Assign to first active job if available
            });
            result.created++;
            result.details.push({
              contactId: airtableContact.id,
              crmName: contactName || contactEmail,
              candidateName: newCandidate.name,
              action: "created",
              reason: "Created new candidate from Airtable"
            });
          } catch (createError) {
            result.errors.push(`Failed to create candidate from Airtable: ${createError.message}`);
            result.details.push({
              contactId: airtableContact.id,
              crmName: contactName || contactEmail || "Unknown",
              candidateName: "N/A",
              action: "error",
              reason: `Create failed: ${createError.message}`
            });
          }
          continue;
        }
        result.matched++;
        const airtablePhoneValue = getAirtableFieldValue(airtableContact, "phone", mappings);
        const airtableLocationValue = getAirtableFieldValue(airtableContact, "location", mappings);
        const airtableSalaryValue = getAirtableFieldValue(airtableContact, "expectedSalary", mappings);
        const airtableExpValue = getAirtableFieldValue(airtableContact, "experienceYears", mappings);
        const airtableSkillsValue = getAirtableFieldValue(airtableContact, "skills", mappings);
        const normalizedAirtableSkills = airtableSkillsValue ? typeof airtableSkillsValue === "string" ? airtableSkillsValue.split(",").map((s) => s.trim()).filter((s) => s).sort().join(",") : Array.isArray(airtableSkillsValue) ? airtableSkillsValue.sort().join(",") : "" : "";
        const normalizedCandidateSkills = matchingCandidate.skills ? Array.isArray(matchingCandidate.skills) ? matchingCandidate.skills.sort().join(",") : String(matchingCandidate.skills) : "";
        const hasChanges = normalizeName2(contactName) !== normalizeName2(matchingCandidate.name) || contactEmail.toLowerCase() !== matchingCandidate.email.toLowerCase() || airtablePhoneValue && airtablePhoneValue !== matchingCandidate.phone || airtableLocationValue && airtableLocationValue !== matchingCandidate.location || airtableSalaryValue && airtableSalaryValue !== matchingCandidate.expectedSalary || airtableExpValue !== void 0 && airtableExpValue !== null && (typeof airtableExpValue === "number" ? airtableExpValue : parseInt(airtableExpValue)) !== matchingCandidate.experienceYears || normalizedAirtableSkills !== normalizedCandidateSkills;
        if (!hasChanges) {
          result.skipped++;
          result.details.push({
            contactId: airtableContact.id,
            crmName: contactName || contactEmail || "Unknown",
            candidateName: matchingCandidate.name,
            action: "skipped",
            reason: "No changes detected - data is already in sync"
          });
          continue;
        }
        const updateData = {};
        if (contactName && normalizeName2(contactName) !== normalizeName2(matchingCandidate.name)) {
          updateData.name = contactName.trim();
        }
        if (airtablePhoneValue && airtablePhoneValue !== matchingCandidate.phone) {
          updateData.phone = airtablePhoneValue;
        }
        if (airtableLocationValue && airtableLocationValue !== matchingCandidate.location) {
          updateData.location = airtableLocationValue;
        }
        if (airtableSalaryValue && airtableSalaryValue !== matchingCandidate.expectedSalary) {
          updateData.expectedSalary = airtableSalaryValue;
        }
        if (airtableExpValue !== void 0 && airtableExpValue !== null && (typeof airtableExpValue === "number" ? airtableExpValue : parseInt(airtableExpValue)) !== matchingCandidate.experienceYears) {
          updateData.experienceYears = typeof airtableExpValue === "number" ? airtableExpValue : parseInt(airtableExpValue);
        }
        if (airtableSkillsValue) {
          const skillsArray = typeof airtableSkillsValue === "string" ? airtableSkillsValue.split(",").map((s) => s.trim()).filter((s) => s) : Array.isArray(airtableSkillsValue) ? airtableSkillsValue : [];
          const currentSkills = Array.isArray(matchingCandidate.skills) ? matchingCandidate.skills : matchingCandidate.skills ? [matchingCandidate.skills] : [];
          if (JSON.stringify(skillsArray.sort()) !== JSON.stringify(currentSkills.sort())) {
            updateData.skills = skillsArray;
          }
        }
        if (!dryRun && Object.keys(updateData).length > 0) {
          try {
            if (!accountId) {
              throw new Error("Account ID not found");
            }
            await storage.updateCandidate(matchingCandidate.id, accountId, updateData);
          } catch (updateError) {
            result.errors.push(`Failed to update candidate ${matchingCandidate.name}: ${updateError.message}`);
            result.details.push({
              contactId: airtableContact.id,
              crmName: contactName || contactEmail || "Unknown",
              candidateName: matchingCandidate.name,
              action: "error",
              reason: `Update failed: ${updateError.message}`
            });
            continue;
          }
        }
        if (Object.keys(updateData).length > 0) {
          result.updated++;
        } else {
          result.skipped++;
        }
        result.details.push({
          contactId: airtableContact.id,
          crmName: contactName || contactEmail || "Unknown",
          candidateName: matchingCandidate.name,
          action: Object.keys(updateData).length > 0 ? "updated" : "skipped",
          reason: dryRun ? `Would update: ${Object.keys(updateData).length > 0 ? Object.keys(updateData).join(", ") : "no changes"}` : Object.keys(updateData).length > 0 ? `Updated: ${Object.keys(updateData).join(", ")}` : "No changes needed"
        });
      } catch (error) {
        result.errors.push(`Error processing Airtable contact ${airtableContact.id}: ${error.message}`);
        result.details.push({
          contactId: airtableContact.id,
          crmName: "Unknown",
          candidateName: "N/A",
          action: "error",
          reason: error.message
        });
        console.error(`\u274C Error processing Airtable contact ${airtableContact.id}:`, error.message);
      }
    }
    result.success = true;
  } catch (error) {
    result.success = false;
    result.errors.push(`Sync failed: ${error.message}`);
    console.error("Airtable sync failed:", error.message);
  }
  return result;
}
async function previewAirtableSync(userId) {
  return await syncAirtableContacts(true, userId);
}
async function executeAirtableSync(userId, selectedContactIds, skipNewCandidates) {
  return await syncAirtableContacts(false, userId, selectedContactIds, skipNewCandidates);
}
async function createAirtableCandidatesWithJobs(userId, assignments) {
  const result = {
    success: false,
    totalCRMContacts: 0,
    totalCandidates: 0,
    matched: 0,
    updated: 0,
    created: 0,
    skipped: 0,
    errors: [],
    details: []
  };
  try {
    const airtableContacts = await fetchAirtableContacts(300, userId);
    const contactMap = new Map(airtableContacts.map((c) => [c.id, c]));
    const credentials = await getAirtableCredentials(userId);
    const mappings = credentials?.fieldMappings;
    const accountId = userId ? await storage.getUserAccountId(userId) : null;
    const existingCandidates = accountId ? await storage.getCandidates(accountId, {}) : [];
    for (const assignment of assignments) {
      const airtableContact = contactMap.get(assignment.contactId);
      if (!airtableContact) {
        result.skipped++;
        result.details.push({
          contactId: assignment.contactId,
          crmName: "Unknown",
          candidateName: "N/A",
          action: "skipped",
          reason: "Airtable contact not found"
        });
        continue;
      }
      try {
        const contactName = getAirtableFieldValue(airtableContact, "name", mappings) || "";
        const contactEmail = getAirtableFieldValue(airtableContact, "email", mappings) || "";
        if (!contactEmail) {
          result.skipped++;
          result.details.push({
            contactId: assignment.contactId,
            crmName: contactName || "Unknown",
            candidateName: "N/A",
            action: "skipped",
            reason: "No email - cannot create candidate"
          });
          continue;
        }
        const duplicate = existingCandidates.find(
          (c) => c.email && c.email.toLowerCase() === contactEmail.toLowerCase()
        );
        if (duplicate) {
          result.skipped++;
          result.details.push({
            contactId: assignment.contactId,
            crmName: contactName || contactEmail,
            candidateName: duplicate.name,
            action: "skipped",
            reason: `Duplicate email - candidate already exists (ID: ${duplicate.id})`
          });
          continue;
        }
        const airtablePhone = getAirtableFieldValue(airtableContact, "phone", mappings);
        const airtableLocation = getAirtableFieldValue(airtableContact, "location", mappings);
        const airtableSalary = getAirtableFieldValue(airtableContact, "expectedSalary", mappings);
        const airtableExp = getAirtableFieldValue(airtableContact, "experienceYears", mappings);
        const airtableSkills = getAirtableFieldValue(airtableContact, "skills", mappings);
        const skillsArray = airtableSkills ? typeof airtableSkills === "string" ? airtableSkills.split(",").map((s) => s.trim()).filter((s) => s) : Array.isArray(airtableSkills) ? airtableSkills : [] : [];
        if (!accountId) {
          result.skipped++;
          result.details.push({
            contactId: assignment.contactId,
            crmName: contactName || contactEmail,
            candidateName: "N/A",
            action: "skipped",
            reason: "Account ID not found - cannot create candidate"
          });
          continue;
        }
        const newCandidate = await storage.createCandidate({
          accountId,
          name: contactName || contactEmail,
          email: contactEmail,
          phone: airtablePhone || null,
          location: airtableLocation || null,
          expectedSalary: airtableSalary || null,
          experienceYears: airtableExp ? typeof airtableExp === "number" ? airtableExp : parseInt(airtableExp) : null,
          skills: skillsArray.length > 0 ? skillsArray : null,
          status: "new",
          jobId: assignment.jobId
        });
        result.created++;
        result.details.push({
          contactId: assignment.contactId,
          crmName: contactName || contactEmail,
          candidateName: newCandidate.name,
          action: "created",
          reason: `Created with job ID: ${assignment.jobId || "none"}`
        });
      } catch (error) {
        result.errors.push(`Failed to create candidate ${assignment.contactId}: ${error.message}`);
        result.details.push({
          contactId: assignment.contactId,
          crmName: "Unknown",
          candidateName: "N/A",
          action: "error",
          reason: `Create failed: ${error.message}`
        });
      }
    }
    result.success = true;
    result.totalCRMContacts = assignments.length;
    return result;
  } catch (error) {
    result.success = false;
    result.errors.push(`Failed to create candidates: ${error.message}`);
    return result;
  }
}

// server/google-sheets-sync.ts
init_storage();
init_google_sheets_integration();
function normalizeName3(name) {
  if (!name) return "";
  return name.toLowerCase().split(" ").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ").trim();
}
async function syncGoogleSheetsContacts(dryRun = false, userId, selectedContactIds, skipNewCandidates) {
  const result = {
    success: false,
    totalCRMContacts: 0,
    totalCandidates: 0,
    matched: 0,
    updated: 0,
    created: 0,
    skipped: 0,
    errors: [],
    details: []
  };
  try {
    if (!userId) {
      throw new Error("User ID is required");
    }
    const sheetsContacts = await fetchGoogleSheetsContacts(1e3, userId);
    result.totalCRMContacts = sheetsContacts.length;
    if (sheetsContacts.length === 0) {
      result.success = true;
      return result;
    }
    const headers = sheetsContacts[0].headers || [];
    const candidates2 = await storage.getCandidates({});
    result.totalCandidates = candidates2.length;
    const credentials = await getGoogleSheetsCredentials(userId);
    const mappings = credentials?.fieldMappings;
    for (const sheetsContact of sheetsContacts) {
      try {
        const contactName = getGoogleSheetsFieldValue(sheetsContact.data, headers, "name", mappings) || "";
        const contactEmail = getGoogleSheetsFieldValue(sheetsContact.data, headers, "email", mappings) || "";
        if (!contactName && !contactEmail) {
          result.skipped++;
          result.details.push({
            contactId: sheetsContact.id,
            crmName: "No name",
            candidateName: "N/A",
            action: "skipped",
            reason: "No name or email in Google Sheets row"
          });
          continue;
        }
        let matchingCandidate = null;
        if (contactEmail) {
          matchingCandidate = candidates2.find(
            (candidate) => candidate.email && candidate.email.toLowerCase() === contactEmail.toLowerCase()
          );
        }
        if (!matchingCandidate && contactName && contactEmail) {
          const normalizedSheetsName = normalizeName3(contactName);
          matchingCandidate = candidates2.find((candidate) => {
            const nameMatches = normalizeName3(candidate.name) === normalizedSheetsName;
            const emailSafe = !candidate.email || candidate.email.toLowerCase() === contactEmail.toLowerCase();
            return nameMatches && emailSafe;
          });
        }
        if (!matchingCandidate) {
          if (skipNewCandidates) {
            result.skipped++;
            result.details.push({
              contactId: sheetsContact.id,
              crmName: contactName || contactEmail || "Unknown",
              candidateName: "N/A",
              action: "skipped",
              reason: "New candidate - will be processed separately with job assignment"
            });
            continue;
          }
          if (!contactEmail) {
            result.skipped++;
            result.details.push({
              contactId: sheetsContact.id,
              crmName: contactName || "Unknown",
              candidateName: "N/A",
              action: "skipped",
              reason: "No email - cannot create candidate (email is required)"
            });
            continue;
          }
          if (dryRun) {
            result.created++;
            result.details.push({
              contactId: sheetsContact.id,
              crmName: contactName || contactEmail,
              candidateName: contactName || "New Candidate",
              action: "created",
              reason: "Would create new candidate from Google Sheets"
            });
            continue;
          }
          if (selectedContactIds !== void 0) {
            if (!selectedContactIds.includes(sheetsContact.id)) {
              result.skipped++;
              result.details.push({
                contactId: sheetsContact.id,
                crmName: contactName || contactEmail,
                candidateName: "N/A",
                action: "skipped",
                reason: "Not selected for import"
              });
              continue;
            }
          }
          try {
            const existingCandidates = await storage.getCandidates({});
            const duplicateCandidate = existingCandidates.find(
              (c) => c.email && c.email.toLowerCase() === contactEmail.toLowerCase()
            );
            if (duplicateCandidate) {
              result.skipped++;
              result.details.push({
                contactId: sheetsContact.id,
                crmName: contactName || contactEmail,
                candidateName: duplicateCandidate.name,
                action: "skipped",
                reason: `Duplicate email - candidate already exists (ID: ${duplicateCandidate.id})`
              });
              continue;
            }
            const sheetsPhone = getGoogleSheetsFieldValue(sheetsContact.data, headers, "phone", mappings);
            const sheetsLocation = getGoogleSheetsFieldValue(sheetsContact.data, headers, "location", mappings);
            const sheetsSalary = getGoogleSheetsFieldValue(sheetsContact.data, headers, "expectedSalary", mappings);
            const sheetsExp = getGoogleSheetsFieldValue(sheetsContact.data, headers, "experienceYears", mappings);
            const sheetsSkills = getGoogleSheetsFieldValue(sheetsContact.data, headers, "skills", mappings);
            const skillsArray = sheetsSkills ? typeof sheetsSkills === "string" ? sheetsSkills.split(",").map((s) => s.trim()).filter((s) => s) : Array.isArray(sheetsSkills) ? sheetsSkills : [] : [];
            const jobs3 = await storage.getJobs("active");
            const defaultJobId = jobs3.length > 0 ? jobs3[0].id : null;
            const newCandidate = await storage.createCandidate({
              name: contactName || contactEmail,
              email: contactEmail,
              phone: sheetsPhone || null,
              location: sheetsLocation || null,
              expectedSalary: sheetsSalary ? String(parseFloat(sheetsSalary)) : null,
              experienceYears: sheetsExp ? typeof sheetsExp === "number" ? sheetsExp : parseInt(sheetsExp) : null,
              skills: skillsArray.length > 0 ? skillsArray : null,
              status: "new",
              jobId: defaultJobId
            });
            result.created++;
            result.details.push({
              contactId: sheetsContact.id,
              crmName: contactName || contactEmail,
              candidateName: newCandidate.name,
              action: "created",
              reason: "Created new candidate from Google Sheets"
            });
          } catch (createError) {
            result.errors.push(`Failed to create candidate from Google Sheets: ${createError.message}`);
            result.details.push({
              contactId: sheetsContact.id,
              crmName: contactName || contactEmail || "Unknown",
              candidateName: "N/A",
              action: "error",
              reason: `Create failed: ${createError.message}`
            });
          }
          continue;
        }
        result.matched++;
        const sheetsPhoneValue = getGoogleSheetsFieldValue(sheetsContact.data, headers, "phone", mappings);
        const sheetsLocationValue = getGoogleSheetsFieldValue(sheetsContact.data, headers, "location", mappings);
        const sheetsSalaryValue = getGoogleSheetsFieldValue(sheetsContact.data, headers, "expectedSalary", mappings);
        const sheetsExpValue = getGoogleSheetsFieldValue(sheetsContact.data, headers, "experienceYears", mappings);
        const sheetsSkillsValue = getGoogleSheetsFieldValue(sheetsContact.data, headers, "skills", mappings);
        const sheetsNameValue = getGoogleSheetsFieldValue(sheetsContact.data, headers, "name", mappings);
        const hasChanges = sheetsNameValue && sheetsNameValue !== matchingCandidate.name || sheetsPhoneValue !== (matchingCandidate.phone || null) || sheetsLocationValue !== (matchingCandidate.location || null) || sheetsSalaryValue !== (matchingCandidate.expectedSalary?.toString() || null) || sheetsExpValue !== (matchingCandidate.experienceYears?.toString() || null) || sheetsSkillsValue !== (Array.isArray(matchingCandidate.skills) ? matchingCandidate.skills.join(", ") : null);
        if (!hasChanges) {
          result.skipped++;
          result.details.push({
            contactId: sheetsContact.id,
            crmName: contactName || contactEmail,
            candidateName: matchingCandidate.name,
            action: "skipped",
            reason: "No changes detected - data is already in sync"
          });
          continue;
        }
        if (dryRun) {
          result.updated++;
          result.details.push({
            contactId: sheetsContact.id,
            crmName: contactName || contactEmail,
            candidateName: matchingCandidate.name,
            action: "updated",
            reason: "Would update candidate from Google Sheets"
          });
          continue;
        }
        try {
          const skillsArray = sheetsSkillsValue ? typeof sheetsSkillsValue === "string" ? sheetsSkillsValue.split(",").map((s) => s.trim()).filter((s) => s) : Array.isArray(sheetsSkillsValue) ? sheetsSkillsValue : [] : null;
          await storage.updateCandidate(matchingCandidate.id, {
            name: sheetsNameValue || matchingCandidate.name,
            // email: NOT UPDATED - preserve email changes made in HireOS
            phone: sheetsPhoneValue || matchingCandidate.phone,
            location: sheetsLocationValue || matchingCandidate.location,
            expectedSalary: sheetsSalaryValue ? String(parseFloat(sheetsSalaryValue)) : matchingCandidate.expectedSalary,
            experienceYears: sheetsExpValue ? parseInt(sheetsExpValue) : matchingCandidate.experienceYears,
            skills: skillsArray && skillsArray.length > 0 ? skillsArray : matchingCandidate.skills,
            updatedAt: /* @__PURE__ */ new Date()
            // Update timestamp for conflict resolution
          });
          result.updated++;
          result.details.push({
            contactId: sheetsContact.id,
            crmName: contactName || contactEmail,
            candidateName: matchingCandidate.name,
            action: "updated",
            reason: "Updated candidate from Google Sheets"
          });
        } catch (updateError) {
          result.errors.push(`Failed to update candidate: ${updateError.message}`);
          result.details.push({
            contactId: sheetsContact.id,
            crmName: contactName || contactEmail,
            candidateName: matchingCandidate.name,
            action: "error",
            reason: `Update failed: ${updateError.message}`
          });
        }
      } catch (error) {
        result.errors.push(`Error processing Google Sheets contact: ${error.message}`);
        result.details.push({
          contactId: sheetsContact.id,
          crmName: "Unknown",
          candidateName: "N/A",
          action: "error",
          reason: error.message
        });
      }
    }
    result.success = true;
    return result;
  } catch (error) {
    result.success = false;
    result.errors.push(`Sync failed: ${error.message}`);
    return result;
  }
}
async function previewGoogleSheetsSync(userId) {
  return await syncGoogleSheetsContacts(true, userId);
}
async function executeGoogleSheetsSync(userId, selectedContactIds, skipNewCandidates) {
  return await syncGoogleSheetsContacts(false, userId, selectedContactIds, skipNewCandidates);
}
async function createGoogleSheetsCandidatesWithJobs(userId, assignments) {
  const result = {
    success: false,
    totalCRMContacts: 0,
    totalCandidates: 0,
    matched: 0,
    updated: 0,
    created: 0,
    skipped: 0,
    errors: [],
    details: []
  };
  try {
    const sheetsContacts = await fetchGoogleSheetsContacts(1e3, userId);
    const contactMap = new Map(sheetsContacts.map((c) => [c.id, c]));
    const headers = sheetsContacts.length > 0 ? sheetsContacts[0].headers || [] : [];
    const credentials = await getGoogleSheetsCredentials(userId);
    const mappings = credentials?.fieldMappings;
    const existingCandidates = await storage.getCandidates({});
    for (const assignment of assignments) {
      const sheetsContact = contactMap.get(assignment.contactId);
      if (!sheetsContact) {
        result.skipped++;
        result.details.push({
          contactId: assignment.contactId,
          crmName: "Unknown",
          candidateName: "N/A",
          action: "skipped",
          reason: "Google Sheets row not found"
        });
        continue;
      }
      try {
        const contactName = getGoogleSheetsFieldValue(sheetsContact.data, headers, "name", mappings) || "";
        const contactEmail = getGoogleSheetsFieldValue(sheetsContact.data, headers, "email", mappings) || "";
        if (!contactEmail) {
          result.skipped++;
          result.details.push({
            contactId: assignment.contactId,
            crmName: contactName || "Unknown",
            candidateName: "N/A",
            action: "skipped",
            reason: "No email - cannot create candidate"
          });
          continue;
        }
        const duplicate = existingCandidates.find(
          (c) => c.email && c.email.toLowerCase() === contactEmail.toLowerCase()
        );
        if (duplicate) {
          result.skipped++;
          result.details.push({
            contactId: assignment.contactId,
            crmName: contactName || contactEmail,
            candidateName: duplicate.name,
            action: "skipped",
            reason: `Duplicate email - candidate already exists (ID: ${duplicate.id})`
          });
          continue;
        }
        const sheetsPhone = getGoogleSheetsFieldValue(sheetsContact.data, headers, "phone", mappings);
        const sheetsLocation = getGoogleSheetsFieldValue(sheetsContact.data, headers, "location", mappings);
        const sheetsSalary = getGoogleSheetsFieldValue(sheetsContact.data, headers, "expectedSalary", mappings);
        const sheetsExp = getGoogleSheetsFieldValue(sheetsContact.data, headers, "experienceYears", mappings);
        const sheetsSkills = getGoogleSheetsFieldValue(sheetsContact.data, headers, "skills", mappings);
        const skillsArray = sheetsSkills ? typeof sheetsSkills === "string" ? sheetsSkills.split(",").map((s) => s.trim()).filter((s) => s) : Array.isArray(sheetsSkills) ? sheetsSkills : [] : [];
        const newCandidate = await storage.createCandidate({
          name: contactName || contactEmail,
          email: contactEmail,
          phone: sheetsPhone || null,
          location: sheetsLocation || null,
          expectedSalary: sheetsSalary ? String(parseFloat(sheetsSalary)) : null,
          experienceYears: sheetsExp ? typeof sheetsExp === "number" ? sheetsExp : parseInt(sheetsExp) : null,
          skills: skillsArray.length > 0 ? skillsArray : null,
          status: "new",
          jobId: assignment.jobId
        });
        result.created++;
        result.details.push({
          contactId: assignment.contactId,
          crmName: contactName || contactEmail,
          candidateName: newCandidate.name,
          action: "created",
          reason: `Created with job ID: ${assignment.jobId || "none"}`
        });
      } catch (error) {
        result.errors.push(`Failed to create candidate ${assignment.contactId}: ${error.message}`);
        result.details.push({
          contactId: assignment.contactId,
          crmName: "Unknown",
          candidateName: "N/A",
          action: "error",
          reason: `Create failed: ${error.message}`
        });
      }
    }
    result.success = true;
    result.totalCRMContacts = assignments.length;
    return result;
  } catch (error) {
    result.success = false;
    result.errors.push(`Failed to create candidates: ${error.message}`);
    return result;
  }
}

// server/api/crm-sync.ts
init_storage();
function requireAuth2(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
}
function setupCRMSyncRoutes(app2) {
  app2.get("/api/crm-sync/:platformId/preview", requireAuth2, async (req, res) => {
    try {
      const { platformId } = req.params;
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "User ID not found" });
      }
      const integration = await storage.getPlatformIntegration(platformId, userId);
      if (!integration || integration.status !== "connected") {
        return res.status(404).json({
          error: `CRM integration "${platformId}" not found or not connected`
        });
      }
      let result;
      if (platformId === "ghl") {
        result = await previewGHLSync(userId);
      } else if (platformId === "airtable") {
        result = await previewAirtableSync(userId);
      } else if (platformId === "google-sheets") {
        result = await previewGoogleSheetsSync(userId);
      } else {
        return res.status(400).json({
          error: `Sync not yet implemented for platform: ${platformId}`
        });
      }
      res.json(result);
    } catch (error) {
      console.error("Preview CRM sync error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to preview CRM sync",
        error: error.message
      });
    }
  });
  app2.post("/api/crm-sync/:platformId/execute", requireAuth2, async (req, res) => {
    try {
      const { platformId } = req.params;
      const userId = req.user?.id;
      const { selectedContactIds, skipNewCandidates } = req.body;
      if (!userId) {
        return res.status(401).json({ error: "User ID not found" });
      }
      const integration = await storage.getPlatformIntegration(platformId, userId);
      if (!integration || integration.status !== "connected") {
        return res.status(404).json({
          error: `CRM integration "${platformId}" not found or not connected`
        });
      }
      let result;
      if (platformId === "ghl") {
        result = await executeGHLSync(userId);
      } else if (platformId === "airtable") {
        result = await executeAirtableSync(userId, selectedContactIds, skipNewCandidates);
      } else if (platformId === "google-sheets") {
        result = await executeGoogleSheetsSync(userId, selectedContactIds, skipNewCandidates);
      } else {
        return res.status(400).json({
          error: `Sync not yet implemented for platform: ${platformId}`
        });
      }
      res.json(result);
    } catch (error) {
      console.error("Execute CRM sync error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to execute CRM sync",
        error: error.message
      });
    }
  });
  app2.post("/api/crm-sync/:platformId/create-candidates", requireAuth2, async (req, res) => {
    try {
      const { platformId } = req.params;
      const userId = req.user?.id;
      const { assignments } = req.body;
      if (!userId) {
        return res.status(401).json({ error: "User ID not found" });
      }
      const integration = await storage.getPlatformIntegration(platformId, userId);
      if (!integration || integration.status !== "connected") {
        return res.status(404).json({
          error: `CRM integration "${platformId}" not found or not connected`
        });
      }
      if (platformId === "airtable") {
        const result = await createAirtableCandidatesWithJobs(userId, assignments);
        res.json(result);
      } else if (platformId === "google-sheets") {
        const result = await createGoogleSheetsCandidatesWithJobs(userId, assignments);
        res.json(result);
      } else {
        return res.status(400).json({
          error: `Create candidates not yet implemented for platform: ${platformId}`
        });
      }
    } catch (error) {
      console.error("Create candidates error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create candidates",
        error: error.message
      });
    }
  });
}

// server/ghl/ghlAuth.ts
init_db();
init_schema();
import { eq as eq6 } from "drizzle-orm";
var refreshing = null;
async function getTokenRow() {
  const rows = await db.select().from(ghlTokens).where(eq6(ghlTokens.userType, "Location")).limit(1);
  return rows[0] ?? null;
}
async function refreshAccessToken() {
  const row = await getTokenRow();
  if (!row?.refreshToken) {
    throw new Error("No refresh token found. Please re-authorize GHL.");
  }
  console.log("\u{1F511} Using client_id:", process.env.GHL_CLIENT_ID);
  console.log(
    "\u{1F511} Using client_secret (first 6 chars):",
    process.env.GHL_CLIENT_SECRET?.slice(0, 6)
  );
  const res = await fetch("https://services.leadconnectorhq.com/oauth/token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      client_id: process.env.GHL_CLIENT_ID,
      client_secret: process.env.GHL_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: row.refreshToken
    })
  });
  if (!res.ok) {
    const text2 = await res.text().catch(() => "");
    console.error("\u274C GHL refresh failed:", res.status, res.statusText, text2);
    if (res.status === 400 || res.status === 401) {
      throw new Error("Refresh token invalid. Please re-authorize GHL.");
    }
    throw new Error(`Failed to refresh token: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  const newExpiry = new Date(Date.now() + data.expires_in * 1e3);
  await db.update(ghlTokens).set({
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    updatedAt: /* @__PURE__ */ new Date(),
    expiresAt: newExpiry
  }).where(eq6(ghlTokens.userType, "Location"));
  return data.access_token;
}
async function getAccessToken() {
  let row = await getTokenRow();
  if (!row)
    throw new Error("No GHL tokens found in DB. Please seed initial tokens.");
  const isExpired = !row.expiresAt || Date.now() > new Date(row.expiresAt).getTime() - 6e4;
  if (isExpired) {
    if (!refreshing) {
      refreshing = refreshAccessToken().finally(() => {
        refreshing = null;
      });
    }
    return refreshing;
  }
  return row.accessToken;
}

// server/ghl/ghlApi.ts
async function ghlFetch(url, options = {}, retries = 3) {
  const { auth = true, headers, ...rest } = options;
  let accessToken = auth ? await getAccessToken() : null;
  const doFetch = async (token) => fetch(url, {
    ...rest,
    headers: {
      ...headers || {},
      Accept: "application/json",
      ...auth && token ? { Authorization: `Bearer ${token}` } : {}
    }
  });
  let res = await doFetch(accessToken || void 0);
  if (res.status === 401 && auth) {
    console.warn("\u{1F504} Access token expired, refreshing...");
    accessToken = await refreshAccessToken();
    res = await doFetch(accessToken);
  }
  if (res.status === 429 && retries > 0) {
    const retryAfter = Number(res.headers.get("Retry-After")) || 1e3 * (4 - retries);
    console.warn(
      `\u23F3 Rate limited, retrying in ${retryAfter}ms... (${retries} retries left)`
    );
    await new Promise((r) => setTimeout(r, retryAfter));
    return ghlFetch(url, options, retries - 1);
  }
  return res;
}

// server/ghl/ghlAutomation.ts
var GHL_V2_BASE_URL2 = "https://services.leadconnectorhq.com";
var workflowMap = {
  assessment: "bb80d0bd-2475-4260-832c-48eacfad539f",
  // Send assessment on application form
  interview: "9c6fe3a0-e12b-4a6f-b0dd-e87dc6e7f179",
  // Send Interview Invite
  offer: "30ebd770-2419-4ddb-a444-a62a97336b56",
  // Send Offer Email
  reject: "02fb8c33-2358-4777-8599-5ac1e0e081df"
  // Send Rejection Email
};
function formatDateWithOffset(date) {
  const tzOffset = -date.getTimezoneOffset();
  const sign = tzOffset >= 0 ? "+" : "-";
  const pad = (n) => String(Math.floor(Math.abs(n))).padStart(2, "0");
  const hours = pad(tzOffset / 60);
  const minutes = pad(tzOffset % 60);
  return date.toISOString().slice(0, 19) + sign + hours + ":" + minutes;
}
async function addContactToWorkflow(contactId, action, eventStartTime) {
  const workflowId = workflowMap[action];
  if (!workflowId) {
    throw new Error(`\u274C No workflow mapped for action "${action}"`);
  }
  const url = `${GHL_V2_BASE_URL2}/contacts/${contactId}/workflow/${workflowId}`;
  const body = JSON.stringify({
    eventStartTime: eventStartTime || formatDateWithOffset(/* @__PURE__ */ new Date())
  });
  const res = await ghlFetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Version: "2021-07-28"
    },
    body
  });
  const raw = await res.text();
  if (!res.ok) {
    throw new Error(
      `\u274C Failed to add contact to workflow: ${res.status} ${raw}`
    );
  }
  console.log(
    `\u2705 Added contact ${contactId} to ${action} workflow (${workflowId})`
  );
  return JSON.parse(raw);
}

// server/api/ghl-automation.ts
function requireAuth3(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
}
function setupGHLAutomationRoutes(app2) {
  app2.post(
    "/api/ghl-automation/add-to-workflow",
    requireAuth3,
    async (req, res) => {
      try {
        const { contactId, action, eventStartTime } = req.body;
        if (!contactId || !action) {
          return res.status(400).json({
            success: false,
            message: "Missing required fields: contactId and action"
          });
        }
        const result = await addContactToWorkflow(
          contactId,
          action,
          eventStartTime
        );
        res.json({
          success: true,
          message: `Contact ${contactId} added to ${action} workflow`,
          data: result
        });
      } catch (error) {
        console.error("\u274C Add to workflow error:", error);
        res.status(500).json({
          success: false,
          message: "Failed to add contact to workflow",
          error: error.message
        });
      }
    }
  );
}

// server/api/platform-integrations.ts
init_storage();
init_utils();
import { z as z8 } from "zod";
var createIntegrationSchema = z8.object({
  platformId: z8.string().min(1),
  platformName: z8.string().min(1),
  platformType: z8.enum(["builtin", "custom"]).default("builtin"),
  credentials: z8.record(z8.any()).optional(),
  apiEndpoint: z8.string().url().optional(),
  apiMethod: z8.string().optional()
});
var updateIntegrationSchema = z8.object({
  platformName: z8.string().min(1).optional(),
  status: z8.enum(["connected", "disconnected", "error"]).optional(),
  credentials: z8.record(z8.any()).nullable().optional(),
  // Allow null for disconnecting
  apiEndpoint: z8.string().url().optional(),
  apiMethod: z8.string().optional(),
  oauthToken: z8.string().nullable().optional(),
  oauthRefreshToken: z8.string().nullable().optional(),
  oauthExpiresAt: z8.string().datetime().optional(),
  isEnabled: z8.boolean().optional()
});
function setupPlatformIntegrationRoutes(app2) {
  app2.get("/api/platform-integrations", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const integrations = await storage.getPlatformIntegrations();
      res.json(integrations);
    } catch (error) {
      handleApiError(error, res);
    }
  });
  app2.get("/api/platform-integrations/:platformId", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const { platformId } = req.params;
      const integration = await storage.getPlatformIntegration(platformId);
      if (!integration) {
        return res.status(404).json({ message: "Platform integration not found" });
      }
      res.json(integration);
    } catch (error) {
      handleApiError(error, res);
    }
  });
  app2.post("/api/platform-integrations", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const validationResult = createIntegrationSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          message: "Validation error",
          errors: validationResult.error.errors
        });
      }
      const data = validationResult.data;
      const existing = await storage.getPlatformIntegration(data.platformId);
      if (existing) {
        return res.status(400).json({ message: "Platform integration already exists" });
      }
      const integration = await storage.createPlatformIntegration({
        platformId: data.platformId,
        platformName: data.platformName,
        platformType: data.platformType,
        status: "disconnected",
        credentials: data.credentials || null,
        apiEndpoint: data.apiEndpoint || null,
        apiMethod: data.apiMethod || "POST",
        isEnabled: true
      });
      res.status(201).json(integration);
    } catch (error) {
      handleApiError(error, res);
    }
  });
  app2.patch("/api/platform-integrations/:platformId", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const { platformId } = req.params;
      const validationResult = updateIntegrationSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          message: "Validation error",
          errors: validationResult.error.errors
        });
      }
      const data = validationResult.data;
      const updateData = { ...data };
      if (data.oauthExpiresAt) {
        updateData.oauthExpiresAt = new Date(data.oauthExpiresAt);
      }
      const integration = await storage.updatePlatformIntegration(platformId, updateData);
      if (!integration) {
        return res.status(404).json({ message: "Platform integration not found" });
      }
      res.json(integration);
    } catch (error) {
      handleApiError(error, res);
    }
  });
  app2.delete("/api/platform-integrations/:platformId", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const { platformId } = req.params;
      await storage.deletePlatformIntegration(platformId);
      res.status(204).send();
    } catch (error) {
      handleApiError(error, res);
    }
  });
}

// server/api/crm-integrations.ts
init_storage();
init_utils();
import { z as z9 } from "zod";
import { google as google4 } from "googleapis";
var createCRMIntegrationSchema = z9.object({
  platformId: z9.string().min(1),
  // "ghl", "hubspot", "pipedrive", etc.
  platformName: z9.string().min(1),
  credentials: z9.record(z9.any()),
  // { apiKey, locationId, etc. }
  syncDirection: z9.enum(["one-way", "two-way"]).default("one-way")
});
var updateCRMIntegrationSchema = z9.object({
  credentials: z9.record(z9.any()).nullable().optional(),
  syncDirection: z9.enum(["one-way", "two-way"]).optional(),
  status: z9.enum(["connected", "disconnected", "error"]).optional(),
  isEnabled: z9.boolean().optional()
});
function setupCRMIntegrationRoutes(app2) {
  app2.get("/api/crm-integrations", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const userId = req.user.id;
      const integrations = await storage.getCRMIntegrations(userId);
      res.json(integrations);
    } catch (error) {
      handleApiError(error, res);
    }
  });
  app2.get("/api/crm-integrations/:platformId", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const { platformId } = req.params;
      const userId = req.user.id;
      const integration = await storage.getPlatformIntegration(platformId, userId);
      if (!integration) {
        return res.status(404).json({ message: "CRM integration not found" });
      }
      res.json(integration);
    } catch (error) {
      handleApiError(error, res);
    }
  });
  app2.post("/api/crm-integrations", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const validationResult = createCRMIntegrationSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          message: "Validation error",
          errors: validationResult.error.errors
        });
      }
      const userId = req.user.id;
      const data = validationResult.data;
      const existing = await storage.getPlatformIntegration(data.platformId, userId);
      if (existing) {
        const updated = await storage.updatePlatformIntegration(
          data.platformId,
          {
            credentials: data.credentials,
            syncDirection: data.syncDirection,
            status: "connected",
            isEnabled: true
          }
        );
        return res.json(updated);
      }
      const integration = await storage.createPlatformIntegration({
        userId,
        platformId: data.platformId,
        platformName: data.platformName,
        platformType: "crm",
        status: "connected",
        credentials: data.credentials,
        syncDirection: data.syncDirection,
        isEnabled: true
      });
      res.status(201).json(integration);
    } catch (error) {
      handleApiError(error, res);
    }
  });
  app2.patch("/api/crm-integrations/:platformId", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const { platformId } = req.params;
      const userId = req.user.id;
      const validationResult = updateCRMIntegrationSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          message: "Validation error",
          errors: validationResult.error.errors
        });
      }
      const data = validationResult.data;
      const existing = await storage.getPlatformIntegration(platformId, userId);
      if (!existing) {
        return res.status(404).json({ message: "CRM integration not found" });
      }
      const updated = await storage.updatePlatformIntegration(platformId, data);
      res.json(updated);
    } catch (error) {
      handleApiError(error, res);
    }
  });
  app2.delete("/api/crm-integrations/:platformId", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const { platformId } = req.params;
      const userId = req.user.id;
      const existing = await storage.getPlatformIntegration(platformId, userId);
      if (!existing) {
        return res.status(404).json({ message: "CRM integration not found" });
      }
      await storage.deletePlatformIntegration(platformId);
      res.status(204).send();
    } catch (error) {
      handleApiError(error, res);
    }
  });
  app2.get("/api/crm-integrations/airtable/schema", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const userId = req.user.id;
      const integration = await storage.getPlatformIntegration("airtable", userId);
      if (!integration || !integration.credentials) {
        return res.status(404).json({ message: "Airtable integration not found" });
      }
      const credentials = integration.credentials;
      if (!credentials.apiKey || !credentials.baseId) {
        return res.status(400).json({ message: "Airtable credentials incomplete" });
      }
      const tableName = credentials.tableName || "Candidates";
      const axios10 = (await import("axios")).default;
      const AIRTABLE_API_BASE2 = "https://api.airtable.com/v0";
      try {
        const response = await axios10.get(
          `${AIRTABLE_API_BASE2}/meta/bases/${credentials.baseId}/tables`,
          {
            headers: {
              Authorization: `Bearer ${credentials.apiKey}`,
              "Content-Type": "application/json"
            }
          }
        );
        const table = response.data.tables?.find((t) => t.name === tableName);
        if (!table) {
          return res.status(404).json({ message: `Table "${tableName}" not found in Airtable base` });
        }
        const fields = table.fields?.map((field) => ({
          id: field.id,
          name: field.name,
          type: field.type
        })) || [];
        res.json({
          tableName: table.name,
          fields
        });
      } catch (apiError) {
        try {
          const sampleResponse = await axios10.get(
            `${AIRTABLE_API_BASE2}/${credentials.baseId}/${tableName}`,
            {
              headers: {
                Authorization: `Bearer ${credentials.apiKey}`,
                "Content-Type": "application/json"
              },
              params: { maxRecords: 1 }
            }
          );
          const sampleRecord = sampleResponse.data.records?.[0];
          const fields = sampleRecord?.fields ? Object.keys(sampleRecord.fields).map((name) => ({ name, type: "unknown" })) : [];
          res.json({
            tableName,
            fields
          });
        } catch (fallbackError) {
          console.error("Failed to fetch Airtable schema:", fallbackError.message);
          res.status(500).json({
            message: "Failed to fetch Airtable table schema",
            error: fallbackError.response?.data?.message || fallbackError.message
          });
        }
      }
    } catch (error) {
      handleApiError(error, res);
    }
  });
  app2.get("/api/crm-integrations/google-sheets/auth", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const protocol = req.get("x-forwarded-proto") || req.protocol || (req.secure ? "https" : "http");
      const host = req.get("x-forwarded-host") || req.get("host") || "localhost:5000";
      let redirectUri = `${protocol}://${host}/api/crm-integrations/google-sheets/callback`;
      const envRedirectUri = process.env.GOOGLE_REDIRECT_URI;
      if (envRedirectUri) {
        try {
          const envUrl = new URL(envRedirectUri);
          const currentUrl = new URL(redirectUri);
          if (envUrl.hostname === currentUrl.hostname || !host.includes("ngrok") && !host.includes("localhost")) {
            redirectUri = `${envUrl.protocol}//${envUrl.host}/api/crm-integrations/google-sheets/callback`;
          }
        } catch (e) {
        }
      }
      redirectUri = redirectUri.replace(/\/$/, "");
      const oauth2Client = new google4.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        redirectUri
      );
      const authUrl = oauth2Client.generateAuthUrl({
        access_type: "offline",
        // Get refresh token
        scope: [
          "https://www.googleapis.com/auth/spreadsheets.readonly",
          "https://www.googleapis.com/auth/spreadsheets"
        ],
        prompt: "consent",
        // Force consent screen to get refresh token
        state: JSON.stringify({ userId: req.user.id })
        // Pass user ID in state
      });
      res.json({ authUrl });
    } catch (error) {
      handleApiError(error, res);
    }
  });
  app2.get("/api/crm-integrations/google-sheets/callback", async (req, res) => {
    try {
      const { code, state } = req.query;
      if (!code) {
        return res.redirect(`/integrations?error=oauth_cancelled`);
      }
      let userId;
      try {
        const stateData = JSON.parse(state);
        userId = stateData.userId;
      } catch {
        return res.redirect(`/integrations?error=invalid_state`);
      }
      const protocol = req.get("x-forwarded-proto") || req.protocol || (req.secure ? "https" : "http");
      const host = req.get("x-forwarded-host") || req.get("host") || "localhost:5000";
      let redirectUri = `${protocol}://${host}/api/crm-integrations/google-sheets/callback`;
      const envRedirectUri = process.env.GOOGLE_REDIRECT_URI;
      if (envRedirectUri) {
        try {
          const envUrl = new URL(envRedirectUri);
          const currentUrl = new URL(redirectUri);
          if (envUrl.hostname === currentUrl.hostname || !host.includes("ngrok") && !host.includes("localhost")) {
            redirectUri = `${envUrl.protocol}//${envUrl.host}/api/crm-integrations/google-sheets/callback`;
          }
        } catch (e) {
        }
      }
      redirectUri = redirectUri.replace(/\/$/, "");
      const oauth2Client = new google4.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        redirectUri
      );
      const { tokens: tokens2 } = await oauth2Client.getToken(code);
      if (!tokens2.access_token) {
        return res.redirect(`/integrations?error=no_access_token`);
      }
      const existing = await storage.getPlatformIntegration("google-sheets", userId);
      const credentials = {
        accessToken: tokens2.access_token,
        refreshToken: tokens2.refresh_token || null,
        spreadsheetId: "",
        // User will set this in settings
        sheetName: "Sheet1"
        // Default
      };
      if (existing) {
        await storage.updatePlatformIntegration("google-sheets", {
          credentials,
          status: "connected"
        });
      } else {
        await storage.createPlatformIntegration({
          userId,
          platformId: "google-sheets",
          platformName: "Google Sheets",
          platformType: "crm",
          status: "connected",
          credentials,
          syncDirection: "one-way",
          isEnabled: true
        });
      }
      res.redirect(`/integrations?google_sheets_connected=true`);
    } catch (error) {
      console.error("Google OAuth callback error:", error);
      res.redirect(`/integrations?error=${encodeURIComponent(error.message)}`);
    }
  });
  app2.get("/api/crm-integrations/google-sheets/schema", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const userId = req.user.id;
      const integration = await storage.getPlatformIntegration("google-sheets", userId);
      if (!integration || !integration.credentials) {
        return res.status(404).json({ message: "Google Sheets integration not found" });
      }
      const credentials = integration.credentials;
      if (!credentials.accessToken || !credentials.spreadsheetId) {
        return res.status(400).json({ message: "Google Sheets credentials incomplete. Please configure spreadsheet ID in settings." });
      }
      const { getGoogleSheetsSchema: getGoogleSheetsSchema2 } = await Promise.resolve().then(() => (init_google_sheets_integration(), google_sheets_integration_exports));
      const schema = await getGoogleSheetsSchema2(userId);
      res.json(schema);
    } catch (error) {
      handleApiError(error, res);
    }
  });
}

// server/api/form-templates.ts
init_storage();
init_utils();
import { z as z10 } from "zod";
var fieldSchema = z10.object({
  id: z10.string(),
  type: z10.enum([
    "text",
    "email",
    "phone",
    "textarea",
    "number",
    "select",
    "multiselect",
    "radio",
    "checkbox",
    "file",
    "date",
    "time",
    "datetime",
    "rating",
    "scale",
    "url",
    "section",
    "pagebreak"
  ]),
  label: z10.string(),
  description: z10.string().optional(),
  placeholder: z10.string().optional(),
  required: z10.boolean().default(false),
  options: z10.array(z10.string()).optional(),
  // For select, multiselect, radio, checkbox fields
  validation: z10.object({
    min: z10.number().optional(),
    max: z10.number().optional(),
    minLength: z10.number().optional(),
    maxLength: z10.number().optional(),
    pattern: z10.string().optional()
  }).optional(),
  settings: z10.object({
    allowMultiple: z10.boolean().optional(),
    accept: z10.string().optional(),
    min: z10.number().optional(),
    max: z10.number().optional(),
    step: z10.number().optional(),
    rows: z10.number().optional()
  }).optional()
});
var createFormTemplateSchema = z10.object({
  name: z10.string().min(1),
  description: z10.string().optional(),
  fields: z10.array(fieldSchema).min(1),
  isDefault: z10.boolean().optional().default(false)
});
var updateFormTemplateSchema = z10.object({
  name: z10.string().min(1).optional(),
  description: z10.string().optional(),
  fields: z10.array(fieldSchema).optional(),
  isDefault: z10.boolean().optional()
});
function setupFormTemplateRoutes(app2) {
  app2.get("/api/form-templates", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const accountId = await storage.getUserAccountId(req.user.id);
      if (!accountId) {
        return res.status(400).json({ message: "User is not associated with any account" });
      }
      const templates = await storage.getFormTemplates(accountId);
      res.json(templates);
    } catch (error) {
      handleApiError(error, res);
    }
  });
  app2.get("/api/form-templates/default", async (req, res) => {
    try {
      return res.status(401).json({ message: "Authentication required for default template" });
    } catch (error) {
      handleApiError(error, res);
    }
  });
  app2.get("/api/form-templates/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const accountId = await storage.getUserAccountId(req.user.id);
      if (!accountId) {
        return res.status(400).json({ message: "User is not associated with any account" });
      }
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid template ID" });
      }
      const template = await storage.getFormTemplate(id, accountId);
      if (!template) {
        return res.status(404).json({ message: "Form template not found" });
      }
      res.json(template);
    } catch (error) {
      handleApiError(error, res);
    }
  });
  app2.post("/api/form-templates", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const accountId = await storage.getUserAccountId(req.user.id);
      if (!accountId) {
        return res.status(400).json({ message: "User is not associated with any account" });
      }
      const validationResult = createFormTemplateSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          message: "Validation error",
          errors: validationResult.error.errors
        });
      }
      const data = validationResult.data;
      if (data.isDefault) {
        const existingDefaults = await storage.getFormTemplates(accountId);
        for (const template2 of existingDefaults) {
          if (template2.isDefault && template2.id) {
            await storage.updateFormTemplate(template2.id, accountId, { isDefault: false });
          }
        }
      }
      const template = await storage.createFormTemplate({ ...data, accountId });
      res.status(201).json(template);
    } catch (error) {
      handleApiError(error, res);
    }
  });
  app2.patch("/api/form-templates/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const accountId = await storage.getUserAccountId(req.user.id);
      if (!accountId) {
        return res.status(400).json({ message: "User is not associated with any account" });
      }
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid template ID" });
      }
      const validationResult = updateFormTemplateSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          message: "Validation error",
          errors: validationResult.error.errors
        });
      }
      const data = validationResult.data;
      if (data.isDefault) {
        const existingDefaults = await storage.getFormTemplates(accountId);
        for (const template2 of existingDefaults) {
          if (template2.isDefault && template2.id && template2.id !== id) {
            await storage.updateFormTemplate(template2.id, accountId, { isDefault: false });
          }
        }
      }
      const template = await storage.updateFormTemplate(id, accountId, data);
      if (!template) {
        return res.status(404).json({ message: "Form template not found" });
      }
      res.json(template);
    } catch (error) {
      handleApiError(error, res);
    }
  });
  app2.delete("/api/form-templates/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const accountId = await storage.getUserAccountId(req.user.id);
      if (!accountId) {
        return res.status(400).json({ message: "User is not associated with any account" });
      }
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid template ID" });
      }
      await storage.deleteFormTemplate(id, accountId);
      res.status(204).send();
    } catch (error) {
      handleApiError(error, res);
    }
  });
}

// server/api/applications.ts
init_storage();
init_utils();
import { z as z11 } from "zod";
var applicationSchema = z11.object({
  jobId: z11.number().int().positive(),
  name: z11.string().min(2),
  email: z11.string().email(),
  phone: z11.string().optional(),
  location: z11.string().optional(),
  resumeUrl: z11.string().url().nullable().optional(),
  applicationData: z11.record(z11.any()).optional(),
  // Custom form field answers
  source: z11.string().optional().default("website")
});
function setupApplicationRoutes(app2) {
  app2.post("/api/applications", async (req, res) => {
    try {
      const validationResult = applicationSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          message: "Validation error",
          errors: validationResult.error.errors
        });
      }
      const data = validationResult.data;
      const job = await storage.getJob(data.jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      if (job.status !== "active") {
        return res.status(400).json({
          message: "This job is not currently accepting applications",
          jobStatus: job.status
        });
      }
      const existingCandidate = await storage.getCandidateByNameAndEmail(data.name, data.email);
      if (existingCandidate && existingCandidate.jobId === data.jobId) {
        return res.status(409).json({
          message: "You have already applied for this position"
        });
      }
      const candidate = await storage.createCandidate({
        jobId: data.jobId,
        name: data.name,
        email: data.email,
        phone: data.phone || "",
        location: data.location || "",
        resumeUrl: data.resumeUrl || null,
        source: data.source || "website",
        status: "new",
        applicationData: data.applicationData || null
        // Store custom form answers
      });
      const jobWithDetails = await storage.getJob(data.jobId);
      const processAfter = jobWithDetails?.expressReview ? /* @__PURE__ */ new Date() : new Date(Date.now() + 3 * 60 * 60 * 1e3);
      await storage.createNotification({
        type: "email",
        payload: {
          recipientEmail: candidate.email,
          subject: `Your Assessment for ${jobWithDetails?.title}`,
          template: "assessment",
          context: {
            candidateName: candidate.name,
            jobTitle: jobWithDetails?.title,
            hiPeopleLink: jobWithDetails?.hiPeopleLink
          }
        },
        processAfter,
        status: "pending"
      });
      await storage.createActivityLog({
        userId: null,
        // Public application, no user
        action: "Application submitted",
        entityType: "candidate",
        entityId: candidate.id,
        details: {
          candidateName: candidate.name,
          jobTitle: jobWithDetails?.title,
          source: data.source
        },
        timestamp: /* @__PURE__ */ new Date()
      });
      res.status(201).json({
        message: "Application submitted successfully",
        candidateId: candidate.id
      });
    } catch (error) {
      handleApiError(error, res);
    }
  });
}

// server/api/storage.ts
init_utils();
import dns from "dns";
import multer from "multer";
import { createClient } from "@supabase/supabase-js";

// server/security/file-upload.ts
import { fileTypeFromBuffer } from "file-type";
var ALLOWED_MIME_TYPES = [
  "application/pdf"
];
var ALLOWED_EXTENSIONS = [".pdf"];
var MAX_FILE_SIZE = 5 * 1024 * 1024;
async function validateMimeType(buffer, filename) {
  const ext = filename.toLowerCase().substring(filename.lastIndexOf("."));
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return false;
  }
  const fileTypeResult = await fileTypeFromBuffer(buffer);
  if (!fileTypeResult) {
    return ext === ".pdf";
  }
  return ALLOWED_MIME_TYPES.includes(fileTypeResult.mime);
}
function validateFileSize(size) {
  return size > 0 && size <= MAX_FILE_SIZE;
}
function checkForMaliciousContent(buffer) {
  const preview = buffer.slice(0, 1024).toString("utf-8", 0, 1024);
  if (preview.includes("<script") || preview.includes("</script>")) {
    return { safe: false, reason: "File contains script tags" };
  }
  if (preview.toLowerCase().includes("javascript:")) {
    return { safe: false, reason: "File contains javascript: protocol" };
  }
  if (preview.includes("data:text/html") || preview.includes("data:application/javascript")) {
    return { safe: false, reason: "File contains executable data URLs" };
  }
  if (buffer.length > 4) {
    const header = buffer.slice(0, 4).toString("ascii");
    if (!header.startsWith("%PDF") && buffer.length < 1e3) {
      return { safe: false, reason: "File does not appear to be a valid PDF" };
    }
  }
  return { safe: true };
}
async function validateFile(file, req) {
  if (!file || !file.buffer) {
    return { valid: false, error: "No file provided" };
  }
  if (!validateFileSize(file.size)) {
    return {
      valid: false,
      error: `File size must be between 1 byte and ${MAX_FILE_SIZE / 1024 / 1024}MB`
    };
  }
  const isValidMime = await validateMimeType(file.buffer, file.originalname);
  if (!isValidMime) {
    return {
      valid: false,
      error: "Only PDF files are allowed"
    };
  }
  const contentCheck = checkForMaliciousContent(file.buffer);
  if (!contentCheck.safe) {
    return {
      valid: false,
      error: contentCheck.reason || "File contains potentially malicious content"
    };
  }
  return { valid: true };
}

// server/api/storage.ts
dns.setDefaultResultOrder("ipv4first");
if (process.env.NODE_ENV !== "production" && !process.env.NODE_TLS_REJECT_UNAUTHORIZED) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
} else if (process.env.NODE_ENV === "production") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "1";
}
function getSupabaseUrl() {
  if (process.env.SUPABASE_URL) {
    return process.env.SUPABASE_URL;
  }
  const dbUrl2 = process.env.DATABASE_URL || "";
  let match = dbUrl2.match(/postgres\.([^:]+):/);
  if (match) {
    const projectRef = match[1];
    return `https://${projectRef}.supabase.co`;
  }
  match = dbUrl2.match(/db\.([^.]+)\.supabase\.co/);
  if (match) {
    const projectRef = match[1];
    return `https://${projectRef}.supabase.co`;
  }
  console.warn("\u26A0\uFE0F  Could not determine Supabase URL from DATABASE_URL. Please set SUPABASE_URL in .env file.");
  return "https://xrzblucvpnyknupragco.supabase.co";
}
var supabaseUrl = getSupabaseUrl();
var supabaseKey = process.env.SUPABASE_ANON_KEY || "";
if (!supabaseKey) {
  console.error("\u274C SUPABASE_ANON_KEY is not set in .env file!");
}
var supabase = createClient(supabaseUrl, supabaseKey || "placeholder-will-fail");
var upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024
    // 5MB limit
  }
});
function setupStorageRoutes(app2) {
  app2.post("/api/upload/resume", upload.single("resume"), async (req, res) => {
    try {
      if (!supabaseKey) {
        return res.status(500).json({
          message: "Supabase API key not configured. Please set SUPABASE_ANON_KEY in your .env file. See ENV_SETUP.md for instructions."
        });
      }
      if (!req.file) {
        return res.status(400).json({ message: "No file provided" });
      }
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
      const ext = file.originalname.split(".").pop();
      const path2 = candidateId ? `candidate-${candidateId}.${ext}` : `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;
      const { data: uploadData, error: uploadError } = await supabase.storage.from("resumes").upload(path2, file.buffer, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.mimetype
      });
      if (uploadError) {
        const errorMessage = uploadError.message || "";
        if (errorMessage.includes("new row violates row-level security") || errorMessage.includes("permission denied") || errorMessage.includes("row-level security policy")) {
          return res.status(403).json({
            message: "Storage bucket permissions issue. Please check that the 'resumes' bucket has public access enabled and the RLS policies are set correctly. See SUPABASE_STORAGE_SETUP.md for instructions."
          });
        }
        if (errorMessage.includes("Bucket not found") || errorMessage.includes("does not exist")) {
          return res.status(404).json({
            message: "Storage bucket 'resumes' not found. Please create it in Supabase Storage settings and make it public."
          });
        }
        if (errorMessage.includes("ENOTFOUND") || errorMessage.includes("getaddrinfo") || errorMessage.includes("NetworkError")) {
          return res.status(503).json({
            message: "Cannot connect to Supabase storage. The Supabase project may be paused or there's a network issue. Please check: 1) Your Supabase project is active (not paused), 2) Your internet connection, 3) The SUPABASE_URL in your .env file matches your project URL."
          });
        }
        return res.status(500).json({
          message: `Upload failed: ${errorMessage || "Unknown error"}`
        });
      }
      const { data: urlData } = supabase.storage.from("resumes").getPublicUrl(path2);
      if (!urlData?.publicUrl) {
        return res.status(500).json({ message: "Failed to generate public URL for uploaded file" });
      }
      res.json({
        url: urlData.publicUrl,
        path: path2
      });
    } catch (error) {
      handleApiError(error, res);
    }
  });
}

// server/api/calendar-webhooks.ts
init_storage();
init_utils();
init_email_validator();
init_notifications();
async function updateInterviewFromBooking(candidateEmail, scheduledDate, provider, userId) {
  try {
    if (!userId) {
      console.error(`[Calendar Webhook] userId is required for multi-tenant data isolation`);
      return false;
    }
    const accountId = await storage.getUserAccountId(userId);
    if (!accountId) {
      console.error(`[Calendar Webhook] User ${userId} is not associated with any account`);
      return false;
    }
    const candidates2 = await storage.getCandidates(accountId, {});
    const candidate = candidates2.find((c) => c.email.toLowerCase() === candidateEmail.toLowerCase());
    if (!candidate) {
      return false;
    }
    const interviews3 = await storage.getInterviews(accountId, { candidateId: candidate.id });
    let scheduledInterview = interviews3.find(
      (i) => i.status === "scheduled" || i.status === "pending"
    );
    if (userId && scheduledInterview) {
      const userSpecificInterview = interviews3.find(
        (i) => (i.status === "scheduled" || i.status === "pending") && i.interviewerId === userId
      );
      if (userSpecificInterview) {
        scheduledInterview = userSpecificInterview;
      }
    }
    if (!scheduledInterview) {
      const newInterview = await storage.createInterview({
        accountId,
        candidateId: candidate.id,
        type: "video",
        status: "scheduled",
        scheduledDate,
        interviewerId: userId || null,
        notes: `Automatically created from ${provider} booking on ${(/* @__PURE__ */ new Date()).toISOString()}`
      });
      scheduledInterview = newInterview;
    }
    await storage.updateInterview(scheduledInterview.id, accountId, {
      scheduledDate,
      status: "scheduled",
      notes: scheduledInterview.notes ? `${scheduledInterview.notes}

Automatically updated from ${provider} booking on ${(/* @__PURE__ */ new Date()).toISOString()}` : `Automatically updated from ${provider} booking on ${(/* @__PURE__ */ new Date()).toISOString()}`,
      updatedAt: /* @__PURE__ */ new Date()
    });
    if (candidate.status !== "60_1st_interview_scheduled") {
      await storage.updateCandidate(candidate.id, accountId, {
        status: "60_1st_interview_scheduled"
      });
    }
    const job = candidate.jobId ? await storage.getJob(candidate.jobId, accountId) : null;
    const updatedInterview = await storage.getInterview(scheduledInterview.id, accountId);
    if (updatedInterview && candidate && job && userId) {
      await notifySlackUsers(userId, "interview_scheduled", {
        candidate,
        job,
        interview: updatedInterview
      });
      try {
        const jobTitle = job?.title || "position";
        await createNotification(
          userId,
          "interview_scheduled",
          "Interview Scheduled",
          `Interview scheduled: ${candidate.name} (${jobTitle}) on ${scheduledDate.toLocaleDateString()} at ${scheduledDate.toLocaleTimeString()}`,
          `/candidates`,
          { candidateId: candidate.id, jobId: job?.id, interviewId: scheduledInterview.id }
        );
      } catch (error) {
        console.error("[Calendar Webhook] Failed to create notification:", error);
      }
      if (provider === "calendly" && userId) {
        try {
          const googleCalendarIntegration = await storage.getPlatformIntegration("google-calendar", userId);
          const credentials = googleCalendarIntegration?.credentials;
          const syncWithCalendly = credentials?.syncWithCalendly || false;
          if (googleCalendarIntegration?.status === "connected" && syncWithCalendly && updatedInterview) {
            const interviewer = updatedInterview.interviewerId ? await storage.getUser(updatedInterview.interviewerId) : null;
            await createGoogleCalendarEvent(userId, {
              id: updatedInterview.id,
              candidateId: candidate.id,
              scheduledDate,
              type: updatedInterview.type || "video",
              videoUrl: updatedInterview.videoUrl || void 0,
              candidate: {
                name: candidate.name,
                email: candidate.email
              },
              job: job ? { title: job.title } : void 0,
              interviewer: interviewer ? {
                fullName: interviewer.fullName,
                email: interviewer.email
              } : void 0
            });
          }
        } catch (error) {
          console.error("[Calendar Webhook] Failed to create Google Calendar event:", error);
        }
      }
    }
    return true;
  } catch (error) {
    console.error("Error updating interview from calendar booking:", error);
    return false;
  }
}
async function handleCalendlyWebhook(req, res) {
  try {
    const payload = req.body;
    const userId = req.query.userId ? parseInt(req.query.userId) : void 0;
    console.log("[Calendly Webhook] Received webhook, userId:", userId);
    console.log("[Calendly Webhook] Payload event:", payload.event);
    const eventType = payload.event;
    if (eventType === "invitee.canceled") {
      console.log("[Calendly Webhook] Processing cancellation event");
      const inviteeData2 = payload.payload;
      const candidateEmail2 = inviteeData2?.email || inviteeData2?.invitee?.email;
      if (candidateEmail2 && userId) {
        const accountId = await storage.getUserAccountId(userId);
        if (!accountId) {
          console.error(`[Calendly Webhook] User ${userId} is not associated with any account`);
          return res.status(400).json({ message: "User is not associated with any account" });
        }
        const candidates2 = await storage.getCandidates(accountId, {});
        const candidate = candidates2.find((c) => c.email.toLowerCase() === candidateEmail2.toLowerCase());
        if (candidate) {
          const interviews3 = await storage.getInterviews(accountId, { candidateId: candidate.id });
          const scheduledInterview = interviews3.find((i) => i.status === "scheduled" || i.status === "pending");
          if (scheduledInterview) {
            await storage.updateInterview(scheduledInterview.id, accountId, {
              status: "cancelled",
              updatedAt: /* @__PURE__ */ new Date()
            });
            console.log(`[Calendly Webhook] Cancelled interview ${scheduledInterview.id} for ${candidate.name}`);
            if (candidate.status === "60_1st_interview_scheduled") {
              await storage.updateCandidate(candidate.id, accountId, {
                status: "45_1st_interview_sent"
                // Revert to interview sent status
              });
            }
            return res.status(200).json({ message: "Interview cancelled successfully" });
          } else {
            console.log(`[Calendly Webhook] No scheduled interview found for ${candidate.name}`);
            return res.status(200).json({ message: "No scheduled interview found to cancel" });
          }
        } else {
          console.log(`[Calendly Webhook] Candidate not found for email: ${candidateEmail2}`);
          return res.status(200).json({ message: "Candidate not found" });
        }
      } else {
        console.error("[Calendly Webhook] Missing email in cancellation payload");
        return res.status(400).json({ message: "Missing email in cancellation payload" });
      }
    }
    if (eventType === "invitee.updated") {
      console.log("[Calendly Webhook] Processing reschedule event");
      const inviteeData2 = payload.payload;
      const candidateEmail2 = inviteeData2?.email || inviteeData2?.invitee?.email;
      if (!candidateEmail2) {
        console.error("[Calendly Webhook] Missing email in reschedule payload");
        return res.status(400).json({ message: "Missing email in reschedule payload" });
      }
      const scheduledEvent2 = inviteeData2.scheduled_event || payload.scheduled_event;
      if (!scheduledEvent2 || !scheduledEvent2.start_time) {
        console.error("[Calendly Webhook] Missing scheduled_event.start_time in reschedule");
        return res.status(400).json({ message: "Missing scheduled_event.start_time in reschedule" });
      }
      const newScheduledDate = new Date(scheduledEvent2.start_time);
      console.log(`[Calendly Webhook] Rescheduling to: ${newScheduledDate.toISOString()}`);
      const updated2 = await updateInterviewFromBooking(candidateEmail2, newScheduledDate, "calendly", userId);
      if (updated2) {
        console.log("[Calendly Webhook] Interview rescheduled successfully");
        res.status(200).json({ message: "Interview rescheduled successfully" });
      } else {
        console.log("[Calendly Webhook] Failed to reschedule - candidate not found or other error");
        res.status(200).json({ message: "No matching candidate found. Please ensure the candidate exists in HireOS with this email address." });
      }
      return;
    }
    if (eventType !== "invitee.created") {
      console.log(`[Calendly Webhook] Ignoring event type: ${eventType}`);
      return res.status(200).json({ message: "Event ignored" });
    }
    const inviteeData = payload.payload;
    if (!inviteeData) {
      console.error("[Calendly Webhook] Missing payload data");
      return res.status(400).json({ message: "Missing payload data" });
    }
    const candidateEmail = inviteeData.email || inviteeData.invitee?.email;
    if (!candidateEmail) {
      console.error("[Calendly Webhook] Missing email in payload");
      return res.status(400).json({ message: "Missing email in payload" });
    }
    const scheduledEvent = inviteeData.scheduled_event || payload.scheduled_event;
    if (!scheduledEvent || !scheduledEvent.start_time) {
      console.error("[Calendly Webhook] Missing scheduled_event.start_time");
      return res.status(400).json({ message: "Missing scheduled_event.start_time" });
    }
    if (inviteeData.status !== "active") {
      console.log(`[Calendly Webhook] Skipping inactive event with status: ${inviteeData.status}`);
      return res.status(200).json({ message: "Event was canceled or inactive" });
    }
    const scheduledDate = new Date(scheduledEvent.start_time);
    const updated = await updateInterviewFromBooking(candidateEmail, scheduledDate, "calendly", userId);
    if (updated) {
      res.status(200).json({ message: "Interview updated successfully" });
    } else {
      res.status(200).json({ message: "No matching candidate found. Please ensure the candidate exists in HireOS with this email address." });
    }
  } catch (error) {
    console.error("[Calendly Webhook] Error:", error);
    handleApiError(error, res);
  }
}
async function handleCalComWebhook(req, res) {
  try {
    const payload = req.body;
    const userId = req.query.userId ? parseInt(req.query.userId) : void 0;
    if (payload.triggerEvent !== "BOOKING_CREATED") {
      return res.status(200).json({ message: "Event ignored" });
    }
    const attendee = payload.payload.attendee;
    const candidateEmail = attendee.email;
    const scheduledDate = new Date(payload.payload.startTime);
    const updated = await updateInterviewFromBooking(candidateEmail, scheduledDate, "cal.com", userId);
    if (updated) {
      res.status(200).json({ message: "Interview updated successfully" });
    } else {
      res.status(200).json({ message: "No matching candidate or interview found" });
    }
  } catch (error) {
    handleApiError(error, res);
  }
}
async function handleGoogleCalendarWebhook(req, res) {
  try {
    const payload = req.body;
    const userId = req.query.userId ? parseInt(req.query.userId) : void 0;
    const candidateAttendee = payload.attendees?.find(
      (a) => a.email && !isLikelyInvalidEmail(a.email)
    );
    if (!candidateAttendee) {
      return res.status(200).json({ message: "No candidate email found in attendees" });
    }
    const candidateEmail = candidateAttendee.email;
    const scheduledDate = new Date(payload.start.dateTime);
    const updated = await updateInterviewFromBooking(candidateEmail, scheduledDate, "google", userId);
    if (updated) {
      res.status(200).json({ message: "Interview updated successfully" });
    } else {
      res.status(200).json({ message: "No matching candidate or interview found" });
    }
  } catch (error) {
    handleApiError(error, res);
  }
}
async function handleGenericWebhook(req, res) {
  try {
    const provider = req.query.provider;
    const webhookSecret = req.query.secret;
    switch (provider) {
      case "calendly":
        return await handleCalendlyWebhook(req, res);
      case "cal.com":
        return await handleCalComWebhook(req, res);
      case "google":
        return await handleGoogleCalendarWebhook(req, res);
      default:
        const body = req.body;
        if (body.event && body.payload?.invitee) {
          return await handleCalendlyWebhook(req, res);
        } else if (body.triggerEvent && body.payload?.attendee) {
          return await handleCalComWebhook(req, res);
        } else if (body.kind === "calendar#event" && body.attendees) {
          return await handleGoogleCalendarWebhook(req, res);
        } else {
          return res.status(400).json({
            message: "Unknown calendar provider. Please specify ?provider=calendly|cal.com|google"
          });
        }
    }
  } catch (error) {
    handleApiError(error, res);
  }
}
function setupCalendarWebhookRoutes(app2) {
  app2.post("/api/webhooks/calendar", handleGenericWebhook);
  app2.post("/api/webhooks/calendar/calendly", handleCalendlyWebhook);
  app2.post("/api/webhooks/calendar/cal.com", handleCalComWebhook);
  app2.post("/api/webhooks/calendar/google", handleGoogleCalendarWebhook);
}

// server/api/calendly-connect.ts
init_storage();
init_utils();
import axios8 from "axios";
import { z as z12 } from "zod";
var connectCalendlySchema = z12.object({
  token: z12.string().min(1, "Calendly token is required")
});
function setupCalendlyConnectRoutes(app2) {
  app2.post(
    "/api/calendly/connect",
    validateRequest(connectCalendlySchema),
    async (req, res) => {
      try {
        if (!req.isAuthenticated()) {
          return res.status(401).json({ message: "Authentication required" });
        }
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ message: "User not authenticated" });
        }
        const { token } = req.body;
        let userInfo;
        try {
          const userResponse = await axios8.get("https://api.calendly.com/users/me", {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          userInfo = userResponse.data.resource;
        } catch (error) {
          console.error("[Calendly Connect] Token verification failed:", error.response?.data || error.message);
          return res.status(400).json({
            message: "Invalid Calendly token. Please check your Personal Access Token.",
            error: error.response?.data || error.message
          });
        }
        const orgUri = userInfo.current_organization;
        const userUri = userInfo.uri;
        const host = req.get("host");
        if (!host) {
          console.error("[Calendly Connect] Cannot determine server host");
          return res.status(500).json({
            message: "Cannot determine server host. Please ensure your server is properly configured."
          });
        }
        const webhookUrl = `${req.protocol}://${host}/api/webhooks/calendar?provider=calendly&userId=${userId}`;
        let webhookId = null;
        try {
          let allWebhooks = [];
          let pageToken = null;
          do {
            const params = {
              organization: orgUri,
              user: userUri,
              scope: "user"
            };
            if (pageToken) {
              params.page_token = pageToken;
            }
            const existingWebhooksResponse = await axios8.get(
              "https://api.calendly.com/webhook_subscriptions",
              {
                params,
                headers: {
                  Authorization: `Bearer ${token}`
                }
              }
            );
            const webhooks = existingWebhooksResponse.data?.collection || [];
            allWebhooks = allWebhooks.concat(webhooks);
            pageToken = existingWebhooksResponse.data?.pagination?.next_page_token || null;
          } while (pageToken);
          const normalizeUrl = (url) => url.trim().toLowerCase().replace(/\/$/, "");
          const normalizedWebhookUrl = normalizeUrl(webhookUrl);
          const existingWebhook = allWebhooks.find((w) => {
            const hookUrl = w.callback_url || w.url;
            if (!hookUrl) return false;
            return normalizeUrl(hookUrl) === normalizedWebhookUrl;
          });
          if (existingWebhook) {
            webhookId = existingWebhook.uuid || (existingWebhook.uri ? existingWebhook.uri.split("/").pop() : null);
          }
        } catch (error) {
        }
        if (!webhookId) {
          const webhookPayload = {
            url: webhookUrl,
            events: ["invitee.created", "invitee.canceled"],
            organization: orgUri,
            user: userUri,
            scope: "user"
          };
          try {
            const webhookResponse = await axios8.post(
              "https://api.calendly.com/webhook_subscriptions",
              webhookPayload,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json"
                }
              }
            );
            const resource = webhookResponse.data.resource;
            webhookId = resource?.uuid || (resource?.uri ? resource.uri.split("/").pop() : null);
          } catch (error) {
            if (error.response?.status === 409) {
              let found = false;
              let attempts = 0;
              const maxAttempts = 3;
              while (!found && attempts < maxAttempts) {
                try {
                  attempts++;
                  let allWebhooks = [];
                  let pageToken = null;
                  do {
                    const params = {
                      organization: orgUri,
                      user: userUri,
                      scope: "user"
                    };
                    if (pageToken) {
                      params.page_token = pageToken;
                    }
                    const existingWebhooksResponse = await axios8.get(
                      "https://api.calendly.com/webhook_subscriptions",
                      {
                        params,
                        headers: {
                          Authorization: `Bearer ${token}`
                        }
                      }
                    );
                    const webhooks = existingWebhooksResponse.data?.collection || [];
                    allWebhooks = allWebhooks.concat(webhooks);
                    pageToken = existingWebhooksResponse.data?.pagination?.next_page_token || null;
                  } while (pageToken);
                  const normalizeUrl = (url) => url.trim().toLowerCase().replace(/\/$/, "");
                  const normalizedWebhookUrl = normalizeUrl(webhookUrl);
                  let existingWebhook = allWebhooks.find((w) => {
                    const hookUrl = w.callback_url || w.url;
                    if (!hookUrl) return false;
                    return normalizeUrl(hookUrl) === normalizedWebhookUrl;
                  });
                  if (!existingWebhook) {
                    const urlPath = new URL(webhookUrl).pathname;
                    existingWebhook = allWebhooks.find((w) => {
                      const hookUrl = w.callback_url || w.url;
                      if (!hookUrl) return false;
                      try {
                        return new URL(hookUrl).pathname === urlPath;
                      } catch {
                        return false;
                      }
                    });
                  }
                  if (!existingWebhook) {
                    const baseUrl = webhookUrl.split("?")[0];
                    existingWebhook = allWebhooks.find((w) => {
                      const hookUrl = w.callback_url || w.url;
                      if (!hookUrl) return false;
                      return hookUrl.split("?")[0] === baseUrl;
                    });
                  }
                  if (existingWebhook) {
                    webhookId = existingWebhook.uuid || (existingWebhook.uri ? existingWebhook.uri.split("/").pop() : null);
                    found = true;
                  } else {
                    if (attempts < maxAttempts) {
                      await new Promise((resolve) => setTimeout(resolve, 1e3 * attempts));
                    }
                  }
                } catch (retryError) {
                  if (attempts < maxAttempts) {
                    await new Promise((resolve) => setTimeout(resolve, 1e3 * attempts));
                  }
                }
              }
              if (!found) {
                return res.status(500).json({
                  message: "Webhook exists but could not be found. Please delete the existing webhook in Calendly first, then reconnect.",
                  error: "Could not locate webhook ID after multiple attempts",
                  webhookUrl
                });
              }
            } else {
              const errorDetails = error.response?.data?.details || [];
              console.error("[Calendly Connect] Webhook creation failed:", {
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                details: JSON.stringify(errorDetails, null, 2),
                message: error.message,
                webhookUrl,
                payload: webhookPayload
              });
              return res.status(500).json({
                message: "Failed to create webhook. Please try again.",
                error: error.response?.data || error.message,
                details: errorDetails
              });
            }
          }
        }
        await storage.updateUser(userId, {
          calendlyToken: token,
          // Store token (in production, encrypt this!)
          calendlyWebhookId: webhookId,
          calendarProvider: "calendly"
        });
        const accountId = await storage.getUserAccountId(userId);
        if (!accountId) {
          return res.status(400).json({ message: "User is not associated with any account" });
        }
        await storage.createActivityLog({
          accountId,
          userId,
          action: "Connected Calendly",
          entityType: "user",
          entityId: userId,
          details: {
            calendlyUserUri: userUri,
            webhookId
          },
          timestamp: /* @__PURE__ */ new Date()
        });
        res.json({
          message: "Calendly connected successfully",
          webhookId,
          webhookUrl,
          calendlyUser: {
            name: userInfo.name,
            email: userInfo.email,
            uri: userUri
          }
        });
      } catch (error) {
        console.error("[Calendly Connect] Error:", error);
        handleApiError(error, res);
      }
    }
  );
  app2.post("/api/calendly/disconnect", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      if (user.calendlyToken && user.calendlyWebhookId) {
        try {
          await axios8.delete(
            `https://api.calendly.com/webhook_subscriptions/${user.calendlyWebhookId}`,
            {
              headers: {
                Authorization: `Bearer ${user.calendlyToken}`
              }
            }
          );
        } catch (error) {
        }
      }
      await storage.updateUser(userId, {
        calendlyToken: null,
        calendlyWebhookId: null,
        calendarProvider: null
      });
      const accountId = await storage.getUserAccountId(userId);
      if (!accountId) {
        return res.status(400).json({ message: "User is not associated with any account" });
      }
      await storage.createActivityLog({
        accountId,
        userId,
        action: "Disconnected Calendly",
        entityType: "user",
        entityId: userId,
        details: {},
        timestamp: /* @__PURE__ */ new Date()
      });
      res.json({ message: "Calendly disconnected successfully" });
    } catch (error) {
      console.error("[Calendly Disconnect] Error:", error);
      handleApiError(error, res);
    }
  });
  app2.get("/api/calendly/status", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const isConnected = !!user.calendlyToken;
      const webhookUrl = isConnected ? `${req.protocol}://${req.get("host")}/api/webhooks/calendar?provider=calendly&userId=${userId}` : null;
      res.json({
        connected: isConnected,
        webhookId: user.calendlyWebhookId || null,
        webhookUrl,
        calendarProvider: user.calendarProvider || null
      });
    } catch (error) {
      handleApiError(error, res);
    }
  });
}

// server/api/ai-routes.ts
init_storage();
init_utils();
init_resume_parser();
init_ai_matching();
init_db();
init_schema();
import { eq as eq7 } from "drizzle-orm";
function setupAIRoutes(app2) {
  app2.post("/api/ai/parse-resume", async (req, res) => {
    try {
      if (!isAuthorized(req)) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const { resumeUrl, candidateId } = req.body;
      if (!resumeUrl) {
        return res.status(400).json({ message: "resumeUrl is required" });
      }
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      if (!user.openRouterApiKey) {
        return res.status(400).json({
          message: "OpenRouter API key not configured. Please add your API key in Settings."
        });
      }
      const parsedData = await parseResume(resumeUrl, user.openRouterApiKey);
      if (candidateId) {
        const candidate = await storage.getCandidate(candidateId);
        if (!candidate) {
          return res.status(404).json({ message: "Candidate not found" });
        }
        const updates = {
          parsedResumeData: parsedData
        };
        if (parsedData.phone && !candidate.phone) {
          updates.phone = parsedData.phone;
        }
        if (parsedData.location && !candidate.location) {
          updates.location = parsedData.location;
        }
        if (parsedData.skills && parsedData.skills.length > 0) {
          const existingSkills = Array.isArray(candidate.skills) ? candidate.skills : [];
          const skillsSet = /* @__PURE__ */ new Set([...existingSkills, ...parsedData.skills]);
          updates.skills = Array.from(skillsSet);
        }
        if (parsedData.experienceYears && !candidate.experienceYears) {
          updates.experienceYears = parsedData.experienceYears;
        }
        await storage.updateCandidate(candidateId, updates);
        if (candidate.jobId) {
          try {
            const job = await storage.getJob(candidate.jobId);
            if (job) {
              const updatedCandidate = await storage.getCandidate(candidateId);
              const matchResult = await calculateMatchScore(
                {
                  name: updatedCandidate.name,
                  skills: updatedCandidate.skills,
                  experienceYears: updatedCandidate.experienceYears,
                  parsedResumeData: parsedData,
                  applicationData: updatedCandidate.applicationData
                },
                {
                  title: job.title,
                  skills: job.skills,
                  type: job.type,
                  department: job.department,
                  description: job.description
                },
                user.openRouterApiKey
              );
              await storage.updateCandidate(candidateId, { matchScore: matchResult.score });
            }
          } catch (matchError) {
            console.error("Error auto-calculating match score:", matchError);
          }
        }
      }
      res.json({
        success: true,
        data: parsedData,
        message: candidateId ? "Resume parsed and candidate updated" : "Resume parsed successfully"
      });
    } catch (error) {
      handleApiError(error, res);
    }
  });
  app2.post("/api/ai/match", async (req, res) => {
    try {
      if (!isAuthorized(req)) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const { candidateId, jobId } = req.body;
      if (!candidateId || !jobId) {
        return res.status(400).json({ message: "candidateId and jobId are required" });
      }
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      if (!user.openRouterApiKey) {
        return res.status(400).json({
          message: "OpenRouter API key not configured. Please add your API key in Settings."
        });
      }
      const candidate = await storage.getCandidate(candidateId);
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }
      const job = await storage.getJob(jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      const candidateData = {
        name: candidate.name,
        skills: candidate.skills,
        experienceYears: candidate.experienceYears,
        parsedResumeData: candidate.parsedResumeData,
        applicationData: candidate.applicationData
      };
      const jobRequirements = {
        title: job.title,
        skills: job.skills,
        type: job.type,
        department: job.department,
        description: job.description
      };
      const matchResult = await calculateMatchScore(
        candidateData,
        jobRequirements,
        user.openRouterApiKey
      );
      await storage.updateCandidate(candidateId, {
        matchScore: matchResult.score
      });
      res.json({
        success: true,
        data: matchResult
      });
    } catch (error) {
      handleApiError(error, res);
    }
  });
  app2.post("/api/ai/match-job/:jobId", async (req, res) => {
    try {
      if (!isAuthorized(req)) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const jobId = parseInt(req.params.jobId);
      if (isNaN(jobId)) {
        return res.status(400).json({ message: "Invalid job ID" });
      }
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      if (!user.openRouterApiKey) {
        return res.status(400).json({
          message: "OpenRouter API key not configured. Please add your API key in Settings."
        });
      }
      const apiKey = user.openRouterApiKey;
      const job = await storage.getJob(jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      const candidatesList = await db.select().from(candidates).where(eq7(candidates.jobId, jobId));
      const jobRequirements = {
        title: job.title,
        skills: job.skills,
        type: job.type,
        department: job.department,
        description: job.description
      };
      const results = await Promise.allSettled(
        candidatesList.map(async (candidate) => {
          const candidateData = {
            name: candidate.name,
            skills: candidate.skills,
            experienceYears: candidate.experienceYears,
            parsedResumeData: candidate.parsedResumeData,
            applicationData: candidate.applicationData
          };
          const matchResult = await calculateMatchScore(
            candidateData,
            jobRequirements,
            apiKey
          );
          await storage.updateCandidate(candidate.id, {
            matchScore: matchResult.score
          });
          return {
            candidateId: candidate.id,
            candidateName: candidate.name,
            matchResult
          };
        })
      );
      const successful = results.filter((r) => r.status === "fulfilled").map((r) => r.value);
      const failed = results.filter((r) => r.status === "rejected").map((r) => r.reason);
      res.json({
        success: true,
        processed: successful.length,
        failed: failed.length,
        results: successful,
        errors: failed.length > 0 ? failed.map((e) => e.message || String(e)) : void 0
      });
    } catch (error) {
      handleApiError(error, res);
    }
  });
}

// server/routes.ts
init_gmail_integration();

// server/api/comments.ts
init_storage();
init_utils();
import { z as z13 } from "zod";
var createCommentSchema = z13.object({
  entityType: z13.enum(["candidate", "job"]),
  entityId: z13.number().int().positive(),
  content: z13.string().min(1).max(5e3),
  mentions: z13.array(z13.number().int().positive()).optional()
});
function setupCommentRoutes(app2) {
  app2.get("/api/comments", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const { entityType, entityId } = req.query;
      if (!entityType || !entityId) {
        return res.status(400).json({ message: "entityType and entityId are required" });
      }
      if (entityType !== "candidate" && entityType !== "job") {
        return res.status(400).json({ message: "entityType must be 'candidate' or 'job'" });
      }
      const accountId = await storage.getUserAccountId(req.user.id);
      if (!accountId) {
        return res.status(400).json({ message: "User is not associated with any account" });
      }
      const comments2 = await storage.getComments(
        entityType,
        parseInt(entityId),
        accountId
      );
      res.json(comments2);
    } catch (error) {
      handleApiError(error, res);
    }
  });
  app2.post("/api/comments", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const validationResult = createCommentSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          message: "Validation error",
          errors: validationResult.error.errors
        });
      }
      const accountId = await storage.getUserAccountId(req.user.id);
      if (!accountId) {
        return res.status(400).json({ message: "User is not associated with any account" });
      }
      const userId = req.user.id;
      const data = validationResult.data;
      let mentions = data.mentions || [];
      if (!mentions.length && data.content.includes("@")) {
        const mentionRegex = /@(\w+)/g;
        const matches = data.content.match(mentionRegex);
        if (matches) {
          const allUsers = await storage.getUsersForMentionAutocomplete(accountId);
          const mentionedUsernames = matches.map((m) => m.substring(1).toLowerCase());
          mentions = allUsers.filter(
            (u) => mentionedUsernames.some(
              (username) => u.username?.toLowerCase() === username || u.fullName?.toLowerCase().includes(username) || u.email?.toLowerCase().includes(username)
            )
          ).map((u) => u.id);
        }
      }
      const comment = await storage.createComment({
        accountId,
        userId,
        entityType: data.entityType,
        entityId: data.entityId,
        content: data.content,
        mentions: mentions.length > 0 ? mentions : null
      });
      const comments2 = await storage.getComments(data.entityType, data.entityId, accountId);
      const newComment = comments2.find((c) => c.id === comment.id);
      res.status(201).json(newComment || comment);
    } catch (error) {
      handleApiError(error, res);
    }
  });
  app2.delete("/api/comments/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const accountId = await storage.getUserAccountId(req.user.id);
      if (!accountId) {
        return res.status(400).json({ message: "User is not associated with any account" });
      }
      const { id } = req.params;
      const userId = req.user.id;
      await storage.deleteComment(parseInt(id), accountId, userId);
      res.status(204).send();
    } catch (error) {
      handleApiError(error, res);
    }
  });
  app2.get("/api/users/mention-autocomplete", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const accountId = await storage.getUserAccountId(req.user.id);
      if (!accountId) {
        return res.status(400).json({ message: "User is not associated with any account" });
      }
      const { q } = req.query;
      const users2 = await storage.getUsersForMentionAutocomplete(accountId, q);
      res.json(users2);
    } catch (error) {
      handleApiError(error, res);
    }
  });
}

// server/routes.ts
init_notifications();

// server/api/workflows.ts
init_storage();
init_utils();
init_db();
init_schema();
init_workflow_engine();
import { z as z14 } from "zod";
import { eq as eq8, and as and6 } from "drizzle-orm";
var createWorkflowSchema = z14.object({
  name: z14.string().min(1, "Workflow name is required"),
  description: z14.string().optional(),
  isActive: z14.boolean().default(true),
  triggerType: z14.enum([
    "candidate_status_change",
    "interview_scheduled",
    "interview_completed",
    "manual",
    "scheduled"
  ]),
  triggerConfig: z14.record(z14.any()).optional(),
  steps: z14.array(
    z14.object({
      type: z14.string(),
      config: z14.record(z14.any()),
      conditions: z14.array(z14.any()).optional()
    })
  ).min(1, "Workflow must have at least one step")
});
var updateWorkflowSchema = createWorkflowSchema.partial();
function setupWorkflowRoutes(app2) {
  app2.get("/api/workflows/email-templates", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const user = await storage.getUser(req.user.id);
      const userTemplates = user?.emailTemplates || {};
      const defaultTemplates = {
        welcome: {
          subject: "Welcome to {{companyName}}",
          body: "<p>Hi {{candidate.name}},</p><p>Welcome! We're excited to have you on board.</p><p>Best regards,<br>{{user.fullName}}</p>"
        },
        interview_confirmation: {
          subject: "Interview Scheduled - {{job.title}}",
          body: "<p>Hi {{candidate.name}},</p><p>Your interview for {{job.title}} has been scheduled for {{interview.scheduledDate}}.</p><p>Looking forward to meeting you!</p><p>Best regards,<br>{{user.fullName}}</p>"
        },
        rejection: {
          subject: "Update on Your Application - {{job.title}}",
          body: "<p>Hi {{candidate.name}},</p><p>Thank you for your interest in {{job.title}}. Unfortunately, we've decided to move forward with other candidates.</p><p>We wish you the best in your job search.</p><p>Best regards,<br>{{user.fullName}}</p>"
        },
        offer: {
          subject: "Job Offer - {{job.title}}",
          body: "<p>Hi {{candidate.name}},</p><p>We're excited to offer you the {{job.title}} position!</p><p>Please review the details and let us know if you have any questions.</p><p>Best regards,<br>{{user.fullName}}</p>"
        }
      };
      const allTemplates = { ...defaultTemplates, ...userTemplates };
      const templateList = Object.keys(allTemplates).map((key) => {
        const template = allTemplates[key];
        return {
          id: key,
          name: key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
          subject: template.subject || "",
          body: template.body || ""
        };
      });
      res.json(templateList);
    } catch (error) {
      handleApiError(error, res);
    }
  });
  app2.get("/api/workflows/actions", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      try {
        const actions = WorkflowActionLibrary.getAvailableActions();
        res.json(actions);
      } catch (error) {
        console.error("[Workflows API] Error getting available actions:", error);
        res.status(500).json({ message: error.message || "Failed to get available actions" });
      }
    } catch (error) {
      handleApiError(error, res);
    }
  });
  app2.get("/api/workflows/templates", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const templates = [
        {
          id: "new_application",
          name: "New Application Received",
          description: "Automatically handle new candidate applications",
          triggerType: "candidate_status_change",
          triggerConfig: {
            fromStatus: null,
            toStatus: "new"
          },
          steps: [
            {
              type: "send_email",
              config: {
                template: "welcome",
                to: "{{candidate.email}}",
                subject: "Thank you for your application"
              }
            },
            {
              type: "notify_slack",
              config: {
                channel: "#hiring",
                message: "New application: {{candidate.name}} for {{job.title}}"
              }
            }
          ]
        },
        {
          id: "interview_scheduled",
          name: "Interview Scheduled",
          description: "Notify team and candidate when interview is scheduled",
          triggerType: "interview_scheduled",
          triggerConfig: {},
          steps: [
            {
              type: "send_email",
              config: {
                template: "interview_confirmation",
                to: "{{candidate.email}}",
                subject: "Interview Scheduled - {{job.title}}"
              }
            },
            {
              type: "notify_slack",
              config: {
                channel: "#hiring",
                message: "Interview scheduled: {{candidate.name}} on {{interview.scheduledDate}}"
              }
            }
          ]
        },
        {
          id: "assessment_completed",
          name: "Assessment Completed",
          description: "Auto-advance or reject based on assessment score",
          triggerType: "candidate_status_change",
          triggerConfig: {
            fromStatus: "assessment_sent",
            toStatus: "assessment_completed"
          },
          steps: [
            {
              type: "condition",
              config: {
                condition: "{{candidate.hiPeopleScore}} >= 80"
              },
              thenSteps: [
                {
                  type: "update_status",
                  config: {
                    status: "interview_scheduled"
                  }
                }
              ],
              elseSteps: [
                {
                  type: "send_email",
                  config: {
                    template: "rejection",
                    to: "{{candidate.email}}"
                  }
                },
                {
                  type: "update_status",
                  config: {
                    status: "rejected"
                  }
                }
              ]
            }
          ]
        }
      ];
      res.json(templates);
    } catch (error) {
      handleApiError(error, res);
    }
  });
  app2.get("/api/workflows", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const accountId = await storage.getUserAccountId(req.user.id);
      if (!accountId) {
        return res.status(400).json({ message: "User is not associated with any account" });
      }
      const workflowsList = await storage.getWorkflows(accountId);
      res.json(workflowsList);
    } catch (error) {
      handleApiError(error, res);
    }
  });
  app2.get("/api/workflows/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const accountId = await storage.getUserAccountId(req.user.id);
      if (!accountId) {
        return res.status(400).json({ message: "User is not associated with any account" });
      }
      const workflowId = parseInt(req.params.id);
      if (isNaN(workflowId)) {
        return res.status(400).json({ message: "Invalid workflow ID" });
      }
      const workflow = await storage.getWorkflow(workflowId, accountId);
      if (!workflow) {
        return res.status(404).json({ message: "Workflow not found" });
      }
      res.json(workflow);
    } catch (error) {
      handleApiError(error, res);
    }
  });
  app2.post("/api/workflows", validateRequest(createWorkflowSchema), async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const accountId = await storage.getUserAccountId(req.user.id);
      if (!accountId) {
        return res.status(400).json({ message: "User is not associated with any account" });
      }
      const workflow = await storage.createWorkflow({
        accountId,
        name: req.body.name,
        description: req.body.description,
        isActive: req.body.isActive ?? true,
        triggerType: req.body.triggerType,
        triggerConfig: req.body.triggerConfig || {},
        steps: req.body.steps,
        createdById: req.user.id
      });
      res.status(201).json(workflow);
    } catch (error) {
      handleApiError(error, res);
    }
  });
  app2.patch("/api/workflows/:id", validateRequest(updateWorkflowSchema), async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const accountId = await storage.getUserAccountId(req.user.id);
      if (!accountId) {
        return res.status(400).json({ message: "User is not associated with any account" });
      }
      const workflowId = parseInt(req.params.id);
      if (isNaN(workflowId)) {
        return res.status(400).json({ message: "Invalid workflow ID" });
      }
      const workflow = await storage.updateWorkflow(workflowId, accountId, req.body);
      res.json(workflow);
    } catch (error) {
      handleApiError(error, res);
    }
  });
  app2.delete("/api/workflows/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const accountId = await storage.getUserAccountId(req.user.id);
      if (!accountId) {
        return res.status(400).json({ message: "User is not associated with any account" });
      }
      const workflowId = parseInt(req.params.id);
      if (isNaN(workflowId)) {
        return res.status(400).json({ message: "Invalid workflow ID" });
      }
      await storage.deleteWorkflow(workflowId, accountId);
      res.json({ message: "Workflow deleted successfully" });
    } catch (error) {
      handleApiError(error, res);
    }
  });
  app2.post("/api/workflows/:id/trigger", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const accountId = await storage.getUserAccountId(req.user.id);
      if (!accountId) {
        return res.status(400).json({ message: "User is not associated with any account" });
      }
      const workflowId = parseInt(req.params.id);
      if (isNaN(workflowId)) {
        return res.status(400).json({ message: "Invalid workflow ID" });
      }
      const workflow = await storage.getWorkflow(workflowId, accountId);
      if (!workflow) {
        return res.status(404).json({ message: "Workflow not found" });
      }
      if (!workflow.isActive) {
        return res.status(400).json({ message: "Workflow is not active" });
      }
      const executionData = req.body.executionData || {};
      executeWorkflow(workflow, accountId, executionData).catch((error) => {
        console.error(`[Workflow ${workflowId}] Execution error:`, error);
      });
      res.json({ message: "Workflow triggered successfully" });
    } catch (error) {
      handleApiError(error, res);
    }
  });
  app2.get("/api/workflows/:id/executions", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const accountId = await storage.getUserAccountId(req.user.id);
      if (!accountId) {
        return res.status(400).json({ message: "User is not associated with any account" });
      }
      const workflowId = parseInt(req.params.id);
      if (isNaN(workflowId)) {
        return res.status(400).json({ message: "Invalid workflow ID" });
      }
      const limit = req.query.limit ? parseInt(req.query.limit) : 50;
      const executions = await storage.getWorkflowExecutions(workflowId, accountId, limit);
      res.json(executions);
    } catch (error) {
      handleApiError(error, res);
    }
  });
  app2.get("/api/workflow-executions/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const accountId = await storage.getUserAccountId(req.user.id);
      if (!accountId) {
        return res.status(400).json({ message: "User is not associated with any account" });
      }
      const executionId = parseInt(req.params.id);
      if (isNaN(executionId)) {
        return res.status(400).json({ message: "Invalid execution ID" });
      }
      const [execution] = await db.select().from(workflowExecutions).where(and6(eq8(workflowExecutions.id, executionId), eq8(workflowExecutions.accountId, accountId)));
      if (!execution) {
        return res.status(404).json({ message: "Execution not found" });
      }
      const steps = await storage.getWorkflowExecutionSteps(executionId);
      res.json({ ...execution, steps });
    } catch (error) {
      handleApiError(error, res);
    }
  });
  app2.post("/api/workflows/:id/test", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const accountId = await storage.getUserAccountId(req.user.id);
      if (!accountId) {
        return res.status(400).json({ message: "User is not associated with any account" });
      }
      const workflowId = parseInt(req.params.id);
      if (isNaN(workflowId)) {
        return res.status(400).json({ message: "Invalid workflow ID" });
      }
      const workflow = await storage.getWorkflow(workflowId, accountId);
      if (!workflow) {
        return res.status(404).json({ message: "Workflow not found" });
      }
      const testData = req.body.testData || {};
      const isTestMode = req.body.isTestMode !== false;
      let executionData = {
        entityType: workflow.triggerType === "manual" ? "manual" : testData.entityType || "test",
        entityId: testData.entityId || null,
        user: req.user
      };
      if (workflow.triggerType === "candidate_status_change") {
        if (testData.candidateId) {
          const candidate = await storage.getCandidate(testData.candidateId, accountId);
          if (candidate) {
            executionData.candidate = candidate;
          } else {
            executionData.candidate = {
              id: testData.candidateId,
              name: testData.candidateName || "Test Candidate",
              email: testData.candidateEmail || "test@example.com",
              status: testData.fromStatus || "new"
            };
          }
        } else {
          executionData.candidate = testData.candidate || {
            id: testData.candidateId || 1,
            name: testData.candidateName || "Test Candidate",
            email: testData.candidateEmail || "test@example.com",
            status: testData.fromStatus || "new"
          };
        }
        if (!executionData.candidate.email) {
          executionData.candidate.email = testData.candidateEmail || "test@example.com";
        }
        executionData.job = testData.job || (testData.jobId ? await storage.getJob(testData.jobId, accountId) : null);
        executionData.fromStatus = testData.fromStatus || "new";
        executionData.toStatus = testData.toStatus || "interview_scheduled";
      } else if (workflow.triggerType === "interview_scheduled") {
        executionData.interview = testData.interview || {
          id: testData.interviewId || 1,
          scheduledDate: testData.scheduledDate || /* @__PURE__ */ new Date(),
          candidateId: testData.candidateId || 1
        };
        executionData.candidate = testData.candidate || (testData.candidateId ? await storage.getCandidate(testData.candidateId, accountId) : {
          id: testData.candidateId || 1,
          name: testData.candidateName || "Test Candidate",
          email: testData.candidateEmail || "test@example.com"
        });
        executionData.job = testData.job || (testData.jobId ? await storage.getJob(testData.jobId, accountId) : null);
      } else if (workflow.triggerType === "interview_completed") {
        executionData.interview = testData.interview || {
          id: testData.interviewId || 1,
          scheduledDate: testData.scheduledDate || /* @__PURE__ */ new Date(),
          conductedDate: testData.conductedDate || /* @__PURE__ */ new Date(),
          candidateId: testData.candidateId || 1,
          status: "completed"
        };
        executionData.candidate = testData.candidate || (testData.candidateId ? await storage.getCandidate(testData.candidateId, accountId) : {
          id: testData.candidateId || 1,
          name: testData.candidateName || "Test Candidate",
          email: testData.candidateEmail || "test@example.com"
        });
        executionData.job = testData.job || (testData.jobId ? await storage.getJob(testData.jobId, accountId) : null);
      } else if (workflow.triggerType === "manual") {
        let candidate = testData.candidate;
        if (!candidate) {
          if (testData.candidateId) {
            candidate = await storage.getCandidate(testData.candidateId, accountId);
          }
          if (!candidate && (testData.candidateName || testData.candidateEmail)) {
            candidate = {
              id: testData.candidateId || 1,
              name: testData.candidateName || "Test Candidate",
              email: testData.candidateEmail || "test@example.com"
            };
          }
        } else if (!candidate.email && testData.candidateEmail) {
          candidate.email = testData.candidateEmail;
        }
        executionData = {
          ...executionData,
          ...testData,
          candidate,
          job: testData.job || (testData.jobId ? await storage.getJob(testData.jobId, accountId) || null : null),
          interview: testData.interview || (testData.interviewId ? await storage.getInterview(testData.interviewId, accountId) || null : null)
        };
      }
      const execution = await executeWorkflow(workflow, accountId, executionData);
      const steps = await storage.getWorkflowExecutionSteps(execution.id);
      res.json({
        execution,
        steps,
        success: execution.status === "completed"
      });
    } catch (error) {
      handleApiError(error, res);
    }
  });
  app2.get("/api/workflows/:id/last-execution", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const accountId = await storage.getUserAccountId(req.user.id);
      if (!accountId) {
        return res.status(400).json({ message: "User is not associated with any account" });
      }
      const workflowId = parseInt(req.params.id);
      if (isNaN(workflowId)) {
        return res.status(400).json({ message: "Invalid workflow ID" });
      }
      const executions = await storage.getWorkflowExecutions(workflowId, accountId, 1);
      if (executions.length === 0) {
        return res.status(404).json({ message: "No previous executions found" });
      }
      const lastExecution = executions[0];
      const steps = await storage.getWorkflowExecutionSteps(lastExecution.id);
      res.json({
        execution: lastExecution,
        steps,
        executionData: lastExecution.executionData
      });
    } catch (error) {
      handleApiError(error, res);
    }
  });
}

// server/security/csrf.ts
import csrf from "csrf";
import "express-session";
var tokens = new csrf();
var csrfSecret = process.env.CSRF_SECRET || process.env.SESSION_SECRET || "csrf-secret-change-in-production";
function generateCsrfToken(req) {
  const secret = req.session?.csrfSecret || csrfSecret;
  return tokens.create(secret);
}
function verifyCsrfToken(req, token) {
  const secret = req.session?.csrfSecret || csrfSecret;
  return tokens.verify(secret, token);
}
function csrfProtection(req, res, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }
  const publicEndpoints = [
    "/api/upload/resume",
    // Public application form
    "/api/offers/:token"
    // Public offer acceptance
  ];
  const isPublicEndpoint = publicEndpoints.some((endpoint) => {
    const pattern = endpoint.replace(/:[^/]+/g, "[^/]+");
    const regex = new RegExp(`^${pattern}$`);
    return regex.test(req.path);
  });
  if (isPublicEndpoint) {
    return next();
  }
  const token = req.headers["x-csrf-token"] || req.body?._csrf || req.query?._csrf;
  if (!token) {
    return res.status(403).json({
      error: "CSRF token missing",
      message: "CSRF token is required for this request"
    });
  }
  if (!verifyCsrfToken(req, token)) {
    return res.status(403).json({
      error: "Invalid CSRF token",
      message: "CSRF token validation failed"
    });
  }
  next();
}
function csrfTokenMiddleware(req, res, next) {
  if (!req.session?.csrfSecret) {
    if (!req.session) {
      req.session = {};
    }
    req.session.csrfSecret = csrfSecret;
  }
  const token = generateCsrfToken(req);
  res.locals.csrfToken = token;
  res.setHeader("X-CSRF-Token", token);
  next();
}

// server/routes.ts
async function registerRoutes(app2) {
  setupAuth(app2);
  if (process.env.ENABLE_CSRF === "true") {
    app2.use("/api", csrfProtection);
  }
  setupJobRoutes(app2);
  setupCandidateRoutes(app2);
  setupInterviewRoutes(app2);
  setupAnalyticsRoutes(app2);
  setupHiPeopleRoutes(app2);
  setupUserRoutes(app2);
  setupGHLSyncRoutes(app2);
  setupCRMSyncRoutes(app2);
  setupGHLAutomationRoutes(app2);
  setupPlatformIntegrationRoutes(app2);
  setupCRMIntegrationRoutes(app2);
  setupFormTemplateRoutes(app2);
  setupApplicationRoutes(app2);
  setupStorageRoutes(app2);
  setupCalendarWebhookRoutes(app2);
  setupCalendlyConnectRoutes(app2);
  setupAIRoutes(app2);
  setupGmailIntegrationRoutes(app2);
  setupGoogleCalendarRoutes(app2);
  setupCommentRoutes(app2);
  setupNotificationRoutes(app2);
  setupWorkflowRoutes(app2);
  const httpServer = createServer(app2);
  return httpServer;
}

// server/utils.ts
import express from "express";
import fs from "fs";
import path from "path";
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
function serveStatic(app2) {
  const distPath = path.resolve(import.meta.dirname, "..", "dist", "public");
  if (!fs.existsSync(distPath)) {
    const fallbackPath = path.resolve(import.meta.dirname, "public");
    if (fs.existsSync(fallbackPath)) {
      app2.use(express.static(fallbackPath));
      app2.use("*", (_req, res) => {
        res.sendFile(path.resolve(fallbackPath, "index.html"));
      });
      return;
    }
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}

// server/index.ts
import axios9 from "axios";

// server/background-sync.ts
init_storage();
var BackgroundSyncService = class {
  syncInterval = null;
  isRunning = false;
  syncIntervalMs = 5 * 60 * 1e3;
  // Default: 5 minutes
  /**
   * Start the background sync service
   * @param intervalMs How often to check for changes (in milliseconds). Default: 5 minutes
   */
  start(intervalMs = 5 * 60 * 1e3) {
    if (this.syncInterval) {
      this.stop();
    }
    this.syncIntervalMs = intervalMs;
    this.syncInterval = setInterval(() => {
      this.runSync();
    }, intervalMs);
    this.runSync();
  }
  /**
   * Stop the background sync service
   */
  stop() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.isRunning = false;
  }
  /**
   * Run sync for all users with two-way sync enabled
   */
  async runSync() {
    if (this.isRunning) {
      return;
    }
    this.isRunning = true;
    try {
      const users2 = await storage.getAllUsers();
      for (const user of users2) {
        try {
          const integrations = await storage.getCRMIntegrations(user.id);
          for (const integration of integrations) {
            if (integration.isEnabled && integration.status === "connected" && integration.syncDirection === "two-way") {
              try {
                if (integration.platformId === "google-sheets") {
                  const result = await executeGoogleSheetsSync(user.id, void 0, true);
                  if (result.errors.length > 0) {
                    console.error(`[Background Sync] ${integration.platformName} error:`, result.errors[0]);
                  }
                } else if (integration.platformId === "airtable") {
                  const result = await executeAirtableSync(user.id, void 0, true);
                  if (result.errors.length > 0) {
                    console.error(`[Background Sync] ${integration.platformName} error:`, result.errors[0]);
                  }
                }
              } catch (error) {
                console.error(`[Background Sync] ${integration.platformName} sync failed:`, error.message);
              }
            }
          }
        } catch (error) {
        }
      }
    } catch (error) {
    } finally {
      this.isRunning = false;
    }
  }
  /**
   * Manually trigger a sync (useful for testing)
   */
  async triggerSync() {
    await this.runSync();
  }
};
var backgroundSyncService = new BackgroundSyncService();

// server/index.ts
import helmet from "helmet";
dns2.setDefaultResultOrder("ipv4first");
if (process.env.NODE_ENV !== "production" && !process.env.NODE_TLS_REJECT_UNAUTHORIZED) {
  console.warn("\u26A0\uFE0F  WARNING: TLS certificate validation disabled in development mode only");
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
} else if (process.env.NODE_ENV === "production") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "1";
  console.log("\u2705 TLS certificate validation enabled for production");
}
var app = express2();
app.set("trust proxy", 1);
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === "production" ? {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      // Allow inline styles for UI components
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https:"]
    }
  } : false,
  // Disable strict CSP in development
  hsts: {
    maxAge: 31536e3,
    // 1 year
    includeSubDomains: true,
    preload: true
  }
}));
app.use("/api", apiRateLimiter);
app.use(express2.json({ limit: "1mb" }));
app.use(express2.urlencoded({ extended: false, limit: "1mb" }));
if (process.env.ENABLE_CSRF === "true") {
  app.use(csrfTokenMiddleware);
}
app.use((req, res, next) => {
  const start = Date.now();
  const path2 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path2.startsWith("/api")) {
      const sanitizedResponse = capturedJsonResponse ? sanitizeForLogging(capturedJsonResponse) : void 0;
      let logLine = `${req.method} ${path2} ${res.statusCode} in ${duration}ms`;
      if (sanitizedResponse) {
        const responseStr = JSON.stringify(sanitizedResponse);
        if (responseStr.length > 200) {
          logLine += ` :: ${responseStr.slice(0, 199)}\u2026`;
        } else {
          logLine += ` :: ${responseStr}`;
        }
      }
      if (res.statusCode >= 400) {
        SecureLogger.error(`API ${req.method} ${path2}`, { status: res.statusCode, duration });
      } else {
        SecureLogger.debug(`API ${req.method} ${path2}`, { status: res.statusCode, duration });
      }
    }
  });
  next();
});
app.post("/send-message", async (req, res) => {
  const { message } = req.body;
  if (!process.env.SLACK_WEBHOOK) {
    return res.status(500).json({ success: false, error: "Slack webhook not configured" });
  }
  try {
    await axios9.post(process.env.SLACK_WEBHOOK, {
      text: message
    });
    res.status(200).json({ success: true });
  } catch (error) {
    SecureLogger.error("Error sending message to Slack", { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: "Failed to send message to Slack" });
  }
});
var appInitialized = false;
var initApp = async () => {
  if (appInitialized) return;
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = process.env.NODE_ENV === "production" ? status >= 500 ? "Internal Server Error" : err.message || "An error occurred" : err.message || "Internal Server Error";
    SecureLogger.error("Unhandled error", {
      status,
      path: _req.path,
      method: _req.method,
      error: err.message
    });
    res.status(status).json({ message });
  });
  if (process.env.VERCEL !== "1") {
    if (app.get("env") === "development") {
      const viteModule = await eval('import("./vite")');
      await viteModule.setupVite(app, server);
    } else {
      serveStatic(app);
    }
  }
  if (process.env.VERCEL !== "1") {
    const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 5e3;
    server.listen(port, "0.0.0.0", () => {
      log(`serving on port ${port}`);
      const syncInterval = process.env.CRM_SYNC_INTERVAL_MS ? parseInt(process.env.CRM_SYNC_INTERVAL_MS) : 1 * 60 * 1e3;
      backgroundSyncService.start(syncInterval);
      log(`Background sync service started (interval: ${syncInterval / 1e3}s)`);
    });
  }
  appInitialized = true;
};
if (process.env.VERCEL !== "1") {
  initApp();
}
var server_default = app;

// scripts/api-index.ts
var appInitialized2 = false;
var initPromise = null;
async function api_index_default(req, res) {
  if (!appInitialized2) {
    if (!initPromise) {
      initPromise = (async () => {
        try {
          await initApp();
          appInitialized2 = true;
        } catch (error) {
          console.error("Failed to initialize app:", error);
          throw error;
        }
      })();
    }
    try {
      await initPromise;
    } catch (error) {
      res.status(500).json({
        error: "Failed to initialize server",
        message: error instanceof Error ? error.message : String(error)
      });
      return;
    }
  }
  return new Promise((resolve, reject) => {
    server_default(req, res, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve(void 0);
      }
    });
  });
}
export {
  api_index_default as default
};
