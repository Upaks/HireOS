/**
 * Encryption utilities for sensitive data at rest
 * Uses AES-256-GCM for authenticated encryption
 */

import crypto from 'crypto';

// Get encryption key from environment (must be 32 bytes for AES-256)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const ALGORITHM = 'aes-256-gcm';

if (!ENCRYPTION_KEY) {
  console.warn('⚠️  WARNING: ENCRYPTION_KEY not set. Sensitive data will not be encrypted.');
}

if (ENCRYPTION_KEY && ENCRYPTION_KEY.length !== 64) {
  console.warn('⚠️  WARNING: ENCRYPTION_KEY should be 64 hex characters (32 bytes) for AES-256');
}

/**
 * Encrypt sensitive data
 * Returns base64-encoded string: iv:authTag:encryptedData
 */
export function encrypt(plaintext: string): string {
  if (!ENCRYPTION_KEY) {
    // In development, return plaintext with warning
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Encryption disabled: ENCRYPTION_KEY not set');
      return plaintext;
    }
    throw new Error('ENCRYPTION_KEY must be set in production');
  }

  if (!plaintext) {
    return '';
  }

  try {
    const key = Buffer.from(ENCRYPTION_KEY, 'hex');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    const authTag = cipher.getAuthTag();

    // Return: iv:authTag:encryptedData (all base64)
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt sensitive data
 * Expects format: iv:authTag:encryptedData (all base64)
 */
/**
 * Check if a string is valid base64
 */
function isValidBase64(str: string): boolean {
  try {
    // Base64 strings should only contain A-Z, a-z, 0-9, +, /, and = for padding
    // And should be a multiple of 4 in length (after padding)
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    if (!base64Regex.test(str)) {
      return false;
    }
    // Try to decode it
    Buffer.from(str, 'base64');
    return true;
  } catch {
    return false;
  }
}

export function decrypt(ciphertext: string): string {
  if (!ENCRYPTION_KEY) {
    // In development, return as-is if not encrypted
    if (process.env.NODE_ENV !== 'production') {
      return ciphertext;
    }
    throw new Error('ENCRYPTION_KEY must be set in production');
  }

  // If empty or null, return as-is
  if (!ciphertext) {
    return ciphertext;
  }

  // Check if it looks like encrypted data (format: base64:base64:base64)
  const parts = ciphertext.split(':');
  
  // Encrypted data must have exactly 3 parts, all base64
  if (parts.length !== 3) {
    // Not encrypted (legacy data) - return as-is
    return ciphertext;
  }

  // Verify all parts are valid base64 (encrypted data format)
  const [ivPart, authTagPart, encryptedPart] = parts;
  if (!isValidBase64(ivPart) || !isValidBase64(authTagPart) || !isValidBase64(encryptedPart)) {
    // Not encrypted (legacy data that happens to contain ':') - return as-is
    return ciphertext;
  }

  // Additional check: IV should be 16 bytes (24 base64 chars), authTag should be 16 bytes
  try {
    const iv = Buffer.from(ivPart, 'base64');
    const authTag = Buffer.from(authTagPart, 'base64');
    
    // Valid encrypted data should have 16-byte IV and 16-byte authTag
    if (iv.length !== 16 || authTag.length !== 16) {
      // Not encrypted - return as-is
      return ciphertext;
    }
  } catch {
    // Not encrypted - return as-is
    return ciphertext;
  }

  // If we get here, it looks like encrypted data - try to decrypt
  try {
    const key = Buffer.from(ENCRYPTION_KEY, 'hex');
    const iv = Buffer.from(parts[0], 'base64');
    const authTag = Buffer.from(parts[1], 'base64');
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    // Decryption failed - might be corrupted data or wrong key
    // Return original to avoid breaking the application
    // Log error for debugging
    if (process.env.NODE_ENV === 'development') {
      console.warn('Decryption failed, returning original value (may be legacy data):', error);
    }
    return ciphertext;
  }
}

/**
 * Generate a secure encryption key (for setup)
 * Run this once and store the result in ENCRYPTION_KEY
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

