// orchestrator/queues/queue.manager.js — RESQID
//
// Manages all BullMQ queues + QueueEvents for cross-process monitoring.
// Handles job lifecycle, progress tracking, and admin utilities.

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
  generateQueue,
  crisisQueue,
  validateQueue,
  swapQueue,
  bulkUploadQueue,
  pipelineJobsQueue,
} from './queue.config.js';

// RE-EXPORT ALL QUEUES

export {
  allQueues,
  getQueueByName,
  getAllQueueMetrics,
  emergencyAlertsQueue,
  notificationsQueue,
  attendanceBulkQueue,
  generateQueue,
  crisisQueue,
  validateQueue,
  swapQueue,
  bulkUploadQueue,
  pipelineJobsQueue,
};

// QUEUE EVENTS REGISTRY

const _queueEvents = [];

// PUBLIC API

/**
 * Get a queue by name.
 */
export function getQueue(name) {
  return getQueueByName(name);
}

/**
 * Initialize all queues and set up event handlers.
 */
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

/**
 * Close all queues and event listeners gracefully.
 */
export async function closeAllQueues() {
  // Close QueueEvents first
  for (const qe of _queueEvents) {
    try {
      await qe.close();
    } catch (err) {
      logger.error({ err: err.message }, '[queue.manager] Error closing QueueEvents');
    }
  }
  _queueEvents.length = 0;

  // Close all queues
  await _closeAllQueues();
}

// EVENT HANDLERS

function setupQueueEventHandlers(queue, queueName) {
  // ─── Queue-level events ───
  queue.on('error', (err) => {
    logger.error({ queue: queueName, err: err.message }, '[queue.manager] Queue error');
  });

  queue.on('paused', () => {
    logger.warn({ queue: queueName }, '[queue.manager] Queue paused');
  });

  queue.on('resumed', () => {
    logger.info({ queue: queueName }, '[queue.manager] Queue resumed');
  });

  queue.on('drained', () => {
    logger.debug({ queue: queueName }, '[queue.manager] Queue drained');
  });

  // ─── QueueEvents for cross-process monitoring ───
  const qe = new QueueEvents(queueName, {
    connection: getQueueConnection(),
    autorun: true,
  });

  // ─── Job failed ───
  qe.on('failed', async ({ jobId, failedReason }) => {
    logger.error({ queue: queueName, jobId, failedReason }, '[queue.manager] Job failed');

    const job = await queue.getJob(jobId);
    if (!job) return;

    const isFinalFailure = job.attemptsMade >= (job.opts?.attempts ?? 3);

    // Update timetable job record
    if (job.data?.schoolId) {
      try {
        await prisma.timetableJob.update({
          where: { id: jobId },
          data: {
            status: isFinalFailure ? 'FAILED' : 'PROCESSING',
            error: failedReason,
            completedAt: isFinalFailure ? new Date() : null,
          },
        });
      } catch (dbErr) {
        logger.error({ jobId, err: dbErr.message }, '[queue.manager] Failed to update job record');
      }
    }
  });

  // ─── Job completed ───
  qe.on('completed', async ({ jobId, returnvalue }) => {
    logger.info({ queue: queueName, jobId }, '[queue.manager] Job completed');

    const job = await queue.getJob(jobId);
    if (!job) return;

    // Update timetable job record
    if (job.data?.schoolId) {
      try {
        await prisma.timetableJob.update({
          where: { id: jobId },
          data: {
            status: 'COMPLETED',
            output: returnvalue ?? null,
            progressPercent: 100,
            completedAt: new Date(),
          },
        });
      } catch (dbErr) {
        logger.error(
          { jobId, err: dbErr.message },
          '[queue.manager] Failed to update job completion'
        );
      }
    }

    // Update crisis event if linked
    if (job.data?.crisisEventId) {
      try {
        await prisma.crisisEvent.update({
          where: { id: job.data.crisisEventId },
          data: {
            status: returnvalue?.success !== false ? 'RESOLVED' : 'UNRESOLVED',
            resolvedAt: new Date(),
            resolution: returnvalue,
          },
        });
      } catch (dbErr) {
        logger.error(
          { crisisEventId: job.data.crisisEventId, err: dbErr.message },
          '[queue.manager] Failed to update crisis event'
        );
      }
    }
  });

  // ─── Job stalled ───
  qe.on('stalled', async ({ jobId }) => {
    logger.warn({ queue: queueName, jobId }, '[queue.manager] Job stalled — re-queuing');

    // Update job status if tracked
    try {
      await prisma.timetableJob.updateMany({
        where: { id: jobId },
        data: { status: 'PROCESSING', statusMessage: 'Job stalled, re-queued' },
      });
    } catch (dbErr) {
      // Job might not exist in our table — that's ok
    }
  });

  // ─── Job progress (timetable-specific) ───
  qe.on('progress', async ({ jobId, data }) => {
    if (
      queueName.includes('timetable') ||
      queueName.includes('generate') ||
      queueName.includes('crisis')
    ) {
      logger.info({ queue: queueName, jobId, progress: data }, '[queue.manager] Job progress');

      // Update progress in database
      try {
        await prisma.timetableJob.update({
          where: { id: jobId },
          data: {
            progressPercent: data?.progress ? Math.round(data.progress * 100) : undefined,
            statusMessage: data?.message || data?.phase || undefined,
          },
        });
      } catch (dbErr) {
        // Non-critical — progress update can fail silently
      }
    }
  });

  // ─── Job waiting/active for monitoring ───
  qe.on('waiting', ({ jobId }) => {
    logger.debug({ queue: queueName, jobId }, '[queue.manager] Job waiting');
  });

  qe.on('active', ({ jobId }) => {
    logger.debug({ queue: queueName, jobId }, '[queue.manager] Job active');
  });

  return qe;
}

// ADMIN UTILITIES

/**
 * Drain (remove) a dead/failed job.
 */
export async function drainDeadJob(jobId, queueName = null) {
  let job = null;

  if (queueName && allQueues[queueName]) {
    job = await allQueues[queueName].getJob(jobId);
  } else {
    // Search all queues
    for (const [, queue] of Object.entries(allQueues)) {
      job = await queue.getJob(jobId);
      if (job) break;
    }
  }

  if (!job) {
    logger.warn({ jobId }, '[queue.manager] Job not found for drain');
    return false;
  }

  await job.remove();
  logger.info({ jobId }, '[queue.manager] Dead job drained');

  // Also update database
  try {
    await prisma.timetableJob.update({
      where: { id: jobId },
      data: { status: 'CANCELLED', statusMessage: 'Drained by admin' },
    });
  } catch (dbErr) {
    // May not exist in our table
  }

  return true;
}

/**
 * Retry a failed job.
 */
export async function retryJob(jobId, queueName) {
  const queue = getQueue(queueName);
  const job = await queue.getJob(jobId);
  if (!job) throw new Error(`[queue.manager] Job ${jobId} not found in ${queueName}`);

  await job.retry();
  logger.info({ jobId, queueName }, '[queue.manager] Job retried');

  // Update database
  try {
    await prisma.timetableJob.update({
      where: { id: jobId },
      data: { status: 'QUEUED', attempts: { increment: 1 }, error: null },
    });
  } catch (dbErr) {
    // May not exist
  }

  return job;
}

/**
 * Get queue health metrics.
 */
export async function getQueueHealth() {
  return getAllQueueMetrics();
}

/**
 * Clean old jobs from all queues.
 */
export async function cleanOldJobs(olderThanDays = 7) {
  const graceMs = olderThanDays * 24 * 60 * 60 * 1000;
  const results = {};

  for (const [name, queue] of Object.entries(allQueues)) {
    try {
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
    } catch (err) {
      logger.error({ queue: name, err: err.message }, '[queue.manager] Clean failed');
      results[name] = { error: err.message };
    }
  }

  logger.info({ olderThanDays, results }, '[queue.manager] Cleaned old jobs');
  return results;
}

/**
 * Pause all queues (maintenance mode).
 */
export async function pauseAllQueues() {
  for (const [name, queue] of Object.entries(allQueues)) {
    await queue.pause();
    logger.info({ queue: name }, '[queue.manager] Queue paused');
  }
}

/**
 * Resume all queues.
 */
export async function resumeAllQueues() {
  for (const [name, queue] of Object.entries(allQueues)) {
    await queue.resume();
    logger.info({ queue: name }, '[queue.manager] Queue resumed');
  }
}

/**
 * Get pending job count across all queues.
 */
export async function getPendingCount() {
  let total = 0;
  for (const [, queue] of Object.entries(allQueues)) {
    try {
      total += await queue.getWaitingCount();
      total += await queue.getDelayedCount();
    } catch (err) {
      // Queue might be unavailable
    }
  }
  return total;
}
