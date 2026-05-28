// =============================================================================
// orchestrator/queues/queue.manager.js — RESQID
//
// Manages all BullMQ queues + QueueEvents for cross-process monitoring.
// =============================================================================

import { QueueEvents } from 'bullmq';
import { prisma } from '#config/prisma.js';
import { logger } from '#config/logger.js';
import { getQueueConnection } from './queue.connection.js';
import {
  allQueues,
  getQueueByName,
  closeAllQueues as _closeAllQueues,
  getAllQueueMetrics,
  emergencyAlertsQueue,
  notificationsQueue,
  attendanceBulkQueue,
  pipelineJobsQueue,
} from './queue.config.js';

export {
  allQueues,
  getQueueByName,
  getAllQueueMetrics,
  emergencyAlertsQueue,
  notificationsQueue,
  attendanceBulkQueue,
  pipelineJobsQueue,
};

// ── QueueEvents registry ──────────────────────────────────────────────────────
const _queueEvents = [];

// ── Public API ────────────────────────────────────────────────────────────────

export function getQueue(name) {
  return getQueueByName(name);
}

export function initQueues() {
  const queueCount = Object.keys(allQueues).length;
  logger.info(
    { count: queueCount, queues: Object.keys(allQueues) },
    '[queue.manager] Queues initialized'
  );

  for (const [name, queue] of Object.entries(allQueues)) {
    const qe = setupQueueEventHandlers(queue, name);
    _queueEvents.push(qe);
  }
}

export async function closeAllQueues() {
  for (const qe of _queueEvents) {
    await qe.close();
  }
  await _closeAllQueues();
}

// ── Event handlers ────────────────────────────────────────────────────────────

function setupQueueEventHandlers(queue, queueName) {
  queue.on('error', (err) => {
    logger.error({ queue: queueName, err: err.message }, '[queue.manager] Queue error');
  });
  queue.on('paused', () => logger.warn({ queue: queueName }, '[queue.manager] Queue paused'));
  queue.on('resumed', () => logger.info({ queue: queueName }, '[queue.manager] Queue resumed'));
  queue.on('drained', () => logger.debug({ queue: queueName }, '[queue.manager] Queue drained'));

  const qe = new QueueEvents(queueName, { connection: getQueueConnection() });

  qe.on('failed', async ({ jobId, failedReason }) => {
    logger.error({ queue: queueName, jobId, failedReason }, '[queue.manager] Job failed');

    const job = await queue.getJob(jobId);
    if (!job?.data?.jobExecutionId) return;

    const isFinalFailure = job.attemptsMade >= (job.opts?.attempts ?? 3);

    try {
      await prisma.jobExecution.update({
        where: { id: job.data.jobExecutionId },
        data: {
          status: isFinalFailure ? 'DEAD' : 'FAILED',
          error_message: failedReason,
          completed_at: isFinalFailure ? new Date() : null,
        },
      });
    } catch (dbErr) {
      logger.error(
        { jobExecutionId: job.data.jobExecutionId, err: dbErr.message },
        '[queue.manager] Failed to update job execution'
      );
    }
  });

  qe.on('completed', async ({ jobId, returnvalue }) => {
    logger.info({ queue: queueName, jobId }, '[queue.manager] Job completed');

    const job = await queue.getJob(jobId);
    if (!job?.data?.jobExecutionId) return;

    try {
      await prisma.jobExecution.update({
        where: { id: job.data.jobExecutionId },
        data: {
          status: 'COMPLETED',
          completed_at: new Date(),
          result: returnvalue ?? null,
        },
      });
    } catch (dbErr) {
      logger.error(
        { jobExecutionId: job.data.jobExecutionId, err: dbErr.message },
        '[queue.manager] Failed to update job completion'
      );
    }
  });

  qe.on('stalled', ({ jobId }) => {
    logger.warn({ queue: queueName, jobId }, '[queue.manager] Job stalled — re-queuing');
  });

  return qe;
}

// =============================================================================
// ADMIN UTILITIES
// =============================================================================

export async function drainDeadJob(jobExecutionId, bullJobId, queueName = null) {
  let job = null;

  if (queueName && allQueues[queueName]) {
    job = await allQueues[queueName].getJob(bullJobId);
  } else {
    for (const [, queue] of Object.entries(allQueues)) {
      job = await queue.getJob(bullJobId);
      if (job) break;
    }
  }

  if (!job) {
    logger.warn({ bullJobId, jobExecutionId }, '[queue.manager] Job not found for drain');
    return false;
  }

  await job.remove();
  logger.info({ jobExecutionId, bullJobId }, '[queue.manager] Dead job drained');
  return true;
}

export async function getQueueHealth() {
  return getAllQueueMetrics();
}

export async function retryJob(jobId, queueName) {
  const queue = getQueue(queueName);
  const job = await queue.getJob(jobId);
  if (!job) throw new Error(`[queue.manager] Job ${jobId} not found in ${queueName}`);
  await job.retry();
  logger.info({ jobId, queueName }, '[queue.manager] Job retried');
  return job;
}

export async function cleanOldJobs(olderThanDays = 7) {
  const graceMs = olderThanDays * 24 * 60 * 60 * 1000;
  const results = {};

  for (const [name, queue] of Object.entries(allQueues)) {
    const [completed, failed, delayed] = await Promise.all([
      queue.clean(graceMs, 1000, 'completed'),
      queue.clean(graceMs, 1000, 'failed'),
      queue.clean(graceMs, 1000, 'delayed'),
    ]);
    results[name] = {
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
    };
  }

  logger.info({ olderThanDays, results }, '[queue.manager] Cleaned old jobs');
  return results;
}
