/**
 * Secure logging utility
 * Prevents sensitive data from being logged
 */

import { sanitizeForLogging } from './sanitize';

/**
 * Secure logger that sanitizes sensitive data
 */
export class SecureLogger {
  /**
   * Log info message (sanitized)
   */
  static info(message: string, data?: any): void {
    const sanitizedData = data ? sanitizeForLogging(data) : undefined;
    if (sanitizedData) {
      console.log(`[INFO] ${message}`, sanitizedData);
    } else {
      console.log(`[INFO] ${message}`);
    }
  }

  /**
   * Log error message (sanitized)
   */
  static error(message: string, error?: any): void {
    if (error) {
      const sanitizedError = sanitizeForLogging(error);
      // Don't log stack traces in production
      if (process.env.NODE_ENV === 'production') {
        console.error(`[ERROR] ${message}`, {
          message: error?.message || String(error),
          // Don't include stack in production
        });
      } else {
        console.error(`[ERROR] ${message}`, sanitizedError);
      }
    } else {
      console.error(`[ERROR] ${message}`);
    }
  }

  /**
   * Log warning message (sanitized)
   */
  static warn(message: string, data?: any): void {
    const sanitizedData = data ? sanitizeForLogging(data) : undefined;
    if (sanitizedData) {
      console.warn(`[WARN] ${message}`, sanitizedData);
    } else {
      console.warn(`[WARN] ${message}`);
    }
  }

  /**
   * Log debug message (only in development)
   */
  static debug(message: string, data?: any): void {
    if (process.env.NODE_ENV === 'development') {
      const sanitizedData = data ? sanitizeForLogging(data) : undefined;
      if (sanitizedData) {
        console.debug(`[DEBUG] ${message}`, sanitizedData);
      } else {
        console.debug(`[DEBUG] ${message}`);
      }
    }
  }
}

