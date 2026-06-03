// =============================================================================
// ipBlock.middleware.js — RESQID
//
// Two-layer IP blocking: Redis (O(1) fast path) + AuditLog (persistent).
// Escalating durations for repeat offenders.
// =============================================================================

import { middlewareRedis as redis } from '#config/redis.js';
import { prisma } from '#config/prisma.js';
import { ApiError } from '#shared/response/ApiError.js';
import { asyncHandler } from '#shared/response/asyncHandler.js';
import { logger } from '#config/logger.js';
import { ENV } from '#config/env.js';

// ─── Config ───────────────────────────────────────────────────────────────────

const BLOCK_DURATIONS = {
  1: ENV.IP_BLOCK_DURATION_HOURS ? ENV.IP_BLOCK_DURATION_HOURS * 3600 : 86400,
  2: 7 * 24 * 60 * 60,
  3: 30 * 24 * 60 * 60,
  4: 365 * 24 * 60 * 60,
};

const MAX_BLOCK_DURATION = BLOCK_DURATIONS[4];
const NEVER_BLOCK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

const redisKey = (ip) => `ipblock:${ip}`;
const offenseKey = (ip) => `ipblock:offense:${ip}`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getOffenseCount(ip) {
  try {
    const count = await redis.get(offenseKey(ip));
    return count ? parseInt(count, 10) : 0;
  } catch {
    return 0;
  }
}

async function incrementOffenseCount(ip) {
  const count = await redis.incr(offenseKey(ip));
  if (count === 1) await redis.expire(offenseKey(ip), MAX_BLOCK_DURATION);
  return count;
}

function getBlockDuration(offenseCount) {
  return BLOCK_DURATIONS[Math.min(offenseCount, 4)] || BLOCK_DURATIONS[4];
}

// ─── Middleware ───────────────────────────────────────────────────────────────

export const ipBlockMiddleware = asyncHandler(async (req, _res, next) => {
  const ip = req.ip || 'unknown';
  if (ip === 'unknown' || NEVER_BLOCK.has(ip)) return next();

  // Fast path — Redis
  try {
    const cached = await redis.get(redisKey(ip));
    if (cached) {
      const blockData = JSON.parse(cached);
      logger.warn({ ip, offenseCount: blockData.offenseCount, path: req.path }, 'Blocked IP');
      throw ApiError.ipBlocked();
    }
  } catch (err) {
    if (err instanceof ApiError) throw err;
    logger.error({ err: err.message }, 'Redis block check failed — passing');
  }

  next();
});

// ─── Block IP ─────────────────────────────────────────────────────────────────

export async function blockIpNow(ip, reason = 'SECURITY_BLOCK') {
  if (!ip || NEVER_BLOCK.has(ip)) return;

  const offenseCount = await incrementOffenseCount(ip);
  const blockDuration = getBlockDuration(offenseCount);
  const blockedUntil = new Date(Date.now() + blockDuration * 1000);

  // Set Redis block
  await redis.set(
    redisKey(ip),
    JSON.stringify({
      offenseCount,
      blockedAt: new Date().toISOString(),
      ttl: blockDuration,
      reason,
    }),
    'EX',
    blockDuration
  );

  // Log to AuditLog for persistence
  try {
    await prisma.auditLog.create({
      data: {
        action: 'IP_BLOCKED',
        severity: 'WARNING',
        actorId: 'SYSTEM',
        actorType: 'SYSTEM',
        entity: 'IP',
        entityId: ip,
        ipAddress: ip,
        metadata: { reason, offenseCount, blockedUntil, blockDuration },
      },
    });
  } catch {
    // Non-critical — Redis is the primary block
  }

  logger.warn({ ip, reason, offenseCount, blockedUntil }, `IP blocked: ${ip}`);
}

export async function isIpBlocked(ip) {
  if (NEVER_BLOCK.has(ip)) return false;
  try {
    const cached = await redis.get(redisKey(ip));
    return cached !== null;
  } catch {
    return false;
  }
}

/**
 * Unblock an IP (admin action).
 */
export async function unblockIp(ip) {
  try {
    await redis.del(redisKey(ip));
    await redis.del(offenseKey(ip));
    logger.info({ ip }, `IP unblocked: ${ip}`);
  } catch {
    // Non-critical
  }
}
