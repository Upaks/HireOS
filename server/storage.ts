import { 
  users, jobs, jobPlatforms, candidates, interviews, evaluations, activityLogs, notificationQueue,
  offers, emailLogs, platformIntegrations, formTemplates,
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
  type InsertFormTemplate
} from "@shared/schema";
import { isLikelyInvalidEmail } from "./email-validator";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { db, pool } from "./db";
import { and, eq, or, isNull } from "drizzle-orm";

// Database session store configuration
const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // Session store
  sessionStore: any; // Type for express-session store
  
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUser(id: number, data: Partial<User>): Promise<User>;
  deleteUser(id: number): Promise<void>;
  
  // Job operations
  createJob(job: InsertJob & { description: string, hiPeopleLink?: string, suggestedTitle?: string }): Promise<Job>;
  getJob(id: number): Promise<Job | undefined>;
  getJobs(status?: string): Promise<Job[]>;
  updateJob(id: number, data: Partial<Job>): Promise<Job>;
  
  // Job platform operations
  createJobPlatform(platform: Partial<JobPlatform>): Promise<JobPlatform>;
  getJobPlatforms(jobId: number): Promise<JobPlatform[]>;
  
  // Platform integration operations
  getPlatformIntegrations(): Promise<PlatformIntegration[]>;
  getPlatformIntegration(platformId: string): Promise<PlatformIntegration | undefined>;
  createPlatformIntegration(integration: InsertPlatformIntegration): Promise<PlatformIntegration>;
  updatePlatformIntegration(platformId: string, data: Partial<PlatformIntegration>): Promise<PlatformIntegration>;
  deletePlatformIntegration(platformId: string): Promise<void>;
  
  // Form template operations
  getFormTemplates(): Promise<FormTemplate[]>;
  getFormTemplate(id: number): Promise<FormTemplate | undefined>;
  getDefaultFormTemplate(): Promise<FormTemplate | undefined>;
  createFormTemplate(template: InsertFormTemplate): Promise<FormTemplate>;
  updateFormTemplate(id: number, data: Partial<FormTemplate>): Promise<FormTemplate>;
  deleteFormTemplate(id: number): Promise<void>;
  
  // Candidate operations
  createCandidate(candidate: InsertCandidate): Promise<Candidate>;
  getCandidate(id: number): Promise<Candidate | undefined>;
  getCandidates(filters: { jobId?: number, status?: string }): Promise<Candidate[]>;
  updateCandidate(id: number, data: Partial<Candidate>): Promise<Candidate>;
  getCandidateByNameAndEmail(name: string, email: string): Promise<Candidate | undefined>;
  getCandidateByGHLContactId(ghlContactId: string): Promise<Candidate | undefined>;
  
  // Interview operations
  createInterview(interview: Partial<Interview>): Promise<Interview>;
  getInterview(id: number): Promise<Interview | undefined>;
  getInterviews(filters?: { candidateId?: number, interviewerId?: number, status?: string }): Promise<Interview[]>;
  updateInterview(id: number, data: Partial<Interview>): Promise<Interview>;
  deleteInterview(id: number): Promise<void>;
  
  // Evaluation operations
  createEvaluation(evaluation: Partial<Evaluation>): Promise<Evaluation>;
  getEvaluationByInterview(interviewId: number): Promise<Evaluation | undefined>;
  updateEvaluation(id: number, data: Partial<Evaluation>): Promise<Evaluation>;
  
  // Offer operations
  createOffer(offer: Partial<Offer>): Promise<Offer>;
  getOfferByCandidate(candidateId: number): Promise<Offer | undefined>;
  getOfferByToken(token: string): Promise<Offer | undefined>;
  updateOffer(id: number, data: Partial<Offer>): Promise<Offer>;
  
  // Activity logs
  createActivityLog(log: Omit<ActivityLog, 'id'>): Promise<ActivityLog>;
  
  // Notifications
  createNotification(notification: Omit<NotificationQueueItem, 'id' | 'createdAt' | 'processAttempts' | 'lastAttemptAt' | 'error'>): Promise<NotificationQueueItem>;
  
  // Direct email sending (bypasses notification queue)
  sendDirectEmail(to: string, subject: string, body: string): Promise<void>;
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

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user || undefined;
    } catch (error) {
      console.error("Error getting user by ID:", error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.username, username));
      return user || undefined;
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
    
    const [user] = await db
      .insert(users)
      .values({ ...insertUser, role, createdAt: new Date() })
      .returning();
    
    return user;
  }
  
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }
  
  async updateUser(id: number, data: Partial<User>): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    
    return updatedUser;
  }
  
  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  // Job operations
  async createJob(job: InsertJob & { description: string, hiPeopleLink?: string, suggestedTitle?: string }): Promise<Job> {
    const [newJob] = await db
      .insert(jobs)
      .values({
        ...job,
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

  async getJob(id: number): Promise<Job | undefined> {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, id));
    return job || undefined;
  }

  async getJobs(status?: string): Promise<Job[]> {
    if (status && status !== 'all') {
      return await db.select().from(jobs).where(eq(jobs.status, status));
    }
    return await db.select().from(jobs);
  }

  async updateJob(id: number, data: Partial<Job>): Promise<Job> {
    const [updatedJob] = await db
      .update(jobs)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(jobs.id, id))
      .returning();
    
    return updatedJob;
  }

  // Job platform operations
  async createJobPlatform(platform: Partial<JobPlatform>): Promise<JobPlatform> {
    const [newPlatform] = await db
      .insert(jobPlatforms)
      .values({
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

  async getJobPlatforms(jobId: number): Promise<JobPlatform[]> {
    return await db
      .select()
      .from(jobPlatforms)
      .where(eq(jobPlatforms.jobId, jobId));
  }

  // Platform integration operations
  async getPlatformIntegrations(userId?: number): Promise<PlatformIntegration[]> {
    if (userId) {
      // Get user-specific integrations (CRM/ATS) and system-wide integrations (job posting platforms)
      return await db
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
    }
    // Legacy: Get all integrations (for backward compatibility)
    return await db
      .select()
      .from(platformIntegrations)
      .orderBy(platformIntegrations.platformName);
  }

  async getPlatformIntegration(platformId: string, userId?: number): Promise<PlatformIntegration | undefined> {
    if (userId) {
      // Get user-specific integration
      const [integration] = await db
        .select()
        .from(platformIntegrations)
        .where(
          and(
            eq(platformIntegrations.platformId, platformId),
            eq(platformIntegrations.userId, userId)
          )
        );
      return integration || undefined;
    }
    // Legacy: Get by platformId only (for backward compatibility)
    const [integration] = await db
      .select()
      .from(platformIntegrations)
      .where(eq(platformIntegrations.platformId, platformId));
    return integration || undefined;
  }

  // Get CRM/ATS integrations for a user
  async getCRMIntegrations(userId: number): Promise<PlatformIntegration[]> {
    return await db
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
  }

  async createPlatformIntegration(integration: InsertPlatformIntegration): Promise<PlatformIntegration> {
    const [newIntegration] = await db
      .insert(platformIntegrations)
      .values({
        ...integration,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    return newIntegration;
  }

  async updatePlatformIntegration(platformId: string, data: Partial<PlatformIntegration>): Promise<PlatformIntegration> {
    const [updatedIntegration] = await db
      .update(platformIntegrations)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(platformIntegrations.platformId, platformId))
      .returning();
    return updatedIntegration;
  }

  async deletePlatformIntegration(platformId: string): Promise<void> {
    await db
      .delete(platformIntegrations)
      .where(eq(platformIntegrations.platformId, platformId));
  }

  // Form template operations
  async getFormTemplates(): Promise<FormTemplate[]> {
    return await db
      .select()
      .from(formTemplates)
      .orderBy(formTemplates.name);
  }

  async getFormTemplate(id: number): Promise<FormTemplate | undefined> {
    const [template] = await db
      .select()
      .from(formTemplates)
      .where(eq(formTemplates.id, id));
    return template || undefined;
  }

  async getDefaultFormTemplate(): Promise<FormTemplate | undefined> {
    const [template] = await db
      .select()
      .from(formTemplates)
      .where(eq(formTemplates.isDefault, true))
      .limit(1);
    return template || undefined;
  }

  async createFormTemplate(template: InsertFormTemplate): Promise<FormTemplate> {
    const [newTemplate] = await db
      .insert(formTemplates)
      .values({
        ...template,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    return newTemplate;
  }

  async updateFormTemplate(id: number, data: Partial<FormTemplate>): Promise<FormTemplate> {
    const [updatedTemplate] = await db
      .update(formTemplates)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(formTemplates.id, id))
      .returning();
    return updatedTemplate;
  }

  async deleteFormTemplate(id: number): Promise<void> {
    await db
      .delete(formTemplates)
      .where(eq(formTemplates.id, id));
  }

  // Candidate operations
  async createCandidate(candidate: InsertCandidate): Promise<Candidate> {
    const [newCandidate] = await db
      .insert(candidates)
      .values({
        ...candidate,
        status: candidate.status || 'new',
        finalDecisionStatus: null, // Explicitly set to null for new candidates
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    
    // Get the job data to enrich the candidate
    const job = newCandidate.jobId ? await this.getJob(newCandidate.jobId) : null;
    return { ...newCandidate, job: job || null };
  }

  async getCandidate(id: number): Promise<Candidate | undefined> {
    const [candidate] = await db
      .select()
      .from(candidates)
      .where(eq(candidates.id, id));
    
    if (!candidate) return undefined;
    
    // Enrich with job data
    const job = candidate.jobId ? await this.getJob(candidate.jobId) : null;
    return { ...candidate, job: job || null };
  }

  async getCandidates(filters: { jobId?: number, status?: string, hiPeoplePercentile?: number }): Promise<Candidate[]> {
    const conditions = [];
    
    if (filters.jobId !== undefined) {
      conditions.push(eq(candidates.jobId, filters.jobId));
    }
    
    if (filters.status && filters.status !== 'all') {
      conditions.push(eq(candidates.status, filters.status));
    }
    
    // Add hiPeoplePercentile filter if provided
    if (filters.hiPeoplePercentile !== undefined) {
      // This would need proper implementation if used for filtering
      // conditions.push(gte(candidates.hiPeoplePercentile, filters.hiPeoplePercentile));
    }
    
    let candidatesList;
    if (conditions.length > 0) {
      candidatesList = await db
        .select()
        .from(candidates)
        .where(and(...conditions));
    } else {
      candidatesList = await db.select().from(candidates);
    }
    
    // Enrich candidates with job data - use array instead of Set for compatibility
    const jobIdsArray = candidatesList.map(c => c.jobId);
    const uniqueJobIds = jobIdsArray.filter((id, index) => jobIdsArray.indexOf(id) === index && id !== null);
    const jobsMap = new Map();
    
    if (uniqueJobIds.length > 0) {
      const jobsList = await Promise.all(
        uniqueJobIds.map(id => this.getJob(id!))
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

  async getCandidateByNameAndEmail(name: string, email: string): Promise<Candidate | undefined> {
    try {
      const result = await db
        .select()
        .from(candidates)
        .where(
          and(
            eq(candidates.name, name),
            eq(candidates.email, email)
          )
        )
        .limit(1);
      
      return result[0];
    } catch (error) {
      console.error('Error fetching candidate by name and email:', error);
      return undefined;
    }
  }

  async getCandidateByGHLContactId(ghlContactId: string): Promise<Candidate | undefined> {
    try {
      const result = await db
        .select()
        .from(candidates)
        .where(eq(candidates.ghlContactId, ghlContactId))
        .limit(1);
      
      if (!result[0]) return undefined;
      
      // Enrich with job data
      const job = result[0].jobId ? await this.getJob(result[0].jobId) : null;
      return { ...result[0], job: job || null };
    } catch (error) {
      console.error('Error fetching candidate by GHL contact ID:', error);
      return undefined;
    }
  }

  async updateCandidate(id: number, data: Partial<Candidate>): Promise<Candidate> {
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
      .where(eq(candidates.id, id))
      .returning();

    // Enrich with job data
    const job = updatedCandidate.jobId ? await this.getJob(updatedCandidate.jobId) : null;
    return { ...updatedCandidate, job: job || null };
  }


  // Interview operations
  async createInterview(interviewData: Partial<Interview>): Promise<Interview> {
    const [interview] = await db
      .insert(interviews)
      .values({
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

  async getInterview(id: number): Promise<Interview | undefined> {
    const [interview] = await db
      .select()
      .from(interviews)
      .where(eq(interviews.id, id));
    
    return interview || undefined;
  }

  async getInterviews(filters?: { candidateId?: number, interviewerId?: number, status?: string }): Promise<Interview[]> {
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
      
      // Build base query with joins
      let baseQuery = db
        .select({
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
          interviewerName: users.fullName,
        })
        .from(interviews)
        .leftJoin(candidates, eq(interviews.candidateId, candidates.id))
        .leftJoin(users, eq(interviews.interviewerId, users.id));
      
      // Apply conditions if any
      if (conditions.length > 0) {
        baseQuery = baseQuery.where(and(...conditions)) as any;
      }
      
      const results = await baseQuery;
      
      // Map results to Interview format with nested candidate/interviewer objects
      return results.map((row: any) => ({
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

  async updateInterview(id: number, data: Partial<Interview>): Promise<Interview> {
    const [updatedInterview] = await db
      .update(interviews)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(interviews.id, id))
      .returning();
    return updatedInterview;
  }

  async deleteInterview(id: number): Promise<void> {
    // First, delete any evaluations associated with this interview
    // (due to foreign key constraint)
    await db
      .delete(evaluations)
      .where(eq(evaluations.interviewId, id));
    
    // Then delete the interview
    await db
      .delete(interviews)
      .where(eq(interviews.id, id));
  }

  // Evaluation operations
  async createEvaluation(evaluationData: Partial<Evaluation>): Promise<Evaluation> {
    const [evaluation] = await db
      .insert(evaluations)
      .values({
        interviewId: evaluationData.interviewId!,
        evaluatorId: evaluationData.evaluatorId!,
        overallRating: evaluationData.overallRating!,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...evaluationData
      })
      .returning();
    return evaluation;
  }

  async getEvaluationByInterview(interviewId: number): Promise<Evaluation | undefined> {
    const [evaluation] = await db
      .select()
      .from(evaluations)
      .where(eq(evaluations.interviewId, interviewId));
    return evaluation || undefined;
  }

  async updateEvaluation(id: number, data: Partial<Evaluation>): Promise<Evaluation> {
    const [updatedEvaluation] = await db
      .update(evaluations)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(evaluations.id, id))
      .returning();
    return updatedEvaluation;
  }

  // Activity logs
  async createActivityLog(log: Omit<ActivityLog, 'id'>): Promise<ActivityLog> {
    const [activityLog] = await db
      .insert(activityLogs)
      .values({
        ...log,
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
  async createOffer(offerData: Partial<Offer>): Promise<Offer> {
    // Generate unique acceptance token
    const crypto = await import('crypto');
    const acceptanceToken = crypto.randomBytes(32).toString('hex');
    
    const [offer] = await db
      .insert(offers)
      .values({
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

  async getOfferByCandidate(candidateId: number): Promise<Offer | undefined> {
    const [offer] = await db
      .select()
      .from(offers)
      .where(eq(offers.candidateId, candidateId))
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

  async updateOffer(id: number, data: Partial<Offer>): Promise<Offer> {
    const [updatedOffer] = await db
      .update(offers)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(offers.id, id))
      .returning();
    
    return updatedOffer;
  }

  // Direct email sending (bypasses notification queue)
  async sendDirectEmail(to: string, subject: string, body: string): Promise<void> {
    const nodemailer = await import('nodemailer');

    // Pre-validate the email address before attempting to send
    if (isLikelyInvalidEmail(to)) {
      console.error(`❌ Rejected likely non-existent email: ${to}`);
      
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

    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: "upaksabraham24@gmail.com",
          pass: "znjpubjqmqxkyuht" // Gmail App Password (spaces removed)
        }
      });

      const mailOptions = {
        from: "upaksabraham24@gmail.com",
        to,
        subject,
        html: body
      };

      await transporter.sendMail(mailOptions);

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
      console.error('❌ Error sending direct email:', error);
      
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
}

export const storage = new DatabaseStorage();
