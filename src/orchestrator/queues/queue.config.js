// orchestrator/queues/queue.config.js — RESQID
//
// All BullMQ queue definitions with default job options and enqueue helpers.

import { Queue } from 'bullmq';
import { getQueueConnection } from './queue.connection.js';
import { QUEUE_NAMES } from './queue.names.js';
import { logger } from '#config/logger.js';

// ── QUEUE FACTORY ──────────────────────────────────────────────────────────

const makeQueue = (name, customOptions = {}) => {
  const connection = getQueueConnection();

  const defaultOptions = {
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: { age: 86400, count: 1000 }, // Keep 1 day
      removeOnFail: { age: 604800, count: 5000 }, // Keep 7 days
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

  logger.info({ queueName: name }, '[queue.config] Queue created');
  return queue;
};

// ── EMERGENCY QUEUE — Priority 1 ──────────────────────────────────────────

export const emergencyAlertsQueue = makeQueue(QUEUE_NAMES.EMERGENCY_ALERTS, {
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 500 },
    priority: 1,
    removeOnComplete: { age: 86400, count: 500 },
    removeOnFail: { age: 604800, count: 2000 },
  },
});

// ── CRISIS QUEUE — Priority 1 ─────────────────────────────────────────────

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

// ── ATTENDANCE QUEUE — Priority 2 ─────────────────────────────────────────

export const attendanceBulkQueue = makeQueue(QUEUE_NAMES.ATTENDANCE_BULK, {
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    priority: 2,
    removeOnComplete: { age: 86400, count: 500 },
    removeOnFail: { age: 604800, count: 2000 },
  },
});

// ── SWAP QUEUE — Priority 2 ───────────────────────────────────────────────

export const swapQueue = makeQueue(QUEUE_NAMES.TIMETABLE_SWAP, {
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
    timeout: 30000,
    priority: 2,
    removeOnComplete: { age: 86400, count: 100 },
    removeOnFail: { age: 604800, count: 500 },
  },
});

// ── NOTIFICATIONS QUEUE — Priority 3 ──────────────────────────────────────

export const notificationsQueue = makeQueue(QUEUE_NAMES.NOTIFICATIONS, {
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
    priority: 3,
    removeOnComplete: { age: 86400, count: 1000 },
    removeOnFail: { age: 604800, count: 5000 },
  },
});

// ── VALIDATE QUEUE — Priority 3 ───────────────────────────────────────────

export const validateQueue = makeQueue(QUEUE_NAMES.TIMETABLE_VALIDATE, {
  defaultJobOptions: {
    attempts: 1,
    backoff: { type: 'fixed', delay: 3000 },
    timeout: 60000,
    priority: 3,
    removeOnComplete: { age: 86400, count: 100 },
    removeOnFail: { age: 604800, count: 500 },
  },
});

// ── BULK UPLOAD QUEUE — Priority 3 ────────────────────────────────────────

export const bulkUploadQueue = makeQueue(QUEUE_NAMES.BULK_UPLOAD, {
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 10000 },
    timeout: 300000,
    priority: 3,
    removeOnComplete: { age: 86400, count: 50 },
    removeOnFail: { age: 604800, count: 200 },
  },
});

// ── TIMETABLE QUEUE — Priority 4 ──────────────────────────────────────────

export const timetableQueue = makeQueue(QUEUE_NAMES.TIMETABLE_GENERATE, {
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 5000 },
    timeout: 300000,
    priority: 4,
    removeOnComplete: { age: 86400, count: 50 },
    removeOnFail: { age: 604800, count: 200 },
  },
});

// ── MAINTENANCE QUEUE — Priority 5 ────────────────────────────────────────

export const maintenanceQueue = makeQueue(QUEUE_NAMES.MAINTENANCE, {
  defaultJobOptions: {
    attempts: 1,
    backoff: { type: 'fixed', delay: 60000 },
    timeout: 600000,
    priority: 5,
    removeOnComplete: { age: 86400, count: 100 },
    removeOnFail: { age: 604800, count: 500 },
  },
});

// ── DLQ — Priority 6 ──────────────────────────────────────────────────────

export const dlqQueue = makeQueue(QUEUE_NAMES.DLQ, {
  defaultJobOptions: {
    attempts: 0,
    removeOnComplete: { age: 2592000, count: 1000 }, // Keep 30 days
    removeOnFail: { age: 2592000, count: 1000 },
  },
});

// ── QUEUE REGISTRY ────────────────────────────────────────────────────────

export const allQueues = {
  [QUEUE_NAMES.EMERGENCY_ALERTS]: emergencyAlertsQueue,
  [QUEUE_NAMES.CRISIS_HANDLING]: crisisQueue,
  [QUEUE_NAMES.ATTENDANCE_BULK]: attendanceBulkQueue,
  [QUEUE_NAMES.TIMETABLE_SWAP]: swapQueue,
  [QUEUE_NAMES.NOTIFICATIONS]: notificationsQueue,
  [QUEUE_NAMES.TIMETABLE_VALIDATE]: validateQueue,
  [QUEUE_NAMES.BULK_UPLOAD]: bulkUploadQueue,
  [QUEUE_NAMES.TIMETABLE_GENERATE]: timetableQueue,
  [QUEUE_NAMES.MAINTENANCE]: maintenanceQueue,
  [QUEUE_NAMES.DLQ]: dlqQueue,
};

// ── UTILITY FUNCTIONS ─────────────────────────────────────────────────────

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

// ── ENQUEUE HELPERS ───────────────────────────────────────────────────────

let _idCounter = 0;
const uid = (prefix) => `${prefix}-${Date.now()}-${++_idCounter}`;

export const enqueueEmergency = async (data) => {
  return emergencyAlertsQueue.add('emergency-alert', data, {
    jobId: uid('emergency'),
    priority: 1,
  });
};

export const enqueueCrisis = async (data) => {
  return crisisQueue.add('crisis-handling', data, {
    jobId: uid('crisis'),
    priority: 1,
  });
};

export const enqueueAttendance = async (data) => {
  return attendanceBulkQueue.add('attendance-bulk', data, {
    jobId: uid('attendance'),
    priority: 2,
  });
};

export const enqueueSwap = async (data) => {
  return swapQueue.add('timetable-swap', data, {
    jobId: uid('swap'),
    priority: 2,
  });
};

export const enqueueNotification = async (data) => {
  return notificationsQueue.add('send-notification', data, {
    jobId: uid('notif'),
    priority: 3,
  });
};

export const enqueueValidate = async (data) => {
  return validateQueue.add('validate-timetable', data, {
    jobId: uid('validate'),
    priority: 3,
  });
};

export const enqueueBulkUpload = async (data) => {
  return bulkUploadQueue.add('bulk-upload', data, {
    jobId: uid('bulk'),
    priority: 3,
  });
};

export const enqueueTimetable = async (data) => {
  return timetableQueue.add('generate-timetable', data, {
    jobId: uid('timetable'),
    priority: 4,
  });
};

export const enqueueMaintenance = async (data) => {
  return maintenanceQueue.add('maintenance-task', data, {
    jobId: uid('maint'),
    priority: 5,
  });
};
