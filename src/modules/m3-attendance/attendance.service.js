// =============================================================================
// modules/m3-attendance/attendance.service.js — RESQID
// Business logic for all attendance operations.
// =============================================================================

import { ApiError } from '#shared/response/ApiError.js';
import { logger } from '#config/logger.js';
import * as repo from './attendance.repository.js';

// ═══════════════════════════════════════════════════════════════════════════════
// SESSION
// ═══════════════════════════════════════════════════════════════════════════════

export const openSession = async ({ schoolId, teacherId, grade, section, subject }) => {
  const existing = await repo.findActiveSessionByClass(schoolId, grade, section);
  if (existing) {
    throw ApiError.conflict(`Active session already exists for Grade ${grade}-${section}`);
  }
  return repo.createSession({ schoolId, teacherId, grade, section, subject });
};

export const closeSession = async ({ sessionId, schoolId }) => {
  const session = await repo.findSessionById(sessionId, schoolId);
  if (!session) throw ApiError.notFound('Session not found');
  if (!session.isActive) throw ApiError.conflict('Session already closed');
  return repo.closeSession(sessionId);
};

export const listSessions = async ({ schoolId, filters, page, limit }) => {
  const [sessions, total] = await repo.listSessions({ schoolId, filters, page, limit });
  return { sessions, total, page: parseInt(page) || 1, limit: parseInt(limit) || 20 };
};

// ═══════════════════════════════════════════════════════════════════════════════
// TAP (RFID)
// ═══════════════════════════════════════════════════════════════════════════════

export const processTap = async ({ uidHash, deviceId, tappedAt, schoolId }) => {
  // 🔧 Find student by RFID tag (not token)
  const student = await repo.findStudentByRfid(uidHash, schoolId);
  if (!student) {
    logger.warn({ uidHash, deviceId }, '[attendance] Invalid tap — student not found');
    throw ApiError.notFound('No student found for this RFID card');
  }

  const studentId = student.id;

  // Find or create active session for today
  let session = await repo.findActiveSession(schoolId);
  if (!session) {
    session = await repo.createSession({
      schoolId,
      teacherId: 'SYSTEM',
      grade: student.grade || 'ALL',
      section: student.section || 'ALL',
    });
  }

  // 🔧 Create raw tap record
  const tap = await repo.createTap({
    sessionId: session.id,
    schoolId,
    studentId,
    uidHash,
    deviceId,
    deviceName: deviceId,
  });

  // Check for duplicate (same student, same session, within 30 seconds)
  const existing = await repo.findRecord(session.id, studentId);
  if (existing) {
    await repo.markTapProcessed(tap.id);
    return { alreadyMarked: true, studentId, student };
  }

  // Create attendance record
  const record = await repo.upsertRecord({
    sessionId: session.id,
    studentId,
    schoolId,
    status: 'PRESENT',
    markedAt: tappedAt ? new Date(tappedAt) : new Date(),
    tapId: tap.id,
  });

  // 🔧 Mark tap as processed
  await repo.markTapProcessed(tap.id);

  // 🔧 Update device heartbeat
  if (deviceId) {
    repo.updateDeviceHeartbeat(deviceId).catch(() => {});
  }

  logger.info({ studentId, deviceId }, '[attendance] Tap processed');

  return {
    alreadyMarked: false,
    studentId,
    student,
    record,
    tapId: tap.id,
  };
};

// ═══════════════════════════════════════════════════════════════════════════════
// BULK SYNC (ESP32 Offline)
// ═══════════════════════════════════════════════════════════════════════════════

export const processBulkTaps = async ({ deviceId, schoolId, taps }) => {
  let processed = 0,
    duplicates = 0,
    errors = 0;

  for (const tap of taps) {
    try {
      const result = await processTap({
        uidHash: tap.uidHash,
        deviceId,
        tappedAt: tap.tappedAt,
        schoolId,
      });
      if (result.alreadyMarked) duplicates++;
      else processed++;
    } catch (err) {
      logger.warn({ err: err.message, uidHash: tap.uidHash }, '[attendance] Bulk tap error');
      errors++;
    }
  }

  // Update device last seen
  repo.updateDeviceHeartbeat(deviceId).catch(() => {});

  return { processed, duplicates, errors, total: taps.length };
};

// ═══════════════════════════════════════════════════════════════════════════════
// MANUAL MARK
// ═══════════════════════════════════════════════════════════════════════════════

export const markAttendance = async ({ sessionId, studentId, status, schoolId }) => {
  const session = await repo.findSessionById(sessionId, schoolId);
  if (!session) throw ApiError.notFound('Session not found');
  if (!session.isActive) throw ApiError.conflict('Session is closed');

  return repo.upsertRecord({
    sessionId,
    studentId,
    schoolId,
    status,
    markedAt: new Date(),
  });
};

export const bulkMarkAttendance = async ({ sessionId, records, schoolId }) => {
  const session = await repo.findSessionById(sessionId, schoolId);
  if (!session) throw ApiError.notFound('Session not found');
  if (!session.isActive) throw ApiError.conflict('Session is closed');

  const results = [];
  for (const { studentId, status } of records) {
    const record = await repo.upsertRecord({
      sessionId,
      studentId,
      schoolId,
      status,
      markedAt: new Date(),
    });
    results.push(record);
  }

  return { count: results.length, records: results };
};

export const updateAttendance = async ({ sessionId, studentId, status, schoolId }) => {
  const existing = await repo.findRecord(sessionId, studentId);
  if (!existing) throw ApiError.notFound('Record not found');

  return repo.upsertRecord({
    sessionId,
    studentId,
    schoolId,
    status,
    markedAt: new Date(),
  });
};

// ═══════════════════════════════════════════════════════════════════════════════
// QUERY
// ═══════════════════════════════════════════════════════════════════════════════

export const getSessionRecords = async ({ sessionId, schoolId, page, limit }) => {
  const session = await repo.findSessionById(sessionId, schoolId);
  if (!session) throw ApiError.notFound('Session not found');

  const [records, total] = await repo.listSessionRecords(sessionId, page, limit);
  return { session, records, total, page: parseInt(page) || 1, limit: parseInt(limit) || 20 };
};

export const getStudentAttendance = async ({ studentId, schoolId, page, limit, from, to }) => {
  const [records, total] = await repo.listStudentRecords(studentId, { page, limit, from, to });
  return { records, total, page: parseInt(page) || 1, limit: parseInt(limit) || 20 };
};

export const getClassAttendance = async ({ schoolId, grade, section, from, to }) => {
  const records = await repo.listClassRecords(schoolId, grade, section, from, to);
  return { grade, section, total: records.length, records };
};

// ═══════════════════════════════════════════════════════════════════════════════
// DEVICE
// ═══════════════════════════════════════════════════════════════════════════════

export const registerDevice = async ({ schoolId, name, location }) => {
  return repo.createDevice({ schoolId, name, location });
};

export const deviceHeartbeat = async (deviceId) => {
  return repo.updateDeviceHeartbeat(deviceId);
};

export const listDevices = async (schoolId) => {
  return repo.listDevices(schoolId);
};
