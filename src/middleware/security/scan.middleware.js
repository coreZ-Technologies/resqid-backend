// =============================================================================
// scan.middleware.js — RESQID
//
// Security middleware for the public QR scan endpoint.
// Every check runs BEFORE crypto verification or DB query.
// =============================================================================

import { middlewareRedis as redis } from '#config/redis.js';
import { extractIp } from '#shared/network/extractIp.js';
import { logger } from '#config/logger.js';
import { ENV } from '#config/env.js';
import crypto from 'crypto';

// ─── Trusted IPs ──────────────────────────────────────────────────────────────

const trustedIps = new Set([
  '127.0.0.1',
  '::1',
  '::ffff:127.0.0.1',
  ...(ENV.MAINTENANCE_WHITELIST_IPS || []),
  ...(ENV.SCHOOL_GATEWAY_IPS || '')
    .split(',')
    .filter(Boolean)
    .map((s) => s.trim()),
]);

// ─── IP Block Check ───────────────────────────────────────────────────────────

export const checkIpBlockedRedis = async (req, res, next) => {
  const ip = extractIp(req);

  if (trustedIps.has(ip)) return next();

  try {
    const blocked = await redis.get(`ipblock:${ip}`);
    if (blocked) {
      logger.info({ ip }, 'Blocked IP rejected from scan');
      return res
        .status(403)
        .json({ success: false, message: 'Access restricted', errorCode: 'IP_BLOCKED' });
    }
  } catch (err) {
    logger.error({ err: err.message, ip }, 'IP block check error — passing');
  }

  next();
};

// ─── Public Scan Rate Limiter (IP-based) ─────────────────────────────────────

export const publicScanLimiter = async (req, res, next) => {
  const ip = extractIp(req);

  if (trustedIps.has(ip)) return next();

  const key = `rl:scan:${ip}`;

  try {
    const current = await redis.incr(key);
    if (current === 1) await redis.expire(key, 60); // 1-minute window

    const remaining = Math.max(0, 30 - current);
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    res.setHeader('X-RateLimit-Limit', '30');

    if (current > 30) {
      logger.info({ ip, count: current }, 'Scan IP rate limit exceeded');
      return res.status(429).json({
        success: false,
        message: 'Too many scans',
        errorCode: 'SCAN_LIMIT_EXCEEDED',
        retryAfter: Math.ceil((await redis.ttl(key)) || 60),
      });
    }
  } catch (err) {
    logger.error({ err: err.message, ip }, 'Rate limit error — passing');
  }

  next();
};

// ─── Per-Token Scan Limit ─────────────────────────────────────────────────────

export const perTokenScanLimit = async (req, res, next) => {
  const { code } = req.params;
  if (!code) return next();

  try {
    const hashedCode = crypto.createHash('sha256').update(code).digest('hex');
    const key = `rl:token:${hashedCode}`;

    const current = await redis.incr(key);
    if (current === 1) await redis.expire(key, 3600); // 1-hour window

    req.scanCount = current;

    if (current > 20) {
      logger.info({ codePrefix: code.slice(0, 8), count: current }, 'Token scan limit exceeded');
      return res.status(429).json({
        success: false,
        message: 'This QR code has been scanned too many times',
        errorCode: 'SCAN_LIMIT_EXCEEDED',
      });
    }
  } catch (err) {
    logger.error({ err: err.message }, 'Per-token limit error — passing');
    req.scanCount = 1;
  }

  next();
};
