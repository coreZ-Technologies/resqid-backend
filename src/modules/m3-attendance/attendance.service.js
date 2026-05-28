// TODO: Add implementation
// =============================================================================
// attendance.service.js — RESQID
// Business logic for all attendance operations
// =============================================================================

import { ApiError } from '#shared/response/ApiError.js';
import { AUDIT_ACTION } from '#shared/constants/audit.js';
import { auditLogger } from '#shared/utils/auditLogger.js';
import * as repo from './attendance.repository.js';

// ─── Session Service ──────────────────────────────────────────────────────────

/**
 * Open a new attendance session for a class.
 * Prevents duplicate active sessions for the same grade+section.
 */
export const openSession = async ({ schoolId, teacherId, grade, section, subject }) => {
  // Block if an active session already exists for this class
  const existing = await repo.findActiveSessionByClass(schoolId, grade, section);
  if (existing) {
    throw ApiError.conflict(
      `An active session already exists for Grade ${grade}-${section}. Close it before opening a new one.`
    );
  }

  const session = await repo.createSession({ schoolId, teacherId, grade, section, subject });

  await auditLogger.log({
    action: AUDIT_ACTION.ATTENDANCE_SESSION_OPENED,
    actorId: teacherId,
    schoolId,
    targetId: session.id,
    metadata: { grade, section, subject },
  });

  return session;
};

/**
 * Close an active attendance session.
 */
export const closeSession = async ({ sessionId, schoolId, actorId }) => {
  const session = await repo.findSessionById(sessionId, schoolId);

  if (!session) throw ApiError.notFound('Attendance session not found');
  if (!session.isActive) throw ApiError.conflict('Session is already closed');

  const closed = await repo.closeSession(sessionId);

  await auditLogger.log({
    action: AUDIT_ACTION.ATTENDANCE_SESSION_CLOSED,
    actorId,
    schoolId,
    targetId: sessionId,
    metadata: { grade: session.grade, section: session.section },
  });

  return closed;
};

/**
 * Get a single session by ID.
 */
export const getSession = async ({ sessionId, schoolId }) => {
  const session = await repo.findSessionById(sessionId, schoolId);
  if (!session) throw ApiError.notFound('Attendance session not found');
  return session;
};

/**
 * Paginated list of sessions for a school.
 */
export const listSessions = async ({ schoolId, filters, page, limit }) => {
  const [sessions, total] = await repo.listSessions({ schoolId, filters, page, limit });
  return { sessions, total, page, limit };
};

// ─── Tap Service (RFID) ───────────────────────────────────────────────────────

/**
 * Process an RFID tap from an attendance device.
 * Validates the session is active, resolves student, and upserts record.
 */
export const processTap = async ({ sessionId, uidHash, deviceId, tappedAt, schoolId }) => {
  // 1. Validate session is open
  const session = await repo.findSessionById(sessionId, schoolId);
  if (!session) throw ApiError.notFound('Attendance session not found');
  if (!session.isActive) {
    throw ApiError.conflict('Attendance session is closed');
  }

  // 2. Resolve student from UID hash
  const token = await repo.findStudentByUidHash(uidHash, schoolId);
  if (!token) {
    await auditLogger.log({
      action: AUDIT_ACTION.ATTENDANCE_TAP_INVALID,
      actorId: deviceId || 'unknown_device',
      schoolId,
      targetId: sessionId,
      metadata: { uidHash, reason: 'token_not_found' },
    });
    throw ApiError.notFound('No active token found for this UID');
  }

  const { student } = token;
  if (!student || !student.isActive) {
    throw ApiError.forbidden('Student is inactive');
  }

  // 3. Record the tap
  const tap = await repo.createTap({
    sessionId,
    studentId: student.id,
    schoolId,
    uidHash,
    deviceId,
    tappedAt,
  });

  // 4. Upsert attendance record (first tap = PRESENT, subsequent taps ignored)
  const existing = await repo.findRecord(sessionId, student.id);
  let record = existing;

  if (!existing) {
    record = await repo.upsertRecord({
      sessionId,
      studentId: student.id,
      schoolId,
      status: 'PRESENT',
      markedBy: deviceId || 'RFID_DEVICE',
    });

    await auditLogger.log({
      action: AUDIT_ACTION.ATTENDANCE_MARKED,
      actorId: deviceId || 'RFID_DEVICE',
      schoolId,
      targetId: student.id,
      metadata: { sessionId, status: 'PRESENT', method: 'rfid_tap' },
    });
  }

  await repo.markTapProcessed(tap.id);

  return {
    tap,
    student: {
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
    },
    alreadyMarked: !!existing,
    record,
  };
};

// ─── Manual Mark Service ──────────────────────────────────────────────────────

/**
 * Mark a single student's attendance manually.
 */
export const markAttendance = async ({ sessionId, studentId, status, schoolId, markedBy }) => {
  const session = await repo.findSessionById(sessionId, schoolId);
  if (!session) throw ApiError.notFound('Attendance session not found');
  if (!session.isActive) throw ApiError.conflict('Cannot mark attendance on a closed session');

  const record = await repo.upsertRecord({
    sessionId,
    studentId,
    schoolId,
    status,
    markedBy,
  });

  await auditLogger.log({
    action: AUDIT_ACTION.ATTENDANCE_MARKED,
    actorId: markedBy,
    schoolId,
    targetId: studentId,
    metadata: { sessionId, status, method: 'manual' },
  });

  return record;
};

/**
 * Bulk mark attendance for multiple students in one session.
 */
export const bulkMarkAttendance = async ({ sessionId, records, schoolId, markedBy }) => {
  const session = await repo.findSessionById(sessionId, schoolId);
  if (!session) throw ApiError.notFound('Attendance session not found');
  if (!session.isActive) throw ApiError.conflict('Cannot bulk-mark a closed session');

  const enriched = records.map(({ studentId, status }) => ({
    sessionId,
    studentId,
    schoolId,
    status,
    markedBy,
  }));

  const results = await repo.bulkUpsertRecords(enriched);

  await auditLogger.log({
    action: AUDIT_ACTION.ATTENDANCE_BULK_MARKED,
    actorId: markedBy,
    schoolId,
    targetId: sessionId,
    metadata: { count: records.length, sessionId },
  });

  return { count: results.length, records: results };
};

/**
 * Update an existing attendance record (e.g. PRESENT → LATE).
 */
export const updateAttendance = async ({ sessionId, studentId, status, schoolId, markedBy }) => {
  const existing = await repo.findRecord(sessionId, studentId);
  if (!existing) throw ApiError.notFound('Attendance record not found');

  const record = await repo.upsertRecord({
    sessionId,
    studentId,
    schoolId,
    status,
    markedBy,
  });

  await auditLogger.log({
    action: AUDIT_ACTION.ATTENDANCE_UPDATED,
    actorId: markedBy,
    schoolId,
    targetId: studentId,
    metadata: { sessionId, oldStatus: existing.status, newStatus: status },
  });

  return record;
};

/**
 * Delete an attendance record from a session.
 */
export const deleteAttendance = async ({ sessionId, studentId, schoolId, actorId }) => {
  const session = await repo.findSessionById(sessionId, schoolId);
  if (!session) throw ApiError.notFound('Attendance session not found');

  const existing = await repo.findRecord(sessionId, studentId);
  if (!existing) throw ApiError.notFound('Attendance record not found');

  await repo.deleteRecord(sessionId, studentId);

  await auditLogger.log({
    action: AUDIT_ACTION.ATTENDANCE_DELETED,
    actorId,
    schoolId,
    targetId: studentId,
    metadata: { sessionId },
  });
};

// ─── Query / Report Service ───────────────────────────────────────────────────

/**
 * Get all records in a session, paginated.
 */
export const getSessionRecords = async ({ sessionId, schoolId, page, limit }) => {
  const session = await repo.findSessionById(sessionId, schoolId);
  if (!session) throw ApiError.notFound('Attendance session not found');

  const [records, total] = await repo.listSessionRecords(sessionId, { page, limit });
  return { session, records, total, page, limit };
};

/**
 * Get attendance history for a specific student.
 */
export const getStudentAttendance = async ({ studentId, schoolId, page, limit, from, to }) => {
  const [records, total] = await repo.listStudentRecords(studentId, { page, limit, from, to });
  const summary = await repo.getStudentAttendanceSummary(studentId, schoolId);

  // Shape summary into a flat map { PRESENT: 10, ABSENT: 2, ... }
  const summaryMap = Object.fromEntries(summary.map((s) => [s.status, s._count.status]));

  return { records, total, page, limit, summary: summaryMap };
};

/**
 * Get attendance records for an entire class.
 */
export const getClassAttendance = async ({ schoolId, grade, section, from, to }) => {
  const records = await repo.listClassRecords(schoolId, { grade, section, from, to });
  return { grade, section, total: records.length, records };
};

// ─── Device Service ───────────────────────────────────────────────────────────

/**
 * Register a new RFID device for a school.
 */
export const registerDevice = async ({ schoolId, deviceName, deviceIdentifier, location, actorId }) => {
  const existing = await repo.findDeviceByIdentifier(deviceIdentifier, schoolId);
  if (existing) throw ApiError.conflict('A device with this identifier is already registered');

  const device = await repo.registerDevice({ schoolId, deviceName, deviceIdentifier, location });

  await auditLogger.log({
    action: AUDIT_ACTION.ATTENDANCE_DEVICE_REGISTERED,
    actorId,
    schoolId,
    targetId: device.id,
    metadata: { deviceName, deviceIdentifier },
  });

  return device;
};

/**
 * Remove a registered device.
 */
export const removeDevice = async ({ deviceId, schoolId, actorId }) => {
  const device = await repo.findDeviceById(deviceId, schoolId);
  if (!device) throw ApiError.notFound('Device not found');

  await repo.removeDevice(deviceId);

  await auditLogger.log({
    action: AUDIT_ACTION.ATTENDANCE_DEVICE_REMOVED,
    actorId,
    schoolId,
    targetId: deviceId,
    metadata: { deviceName: device.deviceName },
  });
};

/**
 * List all devices for a school.
 */
export const listDevices = async (schoolId) => {
  return repo.listDevices(schoolId);
};

/**
 * Heartbeat — update device last-seen and online status.
 */
export const deviceHeartbeat = async (deviceId) => {
  // deviceId comes from JWT payload (ATTENDANCE_DEVICE role)
  return repo.updateDeviceHeartbeat(deviceId, true);
};