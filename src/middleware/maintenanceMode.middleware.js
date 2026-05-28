// =============================================================================
// maintenanceMode.middleware.js — RESQID
//
// Global maintenance gate — returns 503 when maintenance mode is active.
// Register as the FIRST middleware in app.js.
//
// Bypass: X-Maintenance-Bypass header with secret
// Redis cache: 30s TTL for fast enable/disable
// =============================================================================

import { prisma } from '#config/prisma.js';
import { redis } from '#config/redis.js';
import { ENV } from '#config/env.js';
import { logger } from '#config/logger.js';
import { extractIp } from '#shared/network/extractIp.js';

// ─── Configuration ────────────────────────────────────────────────────────────

const FLAG_KEY = 'maintenance_mode';
const CACHE_KEY = `flag:${FLAG_KEY}`;
const CACHE_TTL = 30; // 30 seconds
const BYPASS_HEADER = 'x-maintenance-bypass';

// Routes that always work during maintenance
const ALWAYS_ALLOWED = new Set(['/health', '/api/health', '/api/health/detailed', '/api/status']);

// IPs that can always bypass (from env)
const WHITELIST_IPS = ENV.MAINTENANCE_WHITELIST_IPS || [];

// ─── Core Middleware ──────────────────────────────────────────────────────────

export async function maintenanceMode(req, res, next) {
  // Always allow health check routes
  if (ALWAYS_ALLOWED.has(req.path)) {
    return next();
  }

  let isMaintenanceEnabled = false;

  try {
    isMaintenanceEnabled = await checkMaintenanceFlag();
  } catch (err) {
    // Fail open — serve requests if we can't check the flag
    logger.error({ err: err.message }, 'maintenanceMode: flag check failed — failing open');
    return next();
  }

  if (!isMaintenanceEnabled) {
    return next();
  }

  // ── Check bypass methods ────────────────────────────────────────────────

  const ip = extractIp(req);

  // 1. Whitelisted IPs (ops team)
  if (WHITELIST_IPS.length > 0 && WHITELIST_IPS.includes(ip)) {
    logger.info({ ip, path: req.path }, 'maintenanceMode: IP whitelist bypass');
    return next();
  }

  // 2. Bypass secret header (for remote access)
  const bypassSecret = req.headers[BYPASS_HEADER];
  if (ENV.MAINTENANCE_BYPASS_SECRET && bypassSecret === ENV.MAINTENANCE_BYPASS_SECRET) {
    logger.info({ ip, path: req.path }, 'maintenanceMode: secret bypass used');
    return next();
  }

  // ── Maintenance active — return 503 ─────────────────────────────────────

  const retryAfter = 900; // 15 minutes
  const requestId = req.requestId || 'unknown';

  // Log at warn level for ops visibility
  logger.warn(
    {
      type: 'maintenance_blocked',
      ip,
      path: req.path,
      method: req.method,
    },
    'Request blocked by maintenance mode'
  );

  res.setHeader('Retry-After', String(retryAfter));
  res.setHeader('X-Maintenance-Mode', 'true');

  return res.status(503).json({
    success: false,
    statusCode: 503,
    message: 'RESQID is currently undergoing scheduled maintenance. We will be back shortly.',
    errorCode: 'MAINTENANCE_MODE',
    retryAfter,
    requestId,
    timestamp: new Date().toISOString(),
  });
}

// ─── Flag Checker ─────────────────────────────────────────────────────────────

async function checkMaintenanceFlag() {
  // Redis first
  const cached = await redis.get(CACHE_KEY);
  if (cached !== null) {
    return cached === '1';
  }

  // DB fallback
  const flag = await prisma.featureFlag.findUnique({
    where: { key: FLAG_KEY },
    select: { enabled: true },
  });

  const enabled = flag?.enabled ?? false;

  // Cache result
  await redis.set(CACHE_KEY, enabled ? '1' : '0', 'EX', CACHE_TTL);

  return enabled;
}

// ─── Cache Management ─────────────────────────────────────────────────────────

/**
 * Flush maintenance cache — call after toggling the flag in DB.
 */
export async function flushMaintenanceCache() {
  await redis.del(CACHE_KEY);
  logger.info('Maintenance mode cache flushed');
}

/**
 * Enable maintenance mode programmatically.
 */
export async function enableMaintenanceMode() {
  await prisma.featureFlag.upsert({
    where: { key: FLAG_KEY },
    create: { key: FLAG_KEY, enabled: true },
    update: { enabled: true },
  });
  await flushMaintenanceCache();
  logger.warn('Maintenance mode ENABLED');
}

/**
 * Disable maintenance mode programmatically.
 */
export async function disableMaintenanceMode() {
  await prisma.featureFlag.upsert({
    where: { key: FLAG_KEY },
    create: { key: FLAG_KEY, enabled: false },
    update: { enabled: false },
  });
  await flushMaintenanceCache();
  logger.info('Maintenance mode DISABLED');
}
