// =============================================================================
// auditLogger.js — RESQID Audit Log Utility
//
// Non-blocking audit logger. Never throws — failures are logged but
// never break the main request flow.
// =============================================================================

import { prisma } from '#config/prisma.js';
import { extractIp } from '#shared/network/extractIp.js';
import { parseUserAgent } from '#shared/network/userAgent.js';
import { logger } from '#config/logger.js';

/**
 * Action constants — import these instead of raw strings
 * so you never have a typo in an audit log.
 */
export const AUDIT_ACTION = {
  // Auth
  LOGIN: 'auth.login',
  LOGOUT: 'auth.logout',
  OTP_SENT: 'auth.otp_sent',
  OTP_VERIFIED: 'auth.otp_verified',
  PASSWORD_CHANGED: 'auth.password_changed',
  TOKEN_REFRESHED: 'auth.token_refreshed',

  // School
  SCHOOL_CREATED: 'school.created',
  SCHOOL_UPDATED: 'school.updated',
  SCHOOL_DEACTIVATED: 'school.deactivated',

  // Student
  STUDENT_CREATED: 'student.created',
  STUDENT_UPDATED: 'student.updated',
  STUDENT_DELETED: 'student.deleted',

  // Teacher
  TEACHER_CREATED: 'teacher.created',
  TEACHER_UPDATED: 'teacher.updated',
  TEACHER_DELETED: 'teacher.deleted',
  TEACHER_WELLNESS_UPDATED: 'teacher.wellness_updated',

  // Timetable
  TIMETABLE_GENERATED: 'timetable.generated',
  TIMETABLE_VALIDATED: 'timetable.validated',
  TIMETABLE_PUBLISHED: 'timetable.published',
  TIMETABLE_ARCHIVED: 'timetable.archived',

  // Crisis
  CRISIS_TRIGGERED: 'crisis.triggered',
  CRISIS_RESOLVED: 'crisis.resolved',
  SUBSTITUTION_CREATED: 'substitution.created',
  SUBSTITUTION_APPROVED: 'substitution.approved',

  // Subscription
  SUBSCRIPTION_CREATED: 'subscription.created',
  SUBSCRIPTION_RENEWED: 'subscription.renewed',
  SUBSCRIPTION_UPGRADED: 'subscription.upgraded',

  // Scan
  CARD_SCANNED: 'scan.card_scanned',
  QR_SCANNED: 'scan.qr_scanned',
  EMERGENCY_TRIGGERED: 'scan.emergency_triggered',

  // Attendance
  ATTENDANCE_MARKED: 'attendance.marked',
  ATTENDANCE_UPDATED: 'attendance.updated',

  // File
  FILE_UPLOADED: 'file.uploaded',
  FILE_DELETED: 'file.deleted',

  // System
  CONFIG_UPDATED: 'system.config_updated',
  MAINTENANCE_STARTED: 'system.maintenance_started',
  MAINTENANCE_ENDED: 'system.maintenance_ended',
};

/**
 * Log an audit event to the database.
 * Fire-and-forget — never blocks the main request.
 *
 * @param {Object} req - Express request
 * @param {string} action - From AUDIT_ACTION
 * @param {Object} [options]
 * @param {string} [options.actorId] - Who performed the action
 * @param {string} [options.actorType] - Role of the actor
 * @param {string} [options.targetId] - What was affected
 * @param {string} [options.targetType] - Type of affected entity
 * @param {string} [options.schoolId] - School context
 * @param {Object} [options.metadata] - Additional context
 * @param {Object} [options.oldValue] - Before state (for updates)
 * @param {Object} [options.newValue] - After state (for updates)
 *
 * @example
 *   await auditLog(req, AUDIT_ACTION.TEACHER_CREATED, {
 *     targetId: teacher.id,
 *     targetType: 'Teacher',
 *     metadata: { name: teacher.name, subject: teacher.subject },
 *   });
 */
export const auditLog = async (req, action, options = {}) => {
  const {
    actorId = req.user?.id || 'system',
    actorType = req.user?.role || 'SYSTEM',
    targetId = null,
    targetType = null,
    schoolId = req.user?.schoolId || req.schoolId || null,
    metadata = {},
    oldValue = null,
    newValue = null,
  } = options;

  const ip = extractIp(req);
  const agent = parseUserAgent(req);

  // Fire-and-forget — never let audit failure break the main flow
  prisma.auditLog
    .create({
      data: {
        action,
        actorId,
        actorType,
        actorName: req.user?.name || null,
        entity: targetType,
        entityId: targetId,
        schoolId,
        ipAddress: ip,
        device: agent.device,
        userAgent: agent.raw,
        oldValue: oldValue ? JSON.stringify(oldValue) : null,
        newValue: newValue ? JSON.stringify(newValue) : null,
        metadata: metadata,
        severity: 'INFO',
      },
    })
    .then(() => {
      logger.debug({ action, actorId, targetType, targetId }, '[Audit] Event logged');
    })
    .catch((err) => {
      logger.error({ err: err.message, action }, '[AuditLog] Failed to write audit log');
    });
};

/**
 * Log a security-related audit event (higher severity).
 */
export const securityAuditLog = async (req, action, options = {}) => {
  const {
    actorId = req.user?.id || 'system',
    targetId = null,
    targetType = null,
    schoolId = req.user?.schoolId || req.schoolId || null,
    metadata = {},
  } = options;

  const ip = extractIp(req);
  const agent = parseUserAgent(req);

  prisma.auditLog
    .create({
      data: {
        action,
        actorId,
        actorType: req.user?.role || 'SYSTEM',
        entity: targetType,
        entityId: targetId,
        schoolId,
        ipAddress: ip,
        device: agent.device,
        userAgent: agent.raw,
        metadata: metadata,
        severity: 'WARNING',
      },
    })
    .catch((err) => {
      logger.error({ err: err.message, action }, '[AuditLog] Failed to write security audit');
    });
};
