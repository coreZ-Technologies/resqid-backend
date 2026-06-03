// =============================================================================
// rateLimit.middleware.js — RESQID
//
// Layered rate limiting — Redis-backed, cluster-safe.
// Different windows per route type.
// =============================================================================

import { rateLimit } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { middlewareRedis } from '#config/redis.js';
import { asyncHandler } from '#shared/response/asyncHandler.js';
import { extractIp } from '#shared/network/extractIp.js';
import { logger } from '#config/logger.js';

// ─── Redis Store Factory ──────────────────────────────────────────────────────

function makeRedisStore(prefix) {
  return new RedisStore({
    sendCommand: (command, ...args) => middlewareRedis.call(command, ...args),
    prefix,
  });
}

// ─── Shared Handler ───────────────────────────────────────────────────────────

function onLimitReached(req, res) {
  logRateLimitHit(req).catch((e) => logger.warn({ err: e.message }, 'Rate limit log failed'));

  res.status(429).json({
    success: false,
    message: 'Too many requests — please slow down',
    errorCode: 'RATE_LIMITED',
    requestId: req.requestId,
    retryAfter: Math.ceil(res.getHeader('Retry-After') || 60),
  });
}

// ─── Public Emergency — 10/min per IP ─────────────────────────────────────────

export const publicEmergencyLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeRedisStore('rl:emergency:'),
  keyGenerator: (req) => extractIp(req),
  handler: onLimitReached,
  skipSuccessfulRequests: false,
});

// ─── Auth — 5/15min per IP ────────────────────────────────────────────────────

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeRedisStore('rl:auth:'),
  keyGenerator: (req) => extractIp(req),
  handler: onLimitReached,
  skipSuccessfulRequests: false,
});

// ─── OTP — 3/10min per phone ──────────────────────────────────────────────────

export const otpLimiter = asyncHandler(async (req, res, next) => {
  const phone = req.body?.phone;
  if (!phone) return next();

  const key = `rl:otp:${phone}`;
  const current = await middlewareRedis.incr(key);
  if (current === 1) await middlewareRedis.expire(key, 10 * 60);

  if (current > 3) {
    const ttl = await middlewareRedis.ttl(key);
    return res.status(429).json({
      success: false,
      message: 'Too many OTP requests',
      errorCode: 'RATE_LIMITED',
      retryAfter: ttl,
      requestId: req.requestId,
    });
  }

  res.setHeader('X-OTP-Remaining', String(Math.max(0, 3 - current)));
  next();
});

// ─── API — 300/min per user ───────────────────────────────────────────────────

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeRedisStore('rl:api:'),
  keyGenerator: (req) => req.user?.id || extractIp(req),
  handler: onLimitReached,
  skipSuccessfulRequests: false,
});

// ─── Upload — 10/hour per user ────────────────────────────────────────────────

export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeRedisStore('rl:upload:'),
  keyGenerator: (req) => req.user?.id || extractIp(req),
  handler: onLimitReached,
});

// ─── Dashboard — 500/min per user ─────────────────────────────────────────────

export const dashboardLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeRedisStore('rl:dashboard:'),
  keyGenerator: (req) => req.user?.id || extractIp(req),
  handler: onLimitReached,
  skipSuccessfulRequests: true,
});

// ─── Token Generation — 5/hour ────────────────────────────────────────────────

export const tokenGenerationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeRedisStore('rl:token-gen:'),
  keyGenerator: (req) => req.user?.id || extractIp(req),
  handler: onLimitReached,
});

// ─── Registration — 5/min ─────────────────────────────────────────────────────

export const registerLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeRedisStore('rl:register:'),
  keyGenerator: (req) => req.ip,
  handler: onLimitReached,
});

// ─── Per-Token Scan Limit — 20/hour ───────────────────────────────────────────

export const perTokenScanLimit = asyncHandler(async (req, res, next) => {
  const scanCode = req.params.code;
  if (!scanCode) return next();

  const key = `rl:token:${scanCode}`;
  const current = await middlewareRedis.incr(key);
  if (current === 1) await middlewareRedis.expire(key, 60 * 60);

  if (current > 20) {
    return res.status(429).json({
      success: false,
      message: 'This QR code has been scanned too many times',
      errorCode: 'SCAN_LIMIT_EXCEEDED',
      requestId: req.requestId,
    });
  }

  req.scanCount = current;
  next();
});

// ─── IP Block Check ───────────────────────────────────────────────────────────

export const checkIpBlocked = asyncHandler(async (req, res, next) => {
  const ip = extractIp(req);
  const redisKey = `ipblock:${ip}`;

  try {
    const cached = await middlewareRedis.get(redisKey);
    if (cached) {
      return res.status(403).json({
        success: false,
        message: 'IP temporarily blocked',
        errorCode: 'IP_BLOCKED',
        requestId: req.requestId,
      });
    }
  } catch {
    // Redis error — allow through
  }

  next();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function logRateLimitHit(req) {
  const ip = extractIp(req);
  const key = `rl:hit:${ip}`;

  try {
    await middlewareRedis.incr(key);
    await middlewareRedis.expire(key, 3600);
  } catch {
    // Non-critical
  }

  logger.warn({ ip, path: req.path, method: req.method, userId: req.user?.id }, 'Rate limit hit');
}
