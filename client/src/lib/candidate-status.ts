export interface CandidateStatus {
  code: string;
  label: string;
  color: string;
  bgColor: string;
  textColor: string;
}

export const CANDIDATE_STATUSES: Record<string, CandidateStatus> = {
  "00_application_submitted": {
    code: "00",
    label: "Application Submitted",
    color: "green",
    bgColor: "bg-green-100",
    textColor: "text-green-800"
  },
  "15_assessment_sent": {
    code: "15",
    label: "Assessment Sent",
    color: "blue",
    bgColor: "bg-blue-100",
    textColor: "text-blue-800"
  },
  "30_assessment_completed": {
    code: "30",
    label: "Assessment Completed",
    color: "teal",
    bgColor: "bg-teal-100",
    textColor: "text-teal-800"
  },
  "45_1st_interview_sent": {
    code: "45",
    label: "1st Interview Sent",
    color: "pink",
    bgColor: "bg-pink-100",
    textColor: "text-pink-800"
  },
  "60_1st_interview_scheduled": {
    code: "60",
    label: "1st Interview Scheduled",
    color: "orange",
    bgColor: "bg-orange-100",
    textColor: "text-orange-800"
  },
  "75_2nd_interview_scheduled": {
    code: "75",
    label: "2nd Interview Scheduled",
    color: "sky",
    bgColor: "bg-sky-100",
    textColor: "text-sky-800"
  },
  "90_talent_pool": {
    code: "90",
    label: "Moved to Talent Pool",
    color: "purple",
    bgColor: "bg-purple-100",
    textColor: "text-purple-800"
  },
  "95_offer_sent": {
    code: "95",
    label: "Offer Sent",
    color: "yellow",
    bgColor: "bg-yellow-100",
    textColor: "text-yellow-800"
  },
  "100_offer_accepted": {
    code: "100",
    label: "Offer Accepted",
    color: "emerald",
    bgColor: "bg-emerald-100",
    textColor: "text-emerald-800"
  },
  "200_rejected": {
    code: "200",
    label: "Rejected",
    color: "red",
    bgColor: "bg-red-100",
    textColor: "text-red-800"
  }
};

// Legacy status mapping (for backward compatibility)
export const LEGACY_STATUS_MAPPING: Record<string, string> = {
  "new": "00_application_submitted",
  "assessment_sent": "15_assessment_sent",
  "assessment_completed": "30_assessment_completed",
  "interview_scheduled": "60_1st_interview_scheduled",
  "talent_pool": "90_talent_pool",
  "offer_sent": "95_offer_sent",
  "hired": "100_offer_accepted",
  "rejected": "200_rejected"
};

export function getStatusDisplay(statusCode: string): CandidateStatus {
  // Check if it's a legacy status code
  if (LEGACY_STATUS_MAPPING[statusCode]) {
    statusCode = LEGACY_STATUS_MAPPING[statusCode];
  }
  
  // Return status details or a default if not found
  return CANDIDATE_STATUSES[statusCode] || {
    code: "??",
    label: statusCode || "Unknown Status",
    color: "gray",
    bgColor: "bg-gray-100",
    textColor: "text-gray-800"
  };
}

export function getStatusBadgeClassNames(statusCode: string): string {
  const status = getStatusDisplay(statusCode);
  return `${status.bgColor} ${status.textColor}`;
}

export function getStatusesForFilter(): Array<{value: string, label: string}> {
  return Object.entries(CANDIDATE_STATUSES).map(([value, status]) => ({
    value,
    label: `${status.code} ${status.label}`
  }));
}

// Sort candidates by status code (numerically)
export function sortCandidatesByStatus<T extends {status: string}>(candidates: T[]): T[] {
  return [...candidates].sort((a, b) => {
    const aCode = parseInt(getStatusDisplay(a.status).code) || 999;
    const bCode = parseInt(getStatusDisplay(b.status).code) || 999;
    return aCode - bCode;
  });
}

// Function to get all statuses as an array
export function getAllStatuses(): CandidateStatus[] {
  return Object.values(CANDIDATE_STATUSES);
}