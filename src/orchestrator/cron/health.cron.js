// orchestrator/cron/health.cron.js — RESQID
//
// Health check tasks executed by the maintenance worker.

import { checkRedisHealth } from '#orchestrator/queues/queue.connection.js';
import { getAllQueueMetrics } from '#orchestrator/queues/queue.config.js';
import { logger } from '#config/logger.js';

// run system health check
// called by maintenance worker when processing 'system health check' job.

export async function runHealthCheck() {
  const results = {
    timeStamp: new Date().toISOString(),
    redis: null,
    queues: null,
  };

  // check redis
  results.redis = await checkRedisHealth();

  // check all queues
  results.queues = await getAllQueueMetrics();

  // log warning
  const unhealthyQueues = Object.entries(results.queues).filter(
    ([, metrics]) => metrics.failed > 100 || metrics.waiting > 500
  );

  if (unhealthyQueues.length > 0) {
    logger.warn(
      {
        unhealthyQueues,
      },
      '[health] Queues need attentions'
    );
  }

  return results;
}
