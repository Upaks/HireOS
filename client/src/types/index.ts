export interface User {
  id: number;
  username: string;
  fullName: string;
  email: string;
  role: string;
  createdAt: string;
}

export interface Job {
  id: number;
  title: string;
  suggestedTitle?: string;
  description: string;
  type: string;
  department?: string;
  urgency?: string;
  skills?: string;
  teamContext?: string;
  status: string;
  hiPeopleLink?: string;
  expressReview?: boolean;
  submitterId?: number;
  postedDate?: string | null;
  createdAt: string;
  updatedAt: string;
  candidateCount?: number;
}

export interface JobPlatform {
  id: number;
  jobId: number;
  platform: string;
  platformJobId?: string;
  postUrl?: string;
  status: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Candidate {
  id: number;
  jobId: number;
  name: string;
  email: string;
  phone?: string;
  location?: string;
  resumeUrl?: string;
  source?: string;
  status: string;
  hiPeopleScore?: number;
  hiPeoplePercentile?: number;
  hiPeopleCompletedAt?: string;
  skills?: any;
  experienceYears?: number;
  expectedSalary?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  job?: Job;
}

export interface Interview {
  id: number;
  candidateId: number;
  scheduledDate?: string;
  conductedDate?: string;
  interviewerId?: number;
  type: string;
  videoUrl?: string;
  status: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  candidate?: Candidate;
  interviewer?: User;
}

export interface Evaluation {
  id: number;
  interviewId: number;
  technicalScore?: number;
  communicationScore?: number;
  problemSolvingScore?: number;
  culturalFitScore?: number;
  overallRating: string;
  technicalComments?: string;
  communicationComments?: string;
  problemSolvingComments?: string;
  culturalFitComments?: string;
  overallComments?: string;
  evaluatorId?: number;
  createdAt: string;
  updatedAt: string;
  evaluator?: User;
}

export interface Offer {
  id: number;
  candidateId: number;
  offerType: string;
  compensation: string;
  startDate?: string;
  notes?: string;
  status: string;
  sentDate?: string;
  contractUrl?: string;
  approvedById?: number;
  createdAt: string;
  updatedAt: string;
  candidate?: Candidate;
  approvedBy?: User;
}

export interface ActivityLog {
  id: number;
  userId?: number;
  action: string;
  entityType: string;
  entityId: number;
  details?: any;
  timestamp: string;
  user?: User;
}

export interface DashboardStats {
  activeJobs: number;
  totalCandidates: number;
  scheduledInterviews: number;
  offersSent: number;
  totalHires: number;
}

export interface FunnelStats {
  applications: number;
  assessments: number;
  qualified: number;
  interviews: number;
  offers: number;
  hires: number;
  conversionRate: number;
}

export interface JobPerformance {
  id: number;
  title: string;
  type: string;
  department?: string;
  status: string;
  postedDate?: string;
  metrics: {
    applications: number;
    assessments: number;
    interviews: number;
    offers: number;
    hires: number;
    conversionRate: number;
  };
}
