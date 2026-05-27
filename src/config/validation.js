// =============================================================================
// validation.js — RESQID
// Runtime config validation, connection monitoring, health checks,
// graceful shutdown, and startup diagnostics
// =============================================================================

import { ENV } from './env.js';
import { logger } from './logger.js';
import { prisma } from './prisma.js';
import { redis, middlewareRedis, workerRedis, disconnectRedis } from './redis.js';
import { disconnectPrisma } from './prisma.js';

// ─── Constants ────────────────────────────────────────────────────────────────

export const CONSTANTS = Object.freeze({
  WEBHOOK: {
    MAX_RETRIES: 3,
    RETRY_DELAYS_MS: [1000, 5000, 15000],
    TIMEOUT_MS: 10000,
    CONCURRENT_LIMIT: 10,
  },

  RATE_LIMIT_HEADERS: {
    LIMIT: 'x-rate-limit-limit',
    REMAINING: 'x-rate-limit-remaining',
    RESET: 'x-rate-limit-reset',
    RETRY_AFTER: 'retry-after',
  },

  CACHE: {
    DEFAULT_TTL_SECS: 300, // 5 minutes
    STATIC_TTL_SECS: 86400, // 24 hours
    NO_CACHE: 'no-cache, no-store, must-revalidate',
  },

  CORS: {
    ALLOWED_METHODS: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    ALLOWED_HEADERS: [
      'Content-Type',
      'Authorization',
      'X-CSRF-Token',
      'X-Request-ID',
      'API-Version',
      'X-Device-ID',
    ],
    EXPOSED_HEADERS: ['X-Request-ID', 'X-Rate-Limit-Remaining'],
    MAX_AGE: 86400, // 24 hours preflight cache
  },
});

// ─── Anomaly Detection Thresholds ─────────────────────────────────────────────
// Separated so they're easy to tune without touching logic

const ANOMALY_THRESHOLDS = {
  REDIS_CONNECTION_SPIKE: 50, // warn if connections jump by this many in one interval
  REDIS_CONNECTION_MAX: 200, // warn if total exceeds this
  MEMORY_INCREASE_PERCENT: 40, // warn if heap grows by this % in one interval
  MEMORY_INCREASE_MIN_MB: 150, // only warn if absolute increase exceeds this too (avoids GC noise)
};

// ─── Runtime Config Validator ─────────────────────────────────────────────────

/**
 * validateRuntimeConfig()
 *
 * Validates service config and secrets at startup.
 * DB connectivity is intentionally skipped here —
 * connectPrisma() in prisma.js already handles that with retries.
 *
 * Call once after all modules are loaded.
 */
export async function validateRuntimeConfig() {
  const errors = [];
  const warnings = [];

  // 1. Redis connectivity — all 3 clients
  const redisClients = [
    { name: 'http', client: redis },
    { name: 'middleware', client: middlewareRedis },
    { name: 'worker', client: workerRedis },
  ];

  for (const { name, client } of redisClients) {
    try {
      const pong = await Promise.race([
        client.ping(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout after 2s')), 2000)),
      ]);

      if (pong !== 'PONG') {
        // middleware and worker Redis are non-critical — warn, don't error
        const list = name === 'http' ? errors : warnings;
        list.push(`Redis [${name}]: unexpected ping response '${pong}'`);
      }
    } catch (err) {
      const list = name === 'http' ? errors : warnings;
      list.push(`Redis [${name}]: ${err.message}`);
    }
  }

  // 2. Duplicate secrets check — reduces blast radius if one is compromised
  const secrets = [
    ENV.JWT_ACCESS_SECRET,
    ENV.JWT_REFRESH_SECRET,
    ENV.CSRF_SECRET,
    ENV.TOKEN_HASH_SECRET,
    ENV.SCAN_CODE_SECRET,
    ENV.LOOKUP_HASH_SECRET,
  ].filter(Boolean);

  if (new Set(secrets).size !== secrets.length) {
    warnings.push('Two or more secrets share the same value — rotate immediately');
  }

  // 3. URL format — only enforce HTTPS in production
  if (ENV.IS_PROD) {
    const urls = [
      { key: 'API_URL', value: ENV.API_URL },
      { key: 'SUPER_ADMIN_URL', value: ENV.SUPER_ADMIN_URL },
      { key: 'SCHOOL_ADMIN_URL', value: ENV.SCHOOL_ADMIN_URL },
      { key: 'SCAN_BASE_URL', value: ENV.SCAN_BASE_URL },
    ];

    for (const { key, value } of urls) {
      if (value && !value.startsWith('https://')) {
        errors.push(`${key} must use HTTPS in production (got: ${value})`);
      }
    }
  }

  // 4. Production-only checks
  if (ENV.IS_PROD) {
    if (!ENV.SENTRY_DSN) {
      warnings.push('SENTRY_DSN not set — error monitoring disabled');
    }

    if (!ENV.SLACK_ALERTS_WEBHOOK) {
      warnings.push('SLACK_ALERTS_WEBHOOK not set — DLQ alerts disabled');
    }

    if (ENV.ENABLE_PIPELINE_QUEUE) {
      warnings.push(
        'ENABLE_PIPELINE_QUEUE=true in production — pipeline worker should run locally'
      );
    }
  }

  // 5. Storage init check
  try {
    const { getStorage } = await import('#infrastructure/storage/storage.index.js');
    const storage = getStorage();
    if (!storage) warnings.push('Storage not initialized — uploads will fail');
  } catch (err) {
    warnings.push(`Storage module failed to load: ${err.message}`);
  }

  // ── Log results ─────────────────────────────────────────────────────────────

  if (errors.length > 0) {
    logger.error(
      { type: 'runtime_config_invalid', errors, warnings },
      `Runtime validation failed — ${errors.length} error(s)`
    );
    return { valid: false, errors, warnings };
  }

  if (warnings.length > 0) {
    logger.warn(
      { type: 'runtime_config_warnings', warnings },
      `Runtime validation passed with ${warnings.length} warning(s)`
    );
  } else {
    logger.info({ type: 'runtime_config_valid' }, 'Runtime configuration validated successfully');
  }

  return { valid: true, errors: [], warnings };
}

// ─── Connection Pool Monitor ──────────────────────────────────────────────────

let monitoringInterval = null;
let lastStats = {};

export function startConnectionMonitoring(intervalMs = 60_000) {
  if (monitoringInterval) clearInterval(monitoringInterval);

  monitoringInterval = setInterval(async () => {
    try {
      const stats = await getConnectionStats();
      detectAnomalies(stats);
      lastStats = stats;
    } catch (err) {
      // Monitoring failure must never crash the app — log at debug only
      logger.debug({ err: err.message }, 'Connection monitoring tick failed');
    }
  }, intervalMs);

  logger.info({ intervalMs }, 'Connection monitoring started');
}

export function stopConnectionMonitoring() {
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
    monitoringInterval = null;
    logger.info('Connection monitoring stopped');
  }
}

async function getConnectionStats() {
  const mem = process.memoryUsage();

  const stats = {
    timestamp: new Date().toISOString(),
    redis: {},
    database: {},
    memory: {
      rss_mb: Math.round(mem.rss / 1024 / 1024),
      heap_total_mb: Math.round(mem.heapTotal / 1024 / 1024),
      heap_used_mb: Math.round(mem.heapUsed / 1024 / 1024),
      external_mb: Math.round(mem.external / 1024 / 1024),
    },
  };

  // Redis stats
  try {
    const info = await redis.info('clients');
    const match = info.match(/connected_clients:(\d+)/);
    stats.redis = {
      connected_clients: match ? parseInt(match[1]) : null,
      status: redis.status,
    };
  } catch (err) {
    stats.redis = { error: err.message, status: 'error' };
  }

  // DB latency
  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    stats.database = { status: 'ok', latency_ms: Date.now() - start };
  } catch (err) {
    stats.database = { status: 'error', error: err.message };
  }

  return stats;
}

function detectAnomalies(current) {
  const warnings = [];
  const {
    REDIS_CONNECTION_SPIKE,
    REDIS_CONNECTION_MAX,
    MEMORY_INCREASE_PERCENT,
    MEMORY_INCREASE_MIN_MB,
  } = ANOMALY_THRESHOLDS;

  // Redis connection spike
  if (lastStats.redis?.connected_clients && current.redis?.connected_clients) {
    const spike = current.redis.connected_clients - lastStats.redis.connected_clients;
    if (spike > REDIS_CONNECTION_SPIKE && current.redis.connected_clients > REDIS_CONNECTION_MAX) {
      warnings.push(
        `Redis connection spike: +${spike} (total: ${current.redis.connected_clients})`
      );
    }
  }

  // Memory growth — require BOTH % and absolute threshold to avoid GC false positives
  if (lastStats.memory?.heap_used_mb && current.memory?.heap_used_mb) {
    const deltaMb = current.memory.heap_used_mb - lastStats.memory.heap_used_mb;
    const deltaPercent = (deltaMb / lastStats.memory.heap_used_mb) * 100;

    if (deltaPercent > MEMORY_INCREASE_PERCENT && deltaMb > MEMORY_INCREASE_MIN_MB) {
      warnings.push(`Heap growth: +${deltaMb}MB (+${deltaPercent.toFixed(1)}%) — possible leak`);
    }
  }

  if (warnings.length > 0) {
    logger.warn(
      { type: 'connection_anomaly', warnings, stats: current },
      'Connection pool anomaly detected'
    );
  }
}

// ─── Health Check ─────────────────────────────────────────────────────────────

export async function enhancedHealthCheck() {
  const start = Date.now();
  const services = {};
  let status = 'ok';

  // Database
  try {
    const t = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    services.database = { status: 'ok', latency_ms: Date.now() - t };
  } catch (err) {
    services.database = { status: 'error', error: err.message };
    status = 'degraded';
  }

  // Redis — all clients
  const redisClients = [
    { name: 'redis_http', client: redis },
    { name: 'redis_middleware', client: middlewareRedis },
    { name: 'redis_worker', client: workerRedis },
  ];

  for (const { name, client } of redisClients) {
    try {
      const t = Date.now();
      await client.ping();
      services[name] = { status: 'ok', latency_ms: Date.now() - t };
    } catch (err) {
      services[name] = { status: 'error', error: err.message };
      status = 'degraded';
    }
  }

  // S3 / R2
  try {
    const { checkS3Health } = await import('./s3.js');
    const t = Date.now();
    const s3 = await checkS3Health();
    services.s3 = {
      status: s3.status,
      latency_ms: Date.now() - t,
      ...(s3.error && { error: s3.error }),
    };
    if (s3.status !== 'ok') status = 'degraded';
  } catch (err) {
    services.s3 = { status: 'error', error: err.message };
    status = 'degraded';
  }

  return {
    status,
    healthy: status === 'ok',
    timestamp: new Date().toISOString(),
    uptime_seconds: Math.floor(process.uptime()),
    response_time_ms: Date.now() - start,
    services,
  };
}

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
// Imports are at the TOP of the file — never inside shutdown handlers.
// If a module failed to load at boot, you need to know at boot, not at shutdown.

let isShuttingDown = false;

export async function enhancedGracefulShutdown(signal) {
  if (isShuttingDown) {
    logger.warn('Shutdown already in progress — forcing exit');
    process.exit(1);
  }
  isShuttingDown = true;

  logger.info({ signal }, 'Graceful shutdown initiated');

  // Force exit if shutdown hangs beyond 30s
  const timer = setTimeout(() => {
    logger.error('Graceful shutdown timed out after 30s — forcing exit');
    process.exit(1);
  }, 30_000);

  try {
    stopConnectionMonitoring();
    await disconnectPrisma();
    await disconnectRedis();

    // closeMailer is sync — no await needed
    try {
      const { closeMailer } = await import('./mailer.js');
      closeMailer();
    } catch {
      // mailer may not be initialized — not fatal
    }

    logger.info('Graceful shutdown complete');
    clearTimeout(timer);
    process.exit(0);
  } catch (err) {
    logger.error({ err: err.message }, 'Error during graceful shutdown');
    clearTimeout(timer);
    process.exit(1);
  }
}

// ─── Startup Banner ───────────────────────────────────────────────────────────

export function printStartupBanner() {
  const mode = ENV.IS_PROD ? 'PRODUCTION' : ENV.IS_DEV ? 'DEVELOPMENT' : 'STAGING';

  // Use logger so banner goes through log pipeline in prod
  // In dev, logger pretty-prints anyway so this still looks good
  logger.info(
    {
      type: 'startup_banner',
      mode,
      port: ENV.PORT,
      node_env: ENV.NODE_ENV,
      log_level: ENV.LOG_LEVEL,
      jwt_expiry: `${ENV.JWT_ACCESS_EXPIRY} / ${ENV.JWT_REFRESH_EXPIRY}`,
      services: {
        database: ENV.DATABASE_URL ? 'configured' : 'missing',
        redis: ENV.REDIS_URL ? 'configured' : 'missing',
        s3: ENV.AWS_S3_BUCKET ? ENV.AWS_S3_BUCKET : 'missing',
        smtp: ENV.SMTP_HOST ? ENV.SMTP_HOST : 'not configured',
        firebase: ENV.FIREBASE_PROJECT_ID ? 'configured' : 'not configured',
        razorpay: ENV.RAZORPAY_KEY_ID ? 'configured' : 'not configured',
        sentry: ENV.SENTRY_DSN ? 'configured' : 'not configured',
      },
    },
    `RESQID API — ${mode}`
  );
}
