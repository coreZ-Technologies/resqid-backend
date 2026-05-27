// TODO: Add implementation
/**
 * scan.cache.js
 *
 * Cache helpers for the scan / emergency module.
 * After a guard scans a QR code, we temporarily cache the student's
 * emergency profile so the guard's app can view it without re‑querying
 * the DB for a short window (e.g. 2 minutes).
 * Also caches the last few scans per device for anomaly checks.
 */

import { get, set, del } from './cache.js';
import { logger } from '../../config/logger.js';

// ------------------------------------------------------------------
// EMERGENCY PROFILE CACHE (post‑scan)
// ------------------------------------------------------------------

/**
 * Cache a student's emergency profile after a successful emergency scan.
 * The profile includes medical info & contacts – things the guard needs
 * immediately, but which shouldn't stay in cache forever.
 *
 * @param {string} studentId
 * @param {Object} profile
 */
export async function cacheEmergencyProfile(studentId, profile) {
  const key = `scan:emergency-profile:${studentId}`;
  // Short TTL – 2 minutes (after that the guard must re‑scan or request again)
  await set(key, profile, 120);
  logger.debug(`Emergency profile cached for student ${studentId}`);
}

/**
 * Retrieve the cached emergency profile, if still valid.
 * @param {string} studentId
 * @returns {Promise<Object|null>}
 */
export async function getCachedEmergencyProfile(studentId) {
  const key = `scan:emergency-profile:${studentId}`;
  return await get(key);
}

/**
 * Manually clear the emergency profile cache for a student.
 * Called when the emergency ends or the profile is updated.
 *
 * @param {string} studentId
 */
export async function clearEmergencyProfileCache(studentId) {
  const key = `scan:emergency-profile:${studentId}`;
  await del(key);
}

// ------------------------------------------------------------------
// RECENT SCAN LOG FOR ANOMALY DETECTION
// ------------------------------------------------------------------

/**
 * Keep a rolling list of recent scan timestamps per student
 * to allow anomaly.evaluator to quickly check without hitting the DB.
 *
 * @param {string} studentId
 * @param {string} scanId     - the new scan ID
 * @param {Date}   timestamp
 */
export async function pushRecentScanTimestamp(studentId, scanId, timestamp) {
  const listKey = `scan:recent:${studentId}`;
  // Use a Redis LIST: push the scan to the head, trim to last 10
  // We'll store a JSON string: { scanId, timestamp }
  const entry = JSON.stringify({ scanId, timestamp: timestamp.toISOString() });
  try {
    // lazy import to avoid circular dependency – but we have it in same folder
    const { redis } = await import('../../config/redis.js');
    await redis.lpush(`${PREFIX}:${listKey}`, entry);
    await redis.ltrim(`${PREFIX}:${listKey}`, 0, 9); // keep only 10
  } catch (err) {
    logger.error('Failed to push recent scan timestamp', err);
  }
}

/**
 * Get the recent scan list for a student (used by anomaly evaluator).
 * @param {string} studentId
 * @returns {Promise<Array<{scanId:string, timestamp:string}>>}
 */
export async function getRecentScanTimestamps(studentId) {
  const listKey = `scan:recent:${studentId}`;
  try {
    const { redis } = await import('../../config/redis.js');
    const items = await redis.lrange(`${PREFIX}:${listKey}`, 0, -1);
    return items.map(i => JSON.parse(i));
  } catch (err) {
    logger.error('Failed to get recent scan timestamps', err);
    return [];
  }
}