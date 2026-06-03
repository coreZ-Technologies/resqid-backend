// orchestrator/queues/queue.names.js — RESQID
//
// Production queues:
//   emergency_queue              → EmergencyWorker
//   notification_queue           → NotificationWorker
//   attendance_bulk_queue        → AttendanceWorker
//   timetable_generate_queue     → GenerateWorker
//   crisis_handling_queue        → CrisisWorker (substitutions)
//   timetable_validate_queue     → ValidateWorker
//   timetable_swap_queue         → SwapWorker
//   timetable_bulk_upload_queue  → BulkUploadWorker
//
// Local-only:
//   pipeline_queue               → PipelineWorker

export const QUEUE_NAMES = Object.freeze({
  // Core queues
  EMERGENCY_ALERTS: 'emergency_queue',
  NOTIFICATIONS: 'notification_queue',
  ATTENDANCE_BULK: 'attendance_bulk_queue',

  // Timetable queues
  TIMETABLE_GENERATE: 'timetable_generate_queue',
  CRISIS_HANDLING: 'crisis_handling_queue',
  TIMETABLE_VALIDATE: 'timetable_validate_queue',
  TIMETABLE_SWAP: 'timetable_swap_queue',
  TIMETABLE_BULK_UPLOAD: 'timetable_bulk_upload_queue',

  // Pipeline (local only)
  PIPELINE_JOBS: 'pipeline_queue',
});

// PRIORITY MAPPING (1 = highest)

export const QUEUE_PRIORITIES = {
  [QUEUE_NAMES.EMERGENCY_ALERTS]: 1,
  [QUEUE_NAMES.CRISIS_HANDLING]: 1, // Same as emergency
  [QUEUE_NAMES.TIMETABLE_SWAP]: 3,
  [QUEUE_NAMES.ATTENDANCE_BULK]: 3,
  [QUEUE_NAMES.TIMETABLE_VALIDATE]: 4,
  [QUEUE_NAMES.NOTIFICATIONS]: 5,
  [QUEUE_NAMES.TIMETABLE_GENERATE]: 5,
  [QUEUE_NAMES.TIMETABLE_BULK_UPLOAD]: 8,
  [QUEUE_NAMES.PIPELINE_JOBS]: 10,
};

// SLA TARGETS (milliseconds)

export const QUEUE_SLA_MS = {
  [QUEUE_NAMES.EMERGENCY_ALERTS]: 8000, // 8 seconds
  [QUEUE_NAMES.CRISIS_HANDLING]: 15000, // 15 seconds
  [QUEUE_NAMES.TIMETABLE_SWAP]: 15000, // 15 seconds
  [QUEUE_NAMES.NOTIFICATIONS]: 15000, // 15 seconds
  [QUEUE_NAMES.TIMETABLE_VALIDATE]: 30000, // 30 seconds
  [QUEUE_NAMES.ATTENDANCE_BULK]: 30000, // 30 seconds
  [QUEUE_NAMES.TIMETABLE_BULK_UPLOAD]: 60000, // 1 minute
  [QUEUE_NAMES.TIMETABLE_GENERATE]: 120000, // 2 minutes
  [QUEUE_NAMES.PIPELINE_JOBS]: 600000, // 10 minutes
};

// QUEUE GROUPS (for monitoring)

export const QUEUE_GROUPS = {
  CRITICAL: [QUEUE_NAMES.EMERGENCY_ALERTS, QUEUE_NAMES.CRISIS_HANDLING],
  HIGH: [QUEUE_NAMES.TIMETABLE_SWAP, QUEUE_NAMES.ATTENDANCE_BULK],
  MEDIUM: [QUEUE_NAMES.TIMETABLE_VALIDATE, QUEUE_NAMES.NOTIFICATIONS],
  LOW: [QUEUE_NAMES.TIMETABLE_GENERATE, QUEUE_NAMES.TIMETABLE_BULK_UPLOAD],
  BACKGROUND: [QUEUE_NAMES.PIPELINE_JOBS],
};

// QUEUE DESCRIPTIONS (for UI/dashboard)

export const QUEUE_DESCRIPTIONS = {
  [QUEUE_NAMES.EMERGENCY_ALERTS]: 'Emergency alerts and critical notifications',
  [QUEUE_NAMES.CRISIS_HANDLING]: 'Teacher substitution and crisis management',
  [QUEUE_NAMES.TIMETABLE_SWAP]: 'Manual timetable slot swaps and reassignments',
  [QUEUE_NAMES.ATTENDANCE_BULK]: 'Bulk attendance processing from RFID/scans',
  [QUEUE_NAMES.TIMETABLE_VALIDATE]: 'Timetable validation and scoring',
  [QUEUE_NAMES.NOTIFICATIONS]: 'General notifications (SMS, Email, Push)',
  [QUEUE_NAMES.TIMETABLE_GENERATE]: 'Timetable generation (full or class-by-class)',
  [QUEUE_NAMES.TIMETABLE_BULK_UPLOAD]: 'Bulk Excel/CSV data upload processing',
  [QUEUE_NAMES.PIPELINE_JOBS]: 'ID card printing and delivery pipeline',
};

// QUEUE CONCURRENCY (max parallel jobs)

export const QUEUE_CONCURRENCY = {
  [QUEUE_NAMES.EMERGENCY_ALERTS]: 10,
  [QUEUE_NAMES.CRISIS_HANDLING]: 5,
  [QUEUE_NAMES.TIMETABLE_SWAP]: 3,
  [QUEUE_NAMES.ATTENDANCE_BULK]: 5,
  [QUEUE_NAMES.TIMETABLE_VALIDATE]: 3,
  [QUEUE_NAMES.NOTIFICATIONS]: 10,
  [QUEUE_NAMES.TIMETABLE_GENERATE]: 2, // CPU-intensive, limit concurrency
  [QUEUE_NAMES.TIMETABLE_BULK_UPLOAD]: 2,
  [QUEUE_NAMES.PIPELINE_JOBS]: 1,
};
