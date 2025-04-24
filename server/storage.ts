import { 
  users, jobs, jobPlatforms, candidates, interviews, activityLogs, notificationQueue,
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
  
  // Activity logs
  createActivityLog(log: Omit<ActivityLog, 'id'>): Promise<ActivityLog>;
  
  // Notifications
  createNotification(notification: Omit<NotificationQueueItem, 'id' | 'createdAt' | 'processAttempts' | 'lastAttemptAt' | 'error'>): Promise<NotificationQueueItem>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: any;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool,
      createTableIfMissing: true 
    });
    
    // Create admin user if it doesn't exist
    this.initializeAdminUser();
  }

  private async initializeAdminUser() {
    try {
      // Check if admin user exists
      const adminUser = await this.getUserByUsername("admin");
      if (!adminUser) {
        // Create default admin user
        await this.createUser({
          username: "admin",
          password: "$2b$10$dJUaPuKxGyKu2.Ep40mvVuxhvlJ5vtCKbifYoN8m5qpQPrYH3QnLu", // "password"
          fullName: "Admin User",
          email: "admin@example.com",
          role: "admin"
        });
        console.log("Admin user created");
      }
    } catch (error) {
      console.error("Error initializing admin user:", error);
    }
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
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

  async getCandidates(filters: { jobId?: number, status?: string }): Promise<Candidate[]> {
    const conditions = [];
    
    if (filters.jobId !== undefined) {
      conditions.push(eq(candidates.jobId, filters.jobId));
    }
    
    if (filters.status && filters.status !== 'all') {
      conditions.push(eq(candidates.status, filters.status));
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
    const [updatedCandidate] = await db
      .update(candidates)
      .set({
        ...data,
        updatedAt: new Date()
      })
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
}

export const storage = new DatabaseStorage();