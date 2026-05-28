// =============================================================================
// orchestrator/dlq/dlq.handler.js — RESQID
// Dead Letter Queue handler — persists failed jobs + alerts ops team.
// =============================================================================

import { prisma } from '#config/prisma.js';
import { logger } from '#config/logger.js';
import { middlewareRedis as redis } from '#config/redis.js';
import { QUEUE_NAMES } from '../queues/queue.names.js';
import { ENV } from '#config/env.js';

// ─── Config ───────────────────────────────────────────────────────────────────

const DLQ_BATCH_KEY = 'orch:dlq:pending_slack_batch';
const DLQ_BATCH_TTL = 3600; // Flush every hour
const SLACK_WEBHOOK_URL = ENV.SLACK_ALERTS_WEBHOOK;

// ─── Slack Notification ───────────────────────────────────────────────────────

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

// ─── Handle Dead Job ──────────────────────────────────────────────────────────

export const handleDeadJob = async ({ job, error, queueName }) => {
  const isEmergency = queueName === QUEUE_NAMES.EMERGENCY_ALERTS;

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

  // Persist to DB
  let dbRecord = null;
  try {
    dbRecord = await prisma.deadLetterQueue.create({ data: entry });
    logger.error(
      { dlqId: dbRecord.id, jobType: job.name, queueName, retries: entry.retry_count },
      '[dlq] Job moved to DLQ'
    );
  } catch (dbErr) {
    logger.error(
      { err: dbErr.message, jobType: job.name, queueName },
      '[dlq] Failed to write DLQ entry to DB'
    );
  }

  // Emergency alerts → immediate Slack notification
  if (isEmergency) {
    await sendSlackMessage({
      text:
        `🚨 *EMERGENCY ALERT FAILED*\n\n` +
        `• Job: ${job.name}\n` +
        `• Queue: ${queueName}\n` +
        `• Error: ${error?.message ?? 'Unknown'}\n` +
        `• Retries: ${entry.retry_count}\n` +
        `• DLQ ID: ${dbRecord?.id ?? 'DB write failed'}\n` +
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
        error: error?.message ?? 'Unknown',
        dlqId: dbRecord?.id ?? null,
        timestamp: new Date().toISOString(),
      })
    );
    await redis.expire(DLQ_BATCH_KEY, DLQ_BATCH_TTL);
  } catch (redisErr) {
    logger.error({ err: redisErr.message }, '[dlq] Failed to add to Slack batch');
  }
};

// ─── Flush Batch to Slack ─────────────────────────────────────────────────────

export async function flushDlqSlackBatch() {
  try {
    const entries = await redis.smembers(DLQ_BATCH_KEY);
    if (!entries || entries.length === 0) return;

    const messages = entries.map((e) => JSON.parse(e));

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
