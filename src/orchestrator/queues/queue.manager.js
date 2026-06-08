// orchestrator/queues/queue.manager.js — RESQID
//
// Central queue manager — initializes, monitors, and manages all BullMQ queues.
// Provides admin utilities for the super admin dashboard.

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
  timetableQueue,
  crisisQueue,
  validateQueue,
  swapQueue,
  bulkUploadQueue,
} from './queue.config.js';

// ── RE-EXPORT ALL QUEUES ────────────────────────────────────────────────────

export {
  allQueues,
  getQueueByName,
  getAllQueueMetrics,
  emergencyAlertsQueue,
  notificationsQueue,
  attendanceBulkQueue,
  timetableQueue,
  crisisQueue,
  validateQueue,
  swapQueue,
  bulkUploadQueue,
};

// ── QUEUE EVENTS REGISTRY ──────────────────────────────────────────────────

const _queueEvents = [];

// ── PUBLIC API ─────────────────────────────────────────────────────────────

export function getQueue(name) {
  return getQueueByName(name);
}

/**
 * Initialize all queues and set up event handlers.
 */
export function initQueues() {
  const queueNames = Object.keys(allQueues);
  logger.info(
    { count: queueNames.length, queues: queueNames },
    '[queue.manager] Initializing queues'
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
  logger.info('[queue.manager] All queues closed');
}

// ── EVENT HANDLERS ─────────────────────────────────────────────────────────

function setupQueueEventHandlers(queue, queueName) {
  // Queue-level events
  queue.on('error', (err) => {
    logger.error({ queue: queueName, err: err.message }, '[queue] Queue error');
  });

  queue.on('paused', () => {
    logger.warn({ queue: queueName }, '[queue] Paused');
  });

  queue.on('resumed', () => {
    logger.info({ queue: queueName }, '[queue] Resumed');
  });

  queue.on('drained', () => {
    logger.debug({ queue: queueName }, '[queue] Drained');
  });

  // Cross-process event monitoring
  const qe = new QueueEvents(queueName, {
    connection: getQueueConnection(),
    autorun: true,
  });

  // ── Job Failed ──
  qe.on('failed', async ({ jobId, failedReason }) => {
    logger.error({ queue: queueName, jobId, reason: failedReason }, '[job] Failed');

    const job = await queue.getJob(jobId);
    if (!job) return;

    const isFinal = job.attemptsMade >= (job.opts?.attempts ?? 3);
    const status = isFinal ? 'FAILED' : 'RETRYING';

    // Update all tracked job types in database
    await updateJobInDB(jobId, {
      status,
      error: failedReason,
      completedAt: isFinal ? new Date() : null,
    });
  });

  // ── Job Completed ──
  qe.on('completed', async ({ jobId, returnvalue }) => {
    logger.info({ queue: queueName, jobId }, '[job] Completed');

    const job = await queue.getJob(jobId);
    if (!job) return;

    await updateJobInDB(jobId, {
      status: 'COMPLETED',
      output: returnvalue ?? null,
      progressPercent: 100,
      completedAt: new Date(),
    });

    // Resolve crisis events
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
      } catch (err) {
        logger.error(
          { crisisEventId: job.data.crisisEventId, err: err.message },
          '[job] Failed to update crisis event'
        );
      }
    }
  });

  // ── Job Stalled ──
  qe.on('stalled', async ({ jobId }) => {
    logger.warn({ queue: queueName, jobId }, '[job] Stalled — re-queuing');
    await updateJobInDB(jobId, { status: 'PROCESSING', statusMessage: 'Job stalled, re-queued' });
  });

  // ── Job Progress (timetable, bulk upload, crisis) ──
  qe.on('progress', async ({ jobId, data }) => {
    const isTracked =
      queueName.includes('timetable') ||
      queueName.includes('crisis') ||
      queueName.includes('bulk-upload');

    if (isTracked) {
      logger.info({ queue: queueName, jobId, progress: data }, '[job] Progress');
      await updateJobInDB(jobId, {
        progressPercent: data?.progress ? Math.round(data.progress * 100) : undefined,
        statusMessage: data?.message || data?.phase || undefined,
      });
    }
  });

  // ── Waiting / Active (debug only) ──
  qe.on('waiting', ({ jobId }) => {
    logger.debug({ queue: queueName, jobId }, '[job] Waiting');
  });

  qe.on('active', ({ jobId }) => {
    logger.debug({ queue: queueName, jobId }, '[job] Active');
  });

  return qe;
}

// ── HELPER: Update job in database ─────────────────────────────────────────

async function updateJobInDB(jobId, data) {
  try {
    // Try TimetableJob table
    const existing = await prisma.timetableJob.findUnique({ where: { id: jobId } });
    if (existing) {
      await prisma.timetableJob.update({ where: { id: jobId }, data });
      return;
    }
  } catch {
    // Table might not exist or job not found — that's fine
  }

  try {
    // Try BulkUploadJob table
    const existing = await prisma.bulkUploadJob.findUnique({ where: { id: jobId } });
    if (existing) {
      await prisma.bulkUploadJob.update({ where: { id: jobId }, data });
      return;
    }
  } catch {
    // Table might not exist
  }
}

// ── ADMIN UTILITIES ────────────────────────────────────────────────────────

/**
 * Remove a dead/failed job from any queue.
 */
export async function drainDeadJob(jobId, queueName = null) {
  let job = null;

  if (queueName && allQueues[queueName]) {
    job = await allQueues[queueName].getJob(jobId);
  } else {
    for (const [, queue] of Object.entries(allQueues)) {
      job = await queue.getJob(jobId);
      if (job) break;
    }
  }

  if (!job) {
    logger.warn({ jobId }, '[admin] Job not found for drain');
    return false;
  }

  await job.remove();
  logger.info({ jobId }, '[admin] Job drained');

  await updateJobInDB(jobId, { status: 'CANCELLED', statusMessage: 'Drained by admin' });
  return true;
}

/**
 * Retry a failed job.
 */
export async function retryJob(jobId, queueName) {
  const queue = getQueue(queueName);
  if (!queue) throw new Error(`[admin] Queue ${queueName} not found`);

  const job = await queue.getJob(jobId);
  if (!job) throw new Error(`[admin] Job ${jobId} not found in ${queueName}`);

  await job.retry();
  logger.info({ jobId, queueName }, '[admin] Job retried');

  await updateJobInDB(jobId, { status: 'QUEUED', error: null });
  return job;
}

/**
 * Get queue health metrics for all queues.
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
      logger.error({ queue: name, err: err.message }, '[admin] Clean failed');
      results[name] = { error: err.message };
    }
  }

  logger.info({ olderThanDays, results }, '[admin] Cleaned old jobs');
  return results;
}

/**
 * Pause all queues (maintenance mode).
 */
export async function pauseAllQueues() {
  for (const [name, queue] of Object.entries(allQueues)) {
    await queue.pause();
    logger.info({ queue: name }, '[admin] Paused');
  }
}

/**
 * Resume all queues.
 */
export async function resumeAllQueues() {
  for (const [name, queue] of Object.entries(allQueues)) {
    await queue.resume();
    logger.info({ queue: name }, '[admin] Resumed');
  }
}

/**
 * Get total pending job count across all queues.
 */
export async function getPendingCount() {
  let total = 0;
  for (const [, queue] of Object.entries(allQueues)) {
    try {
      total += await queue.getWaitingCount();
      total += await queue.getDelayedCount();
    } catch {
      // Queue might be unavailable
    }
  }
  return total;
}
