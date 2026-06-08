// orchestrator/registry/notification.registry.js — RESQID
//
// Single source of truth for ALL notification types in the system.
// Every notification sent through the platform is defined here.
// Used by the dispatcher to route to correct queues + channels.

const NOTIFICATION_TYPES = Object.freeze({
  // ═══════════════════════════════════════════════════════════════════════
  // ATTENDANCE
  // ═══════════════════════════════════════════════════════════════════════
  ATTENDANCE_TAP_IN: {
    id: 'attendance.tap_in',
    label: 'Student Tap-In',
    description: 'Student RFID card scanned at gate — entering school',
    priority: 'normal',
    channels: ['push', 'sms'],
    template: 'attendance-tap-in',
    category: 'attendance',
    target: 'parent',
    retry: { attempts: 3, backoff: 'exponential', delay: 1000 },
  },
  ATTENDANCE_TAP_OUT: {
    id: 'attendance.tap_out',
    label: 'Student Tap-Out',
    description: 'Student RFID card scanned at gate — leaving school',
    priority: 'normal',
    channels: ['push'],
    template: 'attendance-tap-out',
    category: 'attendance',
    target: 'parent',
    retry: { attempts: 2, backoff: 'exponential', delay: 1000 },
  },
  ATTENDANCE_ABSENT: {
    id: 'attendance.absent',
    label: 'Student Absent',
    description: 'Student did not tap in by cutoff time',
    priority: 'normal',
    channels: ['push', 'sms'],
    template: 'attendance-absent',
    category: 'attendance',
    target: 'parent',
    retry: { attempts: 3, backoff: 'exponential', delay: 2000 },
  },
  ATTENDANCE_LATE: {
    id: 'attendance.late',
    label: 'Student Late',
    description: 'Student tapped in after late cutoff time',
    priority: 'normal',
    channels: ['push'],
    template: 'attendance-late',
    category: 'attendance',
    target: 'parent',
    retry: { attempts: 2, backoff: 'exponential', delay: 1000 },
  },
  ATTENDANCE_DAILY_SUMMARY: {
    id: 'attendance.daily_summary',
    label: 'Daily Attendance Summary',
    description: 'End-of-day attendance report for parent',
    priority: 'low',
    channels: ['push', 'email'],
    template: 'attendance-daily-summary',
    category: 'attendance',
    target: 'parent',
    retry: { attempts: 2, backoff: 'fixed', delay: 5000 },
  },
  ATTENDANCE_BULK_MARKED: {
    id: 'attendance.bulk_marked',
    label: 'Bulk Attendance Completed',
    description: 'Admin completed bulk attendance marking',
    priority: 'low',
    channels: ['push'],
    template: 'attendance-bulk-complete',
    category: 'attendance',
    target: 'admin',
    retry: { attempts: 1, backoff: 'fixed', delay: 3000 },
  },

  // ═══════════════════════════════════════════════════════════════════════
  // EMERGENCY
  // ═══════════════════════════════════════════════════════════════════════
  EMERGENCY_QR_SCAN: {
    id: 'emergency.qr_scan',
    label: 'QR Emergency Scan',
    description: 'Someone scanned a student QR code in an emergency',
    priority: 'critical',
    channels: ['push', 'sms', 'email', 'whatsapp'],
    template: 'emergency-qr-scan',
    category: 'emergency',
    target: 'parent',
    bypassQuietHours: true,
    retry: { attempts: 5, backoff: 'exponential', delay: 500 },
  },
  EMERGENCY_ADMIN_ALERT: {
    id: 'emergency.admin_alert',
    label: 'Emergency Admin Alert',
    description: 'Notify school admin about an emergency scan',
    priority: 'critical',
    channels: ['push', 'sms'],
    template: 'emergency-admin-alert',
    category: 'emergency',
    target: 'admin',
    bypassQuietHours: true,
    retry: { attempts: 5, backoff: 'exponential', delay: 500 },
  },
  EMERGENCY_DRILL: {
    id: 'emergency.drill',
    label: 'Emergency Drill',
    description: 'Scheduled emergency drill notification',
    priority: 'high',
    channels: ['push', 'sms'],
    template: 'emergency-drill',
    category: 'emergency',
    target: 'parent',
    retry: { attempts: 3, backoff: 'exponential', delay: 1000 },
  },
  EMERGENCY_ANOMALY: {
    id: 'emergency.anomaly',
    label: 'Suspicious Scan Alert',
    description: 'Duplicate scan, unknown card, or after-hours scan detected',
    priority: 'high',
    channels: ['push', 'sms'],
    template: 'emergency-anomaly',
    category: 'emergency',
    target: 'admin',
    retry: { attempts: 3, backoff: 'exponential', delay: 1000 },
  },

  // ═══════════════════════════════════════════════════════════════════════
  // COMMUNICATION
  // ═══════════════════════════════════════════════════════════════════════
  COMMUNICATION_ANNOUNCEMENT: {
    id: 'communication.announcement',
    label: 'School Announcement',
    description: 'School-wide broadcast to all parents/students',
    priority: 'normal',
    channels: ['push', 'email'],
    template: 'communication-announcement',
    category: 'communication',
    target: 'parent',
    retry: { attempts: 2, backoff: 'exponential', delay: 2000 },
  },
  COMMUNICATION_DIRECT_MESSAGE: {
    id: 'communication.direct_message',
    label: 'Direct Message',
    description: 'One-to-one message from admin to parent',
    priority: 'normal',
    channels: ['push'],
    template: 'communication-direct-message',
    category: 'communication',
    target: 'parent',
    retry: { attempts: 2, backoff: 'exponential', delay: 1000 },
  },
  COMMUNICATION_FEE_REMINDER: {
    id: 'communication.fee_reminder',
    label: 'Fee Payment Reminder',
    description: 'Reminder for pending fee payment',
    priority: 'normal',
    channels: ['push', 'sms', 'email'],
    template: 'communication-fee-reminder',
    category: 'communication',
    target: 'parent',
    retry: { attempts: 3, backoff: 'exponential', delay: 5000 },
  },
  COMMUNICATION_PTM_REMINDER: {
    id: 'communication.ptm_reminder',
    label: 'PTM Reminder',
    description: 'Parent-Teacher Meeting reminder',
    priority: 'normal',
    channels: ['push', 'sms'],
    template: 'communication-ptm-reminder',
    category: 'communication',
    target: 'parent',
    retry: { attempts: 2, backoff: 'exponential', delay: 3000 },
  },

  // ═══════════════════════════════════════════════════════════════════════
  // TIMETABLE
  // ═══════════════════════════════════════════════════════════════════════
  TIMETABLE_GENERATED: {
    id: 'timetable.generated',
    label: 'Timetable Generated',
    description: 'New timetable has been generated',
    priority: 'normal',
    channels: ['push'],
    template: 'timetable-generated',
    category: 'timetable',
    target: 'admin',
    retry: { attempts: 1, backoff: 'fixed', delay: 3000 },
  },
  TIMETABLE_CHANGED: {
    id: 'timetable.changed',
    label: 'Timetable Changed',
    description: 'Timetable was modified or updated',
    priority: 'normal',
    channels: ['push'],
    template: 'timetable-changed',
    category: 'timetable',
    target: 'teacher',
    retry: { attempts: 2, backoff: 'exponential', delay: 2000 },
  },
  TIMETABLE_SUBSTITUTION: {
    id: 'timetable.substitution',
    label: 'Teacher Substitution',
    description: 'Teacher assigned as substitute for absent teacher',
    priority: 'high',
    channels: ['push', 'sms'],
    template: 'timetable-substitution',
    category: 'timetable',
    target: 'teacher',
    retry: { attempts: 3, backoff: 'exponential', delay: 1000 },
  },
  TIMETABLE_VALIDATION_COMPLETE: {
    id: 'timetable.validation_complete',
    label: 'Validation Complete',
    description: 'Timetable CSV validation finished',
    priority: 'normal',
    channels: ['push'],
    template: 'timetable-validation-complete',
    category: 'timetable',
    target: 'admin',
    retry: { attempts: 1, backoff: 'fixed', delay: 3000 },
  },

  // ═══════════════════════════════════════════════════════════════════════
  // SYSTEM
  // ═══════════════════════════════════════════════════════════════════════
  SYSTEM_WELCOME: {
    id: 'system.welcome',
    label: 'Welcome Email',
    description: 'Sent when a new school/admin is onboarded',
    priority: 'normal',
    channels: ['email'],
    template: 'system-welcome',
    category: 'system',
    target: 'admin',
    oneTime: true,
    retry: { attempts: 2, backoff: 'fixed', delay: 10000 },
  },
  SYSTEM_PASSWORD_RESET: {
    id: 'system.password_reset',
    label: 'Password Reset',
    description: 'Password reset link for admin/teacher/parent',
    priority: 'high',
    channels: ['email', 'sms'],
    template: 'system-password-reset',
    category: 'system',
    target: 'all',
    oneTime: true,
    retry: { attempts: 3, backoff: 'exponential', delay: 2000 },
  },
  SYSTEM_OTP: {
    id: 'system.otp',
    label: 'OTP Verification',
    description: 'One-time password for login verification',
    priority: 'high',
    channels: ['sms', 'email'],
    template: 'system-otp',
    category: 'system',
    target: 'all',
    oneTime: true,
    retry: { attempts: 2, backoff: 'fixed', delay: 3000 },
  },
  SYSTEM_ACCOUNT_LOCKED: {
    id: 'system.account_locked',
    label: 'Account Locked',
    description: 'Account locked due to multiple failed login attempts',
    priority: 'high',
    channels: ['email'],
    template: 'system-account-locked',
    category: 'system',
    target: 'all',
    retry: { attempts: 2, backoff: 'fixed', delay: 5000 },
  },
  SYSTEM_CARD_DEACTIVATED: {
    id: 'system.card_deactivated',
    label: 'Card Deactivated',
    description: 'Student RFID/QR card has been deactivated',
    priority: 'normal',
    channels: ['push', 'sms'],
    template: 'system-card-deactivated',
    category: 'system',
    target: 'parent',
    retry: { attempts: 2, backoff: 'exponential', delay: 2000 },
  },
});

// Priority weights (lower = higher priority)
const PRIORITY_WEIGHTS = {
  critical: 1,
  high: 2,
  normal: 3,
  low: 4,
};

// Channel configurations
const CHANNEL_CONFIG = {
  push: {
    name: 'Push Notification',
    provider: 'expo',
    maxRetries: 3,
    rateLimit: { perSecond: 50, perMinute: 1000 },
  },
  sms: {
    name: 'SMS',
    provider: 'msg91',
    maxRetries: 2,
    rateLimit: { perSecond: 10, perMinute: 100 },
  },
  email: {
    name: 'Email',
    provider: 'sendgrid',
    maxRetries: 2,
    rateLimit: { perSecond: 20, perMinute: 500 },
  },
  whatsapp: {
    name: 'WhatsApp',
    provider: 'interakt',
    maxRetries: 3,
    rateLimit: { perSecond: 5, perMinute: 50 },
  },
};

// Utility: Get notification config by ID
function getNotificationConfig(typeId) {
  const entry = Object.values(NOTIFICATION_TYPES).find((t) => t.id === typeId);
  if (!entry) throw new Error(`[registry] Unknown notification type: ${typeId}`);
  return entry;
}

// Utility: Get all notification types for a category
function getNotificationsByCategory(category) {
  return Object.values(NOTIFICATION_TYPES).filter((t) => t.category === category);
}

// Utility: Get all critical notifications (bypass quiet hours)
function getCriticalNotifications() {
  return Object.values(NOTIFICATION_TYPES).filter((t) => t.priority === 'critical');
}

export {
  NOTIFICATION_TYPES,
  PRIORITY_WEIGHTS,
  CHANNEL_CONFIG,
  getNotificationConfig,
  getNotificationsByCategory,
  getCriticalNotifications,
};
