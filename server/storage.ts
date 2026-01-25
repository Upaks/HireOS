import { 
  users, jobs, jobPlatforms, candidates, interviews, evaluations, activityLogs, notificationQueue,
  offers, emailLogs, platformIntegrations, formTemplates, comments, inAppNotifications,
  accounts, accountMembers, workflows, workflowExecutions, workflowExecutionSteps,
  UserRoles,
  type User, 
  type InsertUser,
  type Job,
  type InsertJob,
  type JobPlatform,
  type Candidate,
  type InsertCandidate,
  type Interview,
  type Evaluation,
  type Offer,
  type ActivityLog,
  type NotificationQueueItem,
  type PlatformIntegration,
  type InsertPlatformIntegration,
  type FormTemplate,
  type InsertFormTemplate,
  type Comment,
  type InsertComment,
  type InAppNotification,
  type InsertInAppNotification,
  type Account,
  type InsertAccount,
  type AccountMember,
  type InsertAccountMember,
  type Workflow,
  type InsertWorkflow,
  type WorkflowExecution,
  type InsertWorkflowExecution,
  type WorkflowExecutionStep,
  type InsertWorkflowExecutionStep
} from "@shared/schema";
import { isLikelyInvalidEmail } from "./email-validator";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { db, pool } from "./db";
import { and, eq, or, isNull, desc, sql } from "drizzle-orm";
import { encrypt, decrypt } from "./security/encryption";

// Database session store configuration
const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // Session store
  sessionStore: any; // Type for express-session store
  
  // Account operations
  getUserAccountId(userId: number): Promise<number | null>;
  createAccount(name: string, userId: number, role?: string): Promise<Account>;
  getAccountMembers(accountId: number): Promise<AccountMember[]>;
  
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(accountId?: number): Promise<User[]>;
  updateUser(id: number, data: Partial<User>): Promise<User>;
  deleteUser(id: number): Promise<void>;
  
  // Job operations
  createJob(job: InsertJob & { description: string, hiPeopleLink?: string, suggestedTitle?: string, accountId: number }): Promise<Job>;
  getJob(id: number, accountId: number): Promise<Job | undefined>;
  getJobs(accountId: number, status?: string): Promise<Job[]>;
  updateJob(id: number, accountId: number, data: Partial<Job>): Promise<Job>;
  
  // Job platform operations
  createJobPlatform(platform: Partial<JobPlatform> & { accountId: number }): Promise<JobPlatform>;
  getJobPlatforms(jobId: number, accountId: number): Promise<JobPlatform[]>;
  
  // Platform integration operations
  getPlatformIntegrations(): Promise<PlatformIntegration[]>;
  getPlatformIntegration(platformId: string): Promise<PlatformIntegration | undefined>;
  createPlatformIntegration(integration: InsertPlatformIntegration): Promise<PlatformIntegration>;
  updatePlatformIntegration(platformId: string, data: Partial<PlatformIntegration>): Promise<PlatformIntegration>;
  deletePlatformIntegration(platformId: string): Promise<void>;
  
  // Form template operations
  getFormTemplates(accountId: number): Promise<FormTemplate[]>;
  getFormTemplate(id: number, accountId: number): Promise<FormTemplate | undefined>;
  getDefaultFormTemplate(accountId: number): Promise<FormTemplate | undefined>;
  createFormTemplate(template: InsertFormTemplate & { accountId: number }): Promise<FormTemplate>;
  updateFormTemplate(id: number, accountId: number, data: Partial<FormTemplate>): Promise<FormTemplate>;
  deleteFormTemplate(id: number, accountId: number): Promise<void>;
  
  // Candidate operations
  createCandidate(candidate: InsertCandidate & { accountId: number }): Promise<Candidate>;
  getCandidate(id: number, accountId: number): Promise<Candidate | undefined>;
  getCandidates(accountId: number, filters: { jobId?: number, status?: string }): Promise<Candidate[]>;
  updateCandidate(id: number, accountId: number, data: Partial<Candidate>): Promise<Candidate>;
  getCandidateByNameAndEmail(name: string, email: string, accountId: number): Promise<Candidate | undefined>;
  getCandidateByGHLContactId(ghlContactId: string, accountId: number): Promise<Candidate | undefined>;
  
  // Interview operations
  createInterview(interview: Partial<Interview> & { accountId: number }): Promise<Interview>;
  getInterview(id: number, accountId: number): Promise<Interview | undefined>;
  getInterviews(accountId: number, filters?: { candidateId?: number, interviewerId?: number, status?: string }): Promise<Interview[]>;
  updateInterview(id: number, accountId: number, data: Partial<Interview>): Promise<Interview>;
  deleteInterview(id: number, accountId: number): Promise<void>;
  
  // Evaluation operations
  createEvaluation(evaluation: Partial<Evaluation> & { accountId: number }): Promise<Evaluation>;
  getEvaluationByInterview(interviewId: number, accountId: number): Promise<Evaluation | undefined>;
  updateEvaluation(id: number, accountId: number, data: Partial<Evaluation>): Promise<Evaluation>;
  
  // Offer operations
  createOffer(offer: Partial<Offer> & { accountId: number }): Promise<Offer>;
  getOfferByCandidate(candidateId: number, accountId: number): Promise<Offer | undefined>;
  getOfferByToken(token: string): Promise<Offer | undefined>; // Token lookup doesn't need accountId
  updateOffer(id: number, accountId: number, data: Partial<Offer>): Promise<Offer>;
  
  // Activity logs
  createActivityLog(log: Omit<ActivityLog, 'id'> & { accountId: number }): Promise<ActivityLog>;
  
  // Notifications
  createNotification(notification: Omit<NotificationQueueItem, 'id' | 'createdAt' | 'processAttempts' | 'lastAttemptAt' | 'error'>): Promise<NotificationQueueItem>;
  
  // Direct email sending (bypasses notification queue)
  sendDirectEmail(to: string, subject: string, body: string, userId?: number): Promise<void>;
  
  // Direct Slack notification (no queue, immediate send)
  sendSlackNotification(userId: number, message: string): Promise<void>;
  
  // Get users who should receive Slack notifications based on scope
  getUsersForSlackNotification(triggerUserId: number, eventType: string): Promise<User[]>;
  
  // Comment operations
  createComment(comment: InsertComment & { accountId: number }): Promise<Comment>;
  getComments(entityType: string, entityId: number, accountId: number): Promise<Comment[]>;
  deleteComment(id: number, userId: number, accountId: number): Promise<void>;
  getUsersForMentionAutocomplete(accountId: number, query?: string): Promise<User[]>;
  
  // Workflow operations
  createWorkflow(workflow: any & { accountId: number }): Promise<any>;
  getWorkflows(accountId: number): Promise<any[]>;
  getWorkflow(id: number, accountId: number): Promise<any | undefined>;
  updateWorkflow(id: number, accountId: number, data: Partial<any>): Promise<any>;
  deleteWorkflow(id: number, accountId: number): Promise<void>;
  getActiveWorkflowsByTrigger(accountId: number, triggerType: string, triggerConfig?: any): Promise<any[]>;
  createWorkflowExecution(execution: any & { accountId: number }): Promise<any>;
  updateWorkflowExecution(id: number, accountId: number, data: Partial<any>): Promise<any>;
  createWorkflowExecutionStep(step: any): Promise<any>;
  updateWorkflowExecutionStep(id: number, data: Partial<any>): Promise<any>;
  getWorkflowExecutions(workflowId: number, accountId: number, limit?: number): Promise<any[]>;
  getWorkflowExecutionSteps(executionId: number): Promise<any[]>;
  incrementWorkflowExecutionCount(workflowId: number, accountId: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: any;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool,
      createTableIfMissing: true 
    });
    // We're using the rebuild-users.ts script to create users now
  }

  // SECURITY: Helper to decrypt sensitive user fields
  private decryptUserFields(user: User): User {
    if (!user) return user;
    
    const decrypted = { ...user };
    
    // Decrypt sensitive fields if they exist
    // The decrypt function handles legacy unencrypted data gracefully
    if (decrypted.openRouterApiKey) {
      decrypted.openRouterApiKey = decrypt(decrypted.openRouterApiKey);
    }
    
    if (decrypted.calendlyToken) {
      decrypted.calendlyToken = decrypt(decrypted.calendlyToken);
    }
    
    if (decrypted.slackWebhookUrl) {
      // decrypt() handles legacy data gracefully - no try/catch needed
      decrypted.slackWebhookUrl = decrypt(decrypted.slackWebhookUrl);
    }
    
    return decrypted;
  }

  // SECURITY: Helper to encrypt sensitive user fields before saving
  private encryptUserFields(data: Partial<User>): Partial<User> {
    const encrypted = { ...data };
    
    // Encrypt sensitive fields if they exist
    if (encrypted.openRouterApiKey !== undefined && encrypted.openRouterApiKey !== null) {
      encrypted.openRouterApiKey = encrypt(encrypted.openRouterApiKey);
    }
    
    if (encrypted.calendlyToken !== undefined && encrypted.calendlyToken !== null) {
      encrypted.calendlyToken = encrypt(encrypted.calendlyToken);
    }
    
    if (encrypted.slackWebhookUrl !== undefined && encrypted.slackWebhookUrl !== null) {
      encrypted.slackWebhookUrl = encrypt(encrypted.slackWebhookUrl);
    }
    
    return encrypted;
  }

  // Account operations
  async getUserAccountId(userId: number): Promise<number | null> {
    try {
      const [member] = await db
        .select({ accountId: accountMembers.accountId })
        .from(accountMembers)
        .where(eq(accountMembers.userId, userId))
        .limit(1);
      
      return member?.accountId || null;
    } catch (error) {
      console.error("Error getting user account ID:", error);
      return null;
    }
  }

  async createAccount(name: string, userId: number, role: string = UserRoles.ADMIN): Promise<Account> {
    // Create account
    const [account] = await db
      .insert(accounts)
      .values({
        name,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    
    // Add user as member
    await db
      .insert(accountMembers)
      .values({
        accountId: account.id,
        userId,
        role,
        joinedAt: new Date(),
      });
    
    return account;
  }

  async getAccountMembers(accountId: number): Promise<AccountMember[]> {
    return await db
      .select()
      .from(accountMembers)
      .where(eq(accountMembers.accountId, accountId));
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      if (!user) return undefined;
      
      // SECURITY: Decrypt sensitive fields before returning
      return this.decryptUserFields(user);
    } catch (error) {
      console.error("Error getting user by ID:", error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.username, username));
      if (!user) return undefined;
      
      // SECURITY: Decrypt sensitive fields before returning
      return this.decryptUserFields(user);
    } catch (error) {
      // Better error logging
      if (error instanceof Error) {
        console.error(`Error getting user by username "${username}":`, error.message);
        // Only log stack in development
        if (process.env.NODE_ENV === 'development') {
          console.error("Stack:", error.stack);
        }
      } else {
        console.error("Error getting user by username:", String(error));
      }
      return undefined;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Default to hiringManager if no role specified
    const role = insertUser.role || UserRoles.HIRING_MANAGER;
    
    // SECURITY: Encrypt sensitive fields before saving
    const encryptedData = this.encryptUserFields(insertUser as Partial<User>);
    
    const [user] = await db
      .insert(users)
      .values({ ...encryptedData, role, createdAt: new Date() } as any)
      .returning();
    
    // SECURITY: Decrypt sensitive fields before returning
    return this.decryptUserFields(user);
  }
  
  async getAllUsers(accountId?: number): Promise<User[]> {
    let usersList: User[];
    
    if (accountId) {
      // Get users who are members of this account
      usersList = await db
        .select({
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
          slackNotificationEvents: users.slackNotificationEvents,
        })
        .from(users)
        .innerJoin(accountMembers, eq(users.id, accountMembers.userId))
        .where(eq(accountMembers.accountId, accountId));
    } else {
      // Legacy: Get all users (for backward compatibility)
      usersList = await db.select().from(users);
    }
    
    // SECURITY: Decrypt sensitive fields for all users
    return usersList.map(user => this.decryptUserFields(user));
  }
  
  async updateUser(id: number, data: Partial<User>): Promise<User> {
    // SECURITY: Encrypt sensitive fields before saving
    const encryptedData = this.encryptUserFields(data);
    
    const [updatedUser] = await db
      .update(users)
      .set(encryptedData)
      .where(eq(users.id, id))
      .returning();
    
    // SECURITY: Decrypt sensitive fields before returning
    return this.decryptUserFields(updatedUser);
  }
  
  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  // Job operations
  async createJob(job: InsertJob & { description: string, hiPeopleLink?: string, suggestedTitle?: string, accountId: number }): Promise<Job> {
    const [newJob] = await db
      .insert(jobs)
      .values({
        ...job,
        accountId: job.accountId,
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
        postedDate: null,
        hiPeopleLink: job.hiPeopleLink || null,
        suggestedTitle: job.suggestedTitle || null,
        expressReview: job.expressReview || null,
        candidateCount: 0
      })
      .returning();
    
    return newJob;
  }

  async getJob(id: number, accountId: number): Promise<Job | undefined> {
    const [job] = await db
      .select()
      .from(jobs)
      .where(and(eq(jobs.id, id), eq(jobs.accountId, accountId)));
    return job || undefined;
  }

  async getJobs(accountId: number, status?: string): Promise<Job[]> {
    const conditions = [eq(jobs.accountId, accountId)];
    if (status && status !== 'all') {
      conditions.push(eq(jobs.status, status));
    }
    return await db
      .select()
      .from(jobs)
      .where(and(...conditions));
  }

  async updateJob(id: number, accountId: number, data: Partial<Job>): Promise<Job> {
    const [updatedJob] = await db
      .update(jobs)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(and(eq(jobs.id, id), eq(jobs.accountId, accountId)))
      .returning();
    
    return updatedJob;
  }

  // Job platform operations
  async createJobPlatform(platform: Partial<JobPlatform> & { accountId: number }): Promise<JobPlatform> {
    const [newPlatform] = await db
      .insert(jobPlatforms)
      .values({
        accountId: platform.accountId,
        jobId: platform.jobId!,
        platform: platform.platform!,
        platformJobId: platform.platformJobId || '',
        postUrl: platform.postUrl || '',
        status: platform.status || 'pending',
        errorMessage: platform.errorMessage || '',
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    
    return newPlatform;
  }

  async getJobPlatforms(jobId: number, accountId: number): Promise<JobPlatform[]> {
    return await db
      .select()
      .from(jobPlatforms)
      .where(and(eq(jobPlatforms.jobId, jobId), eq(jobPlatforms.accountId, accountId)));
  }

  // Platform integration operations
  async getPlatformIntegrations(userId?: number): Promise<PlatformIntegration[]> {
    let integrations: PlatformIntegration[];
    
    if (userId) {
      // Get user-specific integrations (CRM/ATS) and system-wide integrations (job posting platforms)
      integrations = await db
        .select()
        .from(platformIntegrations)
        .where(
          // User's integrations OR system-wide (user_id IS NULL)
          or(
            eq(platformIntegrations.userId, userId),
            isNull(platformIntegrations.userId)
          )
        )
        .orderBy(platformIntegrations.platformName);
    } else {
      // Legacy: Get all integrations (for backward compatibility)
      integrations = await db
        .select()
        .from(platformIntegrations)
        .orderBy(platformIntegrations.platformName);
    }
    
    // SECURITY: Decrypt sensitive fields for all integrations
    return integrations.map(integration => this.decryptIntegrationFields(integration));
  }

  // SECURITY: Helper to decrypt sensitive platform integration fields
  private decryptIntegrationFields(integration: PlatformIntegration): PlatformIntegration {
    if (!integration) return integration;
    
    const decrypted = { ...integration };
    
    // Decrypt OAuth tokens if they exist
    // The decrypt function handles legacy unencrypted data gracefully
    if (decrypted.oauthToken) {
      decrypted.oauthToken = decrypt(decrypted.oauthToken);
    }
    
    if (decrypted.oauthRefreshToken) {
      decrypted.oauthRefreshToken = decrypt(decrypted.oauthRefreshToken);
    }
    
    // Decrypt credentials JSONB if it exists
    if (decrypted.credentials && typeof decrypted.credentials === 'object') {
      // Credentials is JSONB, decrypt individual sensitive fields within it
      const creds = decrypted.credentials as any;
      if (typeof creds === 'string') {
        // If credentials is stored as encrypted string, decrypt and parse
        try {
          decrypted.credentials = JSON.parse(decrypt(creds)) as any;
        } catch {
          // If decryption/parsing fails, keep original
          decrypted.credentials = creds;
        }
      } else {
        // Decrypt sensitive fields within credentials object
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
  private encryptIntegrationFields(data: Partial<PlatformIntegration>): Partial<PlatformIntegration> {
    const encrypted = { ...data };
    
    // Encrypt OAuth tokens if they exist
    if (encrypted.oauthToken !== undefined && encrypted.oauthToken !== null) {
      encrypted.oauthToken = encrypt(encrypted.oauthToken);
    }
    
    if (encrypted.oauthRefreshToken !== undefined && encrypted.oauthRefreshToken !== null) {
      encrypted.oauthRefreshToken = encrypt(encrypted.oauthRefreshToken);
    }
    
    // Encrypt sensitive fields within credentials JSONB
    if (encrypted.credentials && typeof encrypted.credentials === 'object') {
      const creds = encrypted.credentials as any;
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

  async getPlatformIntegration(platformId: string, userId?: number): Promise<PlatformIntegration | undefined> {
    let integration: PlatformIntegration | undefined;
    
    if (userId) {
      // Get user-specific integration
      const [result] = await db
        .select()
        .from(platformIntegrations)
        .where(
          and(
            eq(platformIntegrations.platformId, platformId),
            eq(platformIntegrations.userId, userId)
          )
        );
      integration = result || undefined;
    } else {
      // Legacy: Get by platformId only (for backward compatibility)
      const [result] = await db
        .select()
        .from(platformIntegrations)
        .where(eq(platformIntegrations.platformId, platformId));
      integration = result || undefined;
    }
    
    if (!integration) return undefined;
    
    // SECURITY: Decrypt sensitive fields before returning
    return this.decryptIntegrationFields(integration);
  }

  // Get CRM/ATS integrations for a user
  async getCRMIntegrations(userId: number): Promise<PlatformIntegration[]> {
    const integrations = await db
      .select()
      .from(platformIntegrations)
      .where(
        and(
          eq(platformIntegrations.userId, userId),
          or(
            eq(platformIntegrations.platformType, "crm"),
            eq(platformIntegrations.platformType, "ats")
          )
        )
      )
      .orderBy(platformIntegrations.platformName);
    
    // SECURITY: Decrypt sensitive fields for all integrations
    return integrations.map(integration => this.decryptIntegrationFields(integration));
  }

  async createPlatformIntegration(integration: InsertPlatformIntegration): Promise<PlatformIntegration> {
    // SECURITY: Encrypt sensitive fields before saving
    const encryptedData = this.encryptIntegrationFields(integration as Partial<PlatformIntegration>);
    
    const [newIntegration] = await db
      .insert(platformIntegrations)
      .values({
        ...encryptedData,
        createdAt: new Date(),
        updatedAt: new Date()
      } as any)
      .returning();
    
    // SECURITY: Decrypt sensitive fields before returning
    return this.decryptIntegrationFields(newIntegration);
  }

  async updatePlatformIntegration(platformId: string, data: Partial<PlatformIntegration>): Promise<PlatformIntegration> {
    // SECURITY: Encrypt sensitive fields before saving
    const encryptedData = this.encryptIntegrationFields(data);
    
    const [updatedIntegration] = await db
      .update(platformIntegrations)
      .set({
        ...encryptedData,
        updatedAt: new Date()
      })
      .where(eq(platformIntegrations.platformId, platformId))
      .returning();
    
    // SECURITY: Decrypt sensitive fields before returning
    return this.decryptIntegrationFields(updatedIntegration);
  }

  async deletePlatformIntegration(platformId: string): Promise<void> {
    await db
      .delete(platformIntegrations)
      .where(eq(platformIntegrations.platformId, platformId));
  }

  // Form template operations
  async getFormTemplates(accountId: number): Promise<FormTemplate[]> {
    return await db
      .select()
      .from(formTemplates)
      .where(eq(formTemplates.accountId, accountId))
      .orderBy(formTemplates.name);
  }

  async getFormTemplate(id: number, accountId: number): Promise<FormTemplate | undefined> {
    const [template] = await db
      .select()
      .from(formTemplates)
      .where(and(eq(formTemplates.id, id), eq(formTemplates.accountId, accountId)));
    return template || undefined;
  }

  async getDefaultFormTemplate(accountId: number): Promise<FormTemplate | undefined> {
    const [template] = await db
      .select()
      .from(formTemplates)
      .where(and(eq(formTemplates.isDefault, true), eq(formTemplates.accountId, accountId)))
      .limit(1);
    return template || undefined;
  }

  async createFormTemplate(template: InsertFormTemplate & { accountId: number }): Promise<FormTemplate> {
    const [newTemplate] = await db
      .insert(formTemplates)
      .values({
        ...template,
        accountId: template.accountId,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    return newTemplate;
  }

  async updateFormTemplate(id: number, accountId: number, data: Partial<FormTemplate>): Promise<FormTemplate> {
    const [updatedTemplate] = await db
      .update(formTemplates)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(and(eq(formTemplates.id, id), eq(formTemplates.accountId, accountId)))
      .returning();
    return updatedTemplate;
  }

  async deleteFormTemplate(id: number, accountId: number): Promise<void> {
    await db
      .delete(formTemplates)
      .where(and(eq(formTemplates.id, id), eq(formTemplates.accountId, accountId)));
  }

  // Candidate operations
  async createCandidate(candidate: InsertCandidate & { accountId: number }): Promise<Candidate> {
    const [newCandidate] = await db
      .insert(candidates)
      .values({
        ...candidate,
        accountId: candidate.accountId,
        status: candidate.status || 'new',
        finalDecisionStatus: null, // Explicitly set to null for new candidates
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    
    if (!newCandidate) {
      throw new Error('Failed to create candidate - database insert returned no result');
    }
    
    // Get the job data to enrich the candidate
    const job = newCandidate.jobId ? await this.getJob(newCandidate.jobId, candidate.accountId) : null;
    return { ...newCandidate, job: job || null };
  }

  async getCandidate(id: number, accountId: number): Promise<Candidate | undefined> {
    const [candidate] = await db
      .select()
      .from(candidates)
      .where(and(eq(candidates.id, id), eq(candidates.accountId, accountId)));
    
    if (!candidate) return undefined;
    
    // Enrich with job data
    const job = candidate.jobId ? await this.getJob(candidate.jobId, accountId) : null;
    return { ...candidate, job: job || null };
  }

  async getCandidates(accountId: number, filters: { jobId?: number, status?: string }): Promise<Candidate[]> {
    const conditions = [eq(candidates.accountId, accountId)];
    
    if (filters.jobId !== undefined) {
      conditions.push(eq(candidates.jobId, filters.jobId));
    }
    
    if (filters.status && filters.status !== 'all') {
      conditions.push(eq(candidates.status, filters.status));
    }
    
    const candidatesList = await db
      .select()
      .from(candidates)
      .where(and(...conditions));
    
    // Enrich candidates with job data - use array instead of Set for compatibility
    const jobIdsArray = candidatesList.map(c => c.jobId);
    const uniqueJobIds = jobIdsArray.filter((id, index) => jobIdsArray.indexOf(id) === index && id !== null);
    const jobsMap = new Map();
    
    if (uniqueJobIds.length > 0) {
      const jobsList = await Promise.all(
        uniqueJobIds.map(id => this.getJob(id!, accountId))
      );
      
      jobsList.forEach(job => {
        if (job) {
          jobsMap.set(job.id, job);
        }
      });
    }
    
    return candidatesList.map(candidate => ({
      ...candidate,
      job: jobsMap.get(candidate.jobId) || null
    }));
  }

  async getCandidateByNameAndEmail(name: string, email: string, accountId: number): Promise<Candidate | undefined> {
    try {
      const result = await db
        .select()
        .from(candidates)
        .where(
          and(
            eq(candidates.name, name),
            eq(candidates.email, email),
            eq(candidates.accountId, accountId)
          )
        )
        .limit(1);
      
      return result[0];
    } catch (error) {
      console.error('Error fetching candidate by name and email:', error);
      return undefined;
    }
  }

  async getCandidateByGHLContactId(ghlContactId: string, accountId: number): Promise<Candidate | undefined> {
    try {
      const result = await db
        .select()
        .from(candidates)
        .where(and(eq(candidates.ghlContactId, ghlContactId), eq(candidates.accountId, accountId)))
        .limit(1);
      
      if (!result[0]) return undefined;
      
      // Enrich with job data
      const job = result[0].jobId ? await this.getJob(result[0].jobId, accountId) : null;
      return { ...result[0], job: job || null };
    } catch (error) {
      console.error('Error fetching candidate by GHL contact ID:', error);
      return undefined;
    }
  }

  async updateCandidate(id: number, accountId: number, data: Partial<Candidate>): Promise<Candidate> {
    // Ensure consistent status values between currentStatus and finalDecisionStatus
    const updatedData = { ...data };
    
    // Only auto-sync if finalDecisionStatus is explicitly provided (not undefined)
    // This preserves null values when they should stay null
    
    // If status is being updated to rejected, also update finalDecisionStatus (only if finalDecisionStatus is being explicitly set)
    if (data.status === '200_rejected' && data.hasOwnProperty('finalDecisionStatus') && !data.finalDecisionStatus) {
      updatedData.finalDecisionStatus = 'rejected';
    }
    // If status is being updated to offer sent, also update finalDecisionStatus (only if finalDecisionStatus is being explicitly set)
    else if (data.status === '95_offer_sent' && data.hasOwnProperty('finalDecisionStatus') && !data.finalDecisionStatus) {
      updatedData.finalDecisionStatus = 'offer_sent';
    }
    
    // Vice versa - if finalDecisionStatus is updated, also update current status
    if (data.finalDecisionStatus === 'rejected' && !data.status) {
      updatedData.status = '200_rejected';
    }
    else if (data.finalDecisionStatus === 'offer_sent' && !data.status) {
      updatedData.status = '95_offer_sent';
    }
    
    const updateData = {
      ...updatedData,
      updatedAt: new Date()
    };

    const [updatedCandidate] = await db
      .update(candidates)
      .set(updateData)
      .where(and(eq(candidates.id, id), eq(candidates.accountId, accountId)))
      .returning();

    // Enrich with job data
    const job = updatedCandidate.jobId ? await this.getJob(updatedCandidate.jobId, accountId) : null;
    return { ...updatedCandidate, job: job || null };
  }


  // Interview operations
  async createInterview(interviewData: Partial<Interview> & { accountId: number }): Promise<Interview> {
    const [interview] = await db
      .insert(interviews)
      .values({
        accountId: interviewData.accountId,
        candidateId: interviewData.candidateId!,
        type: interviewData.type || 'video',
        status: interviewData.status || 'scheduled',
        scheduledDate: interviewData.scheduledDate || null,
        conductedDate: interviewData.conductedDate || null,
        interviewerId: interviewData.interviewerId || null,
        videoUrl: interviewData.videoUrl || null,
        notes: interviewData.notes || null,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    
    return interview;
  }

  async getInterview(id: number, accountId: number): Promise<Interview | undefined> {
    const [interview] = await db
      .select()
      .from(interviews)
      .where(and(eq(interviews.id, id), eq(interviews.accountId, accountId)));
    
    return interview || undefined;
  }

  async getInterviews(accountId: number, filters?: { candidateId?: number, interviewerId?: number, status?: string }): Promise<Interview[]> {
    try {
      const conditions = [eq(interviews.accountId, accountId)];
      
      if (filters?.candidateId) {
        conditions.push(eq(interviews.candidateId, filters.candidateId));
      }
      
      if (filters?.interviewerId) {
        conditions.push(eq(interviews.interviewerId, filters.interviewerId));
      }
      
      if (filters?.status) {
        conditions.push(eq(interviews.status, filters.status));
      }
      
      // Build base query with joins
      let baseQuery = db
        .select({
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
          interviewerName: users.fullName,
        })
        .from(interviews)
        .leftJoin(candidates, eq(interviews.candidateId, candidates.id))
        .leftJoin(users, eq(interviews.interviewerId, users.id));
      
      // Apply conditions
      baseQuery = baseQuery.where(and(...conditions)) as any;
      
      const results = await baseQuery;
      
      // Map results to Interview format with nested candidate/interviewer objects
      return results.map((row: any) => ({
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
          email: row.candidateEmail,
        } : undefined,
        interviewer: row.interviewerName ? {
          id: row.interviewerId,
          fullName: row.interviewerName,
        } : undefined,
      })) as Interview[];
    } catch (error) {
      console.error("Error getting interviews:", error);
      return [];
    }
  }

  async updateInterview(id: number, accountId: number, data: Partial<Interview>): Promise<Interview> {
    const [updatedInterview] = await db
      .update(interviews)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(and(eq(interviews.id, id), eq(interviews.accountId, accountId)))
      .returning();
    return updatedInterview;
  }

  async deleteInterview(id: number, accountId: number): Promise<void> {
    // First, delete any evaluations associated with this interview
    // (due to foreign key constraint)
    await db
      .delete(evaluations)
      .where(and(eq(evaluations.interviewId, id), eq(evaluations.accountId, accountId)));
    
    // Then delete the interview
    await db
      .delete(interviews)
      .where(and(eq(interviews.id, id), eq(interviews.accountId, accountId)));
  }

  // Evaluation operations
  async createEvaluation(evaluationData: Partial<Evaluation> & { accountId: number }): Promise<Evaluation> {
    const { accountId, ...rest } = evaluationData;
    const [evaluation] = await db
      .insert(evaluations)
      .values({
        accountId: accountId,
        interviewId: evaluationData.interviewId!,
        evaluatorId: evaluationData.evaluatorId!,
        overallRating: evaluationData.overallRating!,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...rest
      })
      .returning();
    return evaluation;
  }

  async getEvaluationByInterview(interviewId: number, accountId: number): Promise<Evaluation | undefined> {
    const [evaluation] = await db
      .select()
      .from(evaluations)
      .where(and(eq(evaluations.interviewId, interviewId), eq(evaluations.accountId, accountId)));
    return evaluation || undefined;
  }

  async updateEvaluation(id: number, accountId: number, data: Partial<Evaluation>): Promise<Evaluation> {
    const [updatedEvaluation] = await db
      .update(evaluations)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(and(eq(evaluations.id, id), eq(evaluations.accountId, accountId)))
      .returning();
    return updatedEvaluation;
  }

  // Activity logs
  async createActivityLog(log: Omit<ActivityLog, 'id'> & { accountId: number }): Promise<ActivityLog> {
    const [activityLog] = await db
      .insert(activityLogs)
      .values({
        ...log,
        accountId: log.accountId,
        timestamp: log.timestamp || new Date()
      })
      .returning();
    
    return activityLog;
  }

  // Notifications
  async createNotification(notification: Omit<NotificationQueueItem, 'id' | 'createdAt' | 'processAttempts' | 'lastAttemptAt' | 'error'>): Promise<NotificationQueueItem> {
    const [newNotification] = await db
      .insert(notificationQueue)
      .values({
        type: notification.type,
        status: notification.status || 'pending',
        payload: notification.payload,
        processAfter: notification.processAfter || new Date(),
        createdAt: new Date(),
        processAttempts: 0,
        lastAttemptAt: null,
        error: null
      })
      .returning();
    
    return newNotification;
  }

  // Offer operations
  async createOffer(offerData: Partial<Offer> & { accountId: number }): Promise<Offer> {
    // Generate unique acceptance token
    const crypto = await import('crypto');
    const acceptanceToken = crypto.randomBytes(32).toString('hex');
    
    const [offer] = await db
      .insert(offers)
      .values({
        accountId: offerData.accountId,
        candidateId: offerData.candidateId!,
        offerType: offerData.offerType!,
        compensation: offerData.compensation!,
        startDate: offerData.startDate || null,
        notes: offerData.notes || null,
        status: offerData.status || 'draft',
        sentDate: offerData.sentDate || null,
        contractUrl: offerData.contractUrl || null,
        acceptanceToken: acceptanceToken,
        approvedById: offerData.approvedById || null,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    
    return offer;
  }

  async getOfferByCandidate(candidateId: number, accountId: number): Promise<Offer | undefined> {
    const [offer] = await db
      .select()
      .from(offers)
      .where(and(eq(offers.candidateId, candidateId), eq(offers.accountId, accountId)))
      .limit(1);
    
    return offer || undefined;
  }

  async getOfferByToken(token: string): Promise<Offer | undefined> {
    const [offer] = await db
      .select()
      .from(offers)
      .where(eq(offers.acceptanceToken, token));
    
    return offer || undefined;
  }

  async updateOffer(id: number, accountId: number, data: Partial<Offer>): Promise<Offer> {
    const [updatedOffer] = await db
      .update(offers)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(and(eq(offers.id, id), eq(offers.accountId, accountId)))
      .returning();
    
    return updatedOffer;
  }

  // Direct email sending (bypasses notification queue)
  async sendDirectEmail(to: string, subject: string, body: string, userId?: number): Promise<void> {
    // Pre-validate the email address before attempting to send
    if (isLikelyInvalidEmail(to)) {
      // Email validation failed - candidate email does not exist
      
      // Log the failure in email_logs
      await db
        .insert(emailLogs)
        .values({
          recipientEmail: to,
          subject,
          template: 'direct',
          context: { body },
          status: 'failed',
          error: 'Candidate email does not exist',
          createdAt: new Date()
        });
      
      // Throw our custom error for the UI to handle
      const error = new Error('Candidate email does not exist');
      (error as any).isNonExistentEmailError = true;
      throw error;
    }

    // Require userId to use Gmail OAuth integration
    if (!userId) {
      const error = new Error('Gmail integration required. Please connect your Gmail account in Settings > Integrations to send emails.');
      await db
        .insert(emailLogs)
        .values({
          recipientEmail: to,
          subject,
          template: 'direct',
          context: { body },
          status: 'failed',
          error: error.message,
          createdAt: new Date()
        });
      throw error;
    }

    try {
      // Use Gmail OAuth integration instead of hardcoded credentials
      const { sendGmailEmail } = await import("./api/gmail-integration");
      await sendGmailEmail(userId, to, subject, body);

      // Log the email but don't add to queue
      await db
        .insert(emailLogs)
        .values({
          recipientEmail: to,
          subject: subject,
          template: 'direct',
          context: { body },
          status: 'sent',
          sentAt: new Date(),
          createdAt: new Date()
        });
    } catch (error: unknown) {
      // Check if this is an email address not found error
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isNonExistentEmailError = 
        errorMessage.includes("User doesn't exist") || 
        errorMessage.includes("User unknown") || 
        errorMessage.includes("550") ||
        errorMessage.includes("No such user") ||
        errorMessage.includes("recipient rejected") || 
        errorMessage.includes("Invalid recipient");
      
      const errorType = isNonExistentEmailError ? 'non_existent_email' : 'email_error';
      const formattedError = isNonExistentEmailError ? 'Candidate email does not exist' : errorMessage;

      // Log the failure in email_logs
      await db
        .insert(emailLogs)
        .values({
          recipientEmail: to,
          subject,
          template: 'direct',
          context: { body },
          status: 'failed', // Mark as failed
          error: formattedError, // Use standardized error message if applicable
          createdAt: new Date()
        });

      // Create a custom error with additional metadata
      const enhancedError = new Error(formattedError);
      (enhancedError as any).isNonExistentEmailError = isNonExistentEmailError;
      (enhancedError as any).originalError = errorMessage;
      
      throw enhancedError; // Rethrow enhanced error after logging
    }
  }

  // Direct Slack notification (no queue, immediate send)
  async sendSlackNotification(userId: number, message: string): Promise<void> {
    try {
      const user = await this.getUser(userId);
      if (!user || !user.slackWebhookUrl) {
        return; // User hasn't configured Slack, silently skip
      }

      const axios = await import('axios');
      await axios.default.post(user.slackWebhookUrl, {
        text: message,
      });
    } catch (error) {
      // Log error but don't throw - Slack failures shouldn't break the main flow
      console.error(`Failed to send Slack notification to user ${userId}:`, error);
    }
  }

  // Get users who should receive Slack notifications based on scope
  async getUsersForSlackNotification(triggerUserId: number, eventType: string): Promise<User[]> {
    const triggerUser = await this.getUser(triggerUserId);
    if (!triggerUser) {
      return [];
    }

    // Check if trigger user has Slack configured and wants this event type
    const userEvents = triggerUser.slackNotificationEvents as string[] | null;
    if (!triggerUser.slackWebhookUrl || !userEvents?.includes(eventType)) {
      return []; // User doesn't want this event type
    }

    const scope = triggerUser.slackNotificationScope;
    
    if (scope === "all_users") {
      // Get all users with Slack configured and this event enabled
      const allUsers = await db.select().from(users);
      const decryptedUsers = allUsers.map(user => this.decryptUserFields(user));
      return decryptedUsers.filter(user => {
        if (!user.slackWebhookUrl) return false;
        const events = user.slackNotificationEvents as string[] | null;
        return events?.includes(eventType) || false;
      });
    } else if (scope === "specific_roles") {
      // Get users with specific roles
      const allowedRoles = triggerUser.slackNotificationRoles as string[] | null;
      if (!allowedRoles || allowedRoles.length === 0) {
        return [triggerUser]; // Default to just the trigger user
      }
      
      const allUsers = await db.select().from(users);
      const decryptedUsers = allUsers.map(user => this.decryptUserFields(user));
      return decryptedUsers.filter(user => {
        if (!user.slackWebhookUrl) return false;
        if (!allowedRoles.includes(user.role)) return false;
        const events = user.slackNotificationEvents as string[] | null;
        return events?.includes(eventType) || false;
      });
    } else {
      // Default: only notify the user who triggered the event
      return [triggerUser];
    }
  }

  // Comment operations
  async createComment(comment: InsertComment & { accountId: number }): Promise<Comment> {
    const [newComment] = await db
      .insert(comments)
      .values({
        ...comment,
        accountId: comment.accountId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return newComment;
  }

  async getComments(entityType: string, entityId: number, accountId: number): Promise<Comment[]> {
    const commentsList = await db
      .select({
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
        userRole: users.role,
      })
      .from(comments)
      .leftJoin(users, eq(comments.userId, users.id))
      .where(
        and(
          eq(comments.entityType, entityType),
          eq(comments.entityId, entityId),
          eq(comments.accountId, accountId)
        )
      )
      .orderBy(desc(comments.createdAt));

    // Map to include user info
    return commentsList.map((row: any) => ({
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
        role: row.userRole,
      } : undefined,
    })) as any[];
  }

  async deleteComment(id: number, userId: number, accountId: number): Promise<void> {
    // Check if user is admin or the comment author
    const [comment] = await db
      .select()
      .from(comments)
      .where(and(eq(comments.id, id), eq(comments.accountId, accountId)));

    if (!comment) {
      throw new Error('Comment not found');
    }

    // Get user to check if admin
    const user = await this.getUser(userId);
    const isAdmin = user?.role === 'admin' || user?.role === 'ceo' || user?.role === 'coo';

    if (comment.userId !== userId && !isAdmin) {
      throw new Error('Unauthorized: You can only delete your own comments');
    }

    await db
      .delete(comments)
      .where(and(eq(comments.id, id), eq(comments.accountId, accountId)));
  }

  async getUsersForMentionAutocomplete(accountId: number, query?: string): Promise<User[]> {
    const conditions = [eq(accountMembers.accountId, accountId)];
    
    // If query provided, filter by name or email
    if (query && query.trim()) {
      const searchTerm = `%${query.trim().toLowerCase()}%`;
      conditions.push(
        or(
          sql`LOWER(${users.fullName}) LIKE ${searchTerm}`,
          sql`LOWER(${users.email}) LIKE ${searchTerm}`,
          sql`LOWER(${users.username}) LIKE ${searchTerm}`
        )!
      );
    }

    const usersList = await db
      .select({
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
        slackNotificationEvents: users.slackNotificationEvents,
      })
      .from(users)
      .innerJoin(accountMembers, eq(users.id, accountMembers.userId))
      .where(and(...conditions))
      .limit(20);
    
    // SECURITY: Decrypt sensitive fields for all users
    return usersList.map(user => this.decryptUserFields(user));
  }

  // In-app notification operations
  async createInAppNotification(notification: InsertInAppNotification): Promise<InAppNotification> {
    const [newNotification] = await db
      .insert(inAppNotifications)
      .values({
        ...notification,
        createdAt: new Date(),
      })
      .returning();
    return newNotification;
  }

  async getInAppNotifications(accountId: number, userId: number, filters?: { read?: boolean; limit?: number }): Promise<InAppNotification[]> {
    let conditions: any[] = [
      eq(inAppNotifications.accountId, accountId),
      eq(inAppNotifications.userId, userId)
    ];

    if (filters?.read !== undefined) {
      conditions.push(eq(inAppNotifications.read, filters.read));
    }

    let query = db
      .select()
      .from(inAppNotifications)
      .where(and(...conditions))
      .orderBy(desc(inAppNotifications.createdAt));

    if (filters?.limit) {
      query = query.limit(filters.limit) as any;
    }

    return await query;
  }

  async markNotificationAsRead(id: number, accountId: number, userId: number): Promise<void> {
    // Verify the notification belongs to the user and account
    const [notification] = await db
      .select()
      .from(inAppNotifications)
      .where(
        and(
          eq(inAppNotifications.id, id),
          eq(inAppNotifications.accountId, accountId),
          eq(inAppNotifications.userId, userId)
        )
      );

    if (!notification) {
      throw new Error('Notification not found or unauthorized');
    }

    await db
      .update(inAppNotifications)
      .set({ read: true })
      .where(eq(inAppNotifications.id, id));
  }

  async markAllNotificationsAsRead(accountId: number, userId: number): Promise<void> {
    await db
      .update(inAppNotifications)
      .set({ read: true })
      .where(and(
        eq(inAppNotifications.accountId, accountId),
        eq(inAppNotifications.userId, userId)
      ));
  }

  async getUnreadNotificationCount(accountId: number, userId: number): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(inAppNotifications)
      .where(
        and(
          eq(inAppNotifications.accountId, accountId),
          eq(inAppNotifications.userId, userId),
          eq(inAppNotifications.read, false)
        )
      );
    
    return Number(result[0]?.count || 0);
  }

  // =====================================================
  // WORKFLOW OPERATIONS
  // =====================================================

  async createWorkflow(workflow: InsertWorkflow & { accountId: number }): Promise<Workflow> {
    const [newWorkflow] = await db
      .insert(workflows)
      .values({
        accountId: workflow.accountId,
        name: workflow.name,
        description: workflow.description,
        isActive: workflow.isActive ?? true,
        triggerType: workflow.triggerType,
        triggerConfig: workflow.triggerConfig,
        steps: workflow.steps,
        createdById: workflow.createdById,
      })
      .returning();
    return newWorkflow;
  }

  async getWorkflows(accountId: number): Promise<Workflow[]> {
    return await db
      .select()
      .from(workflows)
      .where(eq(workflows.accountId, accountId))
      .orderBy(desc(workflows.updatedAt));
  }

  async getWorkflow(id: number, accountId: number): Promise<Workflow | undefined> {
    const [workflow] = await db
      .select()
      .from(workflows)
      .where(and(eq(workflows.id, id), eq(workflows.accountId, accountId)));
    return workflow;
  }

  async updateWorkflow(id: number, accountId: number, data: Partial<Workflow>): Promise<Workflow> {
    const [updated] = await db
      .update(workflows)
      .set(data)
      .where(and(eq(workflows.id, id), eq(workflows.accountId, accountId)))
      .returning();
    return updated;
  }

  async deleteWorkflow(id: number, accountId: number): Promise<void> {
    await db
      .delete(workflows)
      .where(and(eq(workflows.id, id), eq(workflows.accountId, accountId)));
  }

  async getActiveWorkflowsByTrigger(
    accountId: number,
    triggerType: string,
    triggerConfig?: any
  ): Promise<Workflow[]> {
    const allWorkflows = await db
      .select()
      .from(workflows)
      .where(
        and(
          eq(workflows.accountId, accountId),
          eq(workflows.isActive, true),
          eq(workflows.triggerType, triggerType)
        )
      );

    // Filter by trigger config if provided
    if (triggerConfig) {
      return allWorkflows.filter((workflow) => {
        const config = workflow.triggerConfig as any;
        if (!config) return false;

        // Match trigger config fields
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

  async createWorkflowExecution(
    execution: InsertWorkflowExecution & { accountId: number }
  ): Promise<WorkflowExecution> {
    const [newExecution] = await db
      .insert(workflowExecutions)
      .values({
        accountId: execution.accountId,
        workflowId: execution.workflowId,
        status: execution.status ?? 'running',
        triggerEntityType: execution.triggerEntityType,
        triggerEntityId: execution.triggerEntityId,
        executionData: execution.executionData,
      })
      .returning();
    return newExecution;
  }

  async updateWorkflowExecution(
    id: number,
    accountId: number,
    data: Partial<WorkflowExecution>
  ): Promise<WorkflowExecution> {
    const [updated] = await db
      .update(workflowExecutions)
      .set(data)
      .where(and(eq(workflowExecutions.id, id), eq(workflowExecutions.accountId, accountId)))
      .returning();
    return updated;
  }

  async createWorkflowExecutionStep(step: InsertWorkflowExecutionStep): Promise<WorkflowExecutionStep> {
    const [newStep] = await db
      .insert(workflowExecutionSteps)
      .values({
        executionId: step.executionId,
        stepIndex: step.stepIndex,
        actionType: step.actionType,
        actionConfig: step.actionConfig,
        status: step.status ?? 'pending',
        result: step.result,
        errorMessage: step.errorMessage,
        startedAt: step.startedAt,
        completedAt: step.completedAt,
      })
      .returning();
    return newStep;
  }

  async updateWorkflowExecutionStep(
    id: number,
    data: Partial<WorkflowExecutionStep>
  ): Promise<WorkflowExecutionStep> {
    const [updated] = await db
      .update(workflowExecutionSteps)
      .set(data)
      .where(eq(workflowExecutionSteps.id, id))
      .returning();
    return updated;
  }

  async getWorkflowExecutions(
    workflowId: number,
    accountId: number,
    limit: number = 50
  ): Promise<WorkflowExecution[]> {
    return await db
      .select()
      .from(workflowExecutions)
      .where(
        and(
          eq(workflowExecutions.workflowId, workflowId),
          eq(workflowExecutions.accountId, accountId)
        )
      )
      .orderBy(desc(workflowExecutions.startedAt))
      .limit(limit);
  }

  async getWorkflowExecutionSteps(executionId: number): Promise<WorkflowExecutionStep[]> {
    return await db
      .select()
      .from(workflowExecutionSteps)
      .where(eq(workflowExecutionSteps.executionId, executionId))
      .orderBy(workflowExecutionSteps.stepIndex);
  }

  async incrementWorkflowExecutionCount(workflowId: number, accountId: number): Promise<void> {
    await db
      .update(workflows)
      .set({
        executionCount: sql`${workflows.executionCount} + 1`,
        lastExecutedAt: sql`NOW()`,
      })
      .where(and(eq(workflows.id, workflowId), eq(workflows.accountId, accountId)));
  }
}

export const storage = new DatabaseStorage();
