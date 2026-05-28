// =============================================================================
// orchestrator/services/retry.service.js — RESQID
// Retry logic for workers. Workers use this to decide retry vs DLQ.
// =============================================================================

import { logger } from '#config/logger.js';
import { middlewareRedis as redis } from '#config/redis.js';
import { REDIS_KEYS, RETRY_CONFIG } from '../orchestrator.constants.js';
import { handleDeadJob } from '../dlq/dlq.handler.js';

/**
 * Determine if a failed job should be retried or sent to DLQ.
 */
export const shouldRetry = (job) => {
  const attempts = job.attemptsMade ?? 0;
  const max = job.opts?.attempts ?? RETRY_CONFIG.MAX_ATTEMPTS;

  return {
    retry: attempts < max,
    exhausted: attempts >= max,
  };
};

/**
 * Calculate exponential backoff delay.
 */
export const calcBackoffDelay = (attemptNumber) => {
  const base = RETRY_CONFIG.BACKOFF_DELAY_MS;
  const delay = base * Math.pow(2, attemptNumber - 1);
  return Math.min(delay, 5 * 60 * 1000); // Cap at 5 minutes
};

/**
 * Send a failed job to the DLQ.
 */
export const sendToDLQ = async (job, error) => {
  try {
    await handleDeadJob({
      job,
      error,
      queueName: job.queueName,
    });

    // Track DLQ count for monitoring
    const dlqKey = REDIS_KEYS.DLQ_COUNT(job.id || 'unknown');
    await redis.incr(dlqKey);
    await redis.expire(dlqKey, 86400 * 7);

    logger.error(
      {
        jobId: job.id,
        jobName: job.name,
        queueName: job.queueName,
        error: error?.message,
        attemptsMade: job.attemptsMade,
      },
      '[retry] Job sent to DLQ'
    );
  } catch (err) {
    logger.error({ jobId: job.id, err: err.message }, '[retry] Failed to send to DLQ');
  }
};

/**
 * Standard error handler for workers — call in catch block.
 * Logs, decides retry vs DLQ, and re-throws for BullMQ.
 */
export const handleWorkerFailure = async (job, error) => {
  const { exhausted } = shouldRetry(job);

  logger.error(
    {
      jobId: job.id,
      jobName: job.name,
      queueName: job.queueName,
      attempt: job.attemptsMade,
      exhausted,
      error: error?.message,
    },
    '[retry] Worker job failed'
  );

  if (exhausted) {
    await sendToDLQ(job, error);
  }

  // Re-throw so BullMQ handles retry scheduling
  throw error;
};
