/**
 * API Key Management System
 * Provides per-user API keys with rotation, expiration, and logging
 */

import crypto from 'crypto';
import { storage } from '../storage';
import { SecureLogger } from './logger';
import { encrypt, decrypt } from './encryption';

export interface ApiKey {
  id: number;
  userId: number;
  keyHash: string; // Hashed API key (never store plain keys)
  name: string; // User-friendly name for the key
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  createdAt: Date;
  isActive: boolean;
}

/**
 * Generate a new API key
 * Returns the plain key (only shown once) and the hash to store
 */
export function generateApiKey(): { key: string; hash: string } {
  // Generate 32-byte random key, encode as hex (64 characters)
  const key = crypto.randomBytes(32).toString('hex');
  
  // Hash the key using SHA-256 (one-way hash)
  const hash = crypto.createHash('sha256').update(key).digest('hex');
  
  return { key, hash };
}

/**
 * Hash an API key for comparison
 */
export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * Verify an API key against a hash
 */
export function verifyApiKey(key: string, hash: string): boolean {
  const keyHash = hashApiKey(key);
  return crypto.timingSafeEqual(
    Buffer.from(keyHash, 'hex'),
    Buffer.from(hash, 'hex')
  );
}

/**
 * Create a new API key for a user
 * Returns the plain key (store this securely, it won't be shown again)
 */
export async function createApiKey(
  userId: number,
  name: string,
  expiresInDays?: number
): Promise<{ key: string; apiKey: ApiKey }> {
  const { key, hash } = generateApiKey();
  
  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
    : null;

  // TODO: Store in database (create api_keys table)
  // For now, log the creation
  SecureLogger.info("API key created", { userId, name, expiresAt });

  const apiKey: ApiKey = {
    id: 0, // Will be set by database
    userId,
    keyHash: hash,
    name,
    expiresAt,
    lastUsedAt: null,
    createdAt: new Date(),
    isActive: true,
  };

  return { key, apiKey };
}

/**
 * Validate and get user from API key
 */
export async function validateApiKey(key: string): Promise<{ valid: boolean; userId?: number; error?: string }> {
  const keyHash = hashApiKey(key);
  
  // TODO: Look up in database
  // For now, check against environment variable for backward compatibility
  const envKey = process.env.HireOS_API_Key;
  if (envKey && verifyApiKey(key, hashApiKey(envKey))) {
    // Legacy single API key - return a default user ID or handle differently
    return { valid: true, userId: 0 }; // 0 indicates system/legacy key
  }

  // TODO: Check database for user API keys
  // const apiKey = await db.select().from(apiKeys).where(eq(apiKeys.keyHash, keyHash)).limit(1);
  // if (apiKey && apiKey.isActive && (!apiKey.expiresAt || apiKey.expiresAt > new Date())) {
  //   await updateLastUsed(apiKey.id);
  //   return { valid: true, userId: apiKey.userId };
  // }

  return { valid: false, error: 'Invalid API key' };
}

/**
 * Revoke an API key
 */
export async function revokeApiKey(keyId: number, userId: number): Promise<void> {
  // TODO: Update database to set isActive = false
  SecureLogger.info("API key revoked", { keyId, userId });
}

/**
 * List API keys for a user
 */
export async function listApiKeys(userId: number): Promise<ApiKey[]> {
  // TODO: Query database
  return [];
}

/**
 * Update last used timestamp
 */
async function updateLastUsed(keyId: number): Promise<void> {
  // TODO: Update database
  SecureLogger.debug("API key used", { keyId });
}

