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

// TTL Constants (seconds)

export const TTL = {
  SCHOOL: 5 * 60, // School settings — 5 min
  SESSION: 60, // Session active check — 1 min
  PARENT_CHILDREN: 2 * 60, // Parent-student links — 2 min
  EMERGENCY_PAGE: 30, // Public emergency page — 30 sec
  TOKEN_STATUS: 60, // Token active/revoked — 1 min
  USER_PROFILE: 5 * 60, // User profile — 5 min
  SCAN_RATE: 60, // Rate-limit windows — 1 min
  OTP_BLOCK: 15 * 60, // OTP send block — 15 min
  SHORT: 30, // Volatile data — 30 sec
  MEDIUM: 10 * 60, // Semi-stable data — 10 min
  LONG: 60 * 60, // Stable reference data — 1 hour

  // Timetable-specific TTLs
  TIMETABLE: 24 * 60 * 60, // Generated timetable — 24 hours
  TEACHER_LIST: 30 * 60, // Teacher list — 30 min
  STUDENT_LIST: 30 * 60, // Student list — 30 min
  CLASS_CONFIG: 60 * 60, // Class configuration — 1 hour
  ROOM_LIST: 60 * 60, // Room list — 1 hour
  WELLNESS_DATA: 15 * 60, // Wellness data — 15 min (more sensitive)
  CONSTRAINT_PRESET: 60 * 60, // Constraint presets — 1 hour
};

// Cache Key Builder

export const CacheKey = {
  // School
  school: (id) => `school:${id}`,
  schoolSettings: (id) => `school:settings:${id}`,

  // Session
  session: (id) => `session:${id}`,

  // Parent
  parentChildren: (parentId) => `parent:children:${parentId}`,
  parentProfile: (parentId) => `parent:profile:${parentId}`,

  // Token
  tokenStatus: (tokenHash) => `token:status:${tokenHash}`,
  blacklist: (tokenHash) => `blacklist:${tokenHash}`,

  // Emergency
  emergencyPage: (tokenHash) => `emergency:${tokenHash}`,

  // Scan
  scanCount: (tokenHash) => `scan:count:${tokenHash}`,

  // Rate limiting
  otpBlock: (phone) => `otp:block:${phone}`,
  ipBlock: (ip) => `ip:block:${ip}`,
  rateLimitKey: (id, type) => `rl:${type}:${id}`,

  // Timetable-specific keys
  timetable: (id) => `timetable:${id}`,
  timetableValidation: (id) => `timetable:validation:${id}`,
  teacherList: (schoolId) => `teachers:${schoolId}`,
  teacherWellness: (teacherId) => `teacher:wellness:${teacherId}`,
  studentList: (schoolId) => `students:${schoolId}`,
  classConfig: (classId) => `class:config:${classId}`,
  roomList: (schoolId) => `rooms:${schoolId}`,
  constraintPreset: (schoolId) => `constraints:${schoolId}`,
  gradeConfig: (schoolId) => `grade:config:${schoolId}`,

  // Crisis-specific keys
  activeCrisis: (schoolId) => `crisis:active:${schoolId}`,
  substitutionHistory: (teacherId) => `substitution:${teacherId}`,
};

// Singleto

let cacheInstance = null;

/**
 * Initialize the infrastructure cache.
 * Called once at startup from infrastructure.index.js.
 */
export async function initializeCache(config = {}) {
  if (!cacheInstance) {
    const adapter = new RedisAdapter({
      url: config.REDIS_URL || ENV.REDIS_URL,
      password: config.REDIS_PASSWORD || ENV.REDIS_PASSWORD,
      keyPrefix: ENV.REDIS_KEY_PREFIX || 'resqid:cache:',
      ...config,
    });

    await adapter.connect();
    cacheInstance = adapter;
    logger.info('[Cache] Infrastructure cache initialized');
  }
  return cacheInstance;
}

/**
 * Get the cache instance.
 * Throws if not initialized — call initializeCache() first.
 */
export function getCache() {
  if (!cacheInstance) {
    throw new Error('[Cache] Not initialized. Call initializeCache() first.');
  }
  return cacheInstance;
}

<<<<<<< HEAD
=======
/**
 * Gracefully shutdown the cache.
 */
>>>>>>> 989f84374cc56136e3a7e027fd44e5110bf99e81
export async function shutdownCache() {
  if (cacheInstance) {
    await cacheInstance.disconnect();
    cacheInstance = null;
    logger.info('[Cache] Infrastructure cache shut down');
  }
}

<<<<<<< HEAD
export { CacheProvider, RedisAdapter };
=======
/**
 * Check if cache is initialized.
 */
export function isCacheInitialized() {
  return cacheInstance !== null;
}

/**
 * Get a cached value or compute and store it.
 * Common pattern: "get from cache, if miss → compute → store → return"
 */
export async function getOrSet(key, ttlSeconds, factoryFn) {
  const cache = getCache();

  try {
    const cached = await cache.get(key);
    if (cached !== null && cached !== undefined) {
      return JSON.parse(cached);
    }
  } catch (err) {
    logger.debug({ key, err: err.message }, '[Cache] Cache miss or parse error');
  }

  // Compute fresh value
  const value = await factoryFn();

  // Store in cache (fire and forget — don't block on cache write)
  cache.set(key, JSON.stringify(value), ttlSeconds).catch((err) => {
    logger.debug({ key, err: err.message }, '[Cache] Failed to set cache');
  });

  return value;
}

/**
 * Invalidate multiple cache keys by pattern.
 */
export async function invalidatePattern(pattern) {
  const cache = getCache();
  try {
    const keys = await cache.keys(pattern);
    if (keys.length > 0) {
      await cache.del(...keys);
      logger.debug({ pattern, count: keys.length }, '[Cache] Invalidated keys');
    }
  } catch (err) {
    logger.warn({ pattern, err: err.message }, '[Cache] Invalidation failed');
  }
}

/**
 * Invalidate timetable-related caches for a school.
 */
export async function invalidateTimetableCache(schoolId) {
  await invalidatePattern(`timetable:${schoolId}*`);
  await invalidatePattern(`teachers:${schoolId}*`);
  await invalidatePattern(`classes:${schoolId}*`);
}

export { CacheProvider, RedisAdapter };
>>>>>>> 989f84374cc56136e3a7e027fd44e5110bf99e81
