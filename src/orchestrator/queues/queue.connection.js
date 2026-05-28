// =============================================================================
// orchestrator/queues/queue.connection.js — RESQID
//
// Returns a plain ioredis OPTIONS OBJECT, not a shared instance.
// BullMQ calls .duplicate() internally — passing a shared instance causes
// connection leaks. Passing a config object lets BullMQ manage its own pool.
// =============================================================================

import { logger } from '#config/logger.js';
import { ENV } from '#config/env.js';

export const getQueueConnection = () => {
  const redisUrl = ENV.REDIS_URL;
  if (!redisUrl) {
    throw new Error('[queue.connection] REDIS_URL is required');
  }

  return {
    url: redisUrl,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: false,
    retryStrategy: (times) => Math.min(times * 100, 3000),
    connectTimeout: 10000,
    keepAlive: 300000,
  };
};

export const closeQueueConnection = async () => {
  logger.info('[queue.connection] Connection lifecycle managed by BullMQ');
};

export default { getQueueConnection, closeQueueConnection };
