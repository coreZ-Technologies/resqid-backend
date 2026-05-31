// =============================================================================
// orchestrator/workers/substitute.worker.js — RESQID
// BullMQ worker: runs daily REPLACE for absent teachers.
// Fired by daily.cron.js 30 minutes before school starts.
// =============================================================================

import { Worker } from 'bullmq';
import { getQueueConnection } from '../queues/queue.connection.js';
import { logger } from '#config/logger.js';
import { prisma } from '#config/prisma.js';
import { executeCrisisStrategy } from '#modules/m1-timetable/crisis/crisis.service.js';

const QUEUE_NAME = 'timetable_substitute_queue';

let _worker = null;

/**
 * Process daily substitution job.
 *
 * Job data: { schoolId, date }
 */
const processSubstituteJob = async (job) => {
  const { schoolId, date } = job.data;

  logger.info({ jobId: job.id, schoolId, date }, '[substitute.worker] Starting daily REPLACE');

  // 1. Detect crisis level
  const crisis = await executeCrisisStrategy(schoolId);

  if (!crisis.executed) {
    logger.info({ schoolId }, '[substitute.worker] No crisis — normal day');
    return { status: 'NORMAL', ...crisis };
  }

  // 2. Log results
  await job.log(`Crisis Level ${crisis.level}: ${crisis.reason}`);
  for (const action of crisis.actions) {
    await job.log(action);
  }

  logger.info(
    { schoolId, level: crisis.level, actions: crisis.actions.length },
    '[substitute.worker] REPLACE complete'
  );

  return crisis;
};

export const startSubstituteWorker = () => {
  if (_worker) return _worker;

  _worker = new Worker(QUEUE_NAME, processSubstituteJob, {
    connection: getQueueConnection(),
    concurrency: 5,
    stalledInterval: 60_000,
    maxStalledCount: 1,
    lockDuration: 30_000,
  });

  _worker.on('completed', (job) => {
    logger.info({ jobId: job.id }, '[substitute.worker] Completed');
  });

  _worker.on('failed', (job, error) => {
    logger.error({ jobId: job?.id, err: error.message }, '[substitute.worker] Failed');
  });

  logger.info({ queue: QUEUE_NAME, concurrency: 5 }, '[substitute.worker] Started');
  return _worker;
};

export const stopSubstituteWorker = async () => {
  if (_worker) {
    await _worker.close();
    _worker = null;
    logger.info('[substitute.worker] Stopped');
  }
};
