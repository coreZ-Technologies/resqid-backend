// orchestrator/queues/queue.names.js RESQID

export const QUEUE_NAMES = Object.freeze({
  // Priority 1 Critical (processed first)
  EMERGENCY_ALERTS: 'resqid-emergency',
  CRISIS_HANDLING: 'resqid-crisis',

  // Priority 2 High
  ATTENDANCE_BULK: 'resqid-attendance',
  TIMETABLE_SWAP: 'resqid-swap',

  // Priority 3 Normal
  NOTIFICATIONS: 'resqid-notifications',
  TIMETABLE_VALIDATE: 'resqid-validate',
  BULK_UPLOAD: 'resqid-bulk-upload',

  // Priority 4 Low
  TIMETABLE_GENERATE: 'resqid-timetable',

  // Priority 5 Background
  MAINTENANCE: 'resqid-maintenance',

  // Dead Letter Queue
  DLQ: 'resqid-dlq',
});

export const QUEUE_PRIORITIES = {
  [QUEUE_NAMES.EMERGENCY_ALERTS]: 1,
  [QUEUE_NAMES.CRISIS_HANDLING]: 1,
  [QUEUE_NAMES.TIMETABLE_SWAP]: 2,
  [QUEUE_NAMES.ATTENDANCE_BULK]: 2,
  [QUEUE_NAMES.TIMETABLE_VALIDATE]: 3,
  [QUEUE_NAMES.NOTIFICATIONS]: 3,
  [QUEUE_NAMES.BULK_UPLOAD]: 3, // ← NEW
  [QUEUE_NAMES.TIMETABLE_GENERATE]: 4,
  [QUEUE_NAMES.MAINTENANCE]: 5,
  [QUEUE_NAMES.DLQ]: 6,
};

export const QUEUE_SLA_MS = {
  [QUEUE_NAMES.EMERGENCY_ALERTS]: 8000,
  [QUEUE_NAMES.CRISIS_HANDLING]: 15000,
  [QUEUE_NAMES.TIMETABLE_SWAP]: 15000,
  [QUEUE_NAMES.NOTIFICATIONS]: 15000,
  [QUEUE_NAMES.TIMETABLE_VALIDATE]: 30000,
  [QUEUE_NAMES.ATTENDANCE_BULK]: 30000,
  [QUEUE_NAMES.BULK_UPLOAD]: 60000, // ← NEW 1 minute for large CSVs
  [QUEUE_NAMES.TIMETABLE_GENERATE]: 120000,
  [QUEUE_NAMES.MAINTENANCE]: 300000,
  [QUEUE_NAMES.DLQ]: 600000,
};

export const QUEUE_GROUPS = {
  CRITICAL: [QUEUE_NAMES.EMERGENCY_ALERTS, QUEUE_NAMES.CRISIS_HANDLING],
  HIGH: [QUEUE_NAMES.TIMETABLE_SWAP, QUEUE_NAMES.ATTENDANCE_BULK],
  MEDIUM: [QUEUE_NAMES.TIMETABLE_VALIDATE, QUEUE_NAMES.NOTIFICATIONS, QUEUE_NAMES.BULK_UPLOAD],
  LOW: [QUEUE_NAMES.TIMETABLE_GENERATE],
  BACKGROUND: [QUEUE_NAMES.MAINTENANCE, QUEUE_NAMES.DLQ],
};

export const QUEUE_DESCRIPTIONS = {
  [QUEUE_NAMES.EMERGENCY_ALERTS]: 'Emergency alerts bypasses quiet hours, all channels',
  [QUEUE_NAMES.CRISIS_HANDLING]: 'Teacher substitution, mass timetable changes, wellness leave',
  [QUEUE_NAMES.TIMETABLE_SWAP]: 'Manual timetable slot swaps with conflict validation',
  [QUEUE_NAMES.ATTENDANCE_BULK]: 'Bulk attendance from RFID taps, batch marking, auto-absent',
  [QUEUE_NAMES.TIMETABLE_VALIDATE]: 'Timetable CSV validation teacher conflicts, room clashes',
  [QUEUE_NAMES.NOTIFICATIONS]: 'General notifications announcements, messages, fee reminders',
  [QUEUE_NAMES.BULK_UPLOAD]: 'CSV/Excel imports students, teachers, subjects, classes', // ← NEW
  [QUEUE_NAMES.TIMETABLE_GENERATE]: 'Full timetable generation using CSP/backtracking',
  [QUEUE_NAMES.MAINTENANCE]: 'Daily cron token cleanup, health checks, report generation',
  [QUEUE_NAMES.DLQ]: 'Failed jobs after max retries manual review needed',
};

export const QUEUE_CONCURRENCY = {
  [QUEUE_NAMES.EMERGENCY_ALERTS]: 10,
  [QUEUE_NAMES.CRISIS_HANDLING]: 5,
  [QUEUE_NAMES.TIMETABLE_SWAP]: 3,
  [QUEUE_NAMES.ATTENDANCE_BULK]: 5,
  [QUEUE_NAMES.TIMETABLE_VALIDATE]: 3,
  [QUEUE_NAMES.NOTIFICATIONS]: 10,
  [QUEUE_NAMES.BULK_UPLOAD]: 3, // ← NEW moderate concurrency
  [QUEUE_NAMES.TIMETABLE_GENERATE]: 2,
  [QUEUE_NAMES.MAINTENANCE]: 1,
  [QUEUE_NAMES.DLQ]: 1,
};
