// src/shared/constants/events.js

/**
 * RESQID Event Registry
 * All event names used by the event bus / BullMQ queues.
 *
 * Used by:
 *   - event.publisher.js (publish)
 *   - event.consumer.js (subscribe)
 *   - orchestrator workers
 *
 * Naming: DOMAIN.ACTION (past tense — events describe what happened)
 */

export const EVENTS = Object.freeze({
  // Auth
  AUTH_OTP_SENT: 'auth.otp_sent',
  AUTH_LOGIN_SUCCESS: 'auth.login_success',
  AUTH_LOGIN_FAILED: 'auth.login_failed',
  AUTH_LOGOUT: 'auth.logout',

  // Student
  STUDENT_CREATED: 'student.created',
  STUDENT_UPDATED: 'student.updated',
  STUDENT_DELETED: 'student.deleted',

  // Card / Token
  CARD_SCANNED: 'card.scanned',
  CARD_ISSUED: 'card.issued',
  CARD_REVOKED: 'card.revoked',
  CARD_LOST_REPORTED: 'card.lost_reported',

  // Emergency
  EMERGENCY_TRIGGERED: 'emergency.triggered',
  EMERGENCY_PROFILE_UPDATED: 'emergency.profile_updated',

  // Attendance
  ATTENDANCE_MARKED: 'attendance.marked',
  ATTENDANCE_SESSION_STARTED: 'attendance.session_started',
  ATTENDANCE_SESSION_ENDED: 'attendance.session_ended',

  // Timetable
  TIMETABLE_UPDATED: 'timetable.updated',
  SUBSTITUTION_CREATED: 'substitution.created',

  // Communication
  ANNOUNCEMENT_SENT: 'communication.announcement_sent',
  MESSAGE_SENT: 'communication.message_sent',

  // Order
  ORDER_CREATED: 'order.created',
  ORDER_CONFIRMED: 'order.confirmed',
  ORDER_SHIPPED: 'order.shipped',
  ORDER_DELIVERED: 'order.delivered',
  ORDER_CANCELLED: 'order.cancelled',
  ORDER_REFUNDED: 'order.refunded',

  // Subscription
  SUBSCRIPTION_CREATED: 'subscription.created',
  SUBSCRIPTION_RENEWED: 'subscription.renewed',
  SUBSCRIPTION_UPGRADED: 'subscription.upgraded',
  SUBSCRIPTION_EXPIRED: 'subscription.expired',

  // Anomaly
  ANOMALY_DETECTED: 'anomaly.detected',
  ANOMALY_RESOLVED: 'anomaly.resolved',

  // System
  SCHOOL_ACTIVATED: 'school.activated',
  SCHOOL_DEACTIVATED: 'school.deactivated',
});
