// =============================================================================
// slowDown.middleware.js — RESQID
//
// Progressive request slowing — adds artificial delay to throttle bots.
// Escalates from delay to block for repeat offenders.
// =============================================================================

import slowDown from 'express-slow-down';
import { RedisStore } from 'rate-limit-redis';
import { middlewareRedis } from '#config/redis.js';
import { extractIp } from '#shared/network/extractIp.js';
import { logger } from '#config/logger.js';

function makeStore(prefix) {
  return new RedisStore({
    sendCommand: (command, ...args) => middlewareRedis.call(command, ...args),
    prefix,
  });
}

// ─── Public Emergency — 3/min then 1s delay per excess ────────────────────────

export const publicEmergencySlowDown = slowDown({
  windowMs: 60 * 1000,
  delayAfter: 3,
  delayMs: (hits) => (hits - 3) * 1000,
  maxDelayMs: 10000,
  store: makeStore('sd:emergency:'),
  keyGenerator: (req) => extractIp(req),
});

// ─── Auth — 2/15min then 2s delay per excess ──────────────────────────────────

export const authSlowDown = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 2,
  delayMs: (hits) => (hits - 2) * 2000,
  maxDelayMs: 30000,
  store: makeStore('sd:auth:'),
  keyGenerator: (req) => extractIp(req),
});

// ─── API — 100/min then 500ms delay per excess ────────────────────────────────

export const apiSlowDown = slowDown({
  windowMs: 60 * 1000,
  delayAfter: 100,
  delayMs: (hits) => (hits - 100) * 500,
  maxDelayMs: 5000,
  store: makeStore('sd:api:'),
  keyGenerator: (req) => req.user?.id || extractIp(req),
});

// ─── Scan Token — 5/hour then 2s delay per excess ─────────────────────────────

export const scanTokenSlowDown = slowDown({
  windowMs: 60 * 60 * 1000,
  delayAfter: 5,
  delayMs: (hits) => (hits - 5) * 2000,
  maxDelayMs: 30000,
  store: makeStore('sd:scan_token:'),
  keyGenerator: (req) => req.params?.code?.slice(0, 20) || extractIp(req),
});

// ─── IP — 50/5min then 500ms delay per excess ─────────────────────────────────

export const ipSlowDown = slowDown({
  windowMs: 5 * 60 * 1000,
  delayAfter: 50,
  delayMs: (hits) => (hits - 50) * 500,
  maxDelayMs: 5000,
  store: makeStore('sd:ip:'),
  keyGenerator: (req) => extractIp(req),
});
