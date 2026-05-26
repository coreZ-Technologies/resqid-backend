// src/helpers/auditLogger.js
import { prisma } from '#config/prisma.js';
import { extractIp } from '../network/extractIp.js';
import { parseUserAgent } from '../network/userAgent.js';

/**
 * Action constants — import these instead of raw strings
 * so you never have a typo in an audit log
 */
export const AUDIT_ACTION = {
  // Auth
  LOGIN: 'auth.login',
  LOGOUT: 'auth.logout',
  OTP_SENT: 'auth.otp_sent',
  OTP_VERIFIED: 'auth.otp_verified',

  // School
  SCHOOL_CREATED: 'school.created',
  SCHOOL_UPDATED: 'school.updated',
  SCHOOL_DEACTIVATED: 'school.deactivated',

  // Student
  STUDENT_CREATED: 'student.created',
  STUDENT_UPDATED: 'student.updated',
  STUDENT_DELETED: 'student.deleted',

  // Subscription
  SUBSCRIPTION_CREATED: 'subscription.created',
  SUBSCRIPTION_RENEWED: 'subscription.renewed',
  SUBSCRIPTION_UPGRADED: 'subscription.upgraded',

  // Scan
  CARD_SCANNED: 'scan.card_scanned',
  EMERGENCY_TRIGGERED: 'scan.emergency_triggered',

  // Attendance
  ATTENDANCE_MARKED: 'attendance.marked',
  ATTENDANCE_UPDATED: 'attendance.updated',

  // File
  FILE_UPLOADED: 'file.uploaded',
  FILE_DELETED: 'file.deleted',
};

/**
 * Log an audit event to DB
 *
 * Usage:
 * await auditLog(req, AUDIT_ACTION.STUDENT_CREATED, {
 *   actorId: req.user.id,
 *   targetId: student.id,
 *   targetType: 'Student',
 *   metadata: { name: student.name }
 * })
 */
export const auditLog = async (req, action, options = {}) => {
  const {
    actorId = req.user?.id || null,
    actorType = req.user?.role || 'system',
    targetId = null,
    targetType = null,
    schoolId = req.user?.schoolId || null,
    metadata = {},
  } = options;

  const ip = extractIp(req);
  const agent = parseUserAgent(req);

  // Non-blocking — never let audit log failure break main flow
  prisma.auditLog
    .create({
      data: {
        action,
        actorId,
        actorType,
        targetId,
        targetType,
        schoolId,
        ip,
        device: agent.device,
        os: agent.os,
        browser: agent.browser,
        metadata: metadata,
      },
    })
    .catch((err) => {
      console.error('[AuditLog] Failed to write:', err.message);
    });
};
