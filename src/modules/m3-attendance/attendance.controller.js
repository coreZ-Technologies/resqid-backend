// =============================================================================
// modules/m3-attendance/attendance.controller.js — RESQID
// Thin HTTP layer — calls service, sends response.
// =============================================================================

import { ApiResponse } from '#shared/response/ApiResponse.js';
import * as service from './attendance.service.js';

// ═══════════════════════════════════════════════════════════════════════════════
// SESSION
// ═══════════════════════════════════════════════════════════════════════════════

export const openSession = async (req, res) => {
  const { grade, section, subject } = req.body;
  const session = await service.openSession({
    schoolId: req.schoolId,
    teacherId: req.user.id,
    grade,
    section,
    subject,
  });
  return ApiResponse.created(res, session, 'Session opened');
};

export const closeSession = async (req, res) => {
  const session = await service.closeSession({
    sessionId: req.params.sessionId,
    schoolId: req.schoolId,
  });
  return ApiResponse.ok(res, session, 'Session closed');
};

export const listSessions = async (req, res) => {
  const { page, limit, ...filters } = req.query;
  const result = await service.listSessions({
    schoolId: req.schoolId,
    filters,
    page,
    limit,
  });
  return ApiResponse.paginated(res, result.sessions, {
    page: result.page,
    limit: result.limit,
    total: result.total,
  });
};

// ═══════════════════════════════════════════════════════════════════════════════
// TAP (RFID Device)
// ═══════════════════════════════════════════════════════════════════════════════

export const processTap = async (req, res) => {
  const { uidHash, deviceId, tappedAt } = req.body;
  const schoolId = req.user?.schoolId;

  const result = await service.processTap({ uidHash, deviceId, tappedAt, schoolId });

  return ApiResponse.ok(res, result, result.alreadyMarked ? 'Already marked' : 'Marked PRESENT');
};

// ═══════════════════════════════════════════════════════════════════════════════
// BULK SYNC (ESP32 Offline)
// ═══════════════════════════════════════════════════════════════════════════════

export const processBulkTaps = async (req, res) => {
  const { deviceId, taps } = req.body;
  const schoolId = req.user?.schoolId;

  const result = await service.processBulkTaps({ deviceId, schoolId, taps });

  return ApiResponse.ok(
    res,
    result,
    `Processed ${result.processed}, ${result.duplicates} duplicates, ${result.errors} errors`
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MANUAL MARKS
// ═══════════════════════════════════════════════════════════════════════════════

export const markAttendance = async (req, res) => {
  const { sessionId } = req.params;
  const { studentId, status } = req.body;
  const record = await service.markAttendance({
    sessionId,
    studentId,
    status,
    schoolId: req.schoolId,
  });
  return ApiResponse.created(res, record, 'Attendance marked');
};

export const bulkMarkAttendance = async (req, res) => {
  const { sessionId } = req.params;
  const { records } = req.body;
  const result = await service.bulkMarkAttendance({
    sessionId,
    records,
    schoolId: req.schoolId,
  });
  return ApiResponse.created(res, result, `${result.count} records marked`);
};

export const updateAttendance = async (req, res) => {
  const { sessionId, studentId } = req.params;
  const { status } = req.body;
  const record = await service.updateAttendance({
    sessionId,
    studentId,
    status,
    schoolId: req.schoolId,
  });
  return ApiResponse.ok(res, record, 'Attendance updated');
};

// ═══════════════════════════════════════════════════════════════════════════════
// QUERIES
// ═══════════════════════════════════════════════════════════════════════════════

export const getSessionRecords = async (req, res) => {
  const { sessionId } = req.params;
  const { page, limit } = req.query;
  const result = await service.getSessionRecords({
    sessionId,
    schoolId: req.schoolId,
    page,
    limit,
  });
  return ApiResponse.paginated(res, result.records, {
    page: result.page,
    limit: result.limit,
    total: result.total,
  });
};

export const getStudentAttendance = async (req, res) => {
  const { studentId } = req.params;
  const { page, limit, from, to } = req.query;
  const result = await service.getStudentAttendance({
    studentId,
    schoolId: req.schoolId,
    page,
    limit,
    from,
    to,
  });
  return ApiResponse.paginated(res, result.records, {
    page: result.page,
    limit: result.limit,
    total: result.total,
  });
};

export const getClassAttendance = async (req, res) => {
  const { grade, section, from, to } = req.query;
  const result = await service.getClassAttendance({
    schoolId: req.schoolId,
    grade,
    section,
    from,
    to,
  });
  return ApiResponse.ok(res, result);
};

// ═══════════════════════════════════════════════════════════════════════════════
// DEVICE
// ═══════════════════════════════════════════════════════════════════════════════

export const registerDevice = async (req, res) => {
  const { name, location } = req.body;
  const device = await service.registerDevice({
    schoolId: req.schoolId,
    name,
    location,
  });
  return ApiResponse.created(res, device, 'Device registered');
};

export const deviceHeartbeat = async (req, res) => {
  const deviceId = req.user?.id;
  const device = await service.deviceHeartbeat(deviceId);
  return ApiResponse.ok(res, { lastSeen: device.lastSeenAt }, 'Heartbeat received');
};

export const listDevices = async (req, res) => {
  const devices = await service.listDevices(req.schoolId);
  return ApiResponse.ok(res, devices);
};
