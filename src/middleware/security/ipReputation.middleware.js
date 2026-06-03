// =============================================================================
// ipReputation.middleware.js — RESQID
//
// Multi-layer IP reputation check for public emergency API.
// Blocks datacenter IPs, Tor exit nodes, and Redis-persisted bad IPs.
// =============================================================================

import { middlewareRedis as redis } from '#config/redis.js';
import { asyncHandler } from '#shared/response/asyncHandler.js';
import { extractIp } from '#shared/network/extractIp.js';
import { logger } from '#config/logger.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const IP_BLOCK_PREFIX = 'ipblock:';
const IP_TRUST_PREFIX = 'ipwl:';
const IP_REP_PREFIX = 'iprep:';
const BLOCK_CACHE_TTL = 5 * 60;
const TRUST_CACHE_TTL = 10 * 60;
const REPUTATION_TTL = 7 * 24 * 60 * 60; // 7 days

const NEVER_BLOCK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

// ─── Core Middleware ──────────────────────────────────────────────────────────

export const checkIpReputation = asyncHandler(async (req, res, next) => {
  const ip = extractIp(req);
  if (!ip || NEVER_BLOCK.has(ip)) return next();

  // [1] Redis blocklist
  try {
    const blocked = await redis.get(`${IP_BLOCK_PREFIX}${ip}`);
    if (blocked) {
      logger.warn({ ip, reason: blocked }, 'Blocked IP (Redis)');
      return res.status(403).json({
        success: false,
        message: 'Access restricted',
        errorCode: 'IP_BLOCKED',
        requestId: req.requestId,
      });
    }
  } catch {
    /* fail open */
  }

  // [2] Check IP reputation score
  try {
    const score = await redis.get(`${IP_REP_PREFIX}${ip}`);
    if (score && parseInt(score) <= -50) {
      // Auto-block if reputation is too low
      await blockIp(ip, 'LOW_REPUTATION_SCORE', 24 * 60 * 60);
      return res.status(403).json({
        success: false,
        message: 'Access restricted',
        errorCode: 'IP_BLOCKED',
        requestId: req.requestId,
      });
    }
  } catch {
    /* fail open */
  }

  // [3] Whitelist check (trusted IPs bypass all checks)
  try {
    const trusted = await redis.get(`${IP_TRUST_PREFIX}${ip}`);
    if (trusted) return next();
  } catch {
    /* continue */
  }

  // [4] Datacenter prefix check
  if (isDatacenterIP(ip)) {
    await blockIp(ip, 'DATACENTER_BLOCK', 7 * 24 * 60 * 60);
    return res.status(403).json({
      success: false,
      message: 'Access restricted',
      errorCode: 'IP_BLOCKED',
      requestId: req.requestId,
    });
  }

  // [5] Tor exit node check
  if (isTorExitNode(ip)) {
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

// ─── IP Classification ────────────────────────────────────────────────────────

function isDatacenterIP(ip) {
  const prefixes = [
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
    '45.33.',
    '45.56.',
    '45.79.',
  ];
  return prefixes.some((p) => ip.startsWith(p));
}

function isTorExitNode(ip) {
  const prefixes = [
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
  return prefixes.some((p) => ip.startsWith(p));
}

// ─── Block/Whitelist ──────────────────────────────────────────────────────────

export async function blockIp(ip, reason, durationSec = 7 * 24 * 60 * 60) {
  if (NEVER_BLOCK.has(ip)) return;

  try {
    await redis.set(
      `${IP_BLOCK_PREFIX}${ip}`,
      reason,
      'EX',
      Math.min(durationSec, BLOCK_CACHE_TTL)
    );
    // Also decrease reputation
    await redis.decrby(`${IP_REP_PREFIX}${ip}`, 20);
    await redis.expire(`${IP_REP_PREFIX}${ip}`, REPUTATION_TTL);
  } catch {
    /* non-critical */
  }

  logger.warn({ ip, reason, durationSec }, `IP blocked: ${ip}`);
}

export async function whitelistIp(ip, reason = 'Manual whitelist') {
  if (NEVER_BLOCK.has(ip)) return;

  try {
    await redis.del(`${IP_BLOCK_PREFIX}${ip}`);
    await redis.set(`${IP_TRUST_PREFIX}${ip}`, '1', 'EX', TRUST_CACHE_TTL * 6);
    // Reset reputation
    await redis.set(`${IP_REP_PREFIX}${ip}`, '0', 'EX', REPUTATION_TTL);
  } catch {
    /* non-critical */
  }

  logger.info({ ip, reason }, `IP whitelisted: ${ip}`);
}

/**
 * Decrease IP reputation (called by attackLogger, anomaly evaluator).
 */
export async function decreaseIpReputation(ip, penalty = 10) {
  if (NEVER_BLOCK.has(ip)) return;

  try {
    await redis.decrby(`${IP_REP_PREFIX}${ip}`, penalty);
    await redis.expire(`${IP_REP_PREFIX}${ip}`, REPUTATION_TTL);
  } catch {
    /* non-critical */
  }
}

/**
 * Get current IP reputation score.
 */
export async function getIpReputation(ip) {
  try {
    const score = await redis.get(`${IP_REP_PREFIX}${ip}`);
    return score ? parseInt(score) : 0;
  } catch {
    return 0;
  }
}
