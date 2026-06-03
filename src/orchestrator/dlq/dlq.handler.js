// orchestrator/dlq/dlq.handler.js — RESQID
// Dead Letter Queue handler — persists failed jobs + alerts ops team.

import { prisma } from '#config/prisma.js';
import { logger } from '#config/logger.js';
import { middlewareRedis as redis } from '#config/redis.js';
import { QUEUE_NAMES } from '../queues/queue.names.js';
import { ENV } from '#config/env.js';

// Config

const DLQ_BATCH_KEY = 'orch:dlq:pending_slack_batch';
const DLQ_BATCH_TTL = 3600; // Flush every hour
const SLACK_WEBHOOK_URL = ENV.SLACK_ALERTS_WEBHOOK;

// Slack Notification

async function sendSlackMessage(message) {
  if (!SLACK_WEBHOOK_URL) {
    logger.warn('[dlq] Slack webhook not configured — skipping');
    return;
  }

  try {
    const response = await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      logger.warn({ status: response.status }, '[dlq] Slack send failed');
    }
  } catch (err) {
    logger.error({ err: err.message }, '[dlq] Slack send error');
  }
}

// Handle Dead Job

/**
 * Handle a job that has exhausted all retries.
 * Persists to database and alerts ops team via Slack.
 *
 * @param {Object} params
 * @param {Object} params.job - BullMQ job object
 * @param {Error} params.error - Error that caused the failure
 * @param {string} params.queueName - Queue name
 */
export const handleDeadJob = async ({ job, error, queueName }) => {
  const isEmergency = queueName === QUEUE_NAMES.EMERGENCY_ALERTS;
  const isCrisis = queueName === QUEUE_NAMES.CRISIS_HANDLING;

  const entry = {
    job_type: job.name,
    queue_name: queueName,
    bullmq_job_id: String(job.id),
    payload: job.data ?? {},
    error_message: error?.message ?? 'Unknown error',
    error_stack: error?.stack ?? null,
    retry_count: job.attemptsMade ?? 0,
    resolved: false,
  };

  // Persist to database
  let dbRecord = null;
  try {
    // 🔧 Use timetableJob or create a dedicated dead letter record
    dbRecord = await prisma.timetableJob
      .update({
        where: { id: String(job.id) },
        data: {
          status: 'FAILED',
          error: error?.message ?? 'Unknown error',
          errorDetails: error?.stack ?? null,
          completedAt: new Date(),
        },
      })
      .catch(async () => {
        // If job record doesn't exist, create a crisis event for tracking
        return prisma.crisisEvent.create({
          data: {
            schoolId: job.data?.schoolId || 'unknown',
            timetableId: job.data?.payload?.timetableId || job.data?.timetableId || 'unknown',
            type: 'OTHER',
            severity: 'HIGH',
            status: 'UNRESOLVED',
            title: `DLQ: ${job.name} failed after ${job.attemptsMade} retries`,
            description: error?.message ?? 'Unknown error',
            triggeredBy: 'DLQ',
            triggerReason: `Job exhausted all retries in ${queueName}`,
          },
        });
      });

    logger.error(
      {
        dlqId: dbRecord?.id,
        jobType: job.name,
        queueName,
        retries: entry.retry_count,
        error: error?.message,
      },
      '[dlq] Job moved to DLQ'
    );
  } catch (dbErr) {
    logger.error(
      { err: dbErr.message, jobType: job.name, queueName },
      '[dlq] Failed to persist DLQ entry'
    );
  }

  // Emergency alerts → immediate Slack notification
  if (isEmergency || isCrisis) {
    const alertType = isEmergency ? '🚨 EMERGENCY' : '⚠️ CRISIS';
    await sendSlackMessage({
      text:
        `${alertType} *JOB FAILED*\n\n` +
        `• Job: ${job.name}\n` +
        `• Queue: ${queueName}\n` +
        `• Error: ${error?.message ?? 'Unknown'}\n` +
        `• Retries: ${entry.retry_count}\n` +
        `• Record ID: ${dbRecord?.id ?? 'DB write failed'}\n` +
        `• Time: ${new Date().toISOString()}`,
    });
    return;
  }

  // Non-emergency → batch for hourly flush
  try {
    await redis.sadd(
      DLQ_BATCH_KEY,
      JSON.stringify({
        jobType: job.name,
        queueName,
        jobId: String(job.id),
        error: error?.message?.slice(0, 200) ?? 'Unknown',
        dlqId: dbRecord?.id ?? null,
        timestamp: new Date().toISOString(),
      })
    );
    await redis.expire(DLQ_BATCH_KEY, DLQ_BATCH_TTL);
  } catch (redisErr) {
    logger.error({ err: redisErr.message }, '[dlq] Failed to add to Slack batch');
  }
};

// Flush Batch to Slack

/**
 * Flush batched DLQ entries to Slack.
 * Called every hour by the DLQ monitor job.
 */
export async function flushDlqSlackBatch() {
  try {
    const entries = await redis.smembers(DLQ_BATCH_KEY);
    if (!entries || entries.length === 0) return;

    const messages = entries.map((e) => JSON.parse(e));

    if (messages.length === 0) return;

    const text =
      `⚠️ *DLQ Batch — ${messages.length} failed job(s)*\n\n` +
      messages
        .map(
          (m) =>
            `• ${m.jobType} (${m.queueName})\n` +
            `  Error: ${m.error}\n` +
            `  DLQ ID: ${m.dlqId ?? 'N/A'} | ${m.timestamp}`
        )
        .join('\n\n');

    await sendSlackMessage({ text });

    // Clear after successful send
    await redis.del(DLQ_BATCH_KEY);
    logger.info({ count: messages.length }, '[dlq] Batch flushed to Slack');
  } catch (err) {
    logger.error({ err: err.message }, '[dlq] Failed to flush DLQ batch');
  }
}

// Resolve DLQ Entry

/**
 * Mark a DLQ entry as resolved.
 */
export async function resolveDlqEntry(dlqId) {
  try {
    await prisma.timetableJob.update({
      where: { id: dlqId },
      data: { status: 'CANCELLED', statusMessage: 'Resolved from DLQ' },
    });
    logger.info({ dlqId }, '[dlq] Entry resolved');
    return true;
  } catch (err) {
    logger.error({ err: err.message, dlqId }, '[dlq] Failed to resolve entry');
    return false;
  }
}

// Get DLQ Stats

/**
 * Get DLQ statistics for monitoring.
 */
export async function getDlqStats() {
  try {
    const [totalFailed, unresolved, recentFailures] = await Promise.all([
      prisma.timetableJob.count({ where: { status: 'FAILED' } }),
      prisma.timetableJob.count({ where: { status: 'FAILED', completedAt: null } }),
      prisma.timetableJob.findMany({
        where: { status: 'FAILED' },
        orderBy: { updatedAt: 'desc' },
        take: 10,
        select: { id: true, type: true, error: true, updatedAt: true },
      }),
    ]);

    const batchSize = await redis.scard(DLQ_BATCH_KEY);

    return {
      totalFailed,
      unresolved,
      pendingSlackBatch: batchSize,
      recentFailures,
    };
  } catch (err) {
    logger.error({ err: err.message }, '[dlq] Failed to get stats');
    return { error: err.message };
  }
}
// orchestrator/dlq/dlq.handler.js — RESQID
// Dead Letter Queue handler — persists failed jobs + alerts ops team.

import { prisma } from '#config/prisma.js';
import { logger } from '#config/logger.js';
import { middlewareRedis as redis } from '#config/redis.js';
import { QUEUE_NAMES } from '../queues/queue.names.js';
import { ENV } from '#config/env.js';

// Config

const DLQ_BATCH_KEY = 'orch:dlq:pending_slack_batch';
const DLQ_BATCH_TTL = 3600; // Flush every hour
const SLACK_WEBHOOK_URL = ENV.SLACK_ALERTS_WEBHOOK;

// Slack Notification

async function sendSlackMessage(message) {
  if (!SLACK_WEBHOOK_URL) {
    logger.warn('[dlq] Slack webhook not configured — skipping');
    return;
  }

  try {
    const response = await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      logger.warn({ status: response.status }, '[dlq] Slack send failed');
    }
  } catch (err) {
    logger.error({ err: err.message }, '[dlq] Slack send error');
  }
}

// Handle Dead Job

/**
 * Handle a job that has exhausted all retries.
 * Persists to database and alerts ops team via Slack.
 *
 * @param {Object} params
 * @param {Object} params.job - BullMQ job object
 * @param {Error} params.error - Error that caused the failure
 * @param {string} params.queueName - Queue name
 */
export const handleDeadJob = async ({ job, error, queueName }) => {
  const isEmergency = queueName === QUEUE_NAMES.EMERGENCY_ALERTS;
  const isCrisis = queueName === QUEUE_NAMES.CRISIS_HANDLING;

  const entry = {
    job_type: job.name,
    queue_name: queueName,
    bullmq_job_id: String(job.id),
    payload: job.data ?? {},
    error_message: error?.message ?? 'Unknown error',
    error_stack: error?.stack ?? null,
    retry_count: job.attemptsMade ?? 0,
    resolved: false,
  };

  // Persist to database
  let dbRecord = null;
  try {
    // 🔧 Use timetableJob or create a dedicated dead letter record
    dbRecord = await prisma.timetableJob
      .update({
        where: { id: String(job.id) },
        data: {
          status: 'FAILED',
          error: error?.message ?? 'Unknown error',
          errorDetails: error?.stack ?? null,
          completedAt: new Date(),
        },
      })
      .catch(async () => {
        // If job record doesn't exist, create a crisis event for tracking
        return prisma.crisisEvent.create({
          data: {
            schoolId: job.data?.schoolId || 'unknown',
            timetableId: job.data?.payload?.timetableId || job.data?.timetableId || 'unknown',
            type: 'OTHER',
            severity: 'HIGH',
            status: 'UNRESOLVED',
            title: `DLQ: ${job.name} failed after ${job.attemptsMade} retries`,
            description: error?.message ?? 'Unknown error',
            triggeredBy: 'DLQ',
            triggerReason: `Job exhausted all retries in ${queueName}`,
          },
        });
      });

    logger.error(
      {
        dlqId: dbRecord?.id,
        jobType: job.name,
        queueName,
        retries: entry.retry_count,
        error: error?.message,
      },
      '[dlq] Job moved to DLQ'
    );
  } catch (dbErr) {
    logger.error(
      { err: dbErr.message, jobType: job.name, queueName },
      '[dlq] Failed to persist DLQ entry'
    );
  }

  // Emergency alerts → immediate Slack notification
  if (isEmergency || isCrisis) {
    const alertType = isEmergency ? '🚨 EMERGENCY' : '⚠️ CRISIS';
    await sendSlackMessage({
      text:
        `${alertType} *JOB FAILED*\n\n` +
        `• Job: ${job.name}\n` +
        `• Queue: ${queueName}\n` +
        `• Error: ${error?.message ?? 'Unknown'}\n` +
        `• Retries: ${entry.retry_count}\n` +
        `• Record ID: ${dbRecord?.id ?? 'DB write failed'}\n` +
        `• Time: ${new Date().toISOString()}`,
    });
    return;
  }

  // Non-emergency → batch for hourly flush
  try {
    await redis.sadd(
      DLQ_BATCH_KEY,
      JSON.stringify({
        jobType: job.name,
        queueName,
        jobId: String(job.id),
        error: error?.message?.slice(0, 200) ?? 'Unknown',
        dlqId: dbRecord?.id ?? null,
        timestamp: new Date().toISOString(),
      })
    );
    await redis.expire(DLQ_BATCH_KEY, DLQ_BATCH_TTL);
  } catch (redisErr) {
    logger.error({ err: redisErr.message }, '[dlq] Failed to add to Slack batch');
  }
};

// Flush Batch to Slack

/**
 * Flush batched DLQ entries to Slack.
 * Called every hour by the DLQ monitor job.
 */
export async function flushDlqSlackBatch() {
  try {
    const entries = await redis.smembers(DLQ_BATCH_KEY);
    if (!entries || entries.length === 0) return;

    const messages = entries.map((e) => JSON.parse(e));

    if (messages.length === 0) return;

    const text =
      `⚠️ *DLQ Batch — ${messages.length} failed job(s)*\n\n` +
      messages
        .map(
          (m) =>
            `• ${m.jobType} (${m.queueName})\n` +
            `  Error: ${m.error}\n` +
            `  DLQ ID: ${m.dlqId ?? 'N/A'} | ${m.timestamp}`
        )
        .join('\n\n');

    await sendSlackMessage({ text });

    // Clear after successful send
    await redis.del(DLQ_BATCH_KEY);
    logger.info({ count: messages.length }, '[dlq] Batch flushed to Slack');
  } catch (err) {
    logger.error({ err: err.message }, '[dlq] Failed to flush DLQ batch');
  }
}

// Resolve DLQ Entry

/**
 * Mark a DLQ entry as resolved.
 */
export async function resolveDlqEntry(dlqId) {
  try {
    await prisma.timetableJob.update({
      where: { id: dlqId },
      data: { status: 'CANCELLED', statusMessage: 'Resolved from DLQ' },
    });
    logger.info({ dlqId }, '[dlq] Entry resolved');
    return true;
  } catch (err) {
    logger.error({ err: err.message, dlqId }, '[dlq] Failed to resolve entry');
    return false;
  }
}

// Get DLQ Stats

/**
 * Get DLQ statistics for monitoring.
 */
export async function getDlqStats() {
  try {
    const [totalFailed, unresolved, recentFailures] = await Promise.all([
      prisma.timetableJob.count({ where: { status: 'FAILED' } }),
      prisma.timetableJob.count({ where: { status: 'FAILED', completedAt: null } }),
      prisma.timetableJob.findMany({
        where: { status: 'FAILED' },
        orderBy: { updatedAt: 'desc' },
        take: 10,
        select: { id: true, type: true, error: true, updatedAt: true },
      }),
    ]);

    const batchSize = await redis.scard(DLQ_BATCH_KEY);

    return {
      totalFailed,
      unresolved,
      pendingSlackBatch: batchSize,
      recentFailures,
    };
  } catch (err) {
    logger.error({ err: err.message }, '[dlq] Failed to get stats');
    return { error: err.message };
  }
}
