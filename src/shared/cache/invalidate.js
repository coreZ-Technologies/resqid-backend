/**
 * invalidate.js
 *
 * Higher‑level cache invalidation strategies.
 * Used when a piece of data changes and all related cache entries
 * must be purged (e.g. a student record is updated → clear all cached
 * versions of that student across modules).
 */

import { redis } from '#config/redis.js';
import { logger } from '#config/logger.js';

const PREFIX = 'resqid';

/**
 * Delete all keys matching a glob pattern.
 * Uses Redis SCAN internally to avoid blocking.
 *
 * @param {string} pattern - e.g. 'student:STU-123:*'
 * @returns {Promise<number>} number of keys deleted
 */
export async function deleteByPattern(pattern) {
  try {
    const fullPattern = `${PREFIX}:${pattern}`;
    let cursor = '0';
    let totalDeleted = 0;

    do {
      const reply = await redis.scan(cursor, 'MATCH', fullPattern, 'COUNT', 100);
      cursor = reply[0];
      const keys = reply[1];
      if (keys.length > 0) {
        totalDeleted += await redis.del(...keys);
      }
    } while (cursor !== '0');

    if (totalDeleted > 0) {
      logger.info(`Cache invalidated: ${totalDeleted} keys matching "${pattern}"`);
    }
    return totalDeleted;
  } catch (err) {
    logger.error(`Cache invalidation failed for pattern: ${pattern}`, err);
    return 0;
  }
}

/**
 * Invalidate all cache entries for a given student.
 * e.g. call this after updating a student's profile or emergency contact.
 *
 * @param {string} studentId
 */
export async function invalidateStudent(studentId) {
  await deleteByPattern(`student:${studentId}:*`);
  // also clear any scan‑related caches for this student
  await deleteByPattern(`scan:${studentId}:*`);
}

/**
 * Invalidate all cache entries belonging to a school.
 * Useful when bulk operations happen (e.g. timetable regeneration).
 *
 * @param {string} schoolId
 */
export async function invalidateSchool(schoolId) {
  await deleteByPattern(`school:${schoolId}:*`);
}
