/**
 * Rate limiting middleware for API endpoints
 * Prevents brute force attacks and DoS
 */

import rateLimit from 'express-rate-limit';
import type { Request } from 'express';

/**
 * General API rate limiter
 * - Authenticated users: 1000 requests per minute
 * - Unauthenticated: 20 requests per minute
 */
export const apiRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: (req: Request) => {
    if (req.isAuthenticated && req.isAuthenticated()) {
      return 1000;
    }
    return 20;
  },
  message: {
    error: 'Too many requests, please try again later',
    retryAfter: '1 minute'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Disable all validations to avoid IPv6 warnings
  validate: false,
});

/**
 * Rate limiter for authentication endpoints
 * 10 attempts per 15 minutes per IP
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: {
    error: 'Too many login attempts, please try again later',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
});

/**
 * Rate limiter for sensitive endpoints (user management, settings)
 */
export const sensitiveRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: (req: Request) => {
    if (req.isAuthenticated && req.isAuthenticated()) {
      return 100;
    }
    return 10;
  },
  message: {
    error: 'Too many requests to this endpoint, please try again later',
    retryAfter: '1 minute'
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
});

/**
 * File upload rate limiter
 * 20 uploads per hour for authenticated, 5 for anonymous
 */
export const uploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: (req: Request) => {
    if (req.isAuthenticated && req.isAuthenticated()) {
      return 20;
    }
    return 5;
  },
  message: {
    error: 'Too many file uploads, please try again later',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
});
