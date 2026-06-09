// orchestrator/dlq/dlq.handler.js — RESQID
//
// Dead Letter Queue handler.
// - Persists ALL failed jobs to database
// - Emergency/crisis → immediate Slack alert
// - Non-critical → batched hourly Slack digest
// - Provides resolve + stats utilities

import { prisma } from '#config/prisma.js';
import { logger } from '#config/logger.js';
import { Redis } from 'ioredis';
import { QUEUE_NAMES } from '../queues/queue.names.js';
import { ENV } from '#config/env.js';

// ── Config ──────────────────────────────────────────────────────────────────

const DLQ_BATCH_KEY = 'orch:dlq:pending_slack_batch';
const DLQ_BATCH_TTL = 3600; // 1 hour
const SLACK_WEBHOOK_URL = ENV.SLACK_ALERTS_WEBHOOK;

// Redis client for DLQ batch operations
const redis = new Redis(ENV.REDIS_URL, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: false,
});

// ── Slack Notification ──────────────────────────────────────────────────────

async function sendSlackMessage(text) {
  if (!SLACK_WEBHOOK_URL) {
    logger.warn('[dlq] Slack webhook not configured — skipping');
    return;
  }
  try {
    const response = await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!response.ok) {
      logger.warn({ status: response.status }, '[dlq] Slack send failed');
    }
  } catch (err) {
    logger.error({ err: err.message }, '[dlq] Slack send error');
  }
}

// ── Persist Failed Job ─────────────────────────────────────────────────────

async function persistFailedJob(job, error, queueName) {
  const data = {
    jobId: String(job.id),
    jobName: job.name,
    queueName,
    payload: JSON.stringify(job.data ?? {}),
    error: error?.message?.slice(0, 500) ?? 'Unknown error',
    errorStack: error?.stack?.slice(0, 1000) ?? null,
    attemptsMade: job.attemptsMade ?? 0,
    failedAt: new Date(),
  };

  // Try timetableJob table
  try {
    const existing = await prisma.timetableJob.findUnique({ where: { id: data.jobId } });
    if (existing) {
      return await prisma.timetableJob.update({
        where: { id: data.jobId },
        data: { status: 'FAILED', error: data.error, completedAt: new Date() },
      });
    }
  } catch {
    // Table might not exist or job not found
  }

  // Try crisisEvent table
  try {
    return await prisma.crisisEvent.create({
      data: {
        schoolId: job.data?.schoolId || null,
        timetableId: job.data?.payload?.timetableId || job.data?.timetableId || null,
        type: 'JOB_FAILED',
        severity: queueName === QUEUE_NAMES.EMERGENCY_ALERTS ? 'CRITICAL' : 'HIGH',
        status: 'UNRESOLVED',
        title: `DLQ: ${job.name} failed after ${data.attemptsMade} retries`,
        description: data.error,
        triggeredBy: 'DLQ',
        triggerReason: `Queue: ${queueName}`,
      },
    });
  } catch {
    // Table might not exist
  }

  // Last resort — log only
  logger.error(data, '[dlq] Could not persist to any table — logged only');
  return null;
}

// ── Handle Dead Job ─────────────────────────────────────────────────────────

export const handleDeadJob = async ({ job, error, queueName }) => {
  const isEmergency = queueName === QUEUE_NAMES.EMERGENCY_ALERTS;
  const isCrisis = queueName === QUEUE_NAMES.CRISIS_HANDLING;

  // Persist to database
  const dbRecord = await persistFailedJob(job, error, queueName);

  logger.error(
    {
      dlqId: dbRecord?.id,
      jobType: job.name,
      queueName,
      retries: job.attemptsMade,
      error: error?.message,
    },
    '[dlq] Job moved to DLQ'
  );

  // Emergency/crisis → immediate Slack
  if (isEmergency || isCrisis) {
    const alertType = isEmergency ? '🚨 EMERGENCY' : '⚠️ CRISIS';
    await sendSlackMessage(
      `${alertType} *JOB FAILED*\n\n` +
        `• Job: ${job.name}\n` +
        `• Queue: ${queueName}\n` +
        `• Error: ${error?.message ?? 'Unknown'}\n` +
        `• Retries: ${job.attemptsMade}\n` +
        `• Record ID: ${dbRecord?.id ?? 'DB write failed'}\n` +
        `• Time: ${new Date().toISOString()}`
    );
    return; // ← Don't batch — already sent
  }

  // Non-critical → batch for hourly digest
  try {
    const entry = JSON.stringify({
      jobType: job.name,
      queueName,
      jobId: String(job.id),
      error: error?.message?.slice(0, 200) ?? 'Unknown',
      dlqId: dbRecord?.id ?? null,
      timestamp: new Date().toISOString(),
    });

    // Use sorted set to prevent duplicates (score = timestamp)
    await redis.zadd(DLQ_BATCH_KEY, Date.now(), entry);
    await redis.expire(DLQ_BATCH_KEY, DLQ_BATCH_TTL);
  } catch (redisErr) {
    logger.error({ err: redisErr.message }, '[dlq] Failed to add to batch');
  }
};

// ── Flush Batch to Slack ────────────────────────────────────────────────────

export async function flushDlqSlackBatch() {
  try {
    const entries = await redis.zrange(DLQ_BATCH_KEY, 0, -1);
    if (!entries || entries.length === 0) return;

    const messages = entries.map((e) => JSON.parse(e));

    const text =
      `⚠️ *DLQ Hourly Digest — ${messages.length} failed job(s)*\n\n` +
      messages
        .map(
          (m) =>
            `• ${m.jobType} (${m.queueName})\n` +
            `  Error: ${m.error}\n` +
            `  DLQ ID: ${m.dlqId ?? 'N/A'} | ${m.timestamp}`
        )
        .join('\n\n');

    await sendSlackMessage(text);
    await redis.del(DLQ_BATCH_KEY);
    logger.info({ count: messages.length }, '[dlq] Batch flushed to Slack');
  } catch (err) {
    logger.error({ err: err.message }, '[dlq] Failed to flush batch');
  }
}

// ── Resolve DLQ Entry ───────────────────────────────────────────────────────

export async function resolveDlqEntry(jobId) {
  try {
    // Try timetableJob
    const updated = await prisma.timetableJob.updateMany({
      where: { id: jobId, status: 'FAILED' },
      data: { status: 'CANCELLED', statusMessage: 'Resolved from DLQ' },
    });
    if (updated.count > 0) {
      logger.info({ jobId }, '[dlq] Entry resolved');
      return true;
    }
  } catch {
    // Table might not exist
  }

  try {
    // Try crisisEvent
    await prisma.crisisEvent.updateMany({
      where: { triggerReason: { contains: jobId }, status: 'UNRESOLVED' },
      data: { status: 'RESOLVED' },
    });
    logger.info({ jobId }, '[dlq] Crisis event resolved');
    return true;
  } catch {
    // Table might not exist
  }

  return false;
}

// ── Get DLQ Stats ───────────────────────────────────────────────────────────

export async function getDlqStats() {
  const stats = {
    timetableFailedJobs: 0,
    unresolvedCrisisEvents: 0,
    pendingSlackBatch: 0,
    recentFailures: [],
  };

  try {
    stats.timetableFailedJobs = await prisma.timetableJob
      .count({ where: { status: 'FAILED' } })
      .catch(() => 0);
  } catch {}

  try {
    stats.unresolvedCrisisEvents = await prisma.crisisEvent
      .count({ where: { status: 'UNRESOLVED' } })
      .catch(() => 0);
  } catch {}

  try {
    stats.pendingSlackBatch = await redis.zcard(DLQ_BATCH_KEY);
  } catch {}

  try {
    stats.recentFailures = await prisma.timetableJob
      .findMany({
        where: { status: 'FAILED' },
        orderBy: { updatedAt: 'desc' },
        take: 10,
        select: { id: true, error: true, updatedAt: true },
      })
      .catch(() => []);
  } catch {}

  return stats;
}
