// =============================================================================
// orchestrator/queues/queue.config.js — RESQID
//
// RAILWAY (24/7): emergency, notification, attendance, timetable
// LOCAL ONLY:    pipeline (when ENABLE_PIPELINE_QUEUE=true)
// =============================================================================

import { Queue } from 'bullmq';
import { getQueueConnection } from './queue.connection.js';
import { QUEUE_NAMES } from './queue.names.js';
import { logger } from '#config/logger.js';
import { ENV } from '#config/env.js';

const makeQueue = (name, customOptions = {}) => {
  const connection = getQueueConnection();

  const defaultOptions = {
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: { age: 86400, count: 1000 },
      removeOnFail: { age: 604800, count: 5000 },
    },
    connection,
  };

  const queue = new Queue(name, {
    ...defaultOptions,
    ...customOptions,
    defaultJobOptions: {
      ...defaultOptions.defaultJobOptions,
      ...(customOptions.defaultJobOptions ?? {}),
    },
  });

  logger.info({ queueName: name }, '[queue.config] Queue initialized');
  return queue;
};

// =============================================================================
// RAILWAY QUEUES — always on
// =============================================================================

export const emergencyAlertsQueue = makeQueue(QUEUE_NAMES.EMERGENCY_ALERTS, {
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 500 },
    priority: 1,
    removeOnComplete: { age: 86400, count: 500 },
    removeOnFail: { age: 604800, count: 2000 },
  },
});

export const notificationsQueue = makeQueue(QUEUE_NAMES.NOTIFICATIONS, {
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
    priority: 5,
    removeOnComplete: { age: 86400, count: 1000 },
    removeOnFail: { age: 604800, count: 5000 },
  },
});

export const attendanceBulkQueue = makeQueue(QUEUE_NAMES.ATTENDANCE_BULK, {
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    priority: 3,
    removeOnComplete: { age: 86400, count: 500 },
    removeOnFail: { age: 604800, count: 2000 },
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// TIMETABLE QUEUES — NEW
// ═══════════════════════════════════════════════════════════════════════════════

export const generateQueue = makeQueue(QUEUE_NAMES.TIMETABLE_GENERATE, {
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 5000 },
    priority: 5,
    removeOnComplete: { age: 86400, count: 50 },
    removeOnFail: { age: 604800, count: 100 },
  },
});

export const substituteQueue = makeQueue(QUEUE_NAMES.TIMETABLE_SUBSTITUTE, {
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'fixed', delay: 5000 },
    priority: 1, // Highest — must run before school starts
    removeOnComplete: { age: 86400, count: 500 },
    removeOnFail: { age: 604800, count: 1000 },
  },
});

export const swapQueue = makeQueue(QUEUE_NAMES.TIMETABLE_SWAP, {
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
    priority: 3,
    removeOnComplete: { age: 86400, count: 100 },
    removeOnFail: { age: 604800, count: 500 },
  },
});

// =============================================================================
// LOCAL-ONLY QUEUE — npm run worker:pipeline
// =============================================================================

export const pipelineJobsQueue =
  ENV.ENABLE_PIPELINE_QUEUE === 'true'
    ? makeQueue(QUEUE_NAMES.PIPELINE_JOBS, {
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          priority: 10,
          removeOnComplete: { age: 86400, count: 500 },
          removeOnFail: { age: 604800, count: 2000 },
        },
      })
    : null;

// =============================================================================
// QUEUE REGISTRY
// =============================================================================

export const allQueues = {
  [QUEUE_NAMES.EMERGENCY_ALERTS]: emergencyAlertsQueue,
  [QUEUE_NAMES.NOTIFICATIONS]: notificationsQueue,
  [QUEUE_NAMES.ATTENDANCE_BULK]: attendanceBulkQueue,
  [QUEUE_NAMES.TIMETABLE_GENERATE]: generateQueue,
  [QUEUE_NAMES.TIMETABLE_SUBSTITUTE]: substituteQueue,
  [QUEUE_NAMES.TIMETABLE_SWAP]: swapQueue,
  ...(pipelineJobsQueue ? { [QUEUE_NAMES.PIPELINE_JOBS]: pipelineJobsQueue } : {}),
};

export const getQueueByName = (name) => {
  const queue = allQueues[name];
  if (!queue) throw new Error(`[queue.config] Queue not found: ${name}`);
  return queue;
};

export const closeAllQueues = async () => {
  for (const [name, queue] of Object.entries(allQueues)) {
    await queue.close();
    logger.info({ queueName: name }, '[queue.config] Queue closed');
  }
};

export const getAllQueueMetrics = async () => {
  const metrics = {};
  for (const [name, queue] of Object.entries(allQueues)) {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);
    metrics[name] = { waiting, active, completed, failed, delayed };
  }
  return metrics;
};
