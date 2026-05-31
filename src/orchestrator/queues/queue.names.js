// =============================================================================
// orchestrator/queues/queue.names.js — RESQID
//
// Production queues:
//   emergency_queue           → EmergencyWorker
//   notification_queue        → NotificationWorker
//   attendance_bulk_queue     → AttendanceWorker
//   timetable_generate_queue  → GenerateWorker
//   timetable_substitute_queue → SubstituteWorker
//   timetable_swap_queue      → SwapWorker
//
// Local-only:
//   pipeline_queue            → PipelineWorker
// =============================================================================

export const QUEUE_NAMES = Object.freeze({
  EMERGENCY_ALERTS: 'emergency_queue',
  NOTIFICATIONS: 'notification_queue',
  ATTENDANCE_BULK: 'attendance_bulk_queue',
  TIMETABLE_GENERATE: 'timetable_generate_queue',
  TIMETABLE_SUBSTITUTE: 'timetable_substitute_queue',
  TIMETABLE_SWAP: 'timetable_swap_queue',
  PIPELINE_JOBS: 'pipeline_queue',
});

// Priority mapping (1 = highest)
export const QUEUE_PRIORITIES = {
  [QUEUE_NAMES.EMERGENCY_ALERTS]: 1,
  [QUEUE_NAMES.TIMETABLE_SUBSTITUTE]: 2,
  [QUEUE_NAMES.NOTIFICATIONS]: 3,
  [QUEUE_NAMES.ATTENDANCE_BULK]: 4,
  [QUEUE_NAMES.TIMETABLE_SWAP]: 5,
  [QUEUE_NAMES.TIMETABLE_GENERATE]: 6,
  [QUEUE_NAMES.PIPELINE_JOBS]: 7,
};

// SLA targets (milliseconds)
export const QUEUE_SLA_MS = {
  [QUEUE_NAMES.EMERGENCY_ALERTS]: 8000,
  [QUEUE_NAMES.TIMETABLE_SUBSTITUTE]: 15000,
  [QUEUE_NAMES.NOTIFICATIONS]: 15000,
  [QUEUE_NAMES.ATTENDANCE_BULK]: 30000,
  [QUEUE_NAMES.TIMETABLE_SWAP]: 30000,
  [QUEUE_NAMES.TIMETABLE_GENERATE]: 60000,
  [QUEUE_NAMES.PIPELINE_JOBS]: 600000,
};
