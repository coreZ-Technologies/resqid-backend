// =============================================================================
// orchestrator/queues/queue.connection.js — RESQID
//
// Returns a plain ioredis OPTIONS OBJECT, not a shared instance.
// BullMQ calls .duplicate() internally — passing a shared instance causes
// connection leaks. Passing a config object lets BullMQ manage its own pool.
// =============================================================================

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

    // Retry strategy with exponential backoff
    retryStrategy: (times) => {
      const delay = Math.min(times * 100, 3000);
      logger.debug({ attempt: times, delayMs: delay }, '[queue.connection] Redis retry');
      return delay;
    },

    // Connection timeouts
    connectTimeout: 10000,
    commandTimeout: 5000,

    // Keep alive
    keepAlive: 300000, // 5 minutes

    // Connection pool (production optimization)
    ...(isProduction && {
      maxRetriesPerRequest: null,
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
 */
export const checkRedisHealth = async () => {
  try {
    const { Redis } = await import('ioredis');
    const redis = new Redis(ENV.REDIS_URL, {
      maxRetriesPerRequest: 1,
      connectTimeout: 5000,
      lazyConnect: true,
    });

    await redis.connect();
    const ping = await redis.ping();
    await redis.quit();

    return {
      status: 'ok',
      ping,
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
 */
export const closeQueueConnection = async () => {
  logger.info('[queue.connection] Connection lifecycle managed by BullMQ');
};

export default {
  getQueueConnection,
  checkRedisHealth,
  closeQueueConnection,
};
