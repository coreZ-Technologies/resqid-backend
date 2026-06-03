// orchestrator/events/event.publisher.js — RESQID
// publish(event) — validates shape, stamps id + createdAt, enqueues to
// the correct BullMQ queue based on event type.

import { randomUUID } from 'crypto';
import { EVENTS, ACTOR_TYPES } from './event.types.js';
import {
  emergencyAlertsQueue,
  notificationsQueue,
  crisisQueue,
  generateQueue,
  validateQueue,
  swapQueue,
  bulkUploadQueue,
} from '../queues/queue.config.js';
import { logger } from '#config/logger.js';

// EVENT → QUEUE ROUTING

const EMERGENCY_EVENTS = new Set([
  EVENTS.EMERGENCY_ALERT_TRIGGERED,
  EVENTS.EMERGENCY_ALERT_ESCALATED,
  EVENTS.EMERGENCY_ALERT_FAILED,
  EVENTS.EMERGENCY_ALERT_DELIVERED,
]);

const CRISIS_EVENTS = new Set([
  EVENTS.CRISIS_TRIGGERED,
  EVENTS.CRISIS_RESOLVED,
  EVENTS.CRISIS_FAILED,
  EVENTS.TEACHER_ABSENT_DETECTED,
  EVENTS.ROOM_UNAVAILABLE_DETECTED,
]);

const TIMETABLE_GENERATE_EVENTS = new Set([
  EVENTS.TIMETABLE_GENERATE_STARTED,
  EVENTS.TIMETABLE_GENERATE_PROGRESS,
  EVENTS.TIMETABLE_GENERATE_COMPLETED,
  EVENTS.TIMETABLE_GENERATE_FAILED,
]);

const TIMETABLE_VALIDATE_EVENTS = new Set([
  EVENTS.TIMETABLE_VALIDATE_STARTED,
  EVENTS.TIMETABLE_VALIDATE_COMPLETED,
  EVENTS.TIMETABLE_VALIDATE_FAILED,
]);

const TIMETABLE_SWAP_EVENTS = new Set([
  EVENTS.TIMETABLE_SWAP_REQUESTED,
  EVENTS.TIMETABLE_SWAP_COMPLETED,
  EVENTS.TIMETABLE_SWAP_FAILED,
]);

const BULK_UPLOAD_EVENTS = new Set([
  EVENTS.BULK_UPLOAD_STARTED,
  EVENTS.BULK_UPLOAD_PROGRESS,
  EVENTS.BULK_UPLOAD_COMPLETED,
  EVENTS.BULK_UPLOAD_FAILED,
]);

/**
 * Route event to the correct queue.
 */
const routeEvent = (type) => {
  if (EMERGENCY_EVENTS.has(type)) return emergencyAlertsQueue;
  if (CRISIS_EVENTS.has(type)) return crisisQueue;
  if (TIMETABLE_GENERATE_EVENTS.has(type)) return generateQueue;
  if (TIMETABLE_VALIDATE_EVENTS.has(type)) return validateQueue;
  if (TIMETABLE_SWAP_EVENTS.has(type)) return swapQueue;
  if (BULK_UPLOAD_EVENTS.has(type)) return bulkUploadQueue;

  // Default: notifications queue
  return notificationsQueue;
};

// JOB OPTIONS PER QUEUE TYPE

const getJobOptions = (type, id, meta = {}) => {
  const jobId = `${type}-${id}`;

  if (EMERGENCY_EVENTS.has(type)) {
    return {
      jobId,
      priority: 1,
      attempts: 5,
      backoff: { type: 'exponential', delay: 1000 },
    };
  }

  if (CRISIS_EVENTS.has(type)) {
    return {
      jobId,
      priority: 1,
      attempts: 2,
      backoff: { type: 'fixed', delay: 5000 },
    };
  }

  if (TIMETABLE_GENERATE_EVENTS.has(type)) {
    return {
      jobId,
      priority: 5,
      attempts: 1,
      backoff: { type: 'exponential', delay: 5000 },
    };
  }

  if (TIMETABLE_VALIDATE_EVENTS.has(type)) {
    return {
      jobId,
      priority: 4,
      attempts: 1,
      backoff: { type: 'fixed', delay: 3000 },
    };
  }

  if (TIMETABLE_SWAP_EVENTS.has(type)) {
    return {
      jobId,
      priority: 3,
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
    };
  }

  if (BULK_UPLOAD_EVENTS.has(type)) {
    return {
      jobId,
      priority: 8,
      attempts: 2,
      backoff: { type: 'exponential', delay: 10000 },
    };
  }

  // Default notification settings
  return {
    jobId,
    priority: 5,
    attempts: 3,
    backoff: { type: 'exponential', delay: 3000 },
  };
};

// SHAPE VALIDATION

const validateEvent = (event) => {
  if (!event || typeof event !== 'object') {
    throw new TypeError('publish: event must be an object');
  }
  if (!event.type) {
    throw new TypeError('publish: event.type is required');
  }
  if (!EVENTS[event.type]) {
    throw new TypeError(`publish: unknown event type "${event.type}"`);
  }
  if (!event.actorId) {
    throw new TypeError('publish: event.actorId is required');
  }
  if (!ACTOR_TYPES.includes(event.actorType)) {
    throw new TypeError(`publish: actorType must be one of: ${ACTOR_TYPES.join(' | ')}`);
  }
};

// PUBLISHER

/**
 * Publish an event to the appropriate queue.
 *
 * @param {Object} event - { type, schoolId, actorId, actorType, payload, meta }
 * @returns {Promise<Job>}
 */
export const publish = async (event) => {
  validateEvent(event);

  const stamped = {
    id: randomUUID(),
    type: event.type,
    schoolId: event.schoolId ?? null,
    actorId: event.actorId,
    actorType: event.actorType,
    payload: event.payload ?? {},
    createdAt: new Date().toISOString(),
    meta: {
      ...event.meta,
      requestId: event.meta?.requestId ?? null,
      source: event.meta?.source ?? 'api',
    },
  };

  const queue = routeEvent(stamped.type);
  const jobOptions = getJobOptions(stamped.type, stamped.id, stamped.meta);

  try {
    const job = await queue.add(stamped.type, stamped, jobOptions);
    logger.info(
      {
        eventId: stamped.id,
        type: stamped.type,
        queue: queue.name,
        jobId: job.id,
        schoolId: stamped.schoolId,
      },
      '[event.publisher] Event published'
    );
    return job;
  } catch (err) {
    logger.error(
      {
        err: err.message,
        type: stamped.type,
        eventId: stamped.id,
      },
      '[event.publisher] Failed to publish event'
    );
    throw err;
  }
};

// CONVENIENCE WRAPPERS

/**
 * Publish an emergency event.
 */
export const publishEmergency = async ({ studentId, schoolId, scannerIp }) => {
  return publish({
    type: EVENTS.EMERGENCY_ALERT_TRIGGERED,
    actorId: scannerIp || 'anonymous',
    actorType: 'EMERGENCY_RESPONDER',
    schoolId,
    payload: { studentId, scannerIp },
    meta: { studentId, source: 'scan' },
  });
};

/**
 * Publish a crisis event (teacher absent, room unavailable).
 */
export const publishCrisis = async ({ type, schoolId, teacherId, roomId, timetableId }) => {
  return publish({
    type: type || EVENTS.CRISIS_TRIGGERED,
    actorId: 'system',
    actorType: 'SYSTEM',
    schoolId,
    payload: { teacherId, roomId, timetableId },
    meta: { source: 'crisis_service' },
  });
};

/**
 * Publish a timetable generation event.
 */
export const publishTimetableGenerate = async ({
  status,
  schoolId,
  templateId,
  timetableId,
  progress,
}) => {
  const eventType =
    {
      started: EVENTS.TIMETABLE_GENERATE_STARTED,
      progress: EVENTS.TIMETABLE_GENERATE_PROGRESS,
      completed: EVENTS.TIMETABLE_GENERATE_COMPLETED,
      failed: EVENTS.TIMETABLE_GENERATE_FAILED,
    }[status] || EVENTS.TIMETABLE_GENERATE_PROGRESS;

  return publish({
    type: eventType,
    actorId: 'system',
    actorType: 'WORKER',
    schoolId,
    payload: { templateId, timetableId, progress },
    meta: { source: 'generate_worker' },
  });
};

/**
 * Publish a timetable validation event.
 */
export const publishTimetableValidate = async ({ status, schoolId, timetableId, score }) => {
  const eventType =
    {
      started: EVENTS.TIMETABLE_VALIDATE_STARTED,
      completed: EVENTS.TIMETABLE_VALIDATE_COMPLETED,
      failed: EVENTS.TIMETABLE_VALIDATE_FAILED,
    }[status] || EVENTS.TIMETABLE_VALIDATE_COMPLETED;

  return publish({
    type: eventType,
    actorId: 'system',
    actorType: 'WORKER',
    schoolId,
    payload: { timetableId, score },
    meta: { source: 'validate_worker' },
  });
};

/**
 * Publish a notification event.
 */
export const publishNotification = async ({ parentId, schoolId, title, body, data = {} }) => {
  return publish({
    type: EVENTS.NOTIFICATION_SENT,
    actorId: 'system',
    actorType: 'SYSTEM',
    schoolId,
    payload: { parentId, title, body, data },
    meta: { studentId: data?.studentId, source: 'notification_service' },
  });
};

/**
 * Publish an anomaly detected event.
 */
export const publishAnomaly = async ({ studentId, schoolId, anomalyType }) => {
  return publish({
    type: EVENTS.ANOMALY_DETECTED,
    actorId: 'system',
    actorType: 'SYSTEM',
    schoolId,
    payload: { studentId, anomalyType },
    meta: { studentId, source: 'anomaly_evaluator' },
  });
};

/**
 * Publish a worker failure event.
 */
export const publishWorkerFailure = async (jobType, queueName, error) => {
  return publish({
    type: EVENTS.WORKER_JOB_FAILED,
    actorId: 'system',
    actorType: 'WORKER',
    payload: {
      jobType,
      queueName,
      error: error?.message ?? String(error),
    },
    meta: { source: 'worker' },
  });
};
