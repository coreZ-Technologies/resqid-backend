// =============================================================================
// orchestrator/index.js — RESQID
// Clean re-export of everything external code needs from the orchestrator.
// No event system — modules call notification.service.js directly.
// =============================================================================

// ── Queues ────────────────────────────────────────────────────────────────────
export { QUEUE_NAMES } from './queues/queue.names.js';
export {
  emergencyAlertsQueue,
  notificationsQueue,
  attendanceBulkQueue,
  closeAllQueues,
  getAllQueueMetrics,
  enqueueEmergency,
  enqueueNotification,
  enqueueAttendance,
  enqueueTimetable,
  enqueueCrisis,
  enqueueValidate,
  enqueueSwap,
  enqueueBulkUpload,
  enqueueMaintenance,
} from './queues/queue.config.js';
export {
  initQueues,
  getQueue,
  getQueueHealth,
  cleanOldJobs,
  pauseAllQueues,
  resumeAllQueues,
  getPendingCount,
  drainDeadJob,
  retryJob,
} from './queues/queue.manager.js';

// ── Workers ───────────────────────────────────────────────────────────────────
export { startWorkers } from './workers/index.js';
export { startEmergencyWorker, stopEmergencyWorker } from './workers/emergency.worker.js';
export { startNotificationWorker, stopNotificationWorker } from './workers/notification.worker.js';

// ── Scheduler ─────────────────────────────────────────────────────────────────
export { startScheduler, stopScheduler, triggerJob } from './jobs/scheduler.service.js';

// ── DLQ ───────────────────────────────────────────────────────────────────────
export {
  handleDeadJob,
  flushDlqSlackBatch,
  resolveDlqEntry,
  getDlqStats,
} from './dlq/dlq.handler.js';

// ── Policies ─────────────────────────────────────────────────────────────────
export { notifySlack, ESCALATION_RULES } from './policies/escalation.policy.js';
export { RETRY_POLICIES, getRetryPolicy, getDefaultJobOptions } from './policies/retry.policy.js';
export {
  checkSchoolRateLimit,
  checkChannelRateLimit,
  checkUserRateLimit,
  checkBulkRateLimit,
  checkOtpRateLimit,
  checkAllRateLimits,
  getRateLimitStatus,
  resetRateLimits,
} from './policies/rate-limit.policy.js';

// ── Notification Channels ─────────────────────────────────────────────────────
export { sendPushNotificationChannel, sendPushToDevice } from './notifications/channel/push.js';
export {
  sendSmsNotification,
  sendOtpSms,
  verifyOtpSms,
  sendBulkSms,
} from './notifications/channel/sms.js';
export { sendEmailNotification, sendEmailWithTemplate } from './notifications/channel/email.js';
export { sendWhatsAppNotification } from './notifications/channel/whatsapp.js';
export {
  sendEmergencyAlert,
  sendEmergencyPush,
  sendEmergencySms,
} from './notifications/channel/emergency.js';

// ── Notification Templates ────────────────────────────────────────────────────
export {
  emailTemplates,
  smsTemplates,
  pushTemplates,
  getEmailTemplate,
  getSmsTemplate,
  getPushTemplate,
} from './notifications/notification.templates.js';

// ── Registry ──────────────────────────────────────────────────────────────────
export {
  ALL_NOTIFICATIONS,
  PRIORITY_WEIGHTS,
  CHANNEL_CONFIG,
  ATTENDANCE_NOTIFICATIONS,
  EMERGENCY_NOTIFICATIONS,
  COMMUNICATION_NOTIFICATIONS,
  TIMETABLE_NOTIFICATIONS,
  SYSTEM_NOTIFICATIONS,
  CARD_NOTIFICATIONS,
} from './registry/index.js';

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
