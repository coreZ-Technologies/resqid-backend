// =============================================================================
// orchestrator/jobs/behavioralCleanup.job.js — RESQID
// Nightly cleanup — runs at 2 AM IST.
// =============================================================================

import { prisma } from '#config/prisma.js';
import { middlewareRedis as redis } from '#config/redis.js';
import { logger } from '#config/logger.js';
import { behavioralCleanup } from '#middleware/security/behavioralSecurity.middleware.js';

/**
 * Scan Redis keys safely — O(1) per batch, non-blocking.
 */
const scanKeys = async (pattern) => {
  const keys = [];
  let cursor = '0';
  do {
    const [nextCursor, batch] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
    cursor = nextCursor;
    keys.push(...batch);
  } while (cursor !== '0');
  return keys;
};

export const runBehavioralCleanup = async () => {
  const startTime = Date.now();
  const summary = {};

  logger.info('[behavioral.cleanup] Job started');

  // 1. Expired OTPs
  try {
    const otpKeys = await scanKeys('otp:*');
    let deleted = 0;
    for (const key of otpKeys) {
      const ttl = await redis.ttl(key);
      if (ttl <= 0) {
        await redis.del(key);
        deleted++;
      }
    }
    summary.otpKeys = deleted;
    logger.info({ deleted }, '[behavioral.cleanup] OTP keys cleaned');
  } catch (err) {
    logger.error({ err: err.message }, '[behavioral.cleanup] OTP cleanup failed');
  }

  // 2. Expired sessions
  try {
    const result = await prisma.userSession.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    summary.sessions = result.count;
    logger.info({ deleted: result.count }, '[behavioral.cleanup] Sessions cleaned');
  } catch (err) {
    logger.error({ err: err.message }, '[behavioral.cleanup] Session cleanup failed');
  }

  // 3. Expired rate limit records
  try {
    const result = await prisma.scanRateLimit.deleteMany({
      where: { blockedUntil: { lt: new Date() } },
    });
    summary.rateLimits = result.count;
    logger.info({ deleted: result.count }, '[behavioral.cleanup] Rate limits cleaned');
  } catch (err) {
    logger.error({ err: err.message }, '[behavioral.cleanup] Rate limit cleanup failed');
  }

  // 4. Behavioral security Redis keys
  try {
    const behavResult = await behavioralCleanup();
    summary.behavioral = behavResult;
  } catch (err) {
    logger.error({ err: err.message }, '[behavioral.cleanup] Behavioral cleanup failed');
  }

  // 5. Orphaned idempotency keys
  try {
    const idemKeys = await scanKeys('idempotency:*');
    let deleted = 0;
    for (const key of idemKeys) {
      const ttl = await redis.ttl(key);
      if (ttl <= 0) {
        await redis.del(key);
        deleted++;
      }
    }
    summary.idempotency = deleted;
    logger.info({ deleted }, '[behavioral.cleanup] Idempotency keys cleaned');
  } catch (err) {
    logger.error({ err: err.message }, '[behavioral.cleanup] Idempotency cleanup failed');
  }

  const durationMs = Date.now() - startTime;
  logger.info({ ...summary, durationMs }, '[behavioral.cleanup] Completed');
  return { ...summary, durationMs };
};
