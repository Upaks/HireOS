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
export function decrypt(ciphertext: string): string {
  if (!ENCRYPTION_KEY) {
    // In development, return as-is if not encrypted
    if (process.env.NODE_ENV !== 'production') {
      return ciphertext;
    }
    throw new Error('ENCRYPTION_KEY must be set in production');
  }

  if (!ciphertext || !ciphertext.includes(':')) {
    // Not encrypted (legacy data or development)
    return ciphertext;
  }

  try {
    const key = Buffer.from(ENCRYPTION_KEY, 'hex');
    const parts = ciphertext.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }

    const iv = Buffer.from(parts[0], 'base64');
    const authTag = Buffer.from(parts[1], 'base64');
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Generate a secure encryption key (for setup)
 * Run this once and store the result in ENCRYPTION_KEY
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

