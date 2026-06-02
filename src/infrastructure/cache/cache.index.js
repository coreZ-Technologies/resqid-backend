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

let cacheInstance = null;

export async function initializeCache(config = {}) {
  if (!cacheInstance) {
    const adapter = new RedisAdapter({
      url: config.REDIS_URL || ENV.REDIS_URL,
      password: config.REDIS_PASSWORD || ENV.REDIS_PASSWORD,
      ...config,
    });
    await adapter.connect();
    cacheInstance = adapter;
    logger.info('[Cache] Infrastructure cache initialized');
  }
  return cacheInstance;
}

export function getCache() {
  if (!cacheInstance) {
    throw new Error('[Cache] Not initialized. Call initializeCache() first.');
  }
  return cacheInstance;
}

export async function shutdownCache() {
  if (cacheInstance) {
    await cacheInstance.disconnect();
    cacheInstance = null;
    logger.info('[Cache] Infrastructure cache shut down');
  }
}

export { CacheProvider, RedisAdapter };