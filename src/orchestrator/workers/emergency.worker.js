// orchestrator/workers/emergency.worker.js — RESQID
//
// Emergency alert worker. CRITICAL priority — always on.
// QR scan → Push + SMS + Email + WhatsApp to all parents + emergency contacts.
// Sacred pipeline — must deliver.

import { Worker } from 'bullmq';
import { getQueueConnection } from '../queues/queue.connection.js';
import { QUEUE_NAMES } from '../queues/queue.names.js';
import { handleDeadJob } from '../dlq/dlq.handler.js';
import { sendPushNotificationChannel } from '../notifications/channel/push.js';
import { sendSmsNotification } from '../notifications/channel/sms.js';
import { sendEmailNotification } from '../notifications/channel/email.js';
import { sendWhatsAppNotification } from '../notifications/channel/whatsapp.js';
import { prisma } from '#config/prisma.js';
import { logger } from '#config/logger.js';
import { decrypt } from '#shared/security/encryption.js';

const QUEUE = QUEUE_NAMES.EMERGENCY_ALERTS;

// ── Helpers ──────────────────────────────────────────────────────────────────

const safeDecrypt = (encrypted) => {
  if (!encrypted) return null;
  try {
    return decrypt(encrypted);
  } catch {
    return null;
  }
};

const formatTime = (iso) => {
  try {
    return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  }
};

// ── Data Loaders ─────────────────────────────────────────────────────────────

async function loadEmergencyContacts(studentId) {
  const profile = await prisma.emergencyProfile.findUnique({
    where: { studentId },
    select: {
      contacts: {
        where: { isActive: true },
        orderBy: { priority: 'asc' },
        select: { id: true, name: true, phone: true, email: true, relation: true },
      },
    },
  });

  return (profile?.contacts ?? []).map((c) => ({
    ...c,
    phone: safeDecrypt(c.phone),
    email: safeDecrypt(c.email),
  }));
}

async function loadParentDevices(studentId) {
  const links = await prisma.parentStudent.findMany({
    where: { studentId },
    select: {
      parent: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          devices: {
            where: { isActive: true, expoPushToken: { not: null } },
            select: { expoPushToken: true },
          },
        },
      },
    },
  });

  return links
    .map((l) => ({
      parentId: l.parent?.id,
      name: l.parent?.name,
      email: safeDecrypt(l.parent?.email),
      phone: safeDecrypt(l.parent?.phone),
      pushTokens: l.parent?.devices?.map((d) => d.expoPushToken) ?? [],
    }))
    .filter((p) => p.pushTokens.length > 0 || p.email || p.phone);
}

async function loadStudentInfo(studentId) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { name: true, class: true, section: true, bloodGroup: true, allergies: true },
  });
  return student;
}

// ── Notification Logger ──────────────────────────────────────────────────────

async function logNotification({ alertId, studentId, schoolId, channels, status, error }) {
  try {
    await prisma.notification.create({
      data: {
        type: 'EMERGENCY_ALERT',
        channels: channels,
        status,
        title: '🚨 Emergency Alert',
        body: `Alert ${alertId} — ${channels.length} channel(s) attempted`,
        failReason: error || null,
        data: { alertId, studentId, schoolId },
      },
    });
  } catch (err) {
    logger.error({ err: err.message }, '[emergency.worker] Log failed');
  }
}

// ── Job Processor ────────────────────────────────────────────────────────────

export const processEmergencyAlert = async (job) => {
  const { alertId, studentId, schoolId, scannedAt, scannerLocation } = job.data?.payload ?? {};

  if (!alertId || !studentId || !schoolId) {
    throw new Error('[emergency.worker] Missing alertId, studentId, or schoolId');
  }

  logger.info({ jobId: job.id, alertId, studentId }, '[emergency.worker] 🚨 Processing emergency');

  // Load all data in parallel
  const [student, contacts, parents] = await Promise.all([
    loadStudentInfo(studentId),
    loadEmergencyContacts(studentId),
    loadParentDevices(studentId),
  ]);

  const studentName = student?.name || 'Student';
  const time = formatTime(scannedAt);
  const location = scannerLocation || 'Unknown location';

  // Build message
  const pushTitle = '🚨 Emergency Alert';
  const pushBody = `${studentName}'s QR was scanned at ${time} near ${location}. Tap for details.`;

  const smsBody = `RESQID EMERGENCY: ${studentName} (Class ${student?.class || '?'}-${student?.section || '?'}) QR scanned at ${time}. Location: ${location}. Blood: ${student?.bloodGroup || '?'}.`;

  const emailSubject = `🚨 RESQID Emergency — ${studentName}`;
  const emailBody = `
        <h2>Emergency Alert</h2>
        <p><strong>Student:</strong> ${studentName}</p>
        <p><strong>Class:</strong> ${student?.class || '?'}-${student?.section || '?'}</p>
        <p><strong>Time:</strong> ${time}</p>
        <p><strong>Location:</strong> ${location}</p>
        ${student?.bloodGroup ? `<p><strong>Blood Group:</strong> ${student.bloodGroup}</p>` : ''}
        ${student?.allergies?.length ? `<p><strong>Allergies:</strong> ${student.allergies.join(', ')}</p>` : ''}
        <hr/>
        <p style="color:red;font-weight:bold;">This is an emergency. Please respond immediately.</p>
    `;

  const results = {
    push: { sent: 0, failed: 0 },
    sms: { sent: 0, failed: 0 },
    email: { sent: 0, failed: 0 },
    whatsapp: { sent: 0, failed: 0 },
  };
  const deliveredChannels = [];

  // ═══════════════════════════════════════════════════════════════════════
  // PUSH — All parent devices
  // ═══════════════════════════════════════════════════════════════════════
  const allPushTokens = parents.flatMap((p) => p.pushTokens);
  if (allPushTokens.length > 0) {
    try {
      await sendPushNotificationChannel({
        tokens: allPushTokens,
        title: pushTitle,
        body: pushBody,
        data: { alertId, studentId, schoolId, type: 'EMERGENCY', priority: 'critical' },
        priority: 'high',
      });
      results.push.sent = allPushTokens.length;
      deliveredChannels.push('PUSH');
    } catch (err) {
      results.push.failed = allPushTokens.length;
      logger.error({ err: err.message }, '[emergency.worker] Push failed');
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SMS — Emergency contacts + parents
  // ═══════════════════════════════════════════════════════════════════════
  const allPhones = [
    ...contacts.map((c) => c.phone).filter(Boolean),
    ...parents.map((p) => p.phone).filter(Boolean),
  ];
  const uniquePhones = [...new Set(allPhones)];

  for (const phone of uniquePhones) {
    try {
      await sendSmsNotification({ to: phone, body: smsBody });
      results.sms.sent++;
      if (!deliveredChannels.includes('SMS')) deliveredChannels.push('SMS');
    } catch (err) {
      results.sms.failed++;
      logger.error({ phone, err: err.message }, '[emergency.worker] SMS failed');
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // EMAIL — Emergency contacts + parents
  // ═══════════════════════════════════════════════════════════════════════
  const allEmails = [
    ...contacts.map((c) => c.email).filter(Boolean),
    ...parents.map((p) => p.email).filter(Boolean),
  ];
  const uniqueEmails = [...new Set(allEmails)];

  for (const email of uniqueEmails) {
    try {
      await sendEmailNotification({ to: email, subject: emailSubject, html: emailBody });
      results.email.sent++;
      if (!deliveredChannels.includes('EMAIL')) deliveredChannels.push('EMAIL');
    } catch (err) {
      results.email.failed++;
      logger.error({ email, err: err.message }, '[emergency.worker] Email failed');
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // WHATSAPP — Emergency contacts only (critical)
  // ═══════════════════════════════════════════════════════════════════════
  const whatsappPhones = contacts.map((c) => c.phone).filter(Boolean);
  for (const phone of whatsappPhones) {
    try {
      await sendWhatsAppNotification({ to: phone, body: smsBody });
      results.whatsapp.sent++;
      if (!deliveredChannels.includes('WHATSAPP')) deliveredChannels.push('WHATSAPP');
    } catch (err) {
      results.whatsapp.failed++;
      logger.error({ phone, err: err.message }, '[emergency.worker] WhatsApp failed');
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Log notification
  // ═══════════════════════════════════════════════════════════════════════
  const status = deliveredChannels.length > 0 ? 'SENT' : 'FAILED';
  await logNotification({
    alertId,
    studentId,
    schoolId,
    channels: deliveredChannels,
    status,
    error: status === 'FAILED' ? 'All channels failed' : null,
  });

  // Update alert record
  await prisma.emergencyAlert
    .update({
      where: { id: alertId },
      data: {
        notifiedAt: new Date(),
        channelsNotified: deliveredChannels,
        notificationStatus: status,
      },
    })
    .catch(() => {});

  logger.info(
    {
      jobId: job.id,
      alertId,
      results,
      channels: deliveredChannels,
    },
    '[emergency.worker] ✅ Complete'
  );

  if (status === 'FAILED') {
    throw new Error(`[emergency.worker] All channels failed for alert ${alertId}`);
  }

  return { alertId, results, channels: deliveredChannels };
};

// ── Worker Setup ─────────────────────────────────────────────────────────────

let _worker = null;

export const startEmergencyWorker = () => {
  if (_worker) return _worker;

  _worker = new Worker(QUEUE, processEmergencyAlert, {
    connection: getQueueConnection(),
    concurrency: 10,
    limiter: { max: 20, duration: 1000 },
    lockDuration: 30000,
    stalledInterval: 15000,
    maxStalledCount: 2,
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

  logger.info({ queue: QUEUE, concurrency: 10 }, '[emergency.worker] 🚨 Started');
  return _worker;
};

export const stopEmergencyWorker = async () => {
  if (_worker) {
    await _worker.close();
    _worker = null;
    logger.info('[emergency.worker] Stopped');
  }
};
