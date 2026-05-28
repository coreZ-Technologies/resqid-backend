// =============================================================================
// scan.cache.js — RESQID
//
// Cache helpers for the scan / emergency module.
// After someone scans a QR code, we temporarily cache the student's
// emergency profile and track recent scans for anomaly detection.
//
// Used by:
//   - scan.service.js         → cache emergency profile after scan
//   - emergency.controller.js → retrieve cached profile
//   - anomaly.evaluator.js    → check recent scan patterns
// =============================================================================

import { middlewareRedis } from '#config/redis.js';
import { middlewareSet, middlewareGet, middlewareDel, increment } from './cache.js';
import { logger } from '#config/logger.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const EMERGENCY_PROFILE_TTL = 120; // 2 minutes
const RECENT_SCANS_LIMIT = 10; // Keep last 10 scans per student
const RECENT_SCANS_TTL = 3600; // 1 hour expiry on list

// ─── Emergency Profile Cache ──────────────────────────────────────────────────

/**
 * Cache a student's emergency profile after a successful QR scan.
 * The profile includes medical info & contacts — things the responder
 * needs immediately, but shouldn't stay in cache forever.
 *
 * @param {string} studentId
 * @param {Object} profile - Emergency profile data
 */
export async function cacheEmergencyProfile(studentId, profile) {
  const key = `scan:emergency-profile:${studentId}`;
  await middlewareSet(key, profile, EMERGENCY_PROFILE_TTL);
  logger.debug({ studentId }, 'Emergency profile cached');
}

/**
 * Retrieve the cached emergency profile, if still valid.
 *
 * @param {string} studentId
 * @returns {Promise<Object|null>}
 */
export async function getCachedEmergencyProfile(studentId) {
  const key = `scan:emergency-profile:${studentId}`;
  return await middlewareGet(key);
}

/**
 * Manually clear the emergency profile cache for a student.
 * Called when the emergency ends or the profile is updated by parent.
 *
 * @param {string} studentId
 */
export async function clearEmergencyProfileCache(studentId) {
  const key = `scan:emergency-profile:${studentId}`;
  await middlewareDel(key);
  logger.debug({ studentId }, 'Emergency profile cache cleared');
}

// ─── Recent Scan Tracking (for Anomaly Detection) ────────────────────────────

/**
 * Push a scan to the rolling list of recent scans per student.
 * Used by anomaly.evaluator.js to quickly check patterns without hitting DB.
 *
 * @param {string} studentId
 * @param {string} scanId     - The new scan record ID
 * @param {string} scanType   - 'RFID' or 'QR'
 * @param {Date}   timestamp
 * @param {string} [scannerIp] - IP of the person/device scanning
 * @param {string} [deviceId]  - Device fingerprint or RFID device ID
 */
export async function pushRecentScan(
  studentId,
  scanId,
  scanType,
  timestamp,
  scannerIp = null,
  deviceId = null
) {
  const listKey = `scan:recent:${studentId}`;

  const entry = JSON.stringify({
    scanId,
    scanType,
    timestamp: timestamp instanceof Date ? timestamp.toISOString() : timestamp,
    scannerIp,
    deviceId,
  });

  try {
    // Push to head of list
    await middlewareRedis.lpush(listKey, entry);

    // Trim to last N scans
    await middlewareRedis.ltrim(listKey, 0, RECENT_SCANS_LIMIT - 1);

    // Set TTL on the list (reset on each push)
    await middlewareRedis.expire(listKey, RECENT_SCANS_TTL);
  } catch (err) {
    logger.error({ err: err.message, studentId }, 'Failed to push recent scan');
  }
}

/**
 * Get the recent scan list for a student.
 * Used by anomaly evaluator to check for duplicate/rapid scans.
 *
 * @param {string} studentId
 * @returns {Promise<Array<{scanId: string, scanType: string, timestamp: string, scannerIp: string|null, deviceId: string|null}>>}
 */
export async function getRecentScans(studentId) {
  const listKey = `scan:recent:${studentId}`;

  try {
    const items = await middlewareRedis.lrange(listKey, 0, -1);
    return items
      .map((item) => {
        try {
          return JSON.parse(item);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch (err) {
    logger.error({ err: err.message, studentId }, 'Failed to get recent scans');
    return [];
  }
}

/**
 * Get count of recent scans for a student within a time window.
 * Used to detect rapid scanning abuse.
 *
 * @param {string} studentId
 * @param {number} windowSeconds - Time window to check
 * @returns {Promise<number>}
 */
export async function getRecentScanCount(studentId, windowSeconds = 60) {
  const recentScans = await getRecentScans(studentId);
  const cutoff = Date.now() - windowSeconds * 1000;

  return recentScans.filter((scan) => {
    const scanTime = new Date(scan.timestamp).getTime();
    return scanTime > cutoff;
  }).length;
}

/**
 * Clear recent scan history for a student.
 * Called after anomaly is resolved or student data is reset.
 *
 * @param {string} studentId
 */
export async function clearRecentScans(studentId) {
  const listKey = `scan:recent:${studentId}`;
  await middlewareDel(listKey);
}

// ─── Scan Rate Tracking (Per IP / Per Student) ────────────────────────────────

/**
 * Track scan count per scanner IP.
 * Used by rate limiting and anomaly detection.
 *
 * @param {string} scannerIp - IP of the person scanning
 * @param {number} windowSeconds - Time window
 * @returns {Promise<number>} Current scan count for this IP
 */
export async function trackScanRate(scannerIp, windowSeconds = 60) {
  const key = `scanrate:${scannerIp}`;
  const count = await increment(key, 1, windowSeconds);
  return count;
}

/**
 * Track scan count per student (from any scanner).
 * Used to detect if a student's QR is being scanned excessively.
 *
 * @param {string} studentId
 * @param {number} windowSeconds - Time window
 * @returns {Promise<number>} Current scan count for this student
 */
export async function trackStudentScanRate(studentId, windowSeconds = 60) {
  const key = `scanrate:student:${studentId}`;
  const count = await increment(key, 1, windowSeconds);
  return count;
}

/**
 * Get current scan rate for an IP.
 *
 * @param {string} scannerIp
 * @returns {Promise<number>}
 */
export async function getScanRate(scannerIp) {
  try {
    const key = `scanrate:${scannerIp}`;
    const value = await middlewareRedis.get(key);
    return value ? parseInt(value, 10) : 0;
  } catch {
    return 0;
  }
}

/**
 * Get current scan rate for a student.
 *
 * @param {string} studentId
 * @returns {Promise<number>}
 */
export async function getStudentScanRate(studentId) {
  try {
    const key = `scanrate:student:${studentId}`;
    const value = await middlewareRedis.get(key);
    return value ? parseInt(value, 10) : 0;
  } catch {
    return 0;
  }
}
