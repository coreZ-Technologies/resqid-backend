// TODO: Add implementation
// =============================================================================
// notification.constants.js — RESQID
// Constants for the notification module (m4-communication)
// =============================================================================

// ─── Channel Enum ─────────────────────────────────────────────────────────────

export const NOTIFICATION_CHANNEL = Object.freeze({
  SMS: 'SMS',
  EMAIL: 'EMAIL',
  PUSH: 'PUSH',
  IN_APP: 'IN_APP',
});

// ─── Status Enum ──────────────────────────────────────────────────────────────

export const NOTIFICATION_STATUS = Object.freeze({
  PENDING: 'PENDING',
  QUEUED: 'QUEUED',
  SENT: 'SENT',
  DELIVERED: 'DELIVERED',
  READ: 'READ',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
});

// ─── Terminal statuses (no further transitions allowed) ───────────────────────

export const TERMINAL_STATUSES = Object.freeze([
  NOTIFICATION_STATUS.DELIVERED,
  NOTIFICATION_STATUS.READ,
  NOTIFICATION_STATUS.FAILED,
  NOTIFICATION_STATUS.CANCELLED,
]);

// ─── Notification Types ───────────────────────────────────────────────────────
// Matches the `type` column — used for frontend routing / deep-links

export const NOTIFICATION_TYPE = Object.freeze({
  // Safety
  EMERGENCY_ALERT: 'EMERGENCY_ALERT',
  ANOMALY_DETECTED: 'ANOMALY_DETECTED',

  // Student / card
  STUDENT_QR_SCANNED: 'STUDENT_QR_SCANNED',
  STUDENT_CARD_EXPIRING: 'STUDENT_CARD_EXPIRING',
  PARENT_CARD_LINKED: 'PARENT_CARD_LINKED',
  PARENT_CARD_LOCKED: 'PARENT_CARD_LOCKED',
  PARENT_CARD_REPLACE_REQUESTED: 'PARENT_CARD_REPLACE_REQUESTED',
  PARENT_CARD_RENEWAL_REQUESTED: 'PARENT_CARD_RENEWAL_REQUESTED',
  PARENT_CHILD_UNLINKED: 'PARENT_CHILD_UNLINKED',

  // Auth / account
  OTP: 'OTP',
  NEW_DEVICE_LOGIN: 'NEW_DEVICE_LOGIN',
  PARENT_REGISTERED: 'PARENT_REGISTERED',
  PARENT_EMAIL_VERIFIED: 'PARENT_EMAIL_VERIFIED',
  PARENT_PHONE_CHANGED: 'PARENT_PHONE_CHANGED',
  PARENT_EMAIL_CHANGED: 'PARENT_EMAIL_CHANGED',
  PARENT_ACCOUNT_DELETED: 'PARENT_ACCOUNT_DELETED',

  // Order
  ORDER_CONFIRMED: 'ORDER_CONFIRMED',
  ORDER_SHIPPED: 'ORDER_SHIPPED',
  ORDER_DELIVERED: 'ORDER_DELIVERED',
  ORDER_REFUNDED: 'ORDER_REFUNDED',
  ORDER_COMPLETED: 'ORDER_COMPLETED',

  // School / admin
  SCHOOL_ONBOARDED: 'SCHOOL_ONBOARDED',
  SCHOOL_USER_ONBOARDED: 'SCHOOL_USER_ONBOARDED',
  SCHOOL_RENEWAL_DUE: 'SCHOOL_RENEWAL_DUE',

  // Internal
  INTERNAL_ALERT: 'INTERNAL_ALERT',
});

// ─── Default Preference Values ────────────────────────────────────────────────

export const DEFAULT_NOTIFICATION_PREFERENCES = Object.freeze({
  smsEnabled: true,
  emailEnabled: false,
  pushEnabled: true,
  onScan: true,
  onAttendance: true,
  onEmergency: true,
  onAnnouncement: true,
});

// ─── Pagination Defaults ──────────────────────────────────────────────────────

export const NOTIFICATION_PAGE_SIZE = 20;
export const NOTIFICATION_MAX_PAGE_SIZE = 100;

// ─── Retention ────────────────────────────────────────────────────────────────
// How many days to keep notifications before archival / deletion

export const NOTIFICATION_RETENTION_DAYS = 90;