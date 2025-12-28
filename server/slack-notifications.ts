import { storage } from "./storage";
import { User, Candidate, Job, Interview } from "@shared/schema";

/**
 * Format detailed Slack messages for different event types
 */

export async function notifySlackUsers(
  triggerUserId: number,
  eventType: "interview_scheduled" | "offer_accepted" | "offer_sent" | "job_posted" | "new_application",
  data: {
    candidate?: Candidate;
    job?: Job;
    interview?: Interview;
    offer?: any;
    user?: User;
  }
): Promise<void> {
  // Get users who should be notified
  const usersToNotify = await storage.getUsersForSlackNotification(triggerUserId, eventType);
  
  // Helper function to get first skill from candidate
  const getFirstSkill = (candidate: Candidate): string => {
    if (!candidate.skills) return 'Candidate';
    // Handle skills as array or string
    if (Array.isArray(candidate.skills)) {
      return candidate.skills[0] || 'Candidate';
    }
    if (typeof candidate.skills === 'string') {
      return candidate.skills;
    }
    return 'Candidate';
  };

  // Format message based on event type
  let message = "";
  
  switch (eventType) {
    case "interview_scheduled":
      if (data.candidate && data.job && data.interview) {
        const interviewDate = data.interview.scheduledDate 
          ? new Date(data.interview.scheduledDate).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            })
          : 'TBD';
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
        message = `Job posted: ${data.job.title} (${data.job.type || 'Full-time'}) by ${data.user.fullName}`;
      }
      break;
      
    case "new_application":
      if (data.candidate && data.job) {
        message = `New application: ${data.candidate.name} (${getFirstSkill(data.candidate)}) for ${data.job.title} position`;
      }
      break;
  }
  
  if (!message) {
    return; // No message to send
  }
  
  // Send notification to all users who should receive it
  await Promise.all(
    usersToNotify.map(user => storage.sendSlackNotification(user.id, message))
  );
}

