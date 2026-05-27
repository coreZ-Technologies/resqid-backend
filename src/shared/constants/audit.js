// src/shared/constants/audit.js

/**
 * RESQID Audit Action Registry
 * All audit log action names — used in auditLogger.js
 *
 * Naming: DOMAIN_ACTION (past tense)
 * Every create/update/delete must have a corresponding audit action.
 */

export const AUDIT_ACTION = Object.freeze({
  // Auth
  LOGIN: 'auth.login',
  LOGOUT: 'auth.logout',
  OTP_SENT: 'auth.otp_sent',
  OTP_VERIFIED: 'auth.otp_verified',
  TOKEN_REFRESHED: 'auth.token_refreshed',

  // School
  SCHOOL_CREATED: 'school.created',
  SCHOOL_UPDATED: 'school.updated',
  SCHOOL_ACTIVATED: 'school.activated',
  SCHOOL_DEACTIVATED: 'school.deactivated',
  SCHOOL_DELETED: 'school.deleted',

  // Student
  STUDENT_CREATED: 'student.created',
  STUDENT_UPDATED: 'student.updated',
  STUDENT_DELETED: 'student.deleted',

  // Teacher
  TEACHER_CREATED: 'teacher.created',
  TEACHER_UPDATED: 'teacher.updated',
  TEACHER_DELETED: 'teacher.deleted',

  // Token / Card
  TOKEN_GENERATED: 'token.generated',
  TOKEN_ISSUED: 'token.issued',
  TOKEN_REVOKED: 'token.revoked',
  TOKEN_BULK_GENERATED: 'token.bulk_generated',
  CARD_SCANNED: 'card.scanned',
  CARD_LOST_REPORTED: 'card.lost_reported',

  // Emergency
  EMERGENCY_TRIGGERED: 'emergency.triggered',
  EMERGENCY_PROFILE_UPDATED: 'emergency.profile_updated',
  EMERGENCY_CONTACT_ADDED: 'emergency.contact_added',
  EMERGENCY_CONTACT_REMOVED: 'emergency.contact_removed',

  // Attendance
  ATTENDANCE_MARKED: 'attendance.marked',
  ATTENDANCE_UPDATED: 'attendance.updated',
  ATTENDANCE_SESSION_OPENED: 'attendance.session_opened',
  ATTENDANCE_SESSION_CLOSED: 'attendance.session_closed',

  // Timetable
  TIMETABLE_CREATED: 'timetable.created',
  TIMETABLE_UPDATED: 'timetable.updated',
  SUBSTITUTION_CREATED: 'substitution.created',

  // Subscription
  SUBSCRIPTION_CREATED: 'subscription.created',
  SUBSCRIPTION_RENEWED: 'subscription.renewed',
  SUBSCRIPTION_UPGRADED: 'subscription.upgraded',
  SUBSCRIPTION_CANCELLED: 'subscription.cancelled',

  // Order
  ORDER_CREATED: 'order.created',
  ORDER_CONFIRMED: 'order.confirmed',
  ORDER_CANCELLED: 'order.cancelled',
  ORDER_REFUNDED: 'order.refunded',

  // File
  FILE_UPLOADED: 'file.uploaded',
  FILE_DELETED: 'file.deleted',

  // Security
  ATTACK_DETECTED: 'security.attack_detected',
  IP_BLOCKED: 'security.ip_blocked',
  ANOMALY_DETECTED: 'security.anomaly_detected',

  // Parent
  PARENT_REGISTERED: 'parent.registered',
  PARENT_UPDATED: 'parent.updated',
  PARENT_DELETED: 'parent.deleted',

  // System
  SYSTEM_STARTUP: 'system.startup',
  SYSTEM_SHUTDOWN: 'system.shutdown',
  CONFIG_VALIDATED: 'system.config_validated',
});
