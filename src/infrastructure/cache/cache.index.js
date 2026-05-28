<<<<<<< HEAD
// TODO: Add implementation
import { RedisAdapter } from './redis.adapter.js';
import { CacheProvider } from './cache.provider.js';

// ---------------------------------------------------------------------------
// TTL Constants (seconds)
// ---------------------------------------------------------------------------
export const TTL = {
  SCHOOL: 5 * 60, // School settings
  SESSION: 60, // Session active check
  PARENT_CHILDREN: 2 * 60, // Parent-student links
  EMERGENCY_PAGE: 30, // Public emergency page
  TOKEN_STATUS: 60, // Token active / revoked status
  USER_PROFILE: 5 * 60, // User profile
  SCAN_RATE: 60, // Rate-limit windows
  OTP_BLOCK: 15 * 60, // OTP send block
  SHORT: 30, // Volatile data
  MEDIUM: 10 * 60, // Semi-stable data
  LONG: 60 * 60, // Stable reference data
};

// ---------------------------------------------------------------------------
// Cache Key Builders
// ---------------------------------------------------------------------------
export const CacheKey = {
  school: id => `school:${id}`,
  schoolSettings: id => `school:settings:${id}`,
  session: id => `session:${id}`,
  parentChildren: parentId => `parent:children:${parentId}`,
  parentProfile: parentId => `parent:profile:${parentId}`,
  tokenStatus: tokenHash => `token:status:${tokenHash}`,
  emergencyPage: tokenHash => `emergency:${tokenHash}`,
  blacklist: tokenHash => `blacklist:${tokenHash}`,
  scanCount: tokenHash => `scan:count:${tokenHash}`,
  otpBlock: phone => `otp:block:${phone}`,
  ipBlock: ip => `ip:block:${ip}`,
  rateLimitKey: (id, type) => `rl:${type}:${id}`,
};

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------
=======
// =============================================================================
// cache.index.js — RESQID
//
// Infrastructure cache layer — singleton Redis adapter.
// Separate from the 3 main Redis clients (http, middleware, worker).
// Used by infrastructure services (email, SMS, storage).
// =============================================================================

import { RedisAdapter } from './redis.adapter.js';
import { CacheProvider } from './cache.provider.js';
import { ENV } from '#config/env.js';
import { logger } from '#config/logger.js';

// ─── TTL Constants (seconds) ─────────────────────────────────────────────────

export const TTL = {
  SCHOOL: 5 * 60,
  SESSION: 60,
  PARENT_CHILDREN: 2 * 60,
  EMERGENCY_PAGE: 30,
  TOKEN_STATUS: 60,
  USER_PROFILE: 5 * 60,
  SCAN_RATE: 60,
  OTP_BLOCK: 15 * 60,
  SHORT: 30,
  MEDIUM: 10 * 60,
  LONG: 60 * 60,
};

// ─── Cache Key Builders ──────────────────────────────────────────────────────

export const CacheKey = {
  school: (id) => `school:${id}`,
  schoolSettings: (id) => `school:settings:${id}`,
  session: (id) => `session:${id}`,
  parentChildren: (parentId) => `parent:children:${parentId}`,
  parentProfile: (parentId) => `parent:profile:${parentId}`,
  tokenStatus: (tokenHash) => `token:status:${tokenHash}`,
  emergencyPage: (tokenHash) => `emergency:${tokenHash}`,
  blacklist: (tokenHash) => `blacklist:${tokenHash}`,
  scanCount: (tokenHash) => `scan:count:${tokenHash}`,
  otpBlock: (phone) => `otp:block:${phone}`,
  ipBlock: (ip) => `ip:block:${ip}`,
  rateLimitKey: (id, type) => `rl:${type}:${id}`,
};

// ─── Singleton ───────────────────────────────────────────────────────────────

>>>>>>> 968b0de918a92400b738d75ff34fed5a70d11b67
let cacheInstance = null;

export async function initializeCache(config = {}) {
  if (!cacheInstance) {
<<<<<<< HEAD
    const adapter = new RedisAdapter(config);
    await adapter.connect();
    cacheInstance = adapter;
=======
    const adapter = new RedisAdapter({
      url: config.REDIS_URL || ENV.REDIS_URL,
      password: config.REDIS_PASSWORD || ENV.REDIS_PASSWORD,
      ...config,
    });
    await adapter.connect();
    cacheInstance = adapter;
    logger.info('[Cache] Infrastructure cache initialized');
>>>>>>> 968b0de918a92400b738d75ff34fed5a70d11b67
  }
  return cacheInstance;
}

export function getCache() {
  if (!cacheInstance) {
<<<<<<< HEAD
    throw new Error('[Cache] Not initialized. Call initializeCache() before use.');
=======
    throw new Error('[Cache] Not initialized. Call initializeCache() first.');
>>>>>>> 968b0de918a92400b738d75ff34fed5a70d11b67
  }
  return cacheInstance;
}

<<<<<<< HEAD
=======
export async function shutdownCache() {
  if (cacheInstance) {
    await cacheInstance.disconnect();
    cacheInstance = null;
    logger.info('[Cache] Infrastructure cache shut down');
  }
}

>>>>>>> 968b0de918a92400b738d75ff34fed5a70d11b67
export { CacheProvider, RedisAdapter };
