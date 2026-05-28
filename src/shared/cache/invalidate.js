// =============================================================================
// invalidate.js — RESQID Cache Invalidation
//
// Higher-level cache invalidation strategies.
// Used when data changes and related cache entries must be purged.
//
// Called by:
//   - student.service.js     → after profile update
//   - emergency.service.js   → after emergency contact change
//   - attendance.service.js  → after attendance marked
//   - timetable.service.js   → after timetable changed
//   - school.service.js      → after school settings update
// =============================================================================

import { redis, middlewareRedis } from '#config/redis.js';
import { logger } from '#config/logger.js';
import { CACHE_KEYS } from '#shared/constants/cache.js';

// ─── Core: Delete by Pattern ─────────────────────────────────────────────────

/**
 * Delete all keys matching a glob pattern.
 * Uses Redis SCAN internally to avoid blocking (never use KEYS in production).
 *
 * @param {string} pattern - e.g. 'student:STU-123:*'
 * @param {'redis'|'middleware'} client - Which Redis client to use
 * @returns {Promise<number>} Number of keys deleted
 */
export async function deleteByPattern(pattern, client = 'redis') {
  try {
    const redisClient = client === 'middleware' ? middlewareRedis : redis;
    let cursor = '0';
    let totalDeleted = 0;

    do {
      const reply = await redisClient.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = reply[0];
      const keys = reply[1];
      if (keys.length > 0) {
        totalDeleted += await redisClient.del(...keys);
      }
    } while (cursor !== '0');

    if (totalDeleted > 0) {
      logger.info({ pattern, count: totalDeleted }, `Cache invalidated: ${totalDeleted} keys`);
    }
    return totalDeleted;
  } catch (err) {
    logger.error({ err: err.message, pattern }, 'Cache invalidation failed');
    return 0;
  }
}

// ─── Entity Invalidation ─────────────────────────────────────────────────────

/**
 * Invalidate all cache entries for a student.
 * Call after: profile update, emergency contact change, card issue/revoke.
 */
export async function invalidateStudent(studentId) {
  const patterns = [
    `student:${studentId}*`,
    `emergency:${studentId}*`,
    `emergency:contacts:${studentId}*`,
    `token:code:*`, // Token lookups by code
    `qr:${studentId}*`,
    `behavior:scan:${studentId}*`,
  ];

  const results = await Promise.all(patterns.map((p) => deleteByPattern(p)));
  const total = results.reduce((sum, n) => sum + n, 0);

  logger.info({ studentId, keysDeleted: total }, `Student cache invalidated`);
  return total;
}

/**
 * Invalidate all cache entries for a school.
 * Call after: school settings update, subscription change, bulk operations.
 */
export async function invalidateSchool(schoolId) {
  const patterns = [
    `school:${schoolId}*`,
    `list:students:${schoolId}*`,
    `list:teachers:${schoolId}*`,
    `modules:${schoolId}*`,
    `subscription:${schoolId}*`,
    `timetable:${schoolId}*`,
    `attendance:session:${schoolId}*`,
  ];

  const results = await Promise.all(patterns.map((p) => deleteByPattern(p)));
  const total = results.reduce((sum, n) => sum + n, 0);

  logger.info({ schoolId, keysDeleted: total }, `School cache invalidated`);
  return total;
}

/**
 * Invalidate timetable cache for a school.
 * Call after: timetable created, updated, deleted, substitution made.
 */
export async function invalidateTimetable(schoolId) {
  const patterns = [`timetable:${schoolId}*`, `substitution:*`, `teacher:*:schedule`];

  const results = await Promise.all(patterns.map((p) => deleteByPattern(p)));
  const total = results.reduce((sum, n) => sum + n, 0);

  logger.info({ schoolId, keysDeleted: total }, `Timetable cache invalidated`);
  return total;
}

/**
 * Invalidate attendance cache.
 * Call after: attendance marked, session opened/closed.
 */
export async function invalidateAttendance(schoolId, studentId = null) {
  const patterns = [`attendance:session:${schoolId}*`];

  if (studentId) {
    patterns.push(`attendance:${studentId}:*`);
    patterns.push(`behavior:attendance:${studentId}*`);
  }

  const results = await Promise.all(patterns.map((p) => deleteByPattern(p)));
  const total = results.reduce((sum, n) => sum + n, 0);

  logger.info({ schoolId, studentId, keysDeleted: total }, `Attendance cache invalidated`);
  return total;
}

/**
 * Invalidate emergency profile cache.
 * Call after: emergency profile updated, contacts changed.
 */
export async function invalidateEmergency(studentId) {
  const patterns = [
    `emergency:${studentId}*`,
    `emergency:contacts:${studentId}*`,
    `emergency:scans:${studentId}*`,
    `student:${studentId}:emergency*`,
  ];

  const results = await Promise.all(patterns.map((p) => deleteByPattern(p)));
  const total = results.reduce((sum, n) => sum + n, 0);

  logger.info({ studentId, keysDeleted: total }, `Emergency cache invalidated`);
  return total;
}

/**
 * Invalidate token/card cache.
 * Call after: card issued, revoked, lost reported.
 */
export async function invalidateToken(tokenId, code = null) {
  const patterns = [`token:${tokenId}*`];

  if (code) {
    patterns.push(`token:code:${code}*`);
    patterns.push(`scan:${code}*`);
  }

  const results = await Promise.all(patterns.map((p) => deleteByPattern(p)));
  const total = results.reduce((sum, n) => sum + n, 0);

  logger.info({ tokenId, code, keysDeleted: total }, `Token cache invalidated`);
  return total;
}

/**
 * Invalidate user session cache.
 * Call after: logout, session revoked, password changed.
 */
export async function invalidateUserSessions(userId) {
  const patterns = [
    `sessions:user:${userId}*`,
    `sessions:device:${userId}*`,
    `refresh:*`, // Clear all refresh tokens for user
  ];

  const results = await Promise.all(patterns.map((p) => deleteByPattern(p)));
  const total = results.reduce((sum, n) => sum + n, 0);

  logger.info({ userId, keysDeleted: total }, `User sessions invalidated`);
  return total;
}

// ─── Middleware Cache Invalidation ────────────────────────────────────────────

/**
 * Invalidate rate limit counters (admin action).
 * Call after: whitelisting an IP, changing rate limit config.
 */
export async function invalidateRateLimits(ip = null) {
  const patterns = ip ? [`rl:*:${ip}*`, `slowdown:${ip}*`] : [`rl:*`, `slowdown:*`];

  const results = await Promise.all(patterns.map((p) => deleteByPattern(p, 'middleware')));
  const total = results.reduce((sum, n) => sum + n, 0);

  logger.info({ ip, keysDeleted: total }, `Rate limit cache invalidated`);
  return total;
}

/**
 * Invalidate IP reputation data.
 * Call after: manually unblocking an IP, resetting reputation.
 */
export async function invalidateIpReputation(ip = null) {
  const patterns = ip
    ? [`iprep:${ip}*`, `ipfail:${ip}*`, `ipblock:${ip}*`]
    : [`iprep:*`, `ipfail:*`, `ipblock:*`];

  const results = await Promise.all(patterns.map((p) => deleteByPattern(p, 'middleware')));
  const total = results.reduce((sum, n) => sum + n, 0);

  logger.info({ ip, keysDeleted: total }, `IP reputation cache invalidated`);
  return total;
}

/**
 * Invalidate device fingerprint data.
 * Call after: blocking/unblocking a device, resetting trust.
 */
export async function invalidateDeviceData(deviceId = null) {
  const patterns = deviceId
    ? [`device:${deviceId}*`, `behavior:device:${deviceId}*`]
    : [`device:*`, `behavior:device:*`];

  const results = await Promise.all(patterns.map((p) => deleteByPattern(p, 'middleware')));
  const total = results.reduce((sum, n) => sum + n, 0);

  logger.info({ deviceId, keysDeleted: total }, `Device cache invalidated`);
  return total;
}

/**
 * Full cache flush (use with extreme caution).
 * Call only during maintenance or emergency situations.
 */
export async function flushAll() {
  try {
    await Promise.all([redis.flushdb(), middlewareRedis.flushdb()]);
    logger.warn('ALL CACHE FLUSHED — full database flush executed');
    return true;
  } catch (err) {
    logger.error({ err: err.message }, 'Full cache flush failed');
    return false;
  }
}
