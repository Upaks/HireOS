import { storage } from "./storage";
import { Candidate, Job, Interview, User } from "@shared/schema";

/**
 * Send Slack notifications for an account based on event type
 * Notifications are now account-scoped (not user-scoped)
 */
export async function notifySlackForAccount(
  accountId: number,
  eventType: "interview_scheduled" | "offer_accepted" | "offer_sent" | "job_posted" | "new_application",
  data: {
    candidate?: Candidate;
    job?: Job;
    interview?: Interview;
    offer?: any;
    user?: User;
  }
): Promise<void> {
  // Get Slack config for this account
  const slackConfig = await storage.getSlackConfig(accountId);
  
  // If Slack is not configured or this event type is not enabled, skip
  if (!slackConfig || !slackConfig.webhookUrl) {
    return;
  }
  
  if (!slackConfig.events?.includes(eventType)) {
    return;
  }

  // Helper function to get first skill from candidate
  const getFirstSkill = (candidate: Candidate): string => {
    if (!candidate.skills) return 'Candidate';
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
        message = `📅 Interview scheduled: ${data.candidate.name} (${getFirstSkill(data.candidate)}) on ${interviewDate} for ${data.job.title} position`;
      }
      break;
      
    case "offer_accepted":
      if (data.candidate && data.job) {
        message = `🎉 ${data.candidate.name} (${getFirstSkill(data.candidate)}) has accepted the offer for ${data.job.title} position!`;
      }
      break;
      
    case "offer_sent":
      if (data.candidate && data.job && data.user) {
        message = `📨 Offer sent to ${data.candidate.name} (${getFirstSkill(data.candidate)}) for ${data.job.title} position by ${data.user.fullName}`;
      }
      break;
      
    case "job_posted":
      if (data.job && data.user) {
        message = `📢 Job posted: ${data.job.title} (${data.job.type || 'Full-time'}) by ${data.user.fullName}`;
      }
      break;
      
    case "new_application":
      if (data.candidate && data.job) {
        message = `📥 New application: ${data.candidate.name} (${getFirstSkill(data.candidate)}) for ${data.job.title} position`;
      }
      break;
  }
  
  if (!message) {
    return;
  }
  
  // Send the notification to the account's Slack webhook
  await storage.sendSlackNotificationForAccount(accountId, message);
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use notifySlackForAccount instead
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
  // Try to get account ID from job (most reliable)
  const accountId = data.job?.accountId;
  
  if (!accountId) {
    console.warn("notifySlackUsers: Could not determine accountId, skipping notification");
    return;
  }
  
  await notifySlackForAccount(accountId, eventType, data);
}
