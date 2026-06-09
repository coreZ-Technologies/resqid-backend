// =============================================================================
// orchestrator/workers/notification.worker.js — RESQID
// Processes NOTIFICATIONS queue. ALWAYS ON.
//
// Receives jobs from the queue and dispatches to all channels.
// Job shape: { notificationId, schoolId, title, body, type, channels,
//              priority, recipients, scheduledFor, isEmergency, isBulk,
//              isRetry, batchId }
// =============================================================================

import { Worker } from 'bullmq';
import { getQueueConnection } from '../queues/queue.connection.js';
import { QUEUE_NAMES } from '../queues/queue.names.js';
import { handleDeadJob } from '../dlq/dlq.handler.js';
import { logger } from '#config/logger.js';
import { prisma } from '#config/prisma.js';

// Channel dispatchers
import { sendPushNotificationChannel } from '../notifications/channel/push.js';
import { sendSmsNotification } from '../notifications/channel/sms.js';
import { sendEmailNotification } from '../notifications/channel/email.js';
import { sendWhatsAppNotification } from '../notifications/channel/whatsapp.js';

// Registry — for channel routing and retry config
import { ALL_NOTIFICATIONS, PRIORITY_WEIGHTS } from '../registry/index.js';

// Rate limiting
import { checkUserRateLimit } from '../policies/rate-limit.policy.js';

const QUEUE = QUEUE_NAMES.NOTIFICATIONS;

// ═══════════════════════════════════════════════════════════════════════════
// JOB PROCESSOR
// ═══════════════════════════════════════════════════════════════════════════

export const processNotificationJob = async (job) => {
  const {
    notificationId,
    schoolId,
    title,
    body,
    type,
    channels,
    priority,
    recipients,
    scheduledFor,
    isEmergency,
    isBulk,
    batchId,
  } = job.data ?? {};

  logger.info(
    {
      jobId: job.id,
      notificationId,
      type,
      channels,
      recipientCount: recipients?.length || 0,
      isEmergency,
      isBulk,
    },
    '[notification.worker] Processing job'
  );

  if (!recipients || recipients.length === 0) {
    logger.warn({ jobId: job.id }, '[notification.worker] No recipients — skipping');
    return { success: false, error: 'No recipients' };
  }

  // Update notification status to PROCESSING
  if (notificationId) {
    await prisma.notification
      .update({
        where: { id: notificationId },
        data: { status: 'PROCESSING' },
      })
      .catch(() => {});
  }

  // Update batch if applicable
  if (batchId) {
    await prisma.notificationBatch
      .update({
        where: { id: batchId },
        data: { status: 'PROCESSING' },
      })
      .catch(() => {});
  }

  const results = {
    push: { sent: 0, failed: 0 },
    sms: { sent: 0, failed: 0 },
    email: { sent: 0, failed: 0 },
    whatsapp: { sent: 0, failed: 0 },
    inApp: { sent: 0 },
  };

  const startTime = Date.now();

  // ═══════════════════════════════════════════════════════════════════════
  // DISPATCH TO EACH CHANNEL
  // ═══════════════════════════════════════════════════════════════════════

  const channelHandlers = {
    PUSH: async (recipient) => {
      if (!recipient.pushTokens?.length) return;
      const result = await sendPushNotificationChannel({
        tokens: recipient.pushTokens,
        title,
        body,
        data: {
          type,
          notificationId,
          schoolId,
          priority,
          ...(job.data.data || {}),
        },
        priority: isEmergency ? 'high' : priority === 'HIGH' ? 'high' : 'normal',
      });
      if (result.success) results.push.sent++;
      else results.push.failed++;
    },

    SMS: async (recipient) => {
      if (!recipient.phone) return;
      const result = await sendSmsNotification({
        to: recipient.phone,
        body: body.length > 160 ? body.substring(0, 157) + '...' : body,
        meta: { type, notificationId },
      });
      if (result.success) results.sms.sent++;
      else results.sms.failed++;
    },

    EMAIL: async (recipient) => {
      if (!recipient.email) return;
      const result = await sendEmailNotification({
        to: recipient.email,
        subject: title,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px;">
            <h2>${title}</h2>
            <p>${body}</p>
            ${isEmergency ? '<p style="color: red; font-weight: bold;">This is an emergency alert.</p>' : ''}
            <hr />
            <p style="color: #666; font-size: 12px;">Sent via RESQID</p>
          </div>
        `,
        meta: { type, notificationId },
      });
      if (result.success) results.email.sent++;
      else results.email.failed++;
    },

    WHATSAPP: async (recipient) => {
      if (!recipient.phone) return;
      const result = await sendWhatsAppNotification({
        to: recipient.phone,
        body,
        meta: { type, notificationId },
      });
      if (result.success) results.whatsapp.sent++;
      else results.whatsapp.failed++;
    },

    IN_APP: async () => {
      // In-app notifications are already saved by the service before enqueuing
      results.inApp.sent++;
    },
  };

  // Process each recipient through each channel
  for (const recipient of recipients) {
    // Check user rate limits (skip for emergency)
    if (!isEmergency && recipient.parentId) {
      for (const channel of channels) {
        const rateCheck = await checkUserRateLimit(recipient.parentId, channel.toLowerCase());
        if (!rateCheck.allowed) {
          logger.debug(
            { parentId: recipient.parentId, channel },
            '[notification.worker] User rate limited — skipping channel'
          );
        }
      }
    }

    // Dispatch to all channels in parallel for this recipient
    const tasks = channels.map((channel) => {
      const handler = channelHandlers[channel];
      return handler
        ? handler(recipient).catch((err) => {
            logger.error(
              { err: err.message, channel, recipientId: recipient.parentId },
              '[notification.worker] Channel dispatch error'
            );
          })
        : Promise.resolve();
    });

    await Promise.all(tasks);
  }

  const latencyMs = Date.now() - startTime;

  // ═══════════════════════════════════════════════════════════════════════
  // UPDATE STATUS
  // ═══════════════════════════════════════════════════════════════════════

  const totalSent =
    results.push.sent +
    results.sms.sent +
    results.email.sent +
    results.whatsapp.sent +
    results.inApp.sent;
  const totalFailed =
    results.push.failed + results.sms.failed + results.email.failed + results.whatsapp.failed;
  const finalStatus = totalSent > 0 ? 'SENT' : 'FAILED';

  // Update notification record
  if (notificationId) {
    await prisma.notification
      .update({
        where: { id: notificationId },
        data: {
          status: finalStatus,
          sentAt: totalSent > 0 ? new Date() : undefined,
          failReason: totalFailed > 0 && totalSent === 0 ? 'All channels failed' : undefined,
          providerResponse: results,
        },
      })
      .catch(() => {});
  }

  // Update batch record
  if (batchId) {
    await prisma.notificationBatch
      .update({
        where: { id: batchId },
        data: {
          status: finalStatus === 'SENT' ? 'COMPLETED' : 'PARTIAL',
          sentCount: totalSent,
          failedCount: totalFailed,
        },
      })
      .catch(() => {});
  }

  logger.info(
    {
      jobId: job.id,
      notificationId,
      type,
      results,
      totalSent,
      totalFailed,
      latencyMs,
      finalStatus,
    },
    '[notification.worker] ✅ Job completed'
  );

  // Throw if all channels failed — triggers retry
  if (finalStatus === 'FAILED') {
    throw new Error(`[notification.worker] All channels failed for notification ${notificationId}`);
  }

  return {
    notificationId,
    results,
    totalSent,
    totalFailed,
    latencyMs,
    status: finalStatus,
  };
};

// ═══════════════════════════════════════════════════════════════════════════
// WORKER LIFECYCLE
// ═══════════════════════════════════════════════════════════════════════════

let _worker = null;

export const startNotificationWorker = () => {
  if (_worker) return _worker;

  _worker = new Worker(QUEUE, processNotificationJob, {
    connection: getQueueConnection(),
    concurrency: 5,
    stalledInterval: 120_000,
    maxStalledCount: 1,
    lockDuration: 30_000,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: { age: 86400, count: 1000 },
      removeOnFail: { age: 604800, count: 5000 },
    },
  });

  _worker.on('completed', (job) => {
    logger.info({ jobId: job.id, result: job.returnvalue }, '[notification.worker] Job completed');
  });

  _worker.on('failed', async (job, error) => {
    logger.error(
      { jobId: job?.id, err: error.message, attemptsMade: job?.attemptsMade },
      '[notification.worker] Job failed'
    );

    // Update notification status on final failure
    if (job?.data?.notificationId && job.attemptsMade >= (job.opts?.attempts ?? 3)) {
      await prisma.notification
        .update({
          where: { id: job.data.notificationId },
          data: {
            status: 'FAILED',
            failReason: error.message,
            retryCount: job.attemptsMade,
          },
        })
        .catch(() => {});
    }

    // Move to DLQ on final attempt
    if (job && job.attemptsMade >= (job.opts?.attempts ?? 3)) {
      await handleDeadJob({ job, error, queueName: QUEUE });
    }
  });

  _worker.on('error', (err) => {
    logger.error({ err: err.message }, '[notification.worker] Worker error');
  });

  _worker.on('drained', () => {
    logger.debug('[notification.worker] Queue drained');
  });

  logger.info({ queue: QUEUE, concurrency: 5 }, '[notification.worker] Started');

  return _worker;
};

export const stopNotificationWorker = async () => {
  if (_worker) {
    await _worker.close();
    _worker = null;
    logger.info('[notification.worker] Stopped');
  }
};

export default {
  processNotificationJob,
  startNotificationWorker,
  stopNotificationWorker,
};
