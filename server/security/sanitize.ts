/**
 * Security utility for sanitizing user input to prevent XSS attacks
 */

import sanitizeHtml from 'sanitize-html';

/**
 * Sanitize HTML content to prevent XSS attacks
 * Allows only safe HTML tags and attributes
 */
export function sanitizeHtmlInput(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  return sanitizeHtml(html, {
    allowedTags: ['p', 'br', 'a', 'b', 'i', 'u', 'strong', 'em', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
    allowedAttributes: {
      'a': ['href', 'title'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    // Remove javascript: and data: protocols
    allowedSchemesByTag: {
      'a': ['http', 'https', 'mailto']
    },
    // Remove script tags and event handlers
    disallowedTagsMode: 'discard',
  });
}

/**
 * Sanitize plain text input
 * Removes potentially dangerous characters
 */
export function sanitizeTextInput(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return text
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers (onclick=, onerror=, etc.)
    .trim();
}

/**
 * Sanitize email template content
 * Allows HTML but removes dangerous elements
 */
export function sanitizeEmailContent(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ['p', 'br', 'a', 'b', 'i', 'u', 'strong', 'em', 'ul', 'ol', 'li'],
    allowedAttributes: {
      'a': ['href'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
  });
}

/**
 * Sanitize comment content
 */
export function sanitizeComment(content: string): string {
  return sanitizeTextInput(content);
}

/**
 * Sanitize an object by removing sensitive fields
 * Used for logging
 */
export function sanitizeForLogging(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sensitiveFields = [
    'password',
    'apiKey',
    'api_key',
    'token',
    'secret',
    'key',
    'openRouterApiKey',
    'calendlyToken',
    'oauthToken',
    'oauthRefreshToken',
    'credentials',
    'slackWebhookUrl',
  ];

  if (Array.isArray(data)) {
    return data.map(item => sanitizeForLogging(item));
  }

  const sanitized = { ...data };
  for (const key of Object.keys(sanitized)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveFields.some(field => lowerKey.includes(field.toLowerCase()))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeForLogging(sanitized[key]);
    }
  }

  return sanitized;
}

