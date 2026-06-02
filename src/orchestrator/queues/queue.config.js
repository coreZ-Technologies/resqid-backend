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

// =============================================================================
// QUEUE FACTORY
// =============================================================================

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
// EMERGENCY QUEUE
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

// =============================================================================
// NOTIFICATION QUEUE
// =============================================================================

export const notificationsQueue = makeQueue(QUEUE_NAMES.NOTIFICATIONS, {
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
    priority: 5,
    removeOnComplete: { age: 86400, count: 1000 },
    removeOnFail: { age: 604800, count: 5000 },
  },
});

// =============================================================================
// ATTENDANCE QUEUE
// =============================================================================

export const attendanceBulkQueue = makeQueue(QUEUE_NAMES.ATTENDANCE_BULK, {
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    priority: 3,
    removeOnComplete: { age: 86400, count: 500 },
    removeOnFail: { age: 604800, count: 2000 },
  },
});

// =============================================================================
// TIMETABLE QUEUES
// =============================================================================

/** Generate — long running, no retry */
export const generateQueue = makeQueue(QUEUE_NAMES.TIMETABLE_GENERATE, {
  defaultJobOptions: {
    attempts: 1,
    backoff: { type: 'exponential', delay: 5000 },
    timeout: 300000,
    priority: 5,
    removeOnComplete: { age: 86400, count: 50 },
    removeOnFail: { age: 604800, count: 200 },
  },
});

/** Crisis/Substitute — highest priority */
export const crisisQueue = makeQueue(QUEUE_NAMES.CRISIS_HANDLING, {
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'fixed', delay: 5000 },
    timeout: 120000,
    priority: 1,
    removeOnComplete: { age: 86400, count: 500 },
    removeOnFail: { age: 604800, count: 1000 },
  },
});

/** Validate — single attempt */
export const validateQueue = makeQueue(QUEUE_NAMES.TIMETABLE_VALIDATE, {
  defaultJobOptions: {
    attempts: 1,
    backoff: { type: 'fixed', delay: 3000 },
    timeout: 60000,
    priority: 4,
    removeOnComplete: { age: 86400, count: 100 },
    removeOnFail: { age: 604800, count: 500 },
  },
});

/** Swap/Reassign */
export const swapQueue = makeQueue(QUEUE_NAMES.TIMETABLE_SWAP, {
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
    timeout: 30000,
    priority: 3,
    removeOnComplete: { age: 86400, count: 100 },
    removeOnFail: { age: 604800, count: 500 },
  },
});

/** Bulk upload processing */
export const bulkUploadQueue = makeQueue(QUEUE_NAMES.TIMETABLE_BULK_UPLOAD, {
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 10000 },
    timeout: 300000,
    priority: 8,
    removeOnComplete: { age: 86400, count: 50 },
    removeOnFail: { age: 604800, count: 200 },
  },
});

// =============================================================================
// PIPELINE QUEUE (Local only)
// =============================================================================

export const pipelineJobsQueue =
  ENV.ENABLE_PIPELINE_QUEUE === 'true'
    ? makeQueue(QUEUE_NAMES.PIPELINE_JOBS, {
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          timeout: 600000,
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
  [QUEUE_NAMES.CRISIS_HANDLING]: crisisQueue,
  [QUEUE_NAMES.TIMETABLE_VALIDATE]: validateQueue,
  [QUEUE_NAMES.TIMETABLE_SWAP]: swapQueue,
  [QUEUE_NAMES.TIMETABLE_BULK_UPLOAD]: bulkUploadQueue,
  ...(pipelineJobsQueue ? { [QUEUE_NAMES.PIPELINE_JOBS]: pipelineJobsQueue } : {}),
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

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
    try {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
        queue.getDelayedCount(),
      ]);
      metrics[name] = { waiting, active, completed, failed, delayed };
    } catch (err) {
      metrics[name] = { error: err.message };
    }
  }
  return metrics;
};

// =============================================================================
// ENQUEUE HELPERS
// =============================================================================

export const enqueueGenerate = async (data) => {
  const { jobId, templateId, schoolId, opts = {} } = data;
  return generateQueue.add(
    QUEUE_NAMES.TIMETABLE_GENERATE,
    { templateId, schoolId, opts },
    {
      jobId: jobId || `generate-${schoolId}-${Date.now()}`,
      priority: opts.priority || 5,
    }
  );
};

export const enqueueCrisis = async (data) => {
  const { jobId, schoolId, type, payload, crisisEventId } = data;
  return crisisQueue.add(
    QUEUE_NAMES.CRISIS_HANDLING,
    { schoolId, type, payload, crisisEventId },
    {
      jobId: jobId || `crisis-${schoolId}-${Date.now()}`,
      priority: 1,
    }
  );
};

export const enqueueValidate = async (data) => {
  const { jobId, timetableId, schoolId } = data;
  return validateQueue.add(
    QUEUE_NAMES.TIMETABLE_VALIDATE,
    { timetableId, schoolId },
    {
      jobId: jobId || `validate-${timetableId}-${Date.now()}`,
      priority: 4,
    }
  );
};

export const enqueueBulkUpload = async (data) => {
  const { jobId, schoolId, uploadType, filePath } = data;
  return bulkUploadQueue.add(
    QUEUE_NAMES.TIMETABLE_BULK_UPLOAD,
    { schoolId, uploadType, filePath },
    {
      jobId: jobId || `bulk-upload-${schoolId}-${Date.now()}`,
      priority: 8,
    }
  );
};
