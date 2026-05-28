// TODO: Add implementation
// =============================================================================
// attendance.controller.js — RESQID
// Thin HTTP layer — validates input, calls service, sends response
// No business logic here
// =============================================================================

import { ApiResponse } from '#shared/response/ApiResponse.js';
import * as service from './attendance.service.js';

// ─── Session Controllers ──────────────────────────────────────────────────────

/**
 * POST /api/attendance/sessions
 * Teacher opens an attendance session for their class
 */
export const openSession = async (req, res) => {
  const { grade, section, subject } = req.body;
  const { id: teacherId, schoolId } = req.user;

  const session = await service.openSession({ schoolId, teacherId, grade, section, subject });

  return ApiResponse.created(res, session, 'Attendance session opened');
};

/**
 * POST /api/attendance/sessions/:sessionId/close
 * Teacher closes an active session
 */
export const closeSession = async (req, res) => {
  const { sessionId } = req.params;
  const { id: actorId, schoolId } = req.user;

  const session = await service.closeSession({ sessionId, schoolId, actorId });

  return ApiResponse.ok(res, session, 'Session closed successfully');
};

/**
 * GET /api/attendance/sessions/:sessionId
 * Get a single session by ID
 */
export const getSession = async (req, res) => {
  const { sessionId } = req.params;
  const { schoolId } = req.user;

  const session = await service.getSession({ sessionId, schoolId });

  return ApiResponse.ok(res, session);
};

/**
 * GET /api/attendance/sessions
 * List sessions for the school with optional filters
 */
export const listSessions = async (req, res) => {
  const { schoolId } = req.user;
  const { page, limit, grade, section, isActive, teacherId, from, to } = req.query;

  const result = await service.listSessions({
    schoolId,
    filters: { grade, section, isActive, teacherId, from, to },
    page,
    limit,
  });

  return ApiResponse.paginated(res, result.sessions, {
    page: result.page,
    limit: result.limit,
    total: result.total,
  });
};

// ─── Tap Controller (RFID Device) ─────────────────────────────────────────────

/**
 * POST /api/attendance/tap
 * RFID device taps a student card — device-auth route (no JWT)
 */
export const processTap = async (req, res) => {
  const { sessionId, uidHash, deviceId, tappedAt } = req.body;

  // req.device is attached by device auth middleware
  const schoolId = req.device?.schoolId;

  const result = await service.processTap({
    sessionId,
    uidHash,
    deviceId: deviceId || req.device?.id,
    tappedAt,
    schoolId,
  });

  const message = result.alreadyMarked
    ? `${result.student.firstName} already marked`
    : `${result.student.firstName} marked PRESENT`;

  return ApiResponse.ok(res, result, message);
};

// ─── Manual Mark Controllers ──────────────────────────────────────────────────

/**
 * POST /api/attendance/sessions/:sessionId/records
 * Manually mark a single student
 */
export const markAttendance = async (req, res) => {
  const { sessionId } = req.params;
  const { studentId, status } = req.body;
  const { id: markedBy, schoolId } = req.user;

  const record = await service.markAttendance({
    sessionId,
    studentId,
    status,
    schoolId,
    markedBy,
  });

  return ApiResponse.created(res, record, 'Attendance marked');
};

/**
 * POST /api/attendance/sessions/:sessionId/records/bulk
 * Bulk mark multiple students in one request
 */
export const bulkMarkAttendance = async (req, res) => {
  const { sessionId } = req.params;
  const { records } = req.body;
  const { id: markedBy, schoolId } = req.user;

  const result = await service.bulkMarkAttendance({
    sessionId,
    records,
    schoolId,
    markedBy,
  });

  return ApiResponse.created(res, result, `${result.count} records marked`);
};

/**
 * PATCH /api/attendance/sessions/:sessionId/records/:studentId
 * Update a student's attendance status
 */
export const updateAttendance = async (req, res) => {
  const { sessionId, studentId } = req.params;
  const { status } = req.body;
  const { id: markedBy, schoolId } = req.user;

  const record = await service.updateAttendance({
    sessionId,
    studentId,
    status,
    schoolId,
    markedBy,
  });

  return ApiResponse.ok(res, record, 'Attendance updated');
};

/**
 * DELETE /api/attendance/sessions/:sessionId/records/:studentId
 * Remove an attendance record
 */
export const deleteAttendance = async (req, res) => {
  const { sessionId, studentId } = req.params;
  const { id: actorId, schoolId } = req.user;

  await service.deleteAttendance({ sessionId, studentId, schoolId, actorId });

  return ApiResponse.noContent(res);
};

// ─── Query / Report Controllers ───────────────────────────────────────────────

/**
 * GET /api/attendance/sessions/:sessionId/records
 * List all records in a session
 */
export const getSessionRecords = async (req, res) => {
  const { sessionId } = req.params;
  const { page, limit } = req.query;
  const { schoolId } = req.user;

  const result = await service.getSessionRecords({ sessionId, schoolId, page, limit });

  return ApiResponse.paginated(
    res,
    { session: result.session, records: result.records },
    { page: result.page, limit: result.limit, total: result.total }
  );
};

/**
 * GET /api/attendance/students/:studentId
 * Full attendance history for a student
 */
export const getStudentAttendance = async (req, res) => {
  const { studentId } = req.params;
  const { page, limit, from, to } = req.query;
  const { schoolId } = req.user;

  const result = await service.getStudentAttendance({
    studentId,
    schoolId,
    page,
    limit,
    from,
    to,
  });

  return ApiResponse.paginated(
    res,
    { summary: result.summary, records: result.records },
    { page: result.page, limit: result.limit, total: result.total }
  );
};

/**
 * GET /api/attendance/class
 * Attendance report for a grade+section
 */
export const getClassAttendance = async (req, res) => {
  const { grade, section, from, to } = req.query;
  const { schoolId } = req.user;

  const result = await service.getClassAttendance({ schoolId, grade, section, from, to });

  return ApiResponse.ok(res, result);
};

// ─── Device Controllers ───────────────────────────────────────────────────────

/**
 * POST /api/attendance/device/register
 * Register a new RFID device (school admin only)
 */
export const registerDevice = async (req, res) => {
  const { deviceName, deviceIdentifier, location } = req.body;
  const { id: actorId, schoolId } = req.user;

  const device = await service.registerDevice({
    schoolId,
    deviceName,
    deviceIdentifier,
    location,
    actorId,
  });

  return ApiResponse.created(res, device, 'Device registered successfully');
};

/**
 * DELETE /api/attendance/device/:deviceId
 * Remove a registered device
 */
export const removeDevice = async (req, res) => {
  const { deviceId } = req.params;
  const { id: actorId, schoolId } = req.user;

  await service.removeDevice({ deviceId, schoolId, actorId });

  return ApiResponse.noContent(res);
};

/**
 * GET /api/attendance/devices
 * List all registered devices for this school
 */
export const listDevices = async (req, res) => {
  const { schoolId } = req.user;

  const devices = await service.listDevices(schoolId);

  return ApiResponse.list(res, devices, devices.length);
};

/**
 * POST /api/attendance/device/heartbeat
 * Device-auth route — device pings to mark itself online
 */
export const deviceHeartbeat = async (req, res) => {
  // sub from device JWT = deviceId
  const deviceId = req.user?.sub;

  const device = await service.deviceHeartbeat(deviceId);

  return ApiResponse.ok(res, { lastSeen: device.lastSeen }, 'Heartbeat received');
};