// =============================================================================
// RESQID Audit Action Registry — All audit log action names
//
// Naming: DOMAIN_ACTION (past tense)
// Every create/update/delete must have a corresponding audit action.
//
// Used by:
//   - auditLogger.js          → log user actions
//   - auditLog.middleware     → auto-log API calls
//   - attackLogger.middleware → log security events
// =============================================================================

export const AUDIT_ACTION = Object.freeze({
  // ─── Authentication ────────────────────────────────────────────────────────
  LOGIN: 'auth.login',
  LOGIN_FAILED: 'auth.login_failed',
  LOGOUT: 'auth.logout',
  OTP_SENT: 'auth.otp_sent',
  OTP_VERIFIED: 'auth.otp_verified',
  OTP_FAILED: 'auth.otp_failed',
  TOKEN_REFRESHED: 'auth.token_refreshed',
  PASSWORD_CHANGED: 'auth.password_changed',
  PASSWORD_RESET_REQUESTED: 'auth.password_reset_requested',
  ACCOUNT_LOCKED: 'auth.account_locked',
  ACCOUNT_UNLOCKED: 'auth.account_unlocked',
  SESSION_REVOKED: 'auth.session_revoked',
  DEVICE_LOGGED_IN: 'auth.device_logged_in',

  // ─── School Management ─────────────────────────────────────────────────────
  SCHOOL_CREATED: 'school.created',
  SCHOOL_UPDATED: 'school.updated',
  SCHOOL_ACTIVATED: 'school.activated',
  SCHOOL_DEACTIVATED: 'school.deactivated',
  SCHOOL_DELETED: 'school.deleted',
  SCHOOL_SETTINGS_UPDATED: 'school.settings_updated',
  SCHOOL_USER_ADDED: 'school.user_added',
  SCHOOL_USER_REMOVED: 'school.user_removed',
  SCHOOL_USER_UPDATED: 'school.user_updated',

  // ─── Student Management ────────────────────────────────────────────────────
  STUDENT_CREATED: 'student.created',
  STUDENT_UPDATED: 'student.updated',
  STUDENT_DELETED: 'student.deleted',
  STUDENT_BULK_IMPORTED: 'student.bulk_imported',
  STUDENT_TRANSFERRED: 'student.transferred',

  // ─── Teacher Management ────────────────────────────────────────────────────
  TEACHER_CREATED: 'teacher.created',
  TEACHER_UPDATED: 'teacher.updated',
  TEACHER_DELETED: 'teacher.deleted',
  TEACHER_ASSIGNED: 'teacher.assigned',

  // ─── Parent Management ─────────────────────────────────────────────────────
  PARENT_REGISTERED: 'parent.registered',
  PARENT_UPDATED: 'parent.updated',
  PARENT_DELETED: 'parent.deleted',
  PARENT_VERIFIED: 'parent.verified',
  PARENT_CHILD_LINKED: 'parent.child_linked',
  PARENT_CHILD_UNLINKED: 'parent.child_unlinked',

  // ─── Token / Card / QR Management ──────────────────────────────────────────
  TOKEN_GENERATED: 'token.generated',
  TOKEN_ISSUED: 'token.issued',
  TOKEN_REVOKED: 'token.revoked',
  TOKEN_BULK_GENERATED: 'token.bulk_generated',
  TOKEN_ACTIVATED: 'token.activated',
  TOKEN_DEACTIVATED: 'token.deactivated',
  CARD_SCANNED: 'card.scanned',
  CARD_LOST_REPORTED: 'card.lost_reported',
  CARD_RENEWED: 'card.renewed',
  QR_GENERATED: 'qr.generated',
  QR_DOWNLOADED: 'qr.downloaded',

  // ─── Emergency Management ──────────────────────────────────────────────────
  EMERGENCY_TRIGGERED: 'emergency.triggered',
  EMERGENCY_PROFILE_UPDATED: 'emergency.profile_updated',
  EMERGENCY_PROFILE_VIEWED: 'emergency.profile_viewed',
  EMERGENCY_CONTACT_ADDED: 'emergency.contact_added',
  EMERGENCY_CONTACT_REMOVED: 'emergency.contact_removed',
  EMERGENCY_CONTACT_UPDATED: 'emergency.contact_updated',
  EMERGENCY_QR_SCANNED: 'emergency.qr_scanned',
  EMERGENCY_SCAN_BLOCKED: 'emergency.scan_blocked',
  EMERGENCY_CONTACT_NOTIFIED: 'emergency.contact_notified',

  // ─── Attendance Management ─────────────────────────────────────────────────
  ATTENDANCE_MARKED: 'attendance.marked',
  ATTENDANCE_UPDATED: 'attendance.updated',
  ATTENDANCE_DELETED: 'attendance.deleted',
  ATTENDANCE_BULK_MARKED: 'attendance.bulk_marked',
  ATTENDANCE_SESSION_OPENED: 'attendance.session_opened',
  ATTENDANCE_SESSION_CLOSED: 'attendance.session_closed',
  ATTENDANCE_DEVICE_REGISTERED: 'attendance.device_registered',
  ATTENDANCE_DEVICE_REMOVED: 'attendance.device_removed',
  ATTENDANCE_DEVICE_ONLINE: 'attendance.device_online',
  ATTENDANCE_DEVICE_OFFLINE: 'attendance.device_offline',
  ATTENDANCE_TAP_INVALID: 'attendance.tap_invalid',

  // ─── Timetable Management ──────────────────────────────────────────────────
  TIMETABLE_CREATED: 'timetable.created',
  TIMETABLE_UPDATED: 'timetable.updated',
  TIMETABLE_DELETED: 'timetable.deleted',
  SUBSTITUTION_CREATED: 'substitution.created',
  SUBSTITUTION_UPDATED: 'substitution.updated',
  SUBSTITUTION_APPROVED: 'substitution.approved',
  SUBSTITUTION_REJECTED: 'substitution.rejected',

  // ─── Communication ─────────────────────────────────────────────────────────
  ANNOUNCEMENT_SENT: 'communication.announcement_sent',
  MESSAGE_SENT: 'communication.message_sent',
  NOTIFICATION_DELIVERED: 'communication.notification_delivered',
  NOTIFICATION_FAILED: 'communication.notification_failed',
  TEMPLATE_CREATED: 'communication.template_created',
  TEMPLATE_UPDATED: 'communication.template_updated',

  // ─── Subscription & Billing ────────────────────────────────────────────────
  SUBSCRIPTION_CREATED: 'subscription.created',
  SUBSCRIPTION_RENEWED: 'subscription.renewed',
  SUBSCRIPTION_UPGRADED: 'subscription.upgraded',
  SUBSCRIPTION_DOWNGRADED: 'subscription.downgraded',
  SUBSCRIPTION_CANCELLED: 'subscription.cancelled',
  PAYMENT_RECEIVED: 'payment.received',
  PAYMENT_FAILED: 'payment.failed',
  INVOICE_GENERATED: 'invoice.generated',
  INVOICE_SENT: 'invoice.sent',

  // ─── Order Management ──────────────────────────────────────────────────────
  ORDER_CREATED: 'order.created',
  ORDER_CONFIRMED: 'order.confirmed',
  ORDER_PROCESSING: 'order.processing',
  ORDER_PRINTED: 'order.printed',
  ORDER_SHIPPED: 'order.shipped',
  ORDER_DELIVERED: 'order.delivered',
  ORDER_CANCELLED: 'order.cancelled',
  ORDER_REFUNDED: 'order.refunded',

  // ─── File Management ───────────────────────────────────────────────────────
  FILE_UPLOADED: 'file.uploaded',
  FILE_DOWNLOADED: 'file.downloaded',
  FILE_DELETED: 'file.deleted',
  FILE_ACCESSED: 'file.accessed',

  // ─── Security Events ───────────────────────────────────────────────────────
  // Access Control
  ACCESS_DENIED: 'security.access_denied',
  PERMISSION_DENIED: 'security.permission_denied',
  MODULE_ACCESS_DENIED: 'security.module_access_denied',
  SCHOOL_ACCESS_DENIED: 'security.school_access_denied',

  // Rate Limiting
  RATE_LIMIT_EXCEEDED: 'security.rate_limit_exceeded',
  RATE_LIMIT_WARNING: 'security.rate_limit_warning',

  // IP Security
  IP_BLOCKED: 'security.ip_blocked',
  IP_UNBLOCKED: 'security.ip_unblocked',
  IP_WHITELISTED: 'security.ip_whitelisted',
  IP_BLACKLISTED: 'security.ip_blacklisted',
  GEO_BLOCKED: 'security.geo_blocked',

  // Device Security
  DEVICE_BLOCKED: 'security.device_blocked',
  DEVICE_UNBLOCKED: 'security.device_unblocked',
  DEVICE_UNRECOGNIZED: 'security.device_unrecognized',
  DEVICE_FINGERPRINT_CHANGED: 'security.device_fingerprint_changed',

  // Attack Detection
  ATTACK_DETECTED: 'security.attack_detected',
  BRUTE_FORCE_DETECTED: 'security.brute_force_detected',
  XSS_ATTEMPT: 'security.xss_attempt',
  SQL_INJECTION_ATTEMPT: 'security.sql_injection_attempt',
  NOSQL_INJECTION_ATTEMPT: 'security.nosql_injection_attempt',
  CSRF_FAILURE: 'security.csrf_failure',
  HPP_DETECTED: 'security.hpp_detected',
  SCANNING_DETECTED: 'security.scanning_detected',

  // Behavioral Anomalies
  BEHAVIOR_ANOMALY: 'security.behavior_anomaly',
  RAPID_SCANS_DETECTED: 'security.rapid_scans_detected',
  UNUSUAL_LOCATION: 'security.unusual_location',
  IMPOSSIBLE_TRAVEL: 'security.impossible_travel',
  UNUSUAL_ATTENDANCE: 'security.unusual_attendance',

  // Anomaly Management
  ANOMALY_DETECTED: 'security.anomaly_detected',
  ANOMALY_REVIEWED: 'security.anomaly_reviewed',
  ANOMALY_RESOLVED: 'security.anomaly_resolved',
  ANOMALY_IGNORED: 'security.anomaly_ignored',

  // ─── System Events ─────────────────────────────────────────────────────────
  SYSTEM_STARTUP: 'system.startup',
  SYSTEM_SHUTDOWN: 'system.shutdown',
  CONFIG_VALIDATED: 'system.config_validated',
  CONFIG_CHANGED: 'system.config_changed',
  MAINTENANCE_MODE_ENTERED: 'system.maintenance_mode_entered',
  MAINTENANCE_MODE_EXITED: 'system.maintenance_mode_exited',
  MAINTENANCE_SCHEDULED: 'system.maintenance_scheduled',
  WORKER_STARTED: 'system.worker_started',
  WORKER_FAILED: 'system.worker_failed',
  WORKER_RESTARTED: 'system.worker_restarted',
  CIRCUIT_BREAKER_OPENED: 'system.circuit_breaker_opened',
  CIRCUIT_BREAKER_CLOSED: 'system.circuit_breaker_closed',
  CACHE_CLEARED: 'system.cache_cleared',
  HEALTH_CHECK_FAILED: 'system.health_check_failed',
});

// ─── Audit Severity Levels ───────────────────────────────────────────────────

export const AUDIT_SEVERITY = Object.freeze({
  INFO: 'INFO',
  WARNING: 'WARNING',
  ERROR: 'ERROR',
  CRITICAL: 'CRITICAL',
});

// ─── Audit Action Severity Mapping ───────────────────────────────────────────
// Determines the severity of each audit action for filtering and alerting

export const AUDIT_ACTION_SEVERITY = Object.freeze({
  // Critical security events
  [AUDIT_ACTION.ATTACK_DETECTED]: AUDIT_SEVERITY.CRITICAL,
  [AUDIT_ACTION.BRUTE_FORCE_DETECTED]: AUDIT_SEVERITY.CRITICAL,
  [AUDIT_ACTION.SYSTEM_SHUTDOWN]: AUDIT_SEVERITY.CRITICAL,
  [AUDIT_ACTION.HEALTH_CHECK_FAILED]: AUDIT_SEVERITY.CRITICAL,

  // Error events
  [AUDIT_ACTION.ACCESS_DENIED]: AUDIT_SEVERITY.ERROR,
  [AUDIT_ACTION.PERMISSION_DENIED]: AUDIT_SEVERITY.ERROR,
  [AUDIT_ACTION.IP_BLOCKED]: AUDIT_SEVERITY.ERROR,
  [AUDIT_ACTION.DEVICE_BLOCKED]: AUDIT_SEVERITY.ERROR,
  [AUDIT_ACTION.GEO_BLOCKED]: AUDIT_SEVERITY.ERROR,
  [AUDIT_ACTION.LOGIN_FAILED]: AUDIT_SEVERITY.ERROR,
  [AUDIT_ACTION.PAYMENT_FAILED]: AUDIT_SEVERITY.ERROR,
  [AUDIT_ACTION.WORKER_FAILED]: AUDIT_SEVERITY.ERROR,

  // Warning events
  [AUDIT_ACTION.RATE_LIMIT_EXCEEDED]: AUDIT_SEVERITY.WARNING,
  [AUDIT_ACTION.RATE_LIMIT_WARNING]: AUDIT_SEVERITY.WARNING,
  [AUDIT_ACTION.DEVICE_UNRECOGNIZED]: AUDIT_SEVERITY.WARNING,
  [AUDIT_ACTION.BEHAVIOR_ANOMALY]: AUDIT_SEVERITY.WARNING,
  [AUDIT_ACTION.XSS_ATTEMPT]: AUDIT_SEVERITY.WARNING,
  [AUDIT_ACTION.CSRF_FAILURE]: AUDIT_SEVERITY.WARNING,

  // Info events (default for everything else)
  [AUDIT_ACTION.LOGIN]: AUDIT_SEVERITY.INFO,
  [AUDIT_ACTION.LOGOUT]: AUDIT_SEVERITY.INFO,
  [AUDIT_ACTION.STUDENT_CREATED]: AUDIT_SEVERITY.INFO,
});

// ─── Helper Functions ────────────────────────────────────────────────────────

/**
 * Get severity of an audit action
 */
export const getAuditSeverity = (action) => {
  return AUDIT_ACTION_SEVERITY[action] || AUDIT_SEVERITY.INFO;
};

/**
 * Check if audit action is a security event
 */
export const isSecurityAudit = (action) => {
  return action.startsWith('security.');
};

/**
 * Check if audit action is critical
 */ 
export const isCriticalAudit = (action) => {
  return getAuditSeverity(action) === AUDIT_SEVERITY.CRITICAL;
};

/**
 * Get audit actions by severity
 */
export const getAuditActionsBySeverity = (severity) => {
  return Object.entries(AUDIT_ACTION_SEVERITY)
    .filter(([, sev]) => sev === severity)
    .map(([action]) => action);
};
