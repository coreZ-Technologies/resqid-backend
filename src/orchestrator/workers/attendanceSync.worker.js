// orchestrator/workers/attendanceSync.worker.js — RESQID
//
// Processes bulk attendance sync from ESP32/RFID devices.
// API buffers taps → flushes to queue at 200 taps OR every 10 minutes.
// This worker takes the batch and writes everything to DB.

import { Worker } from 'bullmq';
import { getQueueConnection } from '../queues/queue.connection.js';
import { QUEUE_NAMES } from '../queues/queue.names.js';
import { handleDeadJob } from '../dlq/dlq.handler.js';
import { prisma } from '#config/prisma.js';
import { logger } from '#config/logger.js';

const QUEUE = QUEUE_NAMES.ATTENDANCE_BULK;
const DUPLICATE_WINDOW_SECONDS = 30; // Ignore taps within 30s from same student

export const processAttendanceBulk = async (job) => {
  const { schoolId, deviceId, taps, batchId } = job.data;

  if (!schoolId || !taps?.length) {
    throw new Error('[attendance.worker] Missing schoolId or taps');
  }

  logger.info(
    {
      jobId: job.id,
      batchId,
      schoolId,
      deviceId,
      tapCount: taps.length,
    },
    '[attendance.worker] Processing batch'
  );

  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  // Get or create today's session
  const session = await getOrCreateSession(schoolId, today);

  for (const tap of taps) {
    try {
      // Validate tap has required fields
      if (!tap.studentId || !tap.timestamp) {
        skipped++;
        continue;
      }

      const tapTime = new Date(tap.timestamp);

      // Check for duplicate (same student within 30 seconds)
      const isDuplicate = await checkDuplicate(tap.studentId, tapTime, DUPLICATE_WINDOW_SECONDS);
      if (isDuplicate) {
        skipped++;
        continue;
      }

      // Determine status
      const status = determineStatus(tapTime, schoolId);

      // Insert attendance record
      await prisma.attendanceRecord.create({
        data: {
          sessionId: session.id,
          studentId: tap.studentId,
          schoolId,
          deviceId: deviceId || null,
          status,
          direction: tap.direction || 'IN',
          markedAt: tapTime,
          method: 'RFID',
          metadata: tap.metadata || {},
        },
      });

      inserted++;
    } catch (err) {
      logger.error(
        {
          err: err.message,
          studentId: tap.studentId,
        },
        '[attendance.worker] Record failed'
      );
      errors++;
    }
  }

  // Update device last sync
  if (deviceId) {
    await prisma.attendanceDevice
      .update({
        where: { id: deviceId },
        data: { lastSyncedAt: now },
      })
      .catch(() => {});
  }

  const result = {
    batchId,
    total: taps.length,
    inserted,
    skipped,
    errors,
    sessionId: session.id,
  };

  logger.info(result, '[attendance.worker] Batch complete');
  return result;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Get or create today's attendance session.
 */
async function getOrCreateSession(schoolId, today) {
  let session = await prisma.attendanceSession.findFirst({
    where: {
      schoolId,
      isActive: true,
      startedAt: { gte: today },
    },
    orderBy: { startedAt: 'desc' },
  });

  if (!session) {
    session = await prisma.attendanceSession.create({
      data: {
        schoolId,
        startedAt: new Date(),
        isActive: true,
        createdBy: 'SYSTEM',
      },
    });
  }

  return session;
}

/**
 * Check if student already has a record within the duplicate window.
 */
async function checkDuplicate(studentId, tapTime, windowSeconds) {
  const windowStart = new Date(tapTime.getTime() - windowSeconds * 1000);

  const existing = await prisma.attendanceRecord.findFirst({
    where: {
      studentId,
      markedAt: {
        gte: windowStart,
        lte: tapTime,
      },
    },
    select: { id: true },
  });

  return !!existing;
}

/**
 * Determine attendance status based on tap time.
 * Pulls school start time from config to check if student is late.
 */
async function determineStatus(tapTime, schoolId) {
  try {
    const config = await prisma.timetableConfig.findUnique({
      where: { schoolId },
      select: { startTime: true, lateCutoff: true },
    });

    if (config?.startTime) {
      const [hours, minutes] = config.startTime.split(':').map(Number);
      const schoolStart = new Date(tapTime);
      schoolStart.setHours(hours, minutes, 0, 0);

      const [lateH, lateM] = (config.lateCutoff || config.startTime).split(':').map(Number);
      const lateCutoff = new Date(tapTime);
      lateCutoff.setHours(lateH, lateM, 0, 0);

      if (tapTime > lateCutoff) return 'LATE';
      if (tapTime > schoolStart) return 'LATE';
    }

    return 'PRESENT';
  } catch {
    return 'PRESENT';
  }
}

// ── Worker Setup ─────────────────────────────────────────────────────────────

let _worker = null;

export const startAttendanceWorker = () => {
  if (_worker) return _worker;

  _worker = new Worker(QUEUE, processAttendanceBulk, {
    connection: getQueueConnection(),
    concurrency: 5, // Process 5 batches simultaneously
    limiter: {
      max: 20, // Max 20 jobs
      duration: 1000, // Per second
    },
    lockDuration: 60000, // 1 minute lock
    stalledInterval: 30000, // Check for stalled jobs every 30s
    maxStalledCount: 2,
  });

  _worker.on('completed', (job) => {
    logger.info(
      {
        jobId: job.id,
        batchId: job.data?.batchId,
      },
      '[attendance.worker] Completed'
    );
  });

  _worker.on('failed', async (job, error) => {
    logger.error(
      {
        jobId: job?.id,
        batchId: job?.data?.batchId,
        err: error.message,
        attempt: job?.attemptsMade,
      },
      '[attendance.worker] Failed'
    );

    if (job && job.attemptsMade >= (job.opts?.attempts ?? 3)) {
      await handleDeadJob({ job, error, queueName: QUEUE });
    }
  });

  _worker.on('error', (err) => {
    logger.error({ err: err.message }, '[attendance.worker] Worker error');
  });

  logger.info({ queue: QUEUE, concurrency: 5 }, '[attendance.worker] Started');
  return _worker;
};

export const stopAttendanceWorker = async () => {
  if (_worker) {
    await _worker.close();
    _worker = null;
    logger.info('[attendance.worker] Stopped');
  }
};
