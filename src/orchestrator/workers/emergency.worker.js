// =============================================================================
// orchestrator/workers/emergency.worker.js — RESQID
// Processes emergency_queue. ALWAYS ON.
// QR scan → Push + SMS to parents. Sacred pipeline.
// =============================================================================

import { Worker } from 'bullmq';
import { getQueueConnection } from '../queues/queue.connection.js';
import { QUEUE_NAMES } from '../queues/queue.names.js';
import { handleDeadJob } from '../dlq/dlq.handler.js';
import { sendPushNotificationChannel } from '../notifications/channel/push.js';
import { sendSmsNotification } from '../notifications/channel/sms.js';
import { prisma } from '#config/prisma.js';
import { logger } from '#config/logger.js';
import { decrypt } from '#shared/security/encryption.js';

const QUEUE = QUEUE_NAMES.EMERGENCY_ALERTS;

// ── Helpers ───────────────────────────────────────────────────────────────────

const safeDecrypt = (encrypted) => {
  if (!encrypted) return null;
  try {
    return decrypt(encrypted);
  } catch (err) {
    logger.error({ err: err.message }, '[emergency.worker] Decrypt failed');
    return null;
  }
};

// ── Contact Loaders ───────────────────────────────────────────────────────────

const loadAlertContacts = async (studentId) => {
  const emergency = await prisma.emergencyProfile.findUnique({
    where: { studentId },
    select: {
      contacts: {
        where: { isActive: true },
        orderBy: { priority: 'asc' },
        select: { id: true, phone: true, name: true, relation: true },
      },
    },
  });

  return (emergency?.contacts ?? []).map((c) => ({
    ...c,
    phone: safeDecrypt(c.phone),
  }));
};

const loadParentExpoTokens = async (studentId) => {
  const links = await prisma.parentStudent.findMany({
    where: { studentId },
    select: {
      parent: {
        select: {
          devices: {
            where: { isActive: true, expoPushToken: { not: null } },
            select: { expoPushToken: true },
          },
        },
      },
    },
  });

  return links.flatMap((l) => l.parent?.devices?.map((d) => d.expoPushToken) ?? []).filter(Boolean);
};

// ─── Notification Logger ──────────────────────────────────────────────────────

const logAttempt = async ({ channel, status, error, alertId, studentId, schoolId }) => {
  try {
    await prisma.notification.create({
      data: {
        type: 'EMERGENCY_ALERT',
        channel: channel === 'PUSH' ? 'PUSH' : channel === 'SMS' ? 'SMS' : 'IN_APP',
        status: status === 'DELIVERED' ? 'SENT' : 'FAILED',
        title: 'Emergency Alert',
        body: `Alert ${alertId}`,
        failReason: error || null,
        data: { alertId, studentId, schoolId },
      },
    });
  } catch (err) {
    logger.error({ err: err.message }, '[emergency.worker] Log failed');
  }
};

// ─── Job Processor ────────────────────────────────────────────────────────────

export const processEmergencyAlert = async (job) => {
  const { alertId, studentId, schoolId, studentName, schoolName, scannedAt } =
    job.data?.payload ?? {};

  if (!alertId || !studentId || !schoolId) {
    throw new Error('[emergency.worker] Missing required fields');
  }

  logger.info({ jobId: job.id, alertId, studentId }, '[emergency.worker] Processing');

  // Load contacts + tokens in parallel
  const [contacts, parentExpoTokens] = await Promise.all([
    loadAlertContacts(studentId),
    loadParentExpoTokens(studentId),
  ]);

  const phoneNumbers = contacts.map((c) => c.phone).filter(Boolean);

  const formattedTime = scannedAt
    ? new Date(scannedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    : new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  const deliveredChannels = [];
  const failedChannels = [];

  // Step 1: Push notification
  if (parentExpoTokens.length > 0) {
    try {
      await sendPushNotificationChannel({
        tokens: parentExpoTokens,
        title: '🚨 Emergency Alert',
        body: `${studentName || 'A student'}'s QR was scanned at ${formattedTime}.`,
        data: { alertId, studentId, type: 'EMERGENCY' },
      });
      deliveredChannels.push('PUSH');
      await logAttempt({ channel: 'PUSH', status: 'DELIVERED', alertId, studentId, schoolId });
    } catch (err) {
      failedChannels.push('PUSH');
      await logAttempt({
        channel: 'PUSH',
        status: 'FAILED',
        error: err.message,
        alertId,
        studentId,
        schoolId,
      });
    }
  }

  // Step 2: SMS to each contact
  for (const phone of phoneNumbers) {
    try {
      await sendSmsNotification({
        to: phone,
        body: `RESQID ALERT: ${studentName || 'Student'}'s card was scanned at ${formattedTime}.`,
      });
      deliveredChannels.push('SMS');
      await logAttempt({ channel: 'SMS', status: 'DELIVERED', alertId, studentId, schoolId });
    } catch (err) {
      failedChannels.push('SMS');
      await logAttempt({
        channel: 'SMS',
        status: 'FAILED',
        error: err.message,
        alertId,
        studentId,
        schoolId,
      });
    }
  }

  // Check if any channel delivered
  if (deliveredChannels.length === 0) {
    throw new Error(`[emergency.worker] All channels failed for alert ${alertId}`);
  }

  logger.info(
    { jobId: job.id, alertId, delivered: deliveredChannels, failed: failedChannels },
    '[emergency.worker] Complete'
  );
};

// ─── Worker Setup ─────────────────────────────────────────────────────────────

let _worker = null;

export const startEmergencyWorker = () => {
  if (_worker) return _worker;

  _worker = new Worker(QUEUE, processEmergencyAlert, {
    connection: getQueueConnection(),
    concurrency: 10,
    stalledInterval: 30_000,
    maxStalledCount: 2,
    lockDuration: 15_000,
  });

  _worker.on('completed', (job) => {
    logger.info({ jobId: job.id }, '[emergency.worker] Completed');
  });

  _worker.on('failed', async (job, error) => {
    logger.error({ jobId: job?.id, err: error.message }, '[emergency.worker] Failed');
    if (job && job.attemptsMade >= (job.opts?.attempts ?? 5)) {
      await handleDeadJob({ job, error, queueName: QUEUE });
    }
  });

  _worker.on('error', (err) => {
    logger.error({ err: err.message }, '[emergency.worker] Worker error');
  });

  logger.info({ queue: QUEUE, concurrency: 10 }, '[emergency.worker] Started');
  return _worker;
};

export const stopEmergencyWorker = async () => {
  if (_worker) {
    await _worker.close();
    _worker = null;
    logger.info('[emergency.worker] Stopped');
  }
};
