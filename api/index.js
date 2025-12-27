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
  activityLogs: () => activityLogs,
  candidates: () => candidates,
  emailLogs: () => emailLogs,
  evaluations: () => evaluations,
  formTemplates: () => formTemplates,
  ghlTokens: () => ghlTokens,
  insertCandidateSchema: () => insertCandidateSchema,
  insertJobSchema: () => insertJobSchema,
  insertUserSchema: () => insertUserSchema,
  interviews: () => interviews,
  jobPlatforms: () => jobPlatforms,
  jobs: () => jobs,
  notificationQueue: () => notificationQueue,
  offers: () => offers,
  platformIntegrations: () => platformIntegrations,
  users: () => users
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
var users, insertUserSchema, jobs, insertJobSchema, jobPlatforms, platformIntegrations, formTemplates, candidates, insertCandidateSchema, interviews, evaluations, offers, activityLogs, emailLogs, notificationQueue, ghlTokens, UserRoles;
var init_schema = __esm({
  "shared/schema.ts"() {
    "use strict";
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
    formTemplates = pgTable("form_templates", {
      id: serial("id").primaryKey(),
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
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull(),
      job: jsonb("job")
      // Virtual field for memory storage - job relation
    });
    insertCandidateSchema = createInsertSchema(candidates).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    interviews = pgTable("interviews", {
      id: serial("id").primaryKey(),
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
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
var dbUrl, isSupabase, pool, db;
var init_db = __esm({
  "server/db.ts"() {
    "use strict";
    init_schema();
    if (!process.env.NODE_TLS_REJECT_UNAUTHORIZED) {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
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
      // Force SSL config for Supabase - rejectUnauthorized: false allows self-signed certs
      // This is required for Supabase's SSL certificates
      ssl: isSupabase ? {
        rejectUnauthorized: false
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

// server/storage.ts
import session from "express-session";
import connectPg from "connect-pg-simple";
import { and, eq, or, isNull } from "drizzle-orm";
var PostgresSessionStore, DatabaseStorage, storage;
var init_storage = __esm({
  "server/storage.ts"() {
    "use strict";
    init_schema();
    init_email_validator();
    init_db();
    PostgresSessionStore = connectPg(session);
    DatabaseStorage = class {
      sessionStore;
      constructor() {
        this.sessionStore = new PostgresSessionStore({
          pool,
          createTableIfMissing: true
        });
      }
      // User operations
      async getUser(id) {
        try {
          const [user] = await db.select().from(users).where(eq(users.id, id));
          return user || void 0;
        } catch (error) {
          console.error("Error getting user by ID:", error);
          return void 0;
        }
      }
      async getUserByUsername(username) {
        try {
          const [user] = await db.select().from(users).where(eq(users.username, username));
          return user || void 0;
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
        const [user] = await db.insert(users).values({ ...insertUser, role, createdAt: /* @__PURE__ */ new Date() }).returning();
        return user;
      }
      async getAllUsers() {
        return await db.select().from(users);
      }
      async updateUser(id, data) {
        const [updatedUser] = await db.update(users).set(data).where(eq(users.id, id)).returning();
        return updatedUser;
      }
      async deleteUser(id) {
        await db.delete(users).where(eq(users.id, id));
      }
      // Job operations
      async createJob(job) {
        const [newJob] = await db.insert(jobs).values({
          ...job,
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
      async getJob(id) {
        const [job] = await db.select().from(jobs).where(eq(jobs.id, id));
        return job || void 0;
      }
      async getJobs(status) {
        if (status && status !== "all") {
          return await db.select().from(jobs).where(eq(jobs.status, status));
        }
        return await db.select().from(jobs);
      }
      async updateJob(id, data) {
        const [updatedJob] = await db.update(jobs).set({
          ...data,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq(jobs.id, id)).returning();
        return updatedJob;
      }
      // Job platform operations
      async createJobPlatform(platform) {
        const [newPlatform] = await db.insert(jobPlatforms).values({
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
      async getJobPlatforms(jobId) {
        return await db.select().from(jobPlatforms).where(eq(jobPlatforms.jobId, jobId));
      }
      // Platform integration operations
      async getPlatformIntegrations(userId) {
        if (userId) {
          return await db.select().from(platformIntegrations).where(
            // User's integrations OR system-wide (user_id IS NULL)
            or(
              eq(platformIntegrations.userId, userId),
              isNull(platformIntegrations.userId)
            )
          ).orderBy(platformIntegrations.platformName);
        }
        return await db.select().from(platformIntegrations).orderBy(platformIntegrations.platformName);
      }
      async getPlatformIntegration(platformId, userId) {
        if (userId) {
          const [integration2] = await db.select().from(platformIntegrations).where(
            and(
              eq(platformIntegrations.platformId, platformId),
              eq(platformIntegrations.userId, userId)
            )
          );
          return integration2 || void 0;
        }
        const [integration] = await db.select().from(platformIntegrations).where(eq(platformIntegrations.platformId, platformId));
        return integration || void 0;
      }
      // Get CRM/ATS integrations for a user
      async getCRMIntegrations(userId) {
        return await db.select().from(platformIntegrations).where(
          and(
            eq(platformIntegrations.userId, userId),
            or(
              eq(platformIntegrations.platformType, "crm"),
              eq(platformIntegrations.platformType, "ats")
            )
          )
        ).orderBy(platformIntegrations.platformName);
      }
      async createPlatformIntegration(integration) {
        const [newIntegration] = await db.insert(platformIntegrations).values({
          ...integration,
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        }).returning();
        return newIntegration;
      }
      async updatePlatformIntegration(platformId, data) {
        const [updatedIntegration] = await db.update(platformIntegrations).set({
          ...data,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq(platformIntegrations.platformId, platformId)).returning();
        return updatedIntegration;
      }
      async deletePlatformIntegration(platformId) {
        await db.delete(platformIntegrations).where(eq(platformIntegrations.platformId, platformId));
      }
      // Form template operations
      async getFormTemplates() {
        return await db.select().from(formTemplates).orderBy(formTemplates.name);
      }
      async getFormTemplate(id) {
        const [template] = await db.select().from(formTemplates).where(eq(formTemplates.id, id));
        return template || void 0;
      }
      async getDefaultFormTemplate() {
        const [template] = await db.select().from(formTemplates).where(eq(formTemplates.isDefault, true)).limit(1);
        return template || void 0;
      }
      async createFormTemplate(template) {
        const [newTemplate] = await db.insert(formTemplates).values({
          ...template,
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        }).returning();
        return newTemplate;
      }
      async updateFormTemplate(id, data) {
        const [updatedTemplate] = await db.update(formTemplates).set({
          ...data,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq(formTemplates.id, id)).returning();
        return updatedTemplate;
      }
      async deleteFormTemplate(id) {
        await db.delete(formTemplates).where(eq(formTemplates.id, id));
      }
      // Candidate operations
      async createCandidate(candidate) {
        const [newCandidate] = await db.insert(candidates).values({
          ...candidate,
          status: candidate.status || "new",
          finalDecisionStatus: null,
          // Explicitly set to null for new candidates
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        }).returning();
        const job = newCandidate.jobId ? await this.getJob(newCandidate.jobId) : null;
        return { ...newCandidate, job: job || null };
      }
      async getCandidate(id) {
        const [candidate] = await db.select().from(candidates).where(eq(candidates.id, id));
        if (!candidate) return void 0;
        const job = candidate.jobId ? await this.getJob(candidate.jobId) : null;
        return { ...candidate, job: job || null };
      }
      async getCandidates(filters) {
        const conditions = [];
        if (filters.jobId !== void 0) {
          conditions.push(eq(candidates.jobId, filters.jobId));
        }
        if (filters.status && filters.status !== "all") {
          conditions.push(eq(candidates.status, filters.status));
        }
        if (filters.hiPeoplePercentile !== void 0) {
        }
        let candidatesList;
        if (conditions.length > 0) {
          candidatesList = await db.select().from(candidates).where(and(...conditions));
        } else {
          candidatesList = await db.select().from(candidates);
        }
        const jobIdsArray = candidatesList.map((c) => c.jobId);
        const uniqueJobIds = jobIdsArray.filter((id, index) => jobIdsArray.indexOf(id) === index && id !== null);
        const jobsMap = /* @__PURE__ */ new Map();
        if (uniqueJobIds.length > 0) {
          const jobsList = await Promise.all(
            uniqueJobIds.map((id) => this.getJob(id))
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
      async getCandidateByNameAndEmail(name, email) {
        try {
          const result = await db.select().from(candidates).where(
            and(
              eq(candidates.name, name),
              eq(candidates.email, email)
            )
          ).limit(1);
          return result[0];
        } catch (error) {
          console.error("Error fetching candidate by name and email:", error);
          return void 0;
        }
      }
      async getCandidateByGHLContactId(ghlContactId) {
        try {
          const result = await db.select().from(candidates).where(eq(candidates.ghlContactId, ghlContactId)).limit(1);
          if (!result[0]) return void 0;
          const job = result[0].jobId ? await this.getJob(result[0].jobId) : null;
          return { ...result[0], job: job || null };
        } catch (error) {
          console.error("Error fetching candidate by GHL contact ID:", error);
          return void 0;
        }
      }
      async updateCandidate(id, data) {
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
        const [updatedCandidate] = await db.update(candidates).set(updateData).where(eq(candidates.id, id)).returning();
        const job = updatedCandidate.jobId ? await this.getJob(updatedCandidate.jobId) : null;
        return { ...updatedCandidate, job: job || null };
      }
      // Interview operations
      async createInterview(interviewData) {
        const [interview] = await db.insert(interviews).values({
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
      async getInterview(id) {
        const [interview] = await db.select().from(interviews).where(eq(interviews.id, id));
        return interview || void 0;
      }
      async getInterviews(filters) {
        try {
          const conditions = [];
          if (filters?.candidateId) {
            conditions.push(eq(interviews.candidateId, filters.candidateId));
          }
          if (filters?.interviewerId) {
            conditions.push(eq(interviews.interviewerId, filters.interviewerId));
          }
          if (filters?.status) {
            conditions.push(eq(interviews.status, filters.status));
          }
          let baseQuery = db.select({
            id: interviews.id,
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
          }).from(interviews).leftJoin(candidates, eq(interviews.candidateId, candidates.id)).leftJoin(users, eq(interviews.interviewerId, users.id));
          if (conditions.length > 0) {
            baseQuery = baseQuery.where(and(...conditions));
          }
          const results = await baseQuery;
          return results.map((row) => ({
            id: row.id,
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
      async updateInterview(id, data) {
        const [updatedInterview] = await db.update(interviews).set({
          ...data,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq(interviews.id, id)).returning();
        return updatedInterview;
      }
      async deleteInterview(id) {
        await db.delete(evaluations).where(eq(evaluations.interviewId, id));
        await db.delete(interviews).where(eq(interviews.id, id));
      }
      // Evaluation operations
      async createEvaluation(evaluationData) {
        const [evaluation] = await db.insert(evaluations).values({
          interviewId: evaluationData.interviewId,
          evaluatorId: evaluationData.evaluatorId,
          overallRating: evaluationData.overallRating,
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date(),
          ...evaluationData
        }).returning();
        return evaluation;
      }
      async getEvaluationByInterview(interviewId) {
        const [evaluation] = await db.select().from(evaluations).where(eq(evaluations.interviewId, interviewId));
        return evaluation || void 0;
      }
      async updateEvaluation(id, data) {
        const [updatedEvaluation] = await db.update(evaluations).set({
          ...data,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq(evaluations.id, id)).returning();
        return updatedEvaluation;
      }
      // Activity logs
      async createActivityLog(log2) {
        const [activityLog] = await db.insert(activityLogs).values({
          ...log2,
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
        const crypto = await import("crypto");
        const acceptanceToken = crypto.randomBytes(32).toString("hex");
        const [offer] = await db.insert(offers).values({
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
      async getOfferByCandidate(candidateId) {
        const [offer] = await db.select().from(offers).where(eq(offers.candidateId, candidateId)).limit(1);
        return offer || void 0;
      }
      async getOfferByToken(token) {
        const [offer] = await db.select().from(offers).where(eq(offers.acceptanceToken, token));
        return offer || void 0;
      }
      async updateOffer(id, data) {
        const [updatedOffer] = await db.update(offers).set({
          ...data,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq(offers.id, id)).returning();
        return updatedOffer;
      }
      // Direct email sending (bypasses notification queue)
      async sendDirectEmail(to, subject, body) {
        const nodemailer = await import("nodemailer");
        if (isLikelyInvalidEmail(to)) {
          console.error(`\u274C Rejected likely non-existent email: ${to}`);
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
        try {
          const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
              user: "upaksabraham24@gmail.com",
              pass: "znjpubjqmqxkyuht"
              // Gmail App Password (spaces removed)
            }
          });
          const mailOptions = {
            from: "upaksabraham24@gmail.com",
            to,
            subject,
            html: body
          };
          await transporter.sendMail(mailOptions);
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
          console.error("\u274C Error sending direct email:", error);
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
    };
    storage = new DatabaseStorage();
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

// server/airtable-integration.ts
var airtable_integration_exports = {};
__export(airtable_integration_exports, {
  createOrUpdateAirtableContact: () => createOrUpdateAirtableContact,
  fetchAirtableContacts: () => fetchAirtableContacts,
  getAirtableCredentials: () => getAirtableCredentials,
  getAirtableFieldValue: () => getAirtableFieldValue,
  updateCandidateInAirtable: () => updateCandidateInAirtable
});
import axios3 from "axios";
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
    const searchResponse = await axios3.get(
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
        const updateResponse = await axios3.patch(
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
                const retryResponse = await axios3.patch(
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
                const minimalResponse = await axios3.patch(
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
            const retryResponse = await axios3.patch(
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
        const createResponse = await axios3.post(
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
                const retryResponse = await axios3.post(
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
                const minimalResponse = await axios3.post(
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
            const retryResponse = await axios3.post(
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
      const response = await axios3.get(
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
import { google } from "googleapis";
async function getGoogleSheetsCredentials(userId) {
  const integration = await storage.getPlatformIntegration("google-sheets", userId);
  if (!integration || integration.status !== "connected" || !integration.credentials) {
    return null;
  }
  return integration.credentials;
}
async function getSheetsClient(credentials, userId) {
  const oauth2Client = new google.auth.OAuth2(
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
  return google.sheets({ version: GOOGLE_SHEETS_API_VERSION, auth: oauth2Client });
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

// scripts/api-index.ts
import serverless from "serverless-http";

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
function setupAuth(app2) {
  const sessionSettings = {
    secret: process.env.SESSION_SECRET || "hireos-development-secret",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === "production",
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
  app2.post("/api/register", async (req, res, next) => {
    try {
      if (!req.body.username || !req.body.password || !req.body.email || !req.body.fullName) {
        return res.status(400).json({
          message: "Missing required fields: username, password, email, and fullName are required"
        });
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
        req.body.role = UserRoles.HIRING_MANAGER;
      }
      const user = await storage.createUser({
        ...req.body,
        password: await hashPassword(req.body.password)
      });
      const { password, ...userWithoutPassword } = user;
      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
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
  app2.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info?.message || "Authentication failed" });
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
    console.log("Sending job description prompt to OpenRouter...");
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
import { eq as eq2 } from "drizzle-orm";
import { count } from "drizzle-orm";
function setupJobRoutes(app2) {
  app2.post("/api/jobs", validateRequest(insertJobSchema), async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
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
        hiPeopleLink
      };
      const job = await storage.createJob(jobData);
      await storage.createActivityLog({
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
      const status = req.query.status;
      const jobs2 = await storage.getJobs(status);
      const jobsWithCandidateCounts = await Promise.all(
        jobs2.map(async (job) => {
          const candidatesResult = await db.select({ count: count() }).from(candidates).where(eq2(candidates.jobId, job.id));
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
      const job = await storage.getJob(jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      if (req.isAuthenticated()) {
        res.json(job);
      } else {
        res.json({
          id: job.id,
          title: job.title,
          description: job.description,
          type: job.type,
          department: job.department,
          status: job.status,
          formTemplateId: job.formTemplateId
        });
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
      const jobId = parseInt(req.params.id);
      if (isNaN(jobId)) {
        return res.status(400).json({ message: "Invalid job ID" });
      }
      const job = await storage.getJob(jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      const updatedJob = await storage.updateJob(jobId, req.body);
      await storage.createActivityLog({
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
      const jobId = parseInt(req.params.id);
      if (isNaN(jobId)) {
        return res.status(400).json({ message: "Invalid job ID" });
      }
      const job = await storage.getJob(jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      const updatedJob = await storage.updateJob(jobId, {
        status: "active",
        postedDate: /* @__PURE__ */ new Date()
      });
      const requestedPlatforms = req.body.platforms || ["linkedin", "onlinejobs"];
      const platformMap = {
        "linkedin": "LinkedIn",
        "onlinejobs": "onlinejobs.ph"
      };
      const platforms = [];
      for (const platformId of requestedPlatforms) {
        const platformName = platformMap[platformId] || platformId;
        platforms.push(platformName);
        await storage.createJobPlatform({
          jobId,
          platform: platformName,
          platformJobId: `${platformId}-${Math.random().toString(36).substring(2, 12)}`,
          postUrl: `https://${platformId === "onlinejobs" ? "onlinejobs.ph" : platformId}.com/jobs/${Math.random().toString(36).substring(2, 10)}`,
          status: "posted"
        });
      }
      await storage.createActivityLog({
        userId: req.user?.id,
        action: "Approved and posted job",
        entityType: "job",
        entityId: job.id,
        details: { jobTitle: job.title, platforms },
        timestamp: /* @__PURE__ */ new Date()
      });
      await storage.createNotification({
        type: "slack",
        payload: {
          channel: "hiring-updates",
          message: `Job posted: ${job.title} by ${req.user?.fullName}`,
          jobId: job.id
        },
        processAfter: /* @__PURE__ */ new Date(),
        status: "pending"
      });
      res.json({
        ...updatedJob,
        platforms: await storage.getJobPlatforms(jobId)
      });
    } catch (error) {
      handleApiError(error, res);
    }
  });
  app2.post("/api/jobs/:id/close", async (req, res) => {
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
      const updatedJob = await storage.updateJob(jobId, {
        status: "closed"
      });
      await storage.createActivityLog({
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
      const jobId = parseInt(req.params.id);
      if (isNaN(jobId)) {
        return res.status(400).json({ message: "Invalid job ID" });
      }
      const platforms = await storage.getJobPlatforms(jobId);
      res.json(platforms);
    } catch (error) {
      handleApiError(error, res);
    }
  });
}

// server/api/candidate.ts
init_storage();
init_schema();
import { z as z3 } from "zod";
init_email_validator();
init_ghl_integration();
function setupCandidateRoutes(app2) {
  app2.post(
    "/api/candidates",
    validateRequest(insertCandidateSchema),
    async (req, res) => {
      try {
        if (!isAuthorized(req)) {
          return res.status(401).json({ message: "Authentication or API key required" });
        }
        const existingCandidate = await storage.getCandidateByNameAndEmail(
          req.body.name,
          req.body.email
        );
        if (existingCandidate) {
          return res.status(409).json({
            message: "Candidate already exists",
            error: "A candidate with the same name and email already exists in the system",
            existingCandidateId: existingCandidate.id
          });
        }
        const candidate = await storage.createCandidate(req.body);
        const userId = req.user?.id;
        if (userId && candidate.jobId !== null && candidate.jobId !== void 0) {
          try {
            const job2 = await storage.getJob(candidate.jobId);
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
                    await storage.updateCandidate(candidate.id, { ghlContactId });
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
          userId: req.user?.id ?? null,
          action: "Added candidate",
          entityType: "candidate",
          entityId: candidate.id,
          details: { candidateName: candidate.name, jobId: candidate.jobId },
          timestamp: /* @__PURE__ */ new Date()
        });
        const job = candidate.jobId ? await storage.getJob(candidate.jobId) : null;
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
      const jobId = req.query.jobId ? parseInt(req.query.jobId) : void 0;
      const status = req.query.status;
      const hiPeoplePercentile = req.query.hiPeoplePercentile ? parseInt(req.query.hiPeoplePercentile) : void 0;
      const candidates2 = await storage.getCandidates({
        jobId,
        status,
        hiPeoplePercentile
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
      const candidateId = parseInt(req.params.id);
      if (isNaN(candidateId)) {
        return res.status(400).json({ message: "Invalid candidate ID" });
      }
      const candidate = await storage.getCandidate(candidateId);
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
      const candidateIdentifier = req.params.id;
      let candidate;
      if (!isNaN(Number(candidateIdentifier))) {
        candidate = await storage.getCandidate(parseInt(candidateIdentifier));
      } else {
        candidate = await storage.getCandidateByGHLContactId(candidateIdentifier);
      }
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }
      const hasEvaluationFields = req.body.technicalProficiency !== void 0 || req.body.leadershipInitiative !== void 0 || req.body.problemSolving !== void 0 || req.body.communicationSkills !== void 0 || req.body.culturalFit !== void 0 || req.body.hiPeopleScore !== void 0 || req.body.hiPeoplePercentile !== void 0;
      if (hasEvaluationFields && !["ceo", "coo", "director", "admin"].includes(req.user?.role || "")) {
        return res.status(403).json({
          message: "Only CEO, COO, or Director can update candidate evaluation criteria"
        });
      }
      const updateData = { ...req.body };
      if (updateData.lastInterviewDate) {
        updateData.lastInterviewDate = new Date(updateData.lastInterviewDate);
      }
      const updatedCandidate = await storage.updateCandidate(
        candidate.id,
        updateData
      );
      const userId = req.user?.id;
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
                  const job = await storage.getJob(updatedCandidate.jobId);
                  if (job) {
                    updatedCandidate.job = job;
                  }
                }
                await updateCandidateInAirtable2(updatedCandidate, userId);
              } else if (integration.platformId === "ghl" && updatedCandidate.ghlContactId) {
                const { updateCandidateInGHL: updateCandidateInGHL2 } = await Promise.resolve().then(() => (init_ghl_integration(), ghl_integration_exports));
                if (updatedCandidate.jobId) {
                  const job = await storage.getJob(updatedCandidate.jobId);
                  if (job) {
                    updatedCandidate.job = job;
                  }
                }
                await updateCandidateInGHL2(updatedCandidate, userId);
              } else if (integration.platformId === "google-sheets") {
                const { createOrUpdateGoogleSheetsContact: createOrUpdateGoogleSheetsContact3, findRowByEmail: findRowByEmail3 } = await Promise.resolve().then(() => (init_google_sheets_integration(), google_sheets_integration_exports));
                if (updatedCandidate.jobId) {
                  const job = await storage.getJob(updatedCandidate.jobId);
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
        const job = candidate.jobId ? await storage.getJob(candidate.jobId) : null;
        if (job) {
          await storage.createNotification({
            type: "email",
            payload: {
              recipientEmail: candidate.email,
              subject: `${candidate.name}, Let's Discuss Your Fit for Our ${job.title} Position`,
              template: "custom",
              context: {
                body: `
                  Hi ${candidate.name},<br><br>
                  It's Aaron Ready from Ready CPA. I came across your profile and would like to chat about your background and how you might fit in our <b>${job.title}</b> position.<br><br>
                  Feel free to grab a time on my calendar when you're available:<br>
                  <a href="https://www.calendar.com/aaronready/client-meeting">Schedule your interview here</a><br><br>
                  Looking forward to connecting!<br><br>
                  Thanks,<br>
                  Aaron Ready, CPA<br>
                  Ready CPA
                `.trim()
              }
            },
            processAfter: /* @__PURE__ */ new Date(),
            status: "pending"
          });
        }
      }
      if (req.body.status === "95_offer_sent" && candidate.status !== "95_offer_sent" || req.body.finalDecisionStatus === "offer" && candidate.finalDecisionStatus !== "offer") {
        const job = candidate.jobId ? await storage.getJob(candidate.jobId) : null;
        let offer = await storage.getOfferByCandidate(candidate.id);
        if (!offer) {
          offer = await storage.createOffer({
            candidateId: candidate.id,
            offerType: "Full-time",
            compensation: "Competitive",
            status: "sent",
            sentDate: /* @__PURE__ */ new Date(),
            approvedById: req.user?.id,
            contractUrl: `https://talent.firmos.app/web-manager-contract453986`
          });
        }
        await storage.createActivityLog({
          userId: req.user?.id ?? null,
          action: "Sent offer to candidate",
          entityType: "candidate",
          entityId: candidate.id,
          details: { candidateName: candidate.name, jobTitle: job?.title },
          timestamp: /* @__PURE__ */ new Date()
        });
        const emailSubject = `Excited to Offer You the ${job?.title} Position`;
        const emailBody = `
          <p>Hi ${candidate.name},</p>
          <p>Great news \u2014 we'd love to bring you on board for the ${job?.title} position at Ready CPA. After reviewing your experience, we're confident you'll make a strong impact on our team.</p>
          <p>Here's the link to your engagement contract:
          <a href="https://talent.firmos.app/web-manager-contract453986">[Contract Link]</a></p>
          <p>To kick things off, please schedule your onboarding call here:
          <a href="https://www.calendar.com/aaronready/client-meeting">[Onboarding Calendar Link]</a></p>
          <p>If anything's unclear or you'd like to chat, don't hesitate to reach out.</p>
          <p>Welcome aboard \u2014 we're excited to get started!</p>
          <p>Best regards,<br>
          Aaron Ready, CPA<br>
          Ready CPA</p>
        `;
        await storage.sendDirectEmail(candidate.email, emailSubject, emailBody);
      }
      if (req.body.status && req.body.status !== candidate.status) {
        const interviewStatuses = ["45_1st_interview_sent", "60_1st_interview_scheduled", "75_2nd_interview_scheduled"];
        const wasInterviewStatus = interviewStatuses.includes(candidate.status);
        const isNoLongerInterviewStatus = !interviewStatuses.includes(req.body.status);
        if (wasInterviewStatus && isNoLongerInterviewStatus) {
          const existingInterviews = await storage.getInterviews({ candidateId: candidate.id });
          for (const interview of existingInterviews) {
            if (interview.status === "scheduled" || interview.status === "pending") {
              await storage.updateInterview(interview.id, {
                status: "cancelled",
                notes: interview.notes ? `${interview.notes}

Cancelled: Candidate status changed to ${req.body.status}` : `Cancelled: Candidate status changed to ${req.body.status}`,
                updatedAt: /* @__PURE__ */ new Date()
              });
            }
          }
        }
        await storage.createActivityLog({
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
      const candidateId = parseInt(req.params.id);
      if (isNaN(candidateId)) {
        return res.status(400).json({ message: "Invalid candidate ID" });
      }
      const candidate = await storage.getCandidate(candidateId);
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }
      const job = candidate.jobId ? await storage.getJob(candidate.jobId) : null;
      if (isLikelyInvalidEmail(candidate.email)) {
        console.error(
          `\u274C Rejected likely non-existent email: ${candidate.email}`
        );
        await storage.createActivityLog({
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
      const updatedCandidate = await storage.updateCandidate(candidateId, {
        status: "45_1st_interview_sent"
      });
      await storage.createActivityLog({
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
      const calendarLink = user.calendarLink;
      const senderName = user.fullName || "Team Member";
      const companyName = "Ready CPA";
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
      const emailSubject = subjectTemplate.replace(/\{\{candidateName\}\}/g, candidate.name).replace(/\{\{jobTitle\}\}/g, job?.title || "the position").replace(/\{\{senderName\}\}/g, senderName).replace(/\{\{companyName\}\}/g, companyName);
      const emailBody = bodyTemplate.replace(/\{\{candidateName\}\}/g, candidate.name).replace(/\{\{jobTitle\}\}/g, job?.title || "the position").replace(/\{\{senderName\}\}/g, senderName).replace(/\{\{companyName\}\}/g, companyName).replace(/\{\{calendarLink\}\}/g, calendarLink);
      await storage.sendDirectEmail(candidate.email, emailSubject, emailBody);
      const existingInterviews = await storage.getInterviews({ candidateId: candidate.id });
      const existingScheduledInterview = existingInterviews.find((i) => i.status === "scheduled" || i.status === "pending");
      if (!existingScheduledInterview) {
        await storage.createInterview({
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
        await storage.updateInterview(existingScheduledInterview.id, {
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
      const candidateId = parseInt(req.params.id);
      if (isNaN(candidateId)) {
        return res.status(400).json({ message: "Invalid candidate ID" });
      }
      const candidate = await storage.getCandidate(candidateId);
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }
      const job = candidate.jobId ? await storage.getJob(candidate.jobId) : null;
      if (isLikelyInvalidEmail(candidate.email)) {
        console.error(
          `\u274C Rejected likely non-existent email: ${candidate.email}`
        );
        await storage.createActivityLog({
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
      const updatedCandidate = await storage.updateCandidate(candidateId, {
        status: "90_talent_pool",
        finalDecisionStatus: "talent_pool"
        // Also keep final decision status in sync
      });
      await storage.createActivityLog({
        userId: req.user?.id,
        action: "Added candidate to talent pool",
        entityType: "candidate",
        entityId: candidate.id,
        details: { candidateName: candidate.name, jobTitle: job?.title },
        timestamp: /* @__PURE__ */ new Date()
      });
      const user = req.user ? await storage.getUser(req.user.id) : null;
      const senderName = user?.fullName || "Team Member";
      const companyName = "Ready CPA";
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
      const emailSubject = subjectTemplate.replace(/\{\{candidateName\}\}/g, candidate.name).replace(/\{\{jobTitle\}\}/g, job?.title || "the position").replace(/\{\{senderName\}\}/g, senderName).replace(/\{\{companyName\}\}/g, companyName);
      const emailBody = bodyTemplate.replace(/\{\{candidateName\}\}/g, candidate.name).replace(/\{\{jobTitle\}\}/g, job?.title || "the position").replace(/\{\{senderName\}\}/g, senderName).replace(/\{\{companyName\}\}/g, companyName);
      try {
        await storage.sendDirectEmail(candidate.email, emailSubject, emailBody);
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
      const candidateId = parseInt(req.params.id);
      if (isNaN(candidateId)) {
        return res.status(400).json({ message: "Invalid candidate ID" });
      }
      const candidate = await storage.getCandidate(candidateId);
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }
      const job = candidate.jobId ? await storage.getJob(candidate.jobId) : null;
      const nodemailer = await import("nodemailer");
      if (isLikelyInvalidEmail(candidate.email)) {
        console.error(
          `\u274C Rejected likely non-existent email: ${candidate.email}`
        );
        await storage.createActivityLog({
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
      const updatedCandidate = await storage.updateCandidate(candidateId, {
        status: "200_rejected",
        finalDecisionStatus: "rejected"
      });
      await storage.createActivityLog({
        userId: req.user?.id,
        action: "Rejected candidate",
        entityType: "candidate",
        entityId: candidate.id,
        details: { candidateName: candidate.name, jobTitle: job?.title },
        timestamp: /* @__PURE__ */ new Date()
      });
      const user = req.user ? await storage.getUser(req.user.id) : null;
      const senderName = user?.fullName || "Team Member";
      const companyName = "Ready CPA";
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
      const emailSubject = subjectTemplate.replace(/\{\{candidateName\}\}/g, candidate.name).replace(/\{\{jobTitle\}\}/g, job?.title || "the position").replace(/\{\{senderName\}\}/g, senderName).replace(/\{\{companyName\}\}/g, companyName);
      const emailBody = bodyTemplate.replace(/\{\{candidateName\}\}/g, candidate.name).replace(/\{\{jobTitle\}\}/g, job?.title || "the position").replace(/\{\{senderName\}\}/g, senderName).replace(/\{\{companyName\}\}/g, companyName);
      try {
        await storage.sendDirectEmail(candidate.email, emailSubject, emailBody);
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
      z3.object({
        offerType: z3.string(),
        compensation: z3.string(),
        startDate: z3.string().optional(),
        notes: z3.string().optional()
      })
    ),
    async (req, res) => {
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
        const job = candidate.jobId ? await storage.getJob(candidate.jobId) : null;
        try {
          if (isLikelyInvalidEmail(candidate.email)) {
            console.log(
              `\u274C Rejected likely non-existent email: ${candidate.email}`
            );
            await storage.createActivityLog({
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
          const updatedCandidate = await storage.updateCandidate(candidateId, {
            status: "95_offer_sent",
            finalDecisionStatus: "offer_sent"
            // Also update final decision status
          });
          const startDate = req.body.startDate ? new Date(req.body.startDate) : void 0;
          const offer = await storage.createOffer({
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
          await storage.createActivityLog({
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
          if (process.env.NODE_ENV !== "production") {
            console.log(`\u{1F4E7} Offer acceptance URL: ${acceptanceUrl}`);
            console.log(`   Token: ${offer.acceptanceToken}`);
          }
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
          const emailSubject = subjectTemplate.replace(/\{\{candidateName\}\}/g, candidate.name).replace(/\{\{jobTitle\}\}/g, job?.title || "the position").replace(/\{\{senderName\}\}/g, senderName).replace(/\{\{companyName\}\}/g, companyName);
          const emailBody = bodyTemplate.replace(/\{\{candidateName\}\}/g, candidate.name).replace(/\{\{jobTitle\}\}/g, job?.title || "the position").replace(/\{\{senderName\}\}/g, senderName).replace(/\{\{companyName\}\}/g, companyName).replace(/\{\{contractLink\}\}/g, offer.contractUrl || "#").replace(/\{\{acceptanceUrl\}\}/g, acceptanceUrl);
          await storage.sendDirectEmail(
            candidate.email,
            emailSubject,
            emailBody
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
      const candidateId = parseInt(req.params.id);
      if (isNaN(candidateId)) {
        return res.status(400).json({ message: "Invalid candidate ID" });
      }
      const candidate = await storage.getCandidate(candidateId);
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }
      const updatedCandidate = await storage.updateCandidate(candidateId, {
        status: "100_offer_accepted"
      });
      const offer = await storage.getOfferByCandidate(candidateId);
      if (offer) {
        await storage.updateOffer(offer.id, {
          status: "accepted"
        });
      }
      const job = candidate.jobId ? await storage.getJob(candidate.jobId) : null;
      await storage.createActivityLog({
        userId: req.user?.id,
        action: "Candidate accepted offer",
        entityType: "candidate",
        entityId: candidate.id,
        details: { candidateName: candidate.name, jobTitle: job?.title },
        timestamp: /* @__PURE__ */ new Date()
      });
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
      const candidate = await storage.getCandidate(offer.candidateId);
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }
      const job = candidate.jobId ? await storage.getJob(candidate.jobId) : null;
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
      const candidate = await storage.getCandidate(offer.candidateId);
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }
      const job = candidate.jobId ? await storage.getJob(candidate.jobId) : null;
      if (action === "accept") {
        await storage.updateOffer(offer.id, {
          status: "accepted"
        });
        await storage.updateCandidate(offer.candidateId, {
          status: "100_offer_accepted"
        });
        const approvingUser = offer.approvedById ? await storage.getUser(offer.approvedById) : null;
        const senderName = approvingUser?.fullName || "Team Member";
        const companyName = "Ready CPA";
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
          await storage.sendDirectEmail(candidate.email, onboardingSubject, onboardingBody);
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
        await storage.updateOffer(offer.id, {
          status: "declined"
        });
        await storage.updateCandidate(offer.candidateId, {
          status: "200_rejected",
          finalDecisionStatus: "rejected"
        });
        await storage.createActivityLog({
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
import { z as z4 } from "zod";
function setupInterviewRoutes(app2) {
  app2.post("/api/interviews", validateRequest(
    z4.object({
      candidateId: z4.number(),
      scheduledDate: z4.string().optional(),
      interviewerId: z4.number().optional(),
      type: z4.string(),
      videoUrl: z4.string().optional(),
      notes: z4.string().optional()
    })
  ), async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const scheduledDate = req.body.scheduledDate ? new Date(req.body.scheduledDate) : void 0;
      const interview = await storage.createInterview({
        candidateId: req.body.candidateId,
        scheduledDate,
        interviewerId: req.body.interviewerId || req.user?.id,
        type: req.body.type,
        videoUrl: req.body.videoUrl,
        notes: req.body.notes,
        status: "scheduled"
      });
      const candidate = await storage.getCandidate(req.body.candidateId);
      if (candidate && candidate.status !== "interview_scheduled") {
        await storage.updateCandidate(req.body.candidateId, {
          status: "interview_scheduled"
        });
      }
      await storage.createActivityLog({
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
      const candidateId = req.query.candidateId ? parseInt(req.query.candidateId) : void 0;
      const interviewerId = req.query.interviewerId ? parseInt(req.query.interviewerId) : void 0;
      const status = req.query.status;
      const interviews3 = await storage.getInterviews({
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
      const interviewId = parseInt(req.params.id);
      if (isNaN(interviewId)) {
        return res.status(400).json({ message: "Invalid interview ID" });
      }
      const interview = await storage.getInterview(interviewId);
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
      const interviewId = parseInt(req.params.id);
      if (isNaN(interviewId)) {
        return res.status(400).json({ message: "Invalid interview ID" });
      }
      const interview = await storage.getInterview(interviewId);
      if (!interview) {
        return res.status(404).json({ message: "Interview not found" });
      }
      if (req.body.scheduledDate) {
        req.body.scheduledDate = new Date(req.body.scheduledDate);
      }
      if (req.body.conductedDate) {
        req.body.conductedDate = new Date(req.body.conductedDate);
      }
      const updatedInterview = await storage.updateInterview(interviewId, req.body);
      await storage.createActivityLog({
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
      const interviewId = parseInt(req.params.id);
      if (isNaN(interviewId)) {
        return res.status(400).json({ message: "Invalid interview ID" });
      }
      const interview = await storage.getInterview(interviewId);
      if (!interview) {
        return res.status(404).json({ message: "Interview not found" });
      }
      const updatedInterview = await storage.updateInterview(interviewId, {
        status: "completed",
        conductedDate: /* @__PURE__ */ new Date()
      });
      await storage.createActivityLog({
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
    z4.object({
      technicalScore: z4.number().min(1).max(5).optional(),
      communicationScore: z4.number().min(1).max(5).optional(),
      problemSolvingScore: z4.number().min(1).max(5).optional(),
      culturalFitScore: z4.number().min(1).max(5).optional(),
      overallRating: z4.string(),
      technicalComments: z4.string().optional(),
      communicationComments: z4.string().optional(),
      problemSolvingComments: z4.string().optional(),
      culturalFitComments: z4.string().optional(),
      overallComments: z4.string().optional()
    })
  ), async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const interviewId = parseInt(req.params.id);
      if (isNaN(interviewId)) {
        return res.status(400).json({ message: "Invalid interview ID" });
      }
      const interview = await storage.getInterview(interviewId);
      if (!interview) {
        return res.status(404).json({ message: "Interview not found" });
      }
      const existingEvaluation = await storage.getEvaluationByInterview(interviewId);
      let evaluation;
      if (existingEvaluation) {
        evaluation = await storage.updateEvaluation(existingEvaluation.id, {
          ...req.body,
          evaluatorId: req.user?.id,
          updatedAt: /* @__PURE__ */ new Date()
        });
      } else {
        evaluation = await storage.createEvaluation({
          interviewId,
          ...req.body,
          evaluatorId: req.user?.id
        });
      }
      if (interview.status !== "completed") {
        await storage.updateInterview(interviewId, {
          status: "completed",
          conductedDate: interview.conductedDate || /* @__PURE__ */ new Date()
        });
      }
      await storage.createActivityLog({
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
      const interviewId = parseInt(req.params.id);
      if (isNaN(interviewId)) {
        return res.status(400).json({ message: "Invalid interview ID" });
      }
      const evaluation = await storage.getEvaluationByInterview(interviewId);
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
      const interviewId = parseInt(req.params.id);
      if (isNaN(interviewId)) {
        return res.status(400).json({ message: "Invalid interview ID" });
      }
      const interview = await storage.getInterview(interviewId);
      if (!interview) {
        return res.status(404).json({ message: "Interview not found" });
      }
      await storage.deleteInterview(interviewId);
      await storage.createActivityLog({
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
init_db();
init_schema();
import { eq as eq3, inArray, and as and2, gte } from "drizzle-orm";
import { count as count2 } from "drizzle-orm";
function setupAnalyticsRoutes(app2) {
  app2.get("/api/analytics/dashboard", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const activeJobsCountResult = await db.select({ count: count2() }).from(jobs).where(eq3(jobs.status, "active"));
      const activeJobs = Number(activeJobsCountResult[0].count);
      const totalCandidatesResult = await db.select({ count: count2() }).from(candidates);
      const totalCandidates = Number(totalCandidatesResult[0].count);
      const scheduledInterviewsResult = await db.select({ count: count2() }).from(candidates).where(inArray(candidates.status, ["60_1st_interview_scheduled", "75_2nd_interview_scheduled"]));
      const scheduledInterviews = Number(scheduledInterviewsResult[0].count);
      const offersSentResult = await db.select({ count: count2() }).from(candidates).where(eq3(candidates.status, "95_offer_sent"));
      const offersSent = Number(offersSentResult[0].count);
      res.json({
        stats: {
          activeJobs,
          totalCandidates,
          scheduledInterviews,
          offersSent
        }
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
      const jobId = req.query.jobId ? parseInt(req.query.jobId) : void 0;
      const dateRange = req.query.dateRange || "30";
      const buildConditions = (...conditions) => {
        const allConditions = [];
        if (dateRange !== "all") {
          const days = parseInt(dateRange);
          const startDate = /* @__PURE__ */ new Date();
          startDate.setDate(startDate.getDate() - days);
          allConditions.push(gte(candidates.createdAt, startDate));
        }
        if (jobId) {
          allConditions.push(eq3(candidates.jobId, jobId));
        }
        allConditions.push(...conditions);
        return allConditions.length > 0 ? and2(...allConditions) : void 0;
      };
      const applicationsResult = await db.select({ count: count2() }).from(candidates).where(buildConditions());
      const applications = Number(applicationsResult[0]?.count || 0);
      const assessmentsResult = await db.select({ count: count2() }).from(candidates).where(buildConditions(eq3(candidates.status, "30_assessment_completed")));
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
      const offersResult = await db.select({ count: count2() }).from(candidates).where(buildConditions(eq3(candidates.status, "95_offer_sent")));
      const offers2 = Number(offersResult[0]?.count || 0);
      const hiresResult = await db.select({ count: count2() }).from(candidates).where(buildConditions(eq3(candidates.status, "100_offer_accepted")));
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
      const allJobs = await storage.getJobs();
      const jobPerformance = [];
      for (const job of allJobs) {
        const allCandidatesResult = await db.select({ count: count2() }).from(candidates).where(eq3(candidates.jobId, job.id));
        const applications = Number(allCandidatesResult[0].count);
        const assessmentsResult = await db.select({ count: count2() }).from(candidates).where(and2(eq3(candidates.jobId, job.id), eq3(candidates.status, "30_assessment_completed")));
        const assessments = Number(assessmentsResult[0].count);
        const interviewStatuses = [
          "45_1st_interview_sent",
          "60_1st_interview_scheduled",
          "75_2nd_interview_scheduled"
        ];
        const interviewsResult = await db.select({ count: count2() }).from(candidates).where(and2(
          eq3(candidates.jobId, job.id),
          inArray(candidates.status, interviewStatuses)
        ));
        const interviews3 = Number(interviewsResult[0].count);
        const offersResult = await db.select({ count: count2() }).from(candidates).where(and2(eq3(candidates.jobId, job.id), eq3(candidates.status, "95_offer_sent")));
        const offers2 = Number(offersResult[0].count);
        const hiresResult = await db.select({ count: count2() }).from(candidates).where(and2(eq3(candidates.jobId, job.id), eq3(candidates.status, "100_offer_accepted")));
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
      const hiredCandidates = await storage.getCandidates({ status: "hired" });
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
import axios4 from "axios";
var HIPEOPLE_SCRAPER_URL = "https://firmos-hipeople-scraper-899783477192.europe-west1.run.app/scrape_hipeople";
async function scrapeHipeople(assessmentUrl, testData) {
  try {
    const candidateName = testData?.applicant_name || "Sample Candidate";
    const candidateEmail = testData?.applicant_email || "sample@example.com";
    console.log(`\u{1F7E1} Sending request to HiPeople scraper for ${candidateName} (${candidateEmail})`);
    const response = await axios4.post(HIPEOPLE_SCRAPER_URL, null, {
      params: {
        applicant_name: candidateName,
        applicant_email: candidateEmail
      },
      timeout: 3e4
    });
    console.log("\u2705 HiPeople scraper response:", JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error("\u274C HiPeople scraping error:", error);
    if (axios4.isAxiosError(error)) {
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
        console.log("\u{1F4E5} Results from HiPeople scraper:", hiPeopleResults);
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
import { z as z5 } from "zod";
var updateUserSchema = z5.object({
  username: z5.string().min(3, "Username must be at least 3 characters").optional(),
  fullName: z5.string().min(2, "Full name is required").optional(),
  email: z5.string().email("Invalid email address").optional(),
  role: z5.enum([
    UserRoles.HIRING_MANAGER,
    UserRoles.PROJECT_MANAGER,
    UserRoles.COO,
    UserRoles.CEO,
    UserRoles.DIRECTOR,
    UserRoles.ADMIN
  ]).optional(),
  password: z5.string().min(6, "Password must be at least 6 characters").optional(),
  calendarLink: z5.string().url("Invalid calendar URL").optional().or(z5.literal("")),
  calendarProvider: z5.enum(["calendly", "cal.com", "google", "custom"]).optional(),
  emailTemplates: z5.record(z5.any()).optional()
  // JSONB field for all email templates
});
function setupUserRoutes(app2) {
  app2.get("/api/users", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const users2 = await storage.getAllUsers();
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
      const hashedPassword = await hashPassword(req.body.password);
      const user = await storage.createUser({
        ...req.body,
        password: hashedPassword
      });
      const { password, ...userWithoutPassword } = user;
      await storage.createActivityLog({
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
        updateData.password = await hashPassword(updateData.password);
      }
      const updatedUser = await storage.updateUser(userId, updateData);
      await storage.createActivityLog({
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
      await storage.createActivityLog({
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
      res.status(204).send();
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

// server/api/test-integration.ts
init_schema();
function setupTestIntegrationRoutes(app2) {
  app2.post("/api/test/openai", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      if (req.user?.role !== UserRoles.ADMIN && req.user?.role !== UserRoles.COO) {
        return res.status(403).json({ message: "Not authorized" });
      }
      const { title, type, skills, teamContext, department } = req.body;
      if (!title) {
        return res.status(400).json({ message: "Job title is required" });
      }
      console.log(`Generating job description for ${title}`);
      const result = await generateJobDescription({
        title,
        type,
        skills,
        teamContext,
        department
      });
      res.json({
        success: true,
        description: result.description,
        suggestedTitle: result.suggestedTitle
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Error testing OpenAI integration:", errorMessage);
      res.status(500).json({
        success: false,
        message: "Failed to generate job description",
        error: errorMessage
      });
    }
  });
  app2.post("/api/test/hipeople", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      if (req.user?.role !== UserRoles.ADMIN && req.user?.role !== UserRoles.COO) {
        return res.status(403).json({ message: "Not authorized" });
      }
      const { url } = req.body;
      if (!url) {
        return res.status(400).json({ message: "HiPeople assessment URL is required" });
      }
      console.log(`Scraping HiPeople assessment from ${url}`);
      const results = await scrapeHipeople(url);
      res.json({
        success: true,
        count: results.length,
        results
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Error testing HiPeople integration:", errorMessage);
      res.status(500).json({
        success: false,
        message: "Failed to scrape HiPeople assessment",
        error: errorMessage
      });
    }
  });
}

// server/api/test-simple.ts
import axios5 from "axios";
function setupSimpleTestRoutes(app2) {
  app2.post("/api/test/simple-openrouter", async (req, res) => {
    try {
      const { title, type, skills, teamContext, department } = req.body;
      if (!title) {
        return res.status(400).json({ message: "Job title is required" });
      }
      console.log(`Generating job description for ${title} (non-authenticated test with OpenRouter)`);
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
        // Using Gemini model for cost effectiveness
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
      const response = await axios5.post(url, data, { headers });
      const content = response.data.choices[0].message.content || "";
      let suggestedTitle;
      const suggestedTitleMatch = content.match(/SUGGESTED_TITLE:\s*(.+?)($|\n)/);
      let description = content;
      if (suggestedTitleMatch && suggestedTitleMatch[1]) {
        suggestedTitle = suggestedTitleMatch[1].trim();
        description = content.replace(/SUGGESTED_TITLE:\s*(.+?)($|\n)/, "").trim();
      }
      res.json({
        success: true,
        description,
        suggestedTitle
      });
    } catch (error) {
      const axiosError = error;
      const errorResponse = axiosError.response?.data;
      const errorMessage = errorResponse ? `${errorResponse.error?.message || JSON.stringify(errorResponse)}` : error instanceof Error ? error.message : String(error);
      console.error("Error testing OpenRouter integration:", errorMessage);
      res.status(500).json({
        success: false,
        message: "Failed to generate job description",
        error: errorMessage
      });
    }
  });
  app2.post("/api/test/simple-hipeople", async (req, res) => {
    try {
      console.log("Using mock data for HiPeople testing...");
      const mockResults = [
        {
          candidate_id: "test-123",
          name: "Test Candidate",
          email: "test@example.com",
          score: 85,
          percentile: 75,
          completed_at: (/* @__PURE__ */ new Date()).toISOString(),
          feedback: [
            {
              category: "Technical Skills",
              score: 4.5,
              feedback: "Strong technical foundation with good problem-solving abilities."
            },
            {
              category: "Communication",
              score: 4,
              feedback: "Communicates ideas clearly and effectively."
            },
            {
              category: "Teamwork",
              score: 4.2,
              feedback: "Works well in collaborative environments."
            }
          ]
        }
      ];
      res.json({
        success: true,
        count: mockResults.length,
        results: mockResults,
        note: "This is mock data for testing purposes only."
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Error in HiPeople test endpoint:", errorMessage);
      res.status(500).json({
        success: false,
        message: "Error in test endpoint",
        error: errorMessage
      });
    }
  });
}

// server/ghl-sync.ts
init_storage();
import axios6 from "axios";
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
      const response = await axios6.get(url, {
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
    const candidates2 = await storage.getCandidates({});
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
        if (!matchingCandidate && contactName) {
          const normalizedAirtableName = normalizeName2(contactName);
          matchingCandidate = candidates2.find(
            (candidate) => normalizeName2(candidate.name) === normalizedAirtableName
          );
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
            const existingCandidates = await storage.getCandidates({});
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
            const jobs2 = await storage.getJobs("active");
            const defaultJobId = jobs2.length > 0 ? jobs2[0].id : null;
            const newCandidate = await storage.createCandidate({
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
        if (contactEmail && contactEmail.toLowerCase() !== matchingCandidate.email.toLowerCase()) {
          updateData.email = contactEmail.trim();
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
            await storage.updateCandidate(matchingCandidate.id, updateData);
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
    const existingCandidates = await storage.getCandidates({});
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
        const newCandidate = await storage.createCandidate({
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
        console.log(`\u2705 Created candidate "${newCandidate.name}" with job ID ${assignment.jobId || "none"}`);
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
        if (!matchingCandidate && contactName) {
          const normalizedSheetsName = normalizeName3(contactName);
          matchingCandidate = candidates2.find(
            (candidate) => normalizeName3(candidate.name) === normalizedSheetsName
          );
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
            const jobs2 = await storage.getJobs("active");
            const defaultJobId = jobs2.length > 0 ? jobs2[0].id : null;
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
import { eq as eq4 } from "drizzle-orm";
var refreshing = null;
async function getTokenRow() {
  const rows = await db.select().from(ghlTokens).where(eq4(ghlTokens.userType, "Location")).limit(1);
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
  }).where(eq4(ghlTokens.userType, "Location"));
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
import { z as z6 } from "zod";
var createIntegrationSchema = z6.object({
  platformId: z6.string().min(1),
  platformName: z6.string().min(1),
  platformType: z6.enum(["builtin", "custom"]).default("builtin"),
  credentials: z6.record(z6.any()).optional(),
  apiEndpoint: z6.string().url().optional(),
  apiMethod: z6.string().optional()
});
var updateIntegrationSchema = z6.object({
  platformName: z6.string().min(1).optional(),
  status: z6.enum(["connected", "disconnected", "error"]).optional(),
  credentials: z6.record(z6.any()).nullable().optional(),
  // Allow null for disconnecting
  apiEndpoint: z6.string().url().optional(),
  apiMethod: z6.string().optional(),
  oauthToken: z6.string().nullable().optional(),
  oauthRefreshToken: z6.string().nullable().optional(),
  oauthExpiresAt: z6.string().datetime().optional(),
  isEnabled: z6.boolean().optional()
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
import { z as z7 } from "zod";
import { google as google2 } from "googleapis";
var createCRMIntegrationSchema = z7.object({
  platformId: z7.string().min(1),
  // "ghl", "hubspot", "pipedrive", etc.
  platformName: z7.string().min(1),
  credentials: z7.record(z7.any()),
  // { apiKey, locationId, etc. }
  syncDirection: z7.enum(["one-way", "two-way"]).default("one-way")
});
var updateCRMIntegrationSchema = z7.object({
  credentials: z7.record(z7.any()).nullable().optional(),
  syncDirection: z7.enum(["one-way", "two-way"]).optional(),
  status: z7.enum(["connected", "disconnected", "error"]).optional(),
  isEnabled: z7.boolean().optional()
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
      const axios8 = (await import("axios")).default;
      const AIRTABLE_API_BASE2 = "https://api.airtable.com/v0";
      try {
        const response = await axios8.get(
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
          const sampleResponse = await axios8.get(
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
      let redirectUri = process.env.GOOGLE_REDIRECT_URI;
      if (!redirectUri) {
        const protocol = req.protocol || (req.secure ? "https" : "http");
        const host = req.get("host") || "localhost:5000";
        redirectUri = `${protocol}://${host}/api/crm-integrations/google-sheets/callback`;
      } else {
        if (!redirectUri.includes("/api/crm-integrations")) {
          redirectUri = redirectUri.replace(/\/crm-integrations/, "/api/crm-integrations");
        }
      }
      redirectUri = redirectUri.replace(/\/$/, "");
      const oauth2Client = new google2.auth.OAuth2(
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
      res.json({ authUrl, redirectUri });
    } catch (error) {
      handleApiError(error, res);
    }
  });
  app2.get("/api/crm-integrations/google-sheets/callback", async (req, res) => {
    try {
      const { code, state } = req.query;
      if (!code) {
        return res.redirect(`/settings?error=oauth_cancelled`);
      }
      let userId;
      try {
        const stateData = JSON.parse(state);
        userId = stateData.userId;
      } catch {
        return res.redirect(`/settings?error=invalid_state`);
      }
      let redirectUri = process.env.GOOGLE_REDIRECT_URI;
      if (!redirectUri) {
        const protocol = req.protocol || (req.secure ? "https" : "http");
        const host = req.get("host") || "localhost:5000";
        redirectUri = `${protocol}://${host}/api/crm-integrations/google-sheets/callback`;
      } else {
        if (!redirectUri.includes("/api/crm-integrations")) {
          redirectUri = redirectUri.replace(/\/crm-integrations/, "/api/crm-integrations");
        }
      }
      redirectUri = redirectUri.replace(/\/$/, "");
      const oauth2Client = new google2.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        redirectUri
      );
      const { tokens } = await oauth2Client.getToken(code);
      if (!tokens.access_token) {
        return res.redirect(`/settings?error=no_access_token`);
      }
      const existing = await storage.getPlatformIntegration("google-sheets", userId);
      const credentials = {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || null,
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
      res.redirect(`/settings?google_sheets_connected=true`);
    } catch (error) {
      console.error("Google OAuth callback error:", error);
      res.redirect(`/settings?error=${encodeURIComponent(error.message)}`);
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
import { z as z8 } from "zod";
var fieldSchema = z8.object({
  id: z8.string(),
  type: z8.enum(["text", "email", "phone", "textarea", "number", "select", "file", "checkbox"]),
  label: z8.string(),
  placeholder: z8.string().optional(),
  required: z8.boolean().default(false),
  options: z8.array(z8.string()).optional(),
  // For select/checkbox fields
  validation: z8.object({
    min: z8.number().optional(),
    max: z8.number().optional(),
    pattern: z8.string().optional()
  }).optional()
});
var createFormTemplateSchema = z8.object({
  name: z8.string().min(1),
  description: z8.string().optional(),
  fields: z8.array(fieldSchema).min(1),
  isDefault: z8.boolean().optional().default(false)
});
var updateFormTemplateSchema = z8.object({
  name: z8.string().min(1).optional(),
  description: z8.string().optional(),
  fields: z8.array(fieldSchema).optional(),
  isDefault: z8.boolean().optional()
});
function setupFormTemplateRoutes(app2) {
  app2.get("/api/form-templates", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const templates = await storage.getFormTemplates();
      res.json(templates);
    } catch (error) {
      handleApiError(error, res);
    }
  });
  app2.get("/api/form-templates/default", async (req, res) => {
    try {
      const template = await storage.getDefaultFormTemplate();
      if (!template) {
        return res.status(404).json({ message: "No default form template found" });
      }
      res.json(template);
    } catch (error) {
      handleApiError(error, res);
    }
  });
  app2.get("/api/form-templates/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid template ID" });
      }
      const template = await storage.getFormTemplate(id);
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
      const validationResult = createFormTemplateSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          message: "Validation error",
          errors: validationResult.error.errors
        });
      }
      const data = validationResult.data;
      if (data.isDefault) {
        const existingDefaults = await storage.getFormTemplates();
        for (const template2 of existingDefaults) {
          if (template2.isDefault && template2.id) {
            await storage.updateFormTemplate(template2.id, { isDefault: false });
          }
        }
      }
      const template = await storage.createFormTemplate(data);
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
        const existingDefaults = await storage.getFormTemplates();
        for (const template2 of existingDefaults) {
          if (template2.isDefault && template2.id && template2.id !== id) {
            await storage.updateFormTemplate(template2.id, { isDefault: false });
          }
        }
      }
      const template = await storage.updateFormTemplate(id, data);
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
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid template ID" });
      }
      await storage.deleteFormTemplate(id);
      res.status(204).send();
    } catch (error) {
      handleApiError(error, res);
    }
  });
}

// server/api/applications.ts
init_storage();
import { z as z9 } from "zod";
var applicationSchema = z9.object({
  jobId: z9.number().int().positive(),
  name: z9.string().min(2),
  email: z9.string().email(),
  phone: z9.string().optional(),
  location: z9.string().optional(),
  resumeUrl: z9.string().url().nullable().optional(),
  applicationData: z9.record(z9.any()).optional(),
  // Custom form field answers
  source: z9.string().optional().default("website")
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
import dns from "dns";
import multer from "multer";
import { createClient } from "@supabase/supabase-js";
dns.setDefaultResultOrder("ipv4first");
if (!process.env.NODE_TLS_REJECT_UNAUTHORIZED) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
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
      const { candidateId } = req.body;
      const file = req.file;
      const ext = file.originalname.split(".").pop();
      const path3 = candidateId ? `candidate-${candidateId}.${ext}` : `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;
      const { data: uploadData, error: uploadError } = await supabase.storage.from("resumes").upload(path3, file.buffer, {
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
      const { data: urlData } = supabase.storage.from("resumes").getPublicUrl(path3);
      if (!urlData?.publicUrl) {
        return res.status(500).json({ message: "Failed to generate public URL for uploaded file" });
      }
      res.json({
        url: urlData.publicUrl,
        path: path3
      });
    } catch (error) {
      handleApiError(error, res);
    }
  });
}

// server/api/calendar-webhooks.ts
init_storage();
init_email_validator();
async function updateInterviewFromBooking(candidateEmail, scheduledDate, provider, userId) {
  try {
    const allCandidates = await storage.getCandidates({});
    const candidate = allCandidates.find((c) => c.email.toLowerCase() === candidateEmail.toLowerCase());
    if (!candidate) {
      return false;
    }
    const interviews3 = await storage.getInterviews({ candidateId: candidate.id });
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
      return false;
    }
    await storage.updateInterview(scheduledInterview.id, {
      scheduledDate,
      status: "scheduled",
      notes: scheduledInterview.notes ? `${scheduledInterview.notes}

Automatically updated from ${provider} booking on ${(/* @__PURE__ */ new Date()).toISOString()}` : `Automatically updated from ${provider} booking on ${(/* @__PURE__ */ new Date()).toISOString()}`,
      updatedAt: /* @__PURE__ */ new Date()
    });
    if (candidate.status !== "60_1st_interview_scheduled") {
      await storage.updateCandidate(candidate.id, {
        status: "60_1st_interview_scheduled"
      });
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
    const eventType = payload.event;
    if (eventType !== "invitee.created") {
      return res.status(200).json({ message: "Event ignored" });
    }
    const inviteeData = payload.payload;
    if (!inviteeData) {
      return res.status(400).json({ message: "Missing payload data" });
    }
    const candidateEmail = inviteeData.email;
    if (!candidateEmail) {
      return res.status(400).json({ message: "Missing email in payload" });
    }
    const scheduledEvent = inviteeData.scheduled_event;
    if (!scheduledEvent || !scheduledEvent.start_time) {
      return res.status(400).json({ message: "Missing scheduled_event.start_time" });
    }
    if (inviteeData.rescheduled || inviteeData.status !== "active") {
      return res.status(200).json({ message: "Event was rescheduled or canceled" });
    }
    const scheduledDate = new Date(scheduledEvent.start_time);
    const updated = await updateInterviewFromBooking(candidateEmail, scheduledDate, "calendly", userId);
    if (updated) {
      res.status(200).json({ message: "Interview updated successfully" });
    } else {
      res.status(200).json({ message: "No matching candidate or interview found" });
    }
  } catch (error) {
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

// server/routes.ts
async function registerRoutes(app2) {
  setupAuth(app2);
  setupJobRoutes(app2);
  setupCandidateRoutes(app2);
  setupInterviewRoutes(app2);
  setupAnalyticsRoutes(app2);
  setupHiPeopleRoutes(app2);
  setupUserRoutes(app2);
  setupTestIntegrationRoutes(app2);
  setupSimpleTestRoutes(app2);
  setupGHLSyncRoutes(app2);
  setupCRMSyncRoutes(app2);
  setupGHLAutomationRoutes(app2);
  setupPlatformIntegrationRoutes(app2);
  setupCRMIntegrationRoutes(app2);
  setupFormTemplateRoutes(app2);
  setupApplicationRoutes(app2);
  setupStorageRoutes(app2);
  setupCalendarWebhookRoutes(app2);
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "..", "dist", "public");
  if (!fs.existsSync(distPath)) {
    const fallbackPath = path2.resolve(import.meta.dirname, "public");
    if (fs.existsSync(fallbackPath)) {
      app2.use(express.static(fallbackPath));
      app2.use("*", (_req, res) => {
        res.sendFile(path2.resolve(fallbackPath, "index.html"));
      });
      return;
    }
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
import axios7 from "axios";

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
                  if (result.updated > 0) {
                    console.log(`[Background Sync] ${integration.platformName}: Updated ${result.updated} candidate(s)`);
                  }
                  if (result.errors.length > 0) {
                    console.error(`[Background Sync] ${integration.platformName} error:`, result.errors[0]);
                  }
                } else if (integration.platformId === "airtable") {
                  const result = await executeAirtableSync(user.id, void 0, true);
                  if (result.updated > 0) {
                    console.log(`[Background Sync] ${integration.platformName}: Updated ${result.updated} candidate(s)`);
                  }
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
dns2.setDefaultResultOrder("ipv4first");
if (!process.env.NODE_TLS_REJECT_UNAUTHORIZED) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}
var app = express2();
app.set("trust proxy", 1);
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
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
    await axios7.post(process.env.SLACK_WEBHOOK, {
      text: message
    });
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error sending message to Slack:", error);
    res.status(500).json({ success: false, error: "Failed to send message to Slack" });
  }
});
var appInitialized = false;
var initApp = async () => {
  if (appInitialized) return;
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
  });
  if (process.env.VERCEL !== "1") {
    if (app.get("env") === "development") {
      await setupVite(app, server);
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
var handler = null;
async function api_index_default(req, res) {
  if (!handler) {
    await initApp();
    handler = serverless(server_default, {
      binary: ["image/*", "application/pdf"]
    });
  }
  return handler(req, res);
}
export {
  api_index_default as default
};
