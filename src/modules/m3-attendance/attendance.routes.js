// TODO: Add implementation
// =============================================================================
// attendance.routes.js — RESQID
//
// Route map:
//
//   Sessions (Teacher / School Admin)
//   POST   /sessions                              → open session
//   POST   /sessions/:sessionId/close             → close session
//   GET    /sessions                              → list sessions
//   GET    /sessions/:sessionId                   → get session
//
//   Records — Manual marking (Teacher / School Admin)
//   POST   /sessions/:sessionId/records           → mark single
//   POST   /sessions/:sessionId/records/bulk      → bulk mark
//   PATCH  /sessions/:sessionId/records/:studentId → update
//   DELETE /sessions/:sessionId/records/:studentId → delete
//
//   Records — Queries (Teacher / School Admin)
//   GET    /sessions/:sessionId/records           → records in session
//   GET    /students/:studentId                   → student history
//   GET    /class                                 → class report
//
//   RFID Device (device-auth — no JWT)
//   POST   /tap                                   → RFID tap
//   POST   /device/heartbeat                      → device ping
//
//   Device Management (School Admin)
//   POST   /device/register                       → register device
//   DELETE /device/:deviceId                      → remove device
//   GET    /devices                               → list devices
// =============================================================================

import { Router } from 'express';
import { asyncHandler } from '#shared/response/asyncHandler.js';
import { validate } from '#shared/middleware/validate.middleware.js';
import { authenticate } from '#shared/middleware/authenticate.middleware.js';
import { authorize } from '#shared/middleware/authorize.middleware.js';
import { ROLES } from '#shared/constants/roles.js';
import * as controller from './attendance.controller.js';
import {
  openSessionSchema,
  closeSessionSchema,
  getSessionSchema,
  listSessionsSchema,
  tapSchema,
  markAttendanceSchema,
  bulkMarkAttendanceSchema,
  updateAttendanceSchema,
  deleteAttendanceSchema,
  sessionRecordsSchema,
  studentAttendanceSchema,
  classAttendanceSchema,
  registerDeviceSchema,
  removeDeviceSchema,
} from './attendance.validation.js';

const router = Router();

// ─── Shorthand role groups ────────────────────────────────────────────────────

const TEACHER_AND_ABOVE = [ROLES.TEACHER, ROLES.SCHOOL_ADMIN, ROLES.SUPER_ADMIN];
const SCHOOL_ADMIN_AND_ABOVE = [ROLES.SCHOOL_ADMIN, ROLES.SUPER_ADMIN];

// ─── Sessions ─────────────────────────────────────────────────────────────────

router.post(
  '/sessions',
  authenticate,
  authorize(TEACHER_AND_ABOVE),
  validate(openSessionSchema),
  asyncHandler(controller.openSession)
);

router.post(
  '/sessions/:sessionId/close',
  authenticate,
  authorize(TEACHER_AND_ABOVE),
  validate(closeSessionSchema),
  asyncHandler(controller.closeSession)
);

router.get(
  '/sessions',
  authenticate,
  authorize(TEACHER_AND_ABOVE),
  validate(listSessionsSchema),
  asyncHandler(controller.listSessions)
);

router.get(
  '/sessions/:sessionId',
  authenticate,
  authorize(TEACHER_AND_ABOVE),
  validate(getSessionSchema),
  asyncHandler(controller.getSession)
);

// ─── Records — Manual Mark ────────────────────────────────────────────────────

router.post(
  '/sessions/:sessionId/records',
  authenticate,
  authorize(TEACHER_AND_ABOVE),
  validate(markAttendanceSchema),
  asyncHandler(controller.markAttendance)
);

router.post(
  '/sessions/:sessionId/records/bulk',
  authenticate,
  authorize(TEACHER_AND_ABOVE),
  validate(bulkMarkAttendanceSchema),
  asyncHandler(controller.bulkMarkAttendance)
);

router.patch(
  '/sessions/:sessionId/records/:studentId',
  authenticate,
  authorize(TEACHER_AND_ABOVE),
  validate(updateAttendanceSchema),
  asyncHandler(controller.updateAttendance)
);

router.delete(
  '/sessions/:sessionId/records/:studentId',
  authenticate,
  authorize(SCHOOL_ADMIN_AND_ABOVE),
  validate(deleteAttendanceSchema),
  asyncHandler(controller.deleteAttendance)
);

// ─── Records — Queries ────────────────────────────────────────────────────────

router.get(
  '/sessions/:sessionId/records',
  authenticate,
  authorize(TEACHER_AND_ABOVE),
  validate(sessionRecordsSchema),
  asyncHandler(controller.getSessionRecords)
);

router.get(
  '/students/:studentId',
  authenticate,
  authorize(TEACHER_AND_ABOVE),
  validate(studentAttendanceSchema),
  asyncHandler(controller.getStudentAttendance)
);

router.get(
  '/class',
  authenticate,
  authorize(TEACHER_AND_ABOVE),
  validate(classAttendanceSchema),
  asyncHandler(controller.getClassAttendance)
);

// ─── RFID Device Routes (device-auth — bypass JWT) ───────────────────────────
// These paths are listed in publicPaths.js → EXACT_PUBLIC_PATHS
// Device middleware runs instead of JWT authenticate

router.post(
  '/tap',
  // No JWT authenticate — device identity from req.device set by deviceAuth middleware
  validate(tapSchema),
  asyncHandler(controller.processTap)
);

router.post(
  '/device/heartbeat',
  // Device JWT verified by deviceAuth middleware upstream
  asyncHandler(controller.deviceHeartbeat)
);

// ─── Device Management (School Admin) ────────────────────────────────────────

router.post(
  '/device/register',
  authenticate,
  authorize(SCHOOL_ADMIN_AND_ABOVE),
  validate(registerDeviceSchema),
  asyncHandler(controller.registerDevice)
);

router.delete(
  '/device/:deviceId',
  authenticate,
  authorize(SCHOOL_ADMIN_AND_ABOVE),
  validate(removeDeviceSchema),
  asyncHandler(controller.removeDevice)
);

router.get(
  '/devices',
  authenticate,
  authorize(SCHOOL_ADMIN_AND_ABOVE),
  asyncHandler(controller.listDevices)
);

export default router;