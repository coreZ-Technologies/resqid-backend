// =============================================================================
// orchestrator/orchestrator.constants.js — RESQID
// Shared constants for queues, jobs, Redis keys, retry config.
// =============================================================================

// ─── Queue Names ──────────────────────────────────────────────────────────────

export const QUEUE_NAMES = Object.freeze({
  EMERGENCY_ALERTS: 'emergency_queue',
  NOTIFICATIONS: 'notification_queue',
  ATTENDANCE_BULK: 'attendance_bulk_queue',
  PIPELINE_JOBS: 'pipeline_queue',
});

// ─── Job Names ────────────────────────────────────────────────────────────────

export const JOB_NAMES = Object.freeze({
  // Emergency
  EMERGENCY_TRIGGERED: 'emergency:triggered',
  EMERGENCY_NOTIFY_CONTACTS: 'emergency:notify-contacts',

  // Notification
  NOTIFY_SEND: 'notification:send',
  NOTIFY_BULK: 'notification:bulk',

  // Attendance
  ATTENDANCE_BULK_SYNC: 'attendance:bulk-sync',

  // Background
  CLEANUP_BEHAVIORAL: 'cleanup:behavioral',
  CLEANUP_EXPO_TOKENS: 'cleanup:expo-tokens',
  DLQ_MONITOR: 'dlq:monitor',
  DLQ_RETRY: 'dlq:retry',
});

// ─── Redis Keys ───────────────────────────────────────────────────────────────

export const REDIS_KEYS = {
  IDEMPOTENCY: (jobId, step) => `idempotency:${jobId}:${step}`,
  LOCK: (jobId, step) => `lock:${jobId}:${step}`,
  DLQ_COUNT: (jobId) => `dlq:count:${jobId}`,
  WORKER_HEARTBEAT: (workerName) => `worker:heartbeat:${workerName}`,
};

// ─── Retry Configuration ──────────────────────────────────────────────────────

export const RETRY_CONFIG = Object.freeze({
  MAX_ATTEMPTS: 5,
  BACKOFF_DELAY_MS: 500,
  BACKOFF_MULTIPLIER: 2,
  MAX_BACKOFF_MS: 60_000,
});

// ─── Distributed Lock TTL ─────────────────────────────────────────────────────

export const DISTRIBUTED_LOCK_TTL_MS = 30_000;

// ─── Idempotency TTL ──────────────────────────────────────────────────────────

export const IDEMPOTENCY_TTL_SECONDS = 86_400; // 24 hours

// ─── Worker Concurrency ───────────────────────────────────────────────────────

export const WORKER_CONCURRENCY = Object.freeze({
  EMERGENCY: 10,
  NOTIFICATION: 5,
  ATTENDANCE: 3,
  BACKGROUND: 3,
  DLQ: 1,
});

// ─── Job Priorities ───────────────────────────────────────────────────────────

export const JOB_PRIORITY = Object.freeze({
  CRITICAL: 1,
  HIGH: 2,
  NORMAL: 3,
  LOW: 4,
});
