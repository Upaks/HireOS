import { 
  users, 
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
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

// modify the interface with any CRUD methods
// you might need

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

export class MemStorage implements IStorage {
  // Session store
  sessionStore: any;
  
  // In-memory storage maps
  private users: Map<number, User>;
  private jobs: Map<number, Job>;
  private jobPlatforms: Map<number, JobPlatform>;
  private candidates: Map<number, Candidate>;
  private interviews: Map<number, Interview>;
  private activityLogs: Map<number, ActivityLog>;
  private notifications: Map<number, NotificationQueueItem>;
  
  // ID counters for each entity
  private userIdCounter: number;
  private jobIdCounter: number;
  private jobPlatformIdCounter: number;
  private candidateIdCounter: number;
  private interviewIdCounter: number;
  private activityLogIdCounter: number;
  private notificationIdCounter: number;

  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
    
    // Initialize maps
    this.users = new Map();
    this.jobs = new Map();
    this.jobPlatforms = new Map();
    this.candidates = new Map();
    this.interviews = new Map();
    this.activityLogs = new Map();
    this.notifications = new Map();
    
    // Initialize ID counters
    this.userIdCounter = 1;
    this.jobIdCounter = 1;
    this.jobPlatformIdCounter = 1;
    this.candidateIdCounter = 1;
    this.interviewIdCounter = 1;
    this.activityLogIdCounter = 1;
    this.notificationIdCounter = 1;
    
    console.log("Admin user created");
    
    // Create default admin user
    this.createUser({
      username: "admin",
      password: "$2b$10$dJUaPuKxGyKu2.Ep40mvVuxhvlJ5vtCKbifYoN8m5qpQPrYH3QnLu", // "password"
      fullName: "Admin User",
      email: "admin@example.com",
      role: "admin"
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const createdAt = new Date();
    const user: User = { ...insertUser, id, createdAt };
    this.users.set(id, user);
    return user;
  }
  
  // Job operations
  async createJob(job: InsertJob & { description: string; hiPeopleLink?: string; suggestedTitle?: string }): Promise<Job> {
    const id = this.jobIdCounter++;
    const now = new Date();
    const newJob: Job = {
      ...job,
      id,
      status: job.status || "draft",
      createdAt: now,
      updatedAt: now
    };
    this.jobs.set(id, newJob);
    return newJob;
  }
  
  async getJob(id: number): Promise<Job | undefined> {
    return this.jobs.get(id);
  }
  
  async getJobs(status?: string): Promise<Job[]> {
    let jobs = Array.from(this.jobs.values());
    if (status && status !== "all") {
      jobs = jobs.filter(job => job.status === status);
    }
    return jobs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  
  async updateJob(id: number, data: Partial<Job>): Promise<Job> {
    const job = this.jobs.get(id);
    if (!job) {
      throw new Error(`Job with ID ${id} not found`);
    }
    
    const updatedJob: Job = {
      ...job,
      ...data,
      updatedAt: new Date()
    };
    
    this.jobs.set(id, updatedJob);
    return updatedJob;
  }
  
  // Job platform operations
  async createJobPlatform(platform: Partial<JobPlatform>): Promise<JobPlatform> {
    const id = this.jobPlatformIdCounter++;
    const now = new Date();
    const newPlatform: JobPlatform = {
      id,
      jobId: platform.jobId!,
      platform: platform.platform!,
      platformJobId: platform.platformJobId || '',
      postUrl: platform.postUrl || '',
      status: platform.status || 'pending',
      errorMessage: platform.errorMessage || '',
      createdAt: now,
      updatedAt: now
    };
    
    this.jobPlatforms.set(id, newPlatform);
    return newPlatform;
  }
  
  async getJobPlatforms(jobId: number): Promise<JobPlatform[]> {
    return Array.from(this.jobPlatforms.values())
      .filter(platform => platform.jobId === jobId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  
  // Candidate operations
  async createCandidate(candidate: InsertCandidate): Promise<Candidate> {
    const id = this.candidateIdCounter++;
    const now = new Date();
    const newCandidate: Candidate = {
      ...candidate,
      id,
      createdAt: now,
      updatedAt: now
    };
    
    this.candidates.set(id, newCandidate);
    return newCandidate;
  }
  
  async getCandidate(id: number): Promise<Candidate | undefined> {
    const candidate = this.candidates.get(id);
    if (candidate) {
      // Enrich with job data if available
      const job = this.jobs.get(candidate.jobId);
      if (job) {
        return { ...candidate, job };
      }
    }
    return candidate;
  }
  
  async getCandidates(filters: { jobId?: number; status?: string }): Promise<Candidate[]> {
    let candidates = Array.from(this.candidates.values());
    
    if (filters.jobId) {
      candidates = candidates.filter(c => c.jobId === filters.jobId);
    }
    
    if (filters.status && filters.status !== "all") {
      candidates = candidates.filter(c => c.status === filters.status);
    }
    
    // Enrich candidates with job data
    return candidates.map(candidate => {
      const job = this.jobs.get(candidate.jobId);
      return job ? { ...candidate, job } : candidate;
    }).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  
  async updateCandidate(id: number, data: Partial<Candidate>): Promise<Candidate> {
    const candidate = this.candidates.get(id);
    if (!candidate) {
      throw new Error(`Candidate with ID ${id} not found`);
    }
    
    const updatedCandidate: Candidate = {
      ...candidate,
      ...data,
      updatedAt: new Date()
    };
    
    this.candidates.set(id, updatedCandidate);
    
    // Return with job data if available
    const job = this.jobs.get(updatedCandidate.jobId);
    return job ? { ...updatedCandidate, job } : updatedCandidate;
  }
  
  // Interview operations
  async createInterview(interviewData: Partial<Interview>): Promise<Interview> {
    const id = this.interviewIdCounter++;
    const now = new Date();
    const interview: Interview = {
      id,
      candidateId: interviewData.candidateId!,
      type: interviewData.type || 'video',
      status: interviewData.status || 'scheduled',
      scheduledDate: interviewData.scheduledDate,
      conductedDate: interviewData.conductedDate,
      interviewerId: interviewData.interviewerId,
      videoUrl: interviewData.videoUrl,
      notes: interviewData.notes,
      createdAt: now,
      updatedAt: now
    };
    
    this.interviews.set(id, interview);
    return interview;
  }
  
  async getInterview(id: number): Promise<Interview | undefined> {
    const interview = this.interviews.get(id);
    if (!interview) return undefined;
    
    // Enrich with candidate and interviewer data
    const candidate = this.candidates.get(interview.candidateId);
    const interviewer = interview.interviewerId ? this.users.get(interview.interviewerId) : undefined;
    
    const enrichedInterview: any = { ...interview };
    if (candidate) enrichedInterview.candidate = candidate;
    if (interviewer) enrichedInterview.interviewer = interviewer;
    
    return enrichedInterview;
  }
  
  // Activity logs
  async createActivityLog(log: Omit<ActivityLog, 'id'>): Promise<ActivityLog> {
    const id = this.activityLogIdCounter++;
    const activityLog: ActivityLog = {
      ...log,
      id,
      timestamp: log.timestamp || new Date()
    };
    
    this.activityLogs.set(id, activityLog);
    return activityLog;
  }
  
  // Notifications
  async createNotification(notification: Omit<NotificationQueueItem, 'id' | 'createdAt' | 'processAttempts' | 'lastAttemptAt' | 'error'>): Promise<NotificationQueueItem> {
    const id = this.notificationIdCounter++;
    const now = new Date();
    const newNotification: NotificationQueueItem = {
      ...notification,
      id,
      processAttempts: 0,
      status: notification.status || 'pending',
      createdAt: now
    };
    
    this.notifications.set(id, newNotification);
    return newNotification;
  }
}

export const storage = new MemStorage();
