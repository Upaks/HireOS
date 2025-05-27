import { 
  users, jobs, jobPlatforms, candidates, interviews, activityLogs, notificationQueue,
  offers, emailLogs,
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
  type NotificationQueueItem
} from "@shared/schema";
import { isLikelyInvalidEmail } from "./email-validator";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { db, pool } from "./db";
import { and, eq } from "drizzle-orm";

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
  
  // Candidate operations
  createCandidate(candidate: InsertCandidate): Promise<Candidate>;
  getCandidate(id: number): Promise<Candidate | undefined>;
  getCandidates(filters: { jobId?: number, status?: string }): Promise<Candidate[]>;
  updateCandidate(id: number, data: Partial<Candidate>): Promise<Candidate>;
  
  // Interview operations
  createInterview(interview: Partial<Interview>): Promise<Interview>;
  getInterview(id: number): Promise<Interview | undefined>;
  
  // Offer operations
  createOffer(offer: Partial<Offer>): Promise<Offer>;
  getOfferByCandidate(candidateId: number): Promise<Offer | undefined>;
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
      console.error("Error getting user by username:", error);
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

  // Candidate operations
  async createCandidate(candidate: InsertCandidate): Promise<Candidate> {
    const [newCandidate] = await db
      .insert(candidates)
      .values({
        ...candidate,
        status: candidate.status || 'new',
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    
    // Get the job data to enrich the candidate
    const job = await this.getJob(newCandidate.jobId);
    return { ...newCandidate, job: job || null };
  }

  async getCandidate(id: number): Promise<Candidate | undefined> {
    const [candidate] = await db
      .select()
      .from(candidates)
      .where(eq(candidates.id, id));
    
    if (!candidate) return undefined;
    
    // Enrich with job data
    const job = await this.getJob(candidate.jobId);
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
    const uniqueJobIds = jobIdsArray.filter((id, index) => jobIdsArray.indexOf(id) === index);
    const jobsMap = new Map();
    
    if (uniqueJobIds.length > 0) {
      const jobsList = await Promise.all(
        uniqueJobIds.map(id => this.getJob(id))
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

  async updateCandidate(id: number, data: Partial<Candidate>): Promise<Candidate> {
    // Ensure consistent status values between currentStatus and finalDecisionStatus
    const updatedData = { ...data };
    
    // If status is being updated to rejected, also update finalDecisionStatus
    if (data.status === '200_rejected' && !data.finalDecisionStatus) {
      updatedData.finalDecisionStatus = 'rejected';
    }
    // If status is being updated to offer sent, also update finalDecisionStatus
    else if (data.status === '95_offer_sent' && !data.finalDecisionStatus) {
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
    console.log("Updating candidate with data:", data);
    console.log("DB Update Payload:", updateData);

    const [updatedCandidate] = await db
      .update(candidates)
      .set(updateData)
      .where(eq(candidates.id, id))
      .returning();

    // Enrich with job data
    const job = await this.getJob(updatedCandidate.jobId);
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
      .where(eq(offers.candidateId, candidateId));
    
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
          user: "earyljames.capitle18@gmail.com",
          pass: "sfkp epqm pdar bowz" // It's better to store sensitive information in environment variables.
        }
      });

      const mailOptions = {
        from: "earyljames.capitle18@gmail.com",
        to,
        subject,
        html: body
      };

      await transporter.sendMail(mailOptions);
      console.log(`✅ Direct email sent to ${to} with subject: ${subject}`);

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
