// =============================================================================
// ipBlock.middleware.js — RESQID
//
// Two-layer IP blocking: Redis (O(1) fast path) + DB (persistent).
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
  1: ENV.IP_BLOCK_DURATION_HOURS ? ENV.IP_BLOCK_DURATION_HOURS * 3600 : 86400, // 24h
  2: 7 * 24 * 60 * 60, // 7 days
  3: 30 * 24 * 60 * 60, // 30 days
  4: 365 * 24 * 60 * 60, // 1 year
};

const MAX_BLOCK_DURATION = BLOCK_DURATIONS[4];
const NEVER_BLOCK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

const redisKey = (ip) => `ipblock:${ip}`;
const offenseKey = (ip) => `ipblock:offense:${ip}`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getOffenseCount(ip) {
  const count = await redis.get(offenseKey(ip));
  return count ? parseInt(count, 10) : 0;
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

  // Slow path — DB
  try {
    const record = await prisma.scanRateLimit.findUnique({
      where: { identifier_identifier_type: { identifier: ip, identifier_type: 'IP' } },
      select: { block_count: true, blocked_until: true, blocked_reason: true },
    });

    if (record?.blocked_until && new Date(record.blocked_until) > new Date()) {
      const offenseCount = (await getOffenseCount(ip)) || record.block_count || 1;
      const duration = getBlockDuration(offenseCount);

      await redis.set(
        redisKey(ip),
        JSON.stringify({
          offenseCount,
          blockedAt: new Date().toISOString(),
          ttl: duration,
          reason: record.blocked_reason,
        }),
        'EX',
        duration
      );

      throw ApiError.ipBlocked();
    }
  } catch (err) {
    if (err instanceof ApiError) throw err;
    // Non-critical
  }

  next();
});

// ─── Block IP Now ─────────────────────────────────────────────────────────────

export async function blockIpNow(ip, reason = 'SECURITY_BLOCK') {
  if (!ip || NEVER_BLOCK.has(ip)) return;

  const offenseCount = await incrementOffenseCount(ip);
  const blockDuration = getBlockDuration(offenseCount);
  const blockedUntil = new Date(Date.now() + blockDuration * 1000);

  await Promise.all([
    redis.set(
      redisKey(ip),
      JSON.stringify({
        offenseCount,
        blockedAt: new Date().toISOString(),
        ttl: blockDuration,
        reason,
      }),
      'EX',
      blockDuration
    ),

    prisma.scanRateLimit.upsert({
      where: { identifier_identifier_type: { identifier: ip, identifier_type: 'IP' } },
      create: {
        identifier: ip,
        identifier_type: 'IP',
        count: 1,
        block_count: offenseCount,
        blocked_until: blockedUntil,
        blocked_reason: `${reason}_${offenseCount}`,
        last_hit: new Date(),
        window_start: new Date(),
      },
      update: {
        block_count: offenseCount,
        blocked_until: blockedUntil,
        blocked_reason: `${reason}_${offenseCount}`,
        last_hit: new Date(),
      },
    }),
  ]);

  logger.warn({ ip, reason, offenseCount, blockedUntil }, `IP blocked: ${ip}`);
}

export async function isIpBlocked(ip) {
  if (NEVER_BLOCK.has(ip)) return false;
  const cached = await redis.get(redisKey(ip));
  return cached !== null;
}
