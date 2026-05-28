// =============================================================================
// orchestrator/queues/queue.names.js — RESQID
//
// Production queues:
//   emergency_queue        → EmergencyWorker (always on)
//   notification_queue     → NotificationWorker (always on)
//   attendance_bulk_queue  → AttendanceWorker (always on)
//
// Local-only (deferred):
//   pipeline_queue         → PipelineWorker (npm run worker:pipeline)
// =============================================================================

export const QUEUE_NAMES = Object.freeze({
  EMERGENCY_ALERTS: 'emergency_queue',
  NOTIFICATIONS: 'notification_queue',
  ATTENDANCE_BULK: 'attendance_bulk_queue',
  PIPELINE_JOBS: 'pipeline_queue',
});

// Priority mapping (1 = highest)
export const QUEUE_PRIORITIES = {
  [QUEUE_NAMES.EMERGENCY_ALERTS]: 1,
  [QUEUE_NAMES.NOTIFICATIONS]: 2,
  [QUEUE_NAMES.ATTENDANCE_BULK]: 3,
  [QUEUE_NAMES.PIPELINE_JOBS]: 4,
};

// SLA targets (milliseconds)
export const QUEUE_SLA_MS = {
  [QUEUE_NAMES.EMERGENCY_ALERTS]: 8000,
  [QUEUE_NAMES.NOTIFICATIONS]: 15000,
  [QUEUE_NAMES.ATTENDANCE_BULK]: 30000,
  [QUEUE_NAMES.PIPELINE_JOBS]: 600000,
};
