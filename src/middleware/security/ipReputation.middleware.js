// =============================================================================
// ipReputation.middleware.js — RESQID
//
// Multi-layer IP reputation check for public emergency API.
// Blocks datacenter IPs, Tor exit nodes, and DB-persisted bad IPs.
// =============================================================================

import { prisma } from '#config/prisma.js';
import { middlewareRedis as redis } from '#config/redis.js';
import { asyncHandler } from '#shared/response/asyncHandler.js';
import { extractIp } from '#shared/network/extractIp.js';
import { logger } from '#config/logger.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const IP_BLOCK_PREFIX = 'ipblock:';
const IP_TRUST_PREFIX = 'ipwl:';
const BLOCK_CACHE_TTL = 5 * 60;
const TRUST_CACHE_TTL = 10 * 60;

const DATACENTER_PREFIXES = [
  '104.16.',
  '104.17.',
  '104.18.',
  '104.19.',
  '162.158.',
  '198.41.128.',
  '198.41.129.',
  '3.208.',
  '3.209.',
  '3.210.',
  '3.211.',
  '34.64.',
  '34.65.',
  '34.66.',
  '34.67.',
  '20.36.',
  '20.37.',
  '20.38.',
  '20.39.',
  '45.33.',
  '45.56.',
  '45.79.',
];

const TOR_PREFIXES = [
  '5.9.',
  '46.165.',
  '62.210.',
  '66.111.',
  '77.247.',
  '82.94.',
  '86.59.',
  '89.18.',
  '93.95.',
  '109.163.',
  '131.188.',
  '176.126.',
  '178.17.',
  '185.100.',
  '193.11.',
  '195.176.',
  '212.47.',
];

const NEVER_BLOCK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

// ─── Core Middleware ──────────────────────────────────────────────────────────

export const checkIpReputation = asyncHandler(async (req, res, next) => {
  const ip = extractIp(req);

  if (!ip || NEVER_BLOCK.has(ip)) return next();

  // [1] Redis blocklist
  const redisBlock = await redis.get(`${IP_BLOCK_PREFIX}${ip}`);
  if (redisBlock) {
    const blockData = JSON.parse(redisBlock);
    logger.warn({ ip, reason: blockData.reason }, 'Blocked IP (Redis)');
    return res.status(403).json({
      success: false,
      message: 'Access restricted',
      errorCode: 'IP_BLOCKED',
      requestId: req.requestId,
    });
  }

  // [2] DB persistent block
  try {
    const dbBlock = await prisma.scanRateLimit.findUnique({
      where: { identifier_identifier_type: { identifier: ip, identifier_type: 'IP' } },
      select: { blocked_until: true, blocked_reason: true, block_count: true },
    });

    if (dbBlock?.blocked_until && new Date(dbBlock.blocked_until) > new Date()) {
      await redis.set(
        `${IP_BLOCK_PREFIX}${ip}`,
        JSON.stringify({
          reason: dbBlock.blocked_reason,
          blockCount: dbBlock.block_count,
        }),
        'EX',
        BLOCK_CACHE_TTL
      );
      return res.status(403).json({
        success: false,
        message: 'Access restricted',
        errorCode: 'IP_BLOCKED',
        requestId: req.requestId,
      });
    }
  } catch {
    /* Non-critical */
  }

  // [3] Datacenter prefix
  if (DATACENTER_PREFIXES.some((p) => ip.startsWith(p))) {
    await blockIp(ip, 'DATACENTER_BLOCK', 7 * 24 * 60 * 60);
    return res.status(403).json({
      success: false,
      message: 'Access restricted',
      errorCode: 'IP_BLOCKED',
      requestId: req.requestId,
    });
  }

  // [4] Tor exit node
  if (TOR_PREFIXES.some((p) => ip.startsWith(p))) {
    await blockIp(ip, 'TOR_EXIT_NODE', 30 * 24 * 60 * 60);
    return res.status(403).json({
      success: false,
      message: 'Access restricted',
      errorCode: 'IP_BLOCKED',
      requestId: req.requestId,
    });
  }

  next();
});

// ─── Block IP ─────────────────────────────────────────────────────────────────

export async function blockIp(ip, reason, durationSec = 7 * 24 * 60 * 60) {
  if (NEVER_BLOCK.has(ip)) return;

  const blockedUntil = new Date(Date.now() + durationSec * 1000);

  try {
    await prisma.scanRateLimit.upsert({
      where: { identifier_identifier_type: { identifier: ip, identifier_type: 'IP' } },
      update: {
        blocked_until: blockedUntil,
        blocked_reason: reason,
        block_count: { increment: 1 },
        last_hit: new Date(),
      },
      create: {
        identifier: ip,
        identifier_type: 'IP',
        count: 1,
        window_start: new Date(),
        last_hit: new Date(),
        blocked_until: blockedUntil,
        blocked_reason: reason,
        block_count: 1,
      },
    });
  } catch {
    /* Table may not exist */
  }

  await redis.set(
    `${IP_BLOCK_PREFIX}${ip}`,
    JSON.stringify({ reason, blockedUntil }),
    'EX',
    Math.min(durationSec, BLOCK_CACHE_TTL)
  );
  logger.warn({ ip, reason }, `IP blocked: ${ip}`);
}

export async function whitelistIp(ip, reason) {
  if (NEVER_BLOCK.has(ip)) return;
  await redis.del(`${IP_BLOCK_PREFIX}${ip}`);
  await redis.set(`${IP_TRUST_PREFIX}${ip}`, '1', 'EX', TRUST_CACHE_TTL * 6);
  logger.info({ ip, reason }, `IP whitelisted: ${ip}`);
}
