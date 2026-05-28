// =============================================================================
// orchestrator/index.js — RESQID
// Clean re-export of everything external code needs from the orchestrator.
// =============================================================================

// ── Events ────────────────────────────────────────────────────────────────────
export { EVENTS, ACTOR_TYPES, getEventQueue } from './events/event.types.js';
export {
  publish,
  publishEmergency,
  publishNotification,
  publishAnomaly,
} from './events/event.publisher.js';
export { consume, dispatch as dispatchEvent, hasHandlers } from './events/event.consumer.js';

// ── Queues ────────────────────────────────────────────────────────────────────
export { QUEUE_NAMES } from './queues/queue.names.js';
export {
  emergencyAlertsQueue,
  notificationsQueue,
  attendanceBulkQueue,
  closeAllQueues,
  getAllQueueMetrics,
} from './queues/queue.config.js';
export { initQueues, getQueue, getQueueHealth, cleanOldJobs } from './queues/queue.manager.js';

// ── Workers ───────────────────────────────────────────────────────────────────
export { startWorkers } from './workers/index.js';

// ── Scheduler ─────────────────────────────────────────────────────────────────
export { startScheduler, stopScheduler, triggerJob } from './jobs/scheduler.service.js';

// ── DLQ ───────────────────────────────────────────────────────────────────────
export { handleDeadJob, flushDlqSlackBatch } from './dlq/dlq.handler.js';

// ── Policies ─────────────────────────────────────────────────────────────────
export { notifySlack, ESCALATION_RULES } from './policies/escalation.policy.js';
export { RETRY_POLICIES, getRetryPolicy } from './policies/retry.policy.js';

// ── Notifications ─────────────────────────────────────────────────────────────
export { dispatch as dispatchNotification } from './notifications/notification.dispatcher.js';
export { publishNotification as publishTypedNotification } from './notifications/notification.publisher.js';

// ── Services ──────────────────────────────────────────────────────────────────
export {
  claimExecution,
  markCompleted,
  releaseClaim,
  executeOnce,
  acquireLock,
  releaseLock,
} from './services/idempotency.service.js';
export {
  shouldRetry,
  calcBackoffDelay,
  sendToDLQ,
  handleWorkerFailure,
} from './services/retry.service.js';

// ── Constants ─────────────────────────────────────────────────────────────────
export {
  JOB_NAMES,
  REDIS_KEYS,
  RETRY_CONFIG,
  DISTRIBUTED_LOCK_TTL_MS,
  IDEMPOTENCY_TTL_SECONDS,
  WORKER_CONCURRENCY,
  JOB_PRIORITY,
} from './orchestrator.constants.js';
