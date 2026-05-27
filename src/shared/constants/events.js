// =============================================================================
// RESQID Event Registry — All event names for event bus & BullMQ queues
//
// Naming: DOMAIN.ACTION (past tense — events describe what happened)
//
// Used by:
//   - event.publisher.js   → publish events
//   - event.consumer.js    → subscribe to events
//   - orchestrator workers → handle events
//   - notification.dispatcher → trigger notifications
//   - auditLog.middleware  → log security events
//   - attackLogger.middleware → log attack events
// =============================================================================

export const EVENTS = Object.freeze({
  // ─── Authentication Events ─────────────────────────────────────────────────
  AUTH_OTP_SENT: 'auth.otp_sent',
  AUTH_OTP_VERIFIED: 'auth.otp_verified',
  AUTH_OTP_FAILED: 'auth.otp_failed',
  AUTH_LOGIN_SUCCESS: 'auth.login_success',
  AUTH_LOGIN_FAILED: 'auth.login_failed',
  AUTH_LOGOUT: 'auth.logout',
  AUTH_TOKEN_REFRESHED: 'auth.token_refreshed',
  AUTH_PASSWORD_CHANGED: 'auth.password_changed',
  AUTH_ACCOUNT_LOCKED: 'auth.account_locked',

  // ─── Student Events ────────────────────────────────────────────────────────
  STUDENT_CREATED: 'student.created',
  STUDENT_UPDATED: 'student.updated',
  STUDENT_DELETED: 'student.deleted',
  STUDENT_BULK_IMPORTED: 'student.bulk_imported',

  // ─── Card / Token Events ───────────────────────────────────────────────────
  CARD_SCANNED: 'card.scanned',
  CARD_ISSUED: 'card.issued',
  CARD_REVOKED: 'card.revoked',
  CARD_LOST_REPORTED: 'card.lost_reported',
  CARD_RENEWED: 'card.renewed',
  CARD_BULK_GENERATED: 'card.bulk_generated',

  // ─── Emergency Events ──────────────────────────────────────────────────────
  EMERGENCY_TRIGGERED: 'emergency.triggered',
  EMERGENCY_PROFILE_UPDATED: 'emergency.profile_updated',
  EMERGENCY_CONTACT_ADDED: 'emergency.contact_added',
  EMERGENCY_CONTACT_REMOVED: 'emergency.contact_removed',
  EMERGENCY_QR_SCANNED: 'emergency.qr_scanned',
  EMERGENCY_QR_INVALID: 'emergency.qr_invalid',
  EMERGENCY_SCAN_BLOCKED: 'emergency.scan_blocked',
  EMERGENCY_CONTACT_NOTIFIED: 'emergency.contact_notified',

  // ─── Attendance Events ─────────────────────────────────────────────────────
  ATTENDANCE_MARKED: 'attendance.marked',
  ATTENDANCE_UPDATED: 'attendance.updated',
  ATTENDANCE_SESSION_STARTED: 'attendance.session_started',
  ATTENDANCE_SESSION_ENDED: 'attendance.session_ended',
  ATTENDANCE_DEVICE_ONLINE: 'attendance.device_online',
  ATTENDANCE_DEVICE_OFFLINE: 'attendance.device_offline',
  ATTENDANCE_DEVICE_REGISTERED: 'attendance.device_registered',
  ATTENDANCE_DEVICE_REMOVED: 'attendance.device_removed',
  ATTENDANCE_TAP_INVALID: 'attendance.tap_invalid',
  ATTENDANCE_BULK_MARKED: 'attendance.bulk_marked',

  // ─── Timetable Events ──────────────────────────────────────────────────────
  TIMETABLE_CREATED: 'timetable.created',
  TIMETABLE_UPDATED: 'timetable.updated',
  TIMETABLE_DELETED: 'timetable.deleted',
  SUBSTITUTION_CREATED: 'substitution.created',
  SUBSTITUTION_UPDATED: 'substitution.updated',
  SUBSTITUTION_APPROVED: 'substitution.approved',
  SUBSTITUTION_REJECTED: 'substitution.rejected',

  // ─── Communication Events ──────────────────────────────────────────────────
  ANNOUNCEMENT_SENT: 'communication.announcement_sent',
  MESSAGE_SENT: 'communication.message_sent',
  NOTIFICATION_DELIVERED: 'communication.notification_delivered',
  NOTIFICATION_FAILED: 'communication.notification_failed',

  // ─── Order Events ──────────────────────────────────────────────────────────
  ORDER_CREATED: 'order.created',
  ORDER_CONFIRMED: 'order.confirmed',
  ORDER_PROCESSING: 'order.processing',
  ORDER_PRINTED: 'order.printed',
  ORDER_SHIPPED: 'order.shipped',
  ORDER_DELIVERED: 'order.delivered',
  ORDER_CANCELLED: 'order.cancelled',
  ORDER_REFUNDED: 'order.refunded',

  // ─── Subscription Events ───────────────────────────────────────────────────
  SUBSCRIPTION_CREATED: 'subscription.created',
  SUBSCRIPTION_RENEWED: 'subscription.renewed',
  SUBSCRIPTION_UPGRADED: 'subscription.upgraded',
  SUBSCRIPTION_EXPIRED: 'subscription.expired',
  SUBSCRIPTION_CANCELLED: 'subscription.cancelled',
  SUBSCRIPTION_PAYMENT_FAILED: 'subscription.payment_failed',

  // ─── Anomaly Events ────────────────────────────────────────────────────────
  ANOMALY_DETECTED: 'anomaly.detected',
  ANOMALY_REVIEWED: 'anomaly.reviewed',
  ANOMALY_RESOLVED: 'anomaly.resolved',
  ANOMALY_IGNORED: 'anomaly.ignored',

  // ─── Security Events ───────────────────────────────────────────────────────
  // Rate Limiting
  RATE_LIMIT_EXCEEDED: 'security.rate_limit_exceeded',
  RATE_LIMIT_WARNING: 'security.rate_limit_warning',

  // IP Security
  IP_BLOCKED: 'security.ip_blocked',
  IP_UNBLOCKED: 'security.ip_unblocked',
  IP_REPUTATION_DROPPED: 'security.ip_reputation_dropped',
  IP_WHITELISTED: 'security.ip_whitelisted',
  IP_BLACKLISTED: 'security.ip_blacklisted',
  GEO_BLOCKED: 'security.geo_blocked',

  // Device Security
  DEVICE_BLOCKED: 'security.device_blocked',
  DEVICE_UNBLOCKED: 'security.device_unblocked',
  DEVICE_UNRECOGNIZED: 'security.device_unrecognized',
  DEVICE_FINGERPRINT_CHANGED: 'security.device_fingerprint_changed',
  DEVICE_LIMIT_EXCEEDED: 'security.device_limit_exceeded',

  // Attack Detection
  ATTACK_DETECTED: 'security.attack_detected',
  BRUTE_FORCE_DETECTED: 'security.brute_force_detected',
  CREDENTIAL_STUFFING_DETECTED: 'security.credential_stuffing_detected',
  XSS_ATTEMPT: 'security.xss_attempt',
  SQL_INJECTION_ATTEMPT: 'security.sql_injection_attempt',
  NOSQL_INJECTION_ATTEMPT: 'security.nosql_injection_attempt',
  CSRF_FAILURE: 'security.csrf_failure',
  HPP_DETECTED: 'security.hpp_detected',
  SCANNING_DETECTED: 'security.scanning_detected',

  // Behavioral Anomalies
  BEHAVIOR_ANOMALY: 'security.behavior_anomaly',
  IMPOSSIBLE_TRAVEL: 'security.impossible_travel',
  RAPID_SCANS_DETECTED: 'security.rapid_scans_detected',
  UNUSUAL_ATTENDANCE: 'security.unusual_attendance',
  UNUSUAL_TIMETABLE_CHANGE: 'security.unusual_timetable_change',
  PATTERN_DEVIATION: 'security.pattern_deviation',

  // ─── School Events ─────────────────────────────────────────────────────────
  SCHOOL_CREATED: 'school.created',
  SCHOOL_UPDATED: 'school.updated',
  SCHOOL_ACTIVATED: 'school.activated',
  SCHOOL_DEACTIVATED: 'school.deactivated',
  SCHOOL_DELETED: 'school.deleted',
  SCHOOL_SETTINGS_UPDATED: 'school.settings_updated',

  // ─── System Events ─────────────────────────────────────────────────────────
  SYSTEM_STARTUP: 'system.startup',
  SYSTEM_SHUTDOWN: 'system.shutdown',
  MAINTENANCE_STARTED: 'system.maintenance_started',
  MAINTENANCE_ENDED: 'system.maintenance_ended',
  MAINTENANCE_SCHEDULED: 'system.maintenance_scheduled',
  CONFIG_CHANGED: 'system.config_changed',
  WORKER_STARTED: 'system.worker_started',
  WORKER_FAILED: 'system.worker_failed',
  WORKER_STALLED: 'system.worker_stalled',
  CIRCUIT_BREAKER_OPENED: 'system.circuit_breaker_opened',
  CIRCUIT_BREAKER_CLOSED: 'system.circuit_breaker_closed',
  CACHE_CLEARED: 'system.cache_cleared',
  HEALTH_CHECK_FAILED: 'system.health_check_failed',

  // ─── Webhook Events ────────────────────────────────────────────────────────
  WEBHOOK_RECEIVED: 'webhook.received',
  WEBHOOK_PROCESSED: 'webhook.processed',
  WEBHOOK_FAILED: 'webhook.failed',
  WEBHOOK_SIGNATURE_INVALID: 'webhook.signature_invalid',
});

// ─── Event Categories ────────────────────────────────────────────────────────
// Group events for easier subscription management

export const EVENT_CATEGORIES = Object.freeze({
  AUTH: [
    EVENTS.AUTH_LOGIN_SUCCESS,
    EVENTS.AUTH_LOGIN_FAILED,
    EVENTS.AUTH_LOGOUT,
    EVENTS.AUTH_ACCOUNT_LOCKED,
  ],
  EMERGENCY: [
    EVENTS.EMERGENCY_TRIGGERED,
    EVENTS.EMERGENCY_QR_SCANNED,
    EVENTS.EMERGENCY_CONTACT_NOTIFIED,
  ],
  ATTENDANCE: [
    EVENTS.ATTENDANCE_MARKED,
    EVENTS.ATTENDANCE_SESSION_STARTED,
    EVENTS.ATTENDANCE_SESSION_ENDED,
    EVENTS.ATTENDANCE_DEVICE_ONLINE,
    EVENTS.ATTENDANCE_DEVICE_OFFLINE,
  ],
  SECURITY_HIGH: [
    EVENTS.ATTACK_DETECTED,
    EVENTS.BRUTE_FORCE_DETECTED,
    EVENTS.CREDENTIAL_STUFFING_DETECTED,
    EVENTS.IP_BLOCKED,
    EVENTS.DEVICE_BLOCKED,
  ],
  SECURITY_MEDIUM: [
    EVENTS.RATE_LIMIT_EXCEEDED,
    EVENTS.GEO_BLOCKED,
    EVENTS.DEVICE_UNRECOGNIZED,
    EVENTS.BEHAVIOR_ANOMALY,
    EVENTS.XSS_ATTEMPT,
    EVENTS.SQL_INJECTION_ATTEMPT,
  ],
  SECURITY_LOW: [
    EVENTS.RATE_LIMIT_WARNING,
    EVENTS.IP_REPUTATION_DROPPED,
    EVENTS.DEVICE_FINGERPRINT_CHANGED,
  ],
  SYSTEM_CRITICAL: [
    EVENTS.SYSTEM_SHUTDOWN,
    EVENTS.WORKER_FAILED,
    EVENTS.HEALTH_CHECK_FAILED,
    EVENTS.CIRCUIT_BREAKER_OPENED,
  ],
});

// ─── Helper Functions ────────────────────────────────────────────────────────

/**
 * Get event category
 */
export const getEventCategory = (eventName) => {
  for (const [category, events] of Object.entries(EVENT_CATEGORIES)) {
    if (events.includes(eventName)) return category;
  }
  return 'GENERAL';
};

/**
 * Check if event is security-related
 */
export const isSecurityEvent = (eventName) => {
  return eventName.startsWith('security.');
};

/**
 * Get security event severity
 */
export const getSecurityEventSeverity = (eventName) => {
  if (EVENT_CATEGORIES.SECURITY_HIGH.includes(eventName)) return 'HIGH';
  if (EVENT_CATEGORIES.SECURITY_MEDIUM.includes(eventName)) return 'MEDIUM';
  if (EVENT_CATEGORIES.SECURITY_LOW.includes(eventName)) return 'LOW';
  return 'INFO';
};

/**
 * Check if event should trigger notification
 */
export const shouldNotify = (eventName) => {
  const notifiableCategories = ['EMERGENCY', 'SECURITY_HIGH', 'SYSTEM_CRITICAL'];
  const category = getEventCategory(eventName);
  return notifiableCategories.includes(category);
};
