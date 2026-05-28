// =============================================================================
// orchestrator/workers/attendance.worker.js — RESQID
// Processes bulk attendance sync from ESP32 devices.
// =============================================================================

import { Worker } from 'bullmq';
import { getQueueConnection } from '../queues/queue.connection.js';
import { QUEUE_NAMES } from '../queues/queue.names.js';
import { handleDeadJob } from '../dlq/dlq.handler.js';
import { prisma } from '#config/prisma.js';
import { logger } from '#config/logger.js';
import { evaluateScan } from '#shared/anomaly/anomaly.evaluator.js';

const QUEUE = QUEUE_NAMES.ATTENDANCE_BULK;

export const processAttendanceBulk = async (job) => {
  const { deviceId, schoolId, taps } = job.data?.payload ?? {};

  if (!deviceId || !schoolId || !taps?.length) {
    throw new Error('[attendance.worker] Missing deviceId, schoolId, or taps');
  }

  logger.info(
    { jobId: job.id, deviceId, tapCount: taps.length },
    '[attendance.worker] Processing bulk'
  );

  let processed = 0;
  let duplicates = 0;
  let errors = 0;

  for (const tap of taps) {
    try {
      // Find token by RFID UID
      const token = await prisma.token.findFirst({
        where: { rfidUid: tap.uid, schoolId, status: 'ACTIVE' },
        select: { id: true, studentId: true },
      });

      if (!token || !token.studentId) {
        errors++;
        continue;
      }

      // Check for duplicate (same student, same device, within 30 seconds)
      const recentWindow = new Date(tap.timestamp - 30 * 1000);
      const existing = await prisma.attendanceRecord.findFirst({
        where: {
          studentId: token.studentId,
          markedAt: { gte: recentWindow },
        },
      });

      if (existing) {
        duplicates++;
        continue;
      }

      // Find or create active session for today
      const today = new Date(tap.timestamp);
      today.setHours(0, 0, 0, 0);

      let session = await prisma.attendanceSession.findFirst({
        where: { schoolId, isActive: true, startedAt: { gte: today } },
      });

      if (!session) {
        session = await prisma.attendanceSession.create({
          data: {
            schoolId,
            teacherId: 'SYSTEM',
            grade: 'ALL',
            section: 'ALL',
            startedAt: new Date(tap.timestamp),
          },
        });
      }

      // Create attendance record
      await prisma.attendanceRecord.create({
        data: {
          sessionId: session.id,
          studentId: token.studentId,
          schoolId,
          status: 'PRESENT',
          markedAt: new Date(tap.timestamp),
        },
      });

      // Fire-and-forget anomaly check
      evaluateScan({
        type: 'RFID',
        studentId: token.studentId,
        schoolId,
        deviceId,
        timestamp: new Date(tap.timestamp),
      }).catch(() => {});

      processed++;
    } catch (err) {
      logger.error({ err: err.message, tap }, '[attendance.worker] Tap failed');
      errors++;
    }
  }

  // Update device last sync time
  await prisma.attendanceDevice.update({
    where: { id: deviceId },
    data: { lastSeenAt: new Date() },
  });

  logger.info(
    { jobId: job.id, processed, duplicates, errors, total: taps.length },
    '[attendance.worker] Bulk complete'
  );

  return { processed, duplicates, errors };
};

// ─── Worker Setup ─────────────────────────────────────────────────────────────

let _worker = null;

export const startAttendanceWorker = () => {
  if (_worker) return _worker;

  _worker = new Worker(QUEUE, processAttendanceBulk, {
    connection: getQueueConnection(),
    concurrency: 3,
    stalledInterval: 60_000,
    maxStalledCount: 2,
    lockDuration: 30_000,
  });

  _worker.on('completed', (job) => {
    logger.info({ jobId: job.id }, '[attendance.worker] Completed');
  });

  _worker.on('failed', async (job, error) => {
    logger.error({ jobId: job?.id, err: error.message }, '[attendance.worker] Failed');
    if (job && job.attemptsMade >= (job.opts?.attempts ?? 3)) {
      await handleDeadJob({ job, error, queueName: QUEUE });
    }
  });

  logger.info({ queue: QUEUE, concurrency: 3 }, '[attendance.worker] Started');
  return _worker;
};

export const stopAttendanceWorker = async () => {
  if (_worker) {
    await _worker.close();
    _worker = null;
  }
};
