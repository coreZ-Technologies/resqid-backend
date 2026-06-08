// orchestrator/queues/queue.connection.js — RESQID
//
// Returns a plain ioredis OPTIONS OBJECT, not a shared instance.
// BullMQ calls .duplicate() internally — passing a shared instance causes
// connection leaks. Passing a config object lets BullMQ manage its own pool.

import { logger } from '#config/logger.js';
import { ENV } from '#config/env.js';

/**
 * Get Redis connection options for BullMQ.
 * Returns a config object so BullMQ can manage its own connection pool.
 */
export const getQueueConnection = () => {
  const redisUrl = ENV.REDIS_URL;
  if (!redisUrl) {
    throw new Error('[queue.connection] REDIS_URL is required');
  }

  const isProduction = ENV.NODE_ENV === 'production';

  return {
    url: redisUrl,
    maxRetriesPerRequest: null, // Required by BullMQ
    enableReadyCheck: false,
    lazyConnect: false,

    // Connection name for debugging/monitoring
    connectionName: `resqid-${ENV.NODE_ENV || 'dev'}`,

    // Force IPv4 (some Redis hosts have IPv6 issues)
    family: 4,

    // Retry strategy with exponential backoff
    retryStrategy: (times) => {
      const delay = Math.min(times * 100, 3000);
      if (times > 10) {
        logger.error({ attempts: times }, '[queue.connection] Redis retry exhausted');
        return undefined; // Stop retrying
      }
      logger.debug({ attempt: times, delayMs: delay }, '[queue.connection] Redis retry');
      return delay;
    },

    // Connection timeouts
    connectTimeout: 10000,
    commandTimeout: 5000,

    // Keep alive
    keepAlive: 300000, // 5 minutes

    // Production optimizations
    ...(isProduction && {
      enableOfflineQueue: true,
      enableAutoPipelining: true,
    }),

    // TLS for production Redis (Railway/Upstash)
    ...(ENV.REDIS_TLS === 'true' && {
      tls: {
        rejectUnauthorized: false,
      },
    }),
  };
};

/**
 * Check Redis connectivity.
 * Returns health status for the super admin dashboard.
 */
export const checkRedisHealth = async () => {
  try {
    const { default: Redis } = await import('ioredis');
    const redis = new Redis(ENV.REDIS_URL, {
      maxRetriesPerRequest: 1,
      connectTimeout: 5000,
      lazyConnect: false, // Direct connection for health check
      family: 4,
      ...(ENV.REDIS_TLS === 'true' && {
        tls: { rejectUnauthorized: false },
      }),
    });

    const ping = await redis.ping();
    const info = await redis.info('server');
    await redis.quit();

    // Extract Redis version from info
    const versionMatch = info.match(/redis_version:(\S+)/);
    const version = versionMatch ? versionMatch[1] : 'unknown';

    return {
      status: 'ok',
      ping,
      version,
    };
  } catch (err) {
    logger.error({ error: err.message }, '[queue.connection] Redis health check failed');
    return {
      status: 'error',
      error: err.message,
    };
  }
};

/**
 * No-op — BullMQ manages its own connections.
 * Called during graceful shutdown for consistency.
 */
export const closeQueueConnection = async () => {
  logger.info('[queue.connection] Connection lifecycle managed by BullMQ — no manual close needed');
};

export default {
  getQueueConnection,
  checkRedisHealth,
  closeQueueConnection,
};
