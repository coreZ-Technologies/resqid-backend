// orchestrator/registry/attendance.registry.js — RESQID
//
// Attendance event types that trigger notifications.

export const ATTENDANCE_EVENTS = {
  TAP_IN: {
    event: 'attendance.tap_in',
    notificationType: 'attendance.tap_in',
    description: 'RFID card scanned at entry gate',
    triggersNotification: true,
  },
  TAP_OUT: {
    event: 'attendance.tap_out',
    notificationType: 'attendance.tap_out',
    description: 'RFID card scanned at exit gate',
    triggersNotification: true,
  },
  MARKED_MANUALLY: {
    event: 'attendance.marked_manually',
    notificationType: 'attendance.absent',
    description: 'Teacher manually marked attendance',
    triggersNotification: true,
  },
  BULK_MARKED: {
    event: 'attendance.bulk_marked',
    notificationType: 'attendance.bulk_marked',
    description: 'Bulk attendance processing completed',
    triggersNotification: true,
  },
  AUTO_ABSENT: {
    event: 'attendance.auto_absent',
    notificationType: 'attendance.absent',
    description: 'System auto-marked student as absent',
    triggersNotification: true,
  },
  DAILY_SUMMARY: {
    event: 'attendance.daily_summary',
    notificationType: 'attendance.daily_summary',
    description: 'Daily attendance summary generated',
    triggersNotification: true,
  },
};
