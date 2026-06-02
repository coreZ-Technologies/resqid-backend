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
  return { sessions, total, page, limit };
};

// ═══════════════════════════════════════════════════════════════════════════════
// TAP (RFID)
// ═══════════════════════════════════════════════════════════════════════════════

export const processTap = async ({ uidHash, deviceId, tappedAt, schoolId }) => {
  // Find token by RFID UID
  const token = await repo.findTokenByUid(uidHash, schoolId);
  if (!token || !token.studentId) {
    logger.warn({ uidHash, deviceId }, '[attendance] Invalid tap — token not found');
    throw ApiError.notFound('No active token found for this card');
  }

  const studentId = token.studentId;

  // Find or create active session for today
  let session = await repo.findActiveSession(schoolId);
  if (!session) {
    session = await repo.createSession({
      schoolId,
      teacherId: 'SYSTEM',
      grade: 'ALL',
      section: 'ALL',
    });
  }

  // Check for duplicate tap (same student, within 30 seconds)
  const recentWindow = new Date(
    tappedAt ? new Date(tappedAt).getTime() - 30000 : Date.now() - 30000
  );
  const existing = await repo.findRecord(session.id, studentId);
  const isRecent = existing && new Date(existing.markedAt) > recentWindow;

  if (isRecent) {
    return { alreadyMarked: true, studentId };
  }

  // Create attendance record
  const record = await repo.upsertRecord({
    sessionId: session.id,
    studentId,
    schoolId,
    status: 'PRESENT',
    markedAt: tappedAt ? new Date(tappedAt) : new Date(),
  });

  return {
    alreadyMarked: false,
    studentId,
    record,
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
    } catch {
      errors++;
    }
  }

  // Update device last seen
  await repo.updateDeviceHeartbeat(deviceId);

  return { processed, duplicates, errors, total: taps.length };
};

// ═══════════════════════════════════════════════════════════════════════════════
// MANUAL MARK
// ═══════════════════════════════════════════════════════════════════════════════

export const markAttendance = async ({ sessionId, studentId, status, schoolId }) => {
  const session = await repo.findSessionById(sessionId, schoolId);
  if (!session) throw ApiError.notFound('Session not found');
  if (!session.isActive) throw ApiError.conflict('Session is closed');

  return repo.upsertRecord({ sessionId, studentId, schoolId, status, markedAt: new Date() });
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

  return { count: results.length };
};

export const updateAttendance = async ({ sessionId, studentId, status, schoolId }) => {
  const existing = await repo.findRecord(sessionId, studentId);
  if (!existing) throw ApiError.notFound('Record not found');
  return repo.upsertRecord({ sessionId, studentId, schoolId, status, markedAt: new Date() });
};

// ═══════════════════════════════════════════════════════════════════════════════
// QUERY
// ═══════════════════════════════════════════════════════════════════════════════

export const getSessionRecords = async ({ sessionId, schoolId, page, limit }) => {
  const session = await repo.findSessionById(sessionId, schoolId);
  if (!session) throw ApiError.notFound('Session not found');
  const [records, total] = await repo.listSessionRecords(sessionId, page, limit);
  return { session, records, total, page, limit };
};

export const getStudentAttendance = async ({ studentId, schoolId, page, limit, from, to }) => {
  const [records, total] = await repo.listStudentRecords(studentId, { page, limit, from, to });
  return { records, total, page, limit };
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
