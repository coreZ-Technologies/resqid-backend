// =============================================================================
// orchestrator/workers/generate.worker.js — RESQID
// BullMQ worker: generates timetable in background.
// Large schools (60 classes, 120 teachers) can take 30+ seconds.
// =============================================================================

import { Worker } from 'bullmq';
import { getQueueConnection } from '../queues/queue.connection.js';
import { logger } from '#config/logger.js';
import { generateTimetable } from '#modules/m1-timetable/timetable.service.js';
import { prisma } from '#config/prisma.js';

const QUEUE_NAME = 'timetable_generate_queue';

let _worker = null;

/**
 * Process a timetable generation job.
 *
 * Job data: { schoolId, classIds, options, requestedBy }
 */
const processGenerateJob = async (job) => {
  const { schoolId, classIds, options = {}, requestedBy } = job.data;

  logger.info(
    { jobId: job.id, schoolId, classCount: classIds.length },
    '[generate.worker] Starting'
  );

  // Update progress
  await job.updateProgress(0);

  const result = await generateTimetable(schoolId, {
    ...options,
    classIds,
    autoSave: true,
    onProgress: async ({ percent, message }) => {
      await job.updateProgress(percent);
      await job.log(`[${percent}%] ${message}`);
    },
  });

  if (result.success) {
    // Save to database
    await job.updateProgress(100);
    await job.log(`Complete! Score: ${result.score?.total}/100`);

    // Notify requesting admin
    if (requestedBy) {
      await prisma.notification.create({
        data: {
          schoolUserId: requestedBy,
          type: 'TIMETABLE_GENERATED',
          title: 'Timetable Generated',
          body: `Timetable for ${classIds.length} classes generated. Score: ${result.score?.total}/100`,
          channel: 'IN_APP',
          status: 'PENDING',
          data: { schoolId, classCount: classIds.length, score: result.score },
        },
      });
    }

    logger.info({ jobId: job.id, score: result.score?.total }, '[generate.worker] Complete');
    return result;
  } else {
    await job.log(`Failed: ${result.error}`);

    if (requestedBy) {
      await prisma.notification.create({
        data: {
          schoolUserId: requestedBy,
          type: 'TIMETABLE_FAILED',
          title: 'Timetable Generation Failed',
          body: result.error,
          channel: 'IN_APP',
          status: 'PENDING',
        },
      });
    }

    throw new Error(result.error);
  }
};

export const startGenerateWorker = () => {
  if (_worker) return _worker;

  _worker = new Worker(QUEUE_NAME, processGenerateJob, {
    connection: getQueueConnection(),
    concurrency: 2, // Only 2 simultaneous generations
    stalledInterval: 120_000, // 2 min stalled check
    maxStalledCount: 1,
    lockDuration: 120_000, // 2 min lock
  });

  _worker.on('completed', (job) => {
    logger.info({ jobId: job.id }, '[generate.worker] Job completed');
  });

  _worker.on('failed', (job, error) => {
    logger.error({ jobId: job?.id, err: error.message }, '[generate.worker] Job failed');
  });

  _worker.on('progress', (job, progress) => {
    logger.debug({ jobId: job.id, progress }, '[generate.worker] Progress');
  });

  logger.info({ queue: QUEUE_NAME, concurrency: 2 }, '[generate.worker] Started');
  return _worker;
};

export const stopGenerateWorker = async () => {
  if (_worker) {
    await _worker.close();
    _worker = null;
    logger.info('[generate.worker] Stopped');
  }
};
