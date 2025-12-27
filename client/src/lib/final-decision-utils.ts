/**
 * Utility functions for Final Decision Status handling
 */

export function getFinalDecisionDisplayLabel(finalDecisionStatus: string | null | undefined): string {
  if (!finalDecisionStatus) {
    return "Not Applicable";
  }
  
  switch (finalDecisionStatus) {
    case "pending":
      return "Pending";
    case "rejected":
      return "Rejected";
    case "90_offer_sent":
    case "offer_sent":
      return "Offer Sent";
    case "80_talent_pool":
    case "talent_pool":
      return "Talent Pool";
    default:
      return "Not Applicable";
  }
}

/**
 * Determines if a candidate should appear in the Executive Review > Final Approvals tab
 * Business Logic: Candidates appear if their status OR final_decision_status matches:
 * - rejected
 * - offer_sent  
 * - offer_accepted
 * - talent_pool
 * - pending (for final_decision_status only)
 */
export function shouldShowInFinalApprovals(candidate: any): boolean {
  const status = candidate.status;
  const finalDecisionStatus = candidate.finalDecisionStatus;
  
  const targetStatuses = ["200_rejected", "95_offer_sent", "100_offer_accepted", "90_talent_pool"];
  const targetFinalDecisionStatuses = ["rejected", "offer_sent", "offer_accepted", "talent_pool", "pending"];
  
  return (
    targetStatuses.includes(status) ||
    targetFinalDecisionStatuses.includes(finalDecisionStatus)
  );
}

/**
 * Determines if a candidate should be excluded from the regular Candidates tab
 * These are candidates that appear in Final Approvals
 */
export function shouldExcludeFromRegularTab(candidate: any): boolean {
  return shouldShowInFinalApprovals(candidate);
}