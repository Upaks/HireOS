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
    /deleted/i,
    /test[0-9]{3,}/i,
    /fake/i,
    /example\./i,
    /invalid/i,
    /notreal/i,
    /donotexist/i
  ];
  
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