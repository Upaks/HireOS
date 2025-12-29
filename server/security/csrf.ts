/**
 * CSRF protection middleware
 * Prevents Cross-Site Request Forgery attacks
 */

import { Request, Response, NextFunction } from 'express';
import csrf from 'csrf';
import 'express-session';

// Extend SessionData to include csrfSecret
declare module 'express-session' {
  interface SessionData {
    csrfSecret?: string;
  }
}

const tokens = new csrf();

// Secret for CSRF tokens (should be stored in env)
const csrfSecret = process.env.CSRF_SECRET || process.env.SESSION_SECRET || 'csrf-secret-change-in-production';

/**
 * Generate CSRF token
 */
export function generateCsrfToken(req: Request): string {
  const secret = req.session?.csrfSecret || csrfSecret;
  return tokens.create(secret);
}

/**
 * Verify CSRF token
 */
export function verifyCsrfToken(req: Request, token: string): boolean {
  const secret = req.session?.csrfSecret || csrfSecret;
  return tokens.verify(secret, token);
}

/**
 * CSRF protection middleware
 * Skips GET, HEAD, OPTIONS requests (they shouldn't change state)
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  // Skip CSRF for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Skip CSRF for public endpoints that don't require auth
  const publicEndpoints = [
    '/api/upload/resume', // Public application form
    '/api/offers/:token', // Public offer acceptance
  ];

  const isPublicEndpoint = publicEndpoints.some(endpoint => {
    const pattern = endpoint.replace(/:[^/]+/g, '[^/]+');
    const regex = new RegExp(`^${pattern}$`);
    return regex.test(req.path);
  });

  if (isPublicEndpoint) {
    return next();
  }

  // Get token from header or body
  const token = req.headers['x-csrf-token'] || req.body?._csrf || req.query?._csrf;

  if (!token) {
    return res.status(403).json({
      error: 'CSRF token missing',
      message: 'CSRF token is required for this request'
    });
  }

  if (!verifyCsrfToken(req, token as string)) {
    return res.status(403).json({
      error: 'Invalid CSRF token',
      message: 'CSRF token validation failed'
    });
  }

  next();
}

/**
 * Middleware to add CSRF token to response
 * Makes token available for frontend
 */
export function csrfTokenMiddleware(req: Request, res: Response, next: NextFunction) {
  // Store secret in session if not present
  if (!req.session?.csrfSecret) {
    if (!req.session) {
      req.session = {} as any;
    }
    (req.session as any).csrfSecret = csrfSecret;
  }

  // Generate and attach token
  const token = generateCsrfToken(req);
  res.locals.csrfToken = token;
  
  // Also set in header for API clients
  res.setHeader('X-CSRF-Token', token);
  
  next();
}

