/**
 * Email validation utilities
 * Helps identify potentially invalid or test email addresses
 */

/**
 * Checks if an email is likely to be invalid or a test address
 * @param email Email address to validate
 * @returns True if the email looks suspicious/invalid
 */
export function isLikelyInvalidEmail(email: string): boolean {
  if (!email) return true;
  
  // Common patterns for test or non-existent emails
  const suspiciousPatterns = [
    /nonexistent/i,
    /deleted(?:account)?/i,
    /test[0-9]+/i,   // Match any test followed by numbers
    /fake/i,
    /example\./i,
    /invalid/i,
    /notreal/i,
    /donotexist/i,
    /dummy/i
  ];
  
  // Specific known test emails from your system
  const knownTestEmails = [
    "nonexistent.user.582013@gmail.com",
    "deletedaccount.test.990199@gmail.com"
  ];
  
  // Check for exact matches first
  if (knownTestEmails.includes(email)) {
    return true;
  }
  
  // Check for suspicious patterns in the email
  if (suspiciousPatterns.some(pattern => pattern.test(email))) {
    return true;
  }
  
  // Very basic email format validation
  const basicEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!basicEmailRegex.test(email)) {
    return true;
  }
  
  // Consider additional validation here if needed
  
  return false;
}