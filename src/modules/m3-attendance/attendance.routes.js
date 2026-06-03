// =============================================================================
// modules/m3-attendance/attendance.routes.js — RESQID
// Mounted at /api/attendance
// =============================================================================

import { Router } from 'express';
import { validate } from '#middleware/validate.middleware.js';
import { authenticate } from '#middleware/auth/authenticate.middleware.js';
import { authorize } from '#middleware/auth/authorize.middleware.js';
import { ROLES } from '#shared/constants/roles.js';
import * as controller from './attendance.controller.js';
import {
  openSessionSchema,
  tapSchema,
  bulkTapSchema,
  markAttendanceSchema,
  bulkMarkAttendanceSchema,
  updateAttendanceSchema,
  registerDeviceSchema,
} from './attendance.validation.js';

const router = Router();

const STAFF = [ROLES.TEACHER, ROLES.SCHOOL_ADMIN, ROLES.SUPER_ADMIN];
const ADMIN = [ROLES.SCHOOL_ADMIN, ROLES.SUPER_ADMIN];

// =============================================================================
// SESSIONS
// =============================================================================

/**
 * POST /api/attendance/sessions
 * Open a new attendance session.
 */
router.post(
  '/sessions',
  authenticate,
  authorize(...STAFF),
  validate(openSessionSchema),
  controller.openSession
);

/**
 * POST /api/attendance/sessions/:sessionId/close
 * Close an attendance session.
 */
router.post(
  '/sessions/:sessionId/close',
  authenticate,
  authorize(...STAFF),
  controller.closeSession
);

/**
 * GET /api/attendance/sessions
 * List attendance sessions.
 */
router.get('/sessions', authenticate, authorize(...STAFF), controller.listSessions);

// =============================================================================
// RFID TAP — Device Auth (handled by authenticate middleware DEVICE strategy)
// =============================================================================

/**
 * POST /api/attendance/tap
 * Process RFID tap from attendance device.
 * Auth: DEVICE token or API key
 */
router.post('/tap', authenticate, validate(tapSchema), controller.processTap);

// =============================================================================
// BULK SYNC — ESP32 Offline
// =============================================================================

/**
 * POST /api/attendance/bulk
 * Bulk sync offline taps from ESP32 device.
 * Auth: DEVICE token
 */
router.post('/bulk', authenticate, validate(bulkTapSchema), controller.processBulkTaps);

// =============================================================================
// DEVICE MANAGEMENT
// =============================================================================

/**
 * POST /api/attendance/device/heartbeat
 * Device heartbeat — keeps device marked as ONLINE.
 * Auth: DEVICE token
 */
router.post('/device/heartbeat', authenticate, controller.deviceHeartbeat);

/**
 * POST /api/attendance/device/register
 * Register a new attendance device.
 * Auth: School Admin
 */
router.post(
  '/device/register',
  authenticate,
  authorize(...ADMIN),
  validate(registerDeviceSchema),
  controller.registerDevice
);

/**
 * GET /api/attendance/devices
 * List all attendance devices for the school.
 * Auth: School Admin
 */
router.get('/devices', authenticate, authorize(...ADMIN), controller.listDevices);

// =============================================================================
// MANUAL ATTENDANCE
// =============================================================================

/**
 * POST /api/attendance/sessions/:sessionId/records
 * Manually mark a student's attendance.
 */
router.post(
  '/sessions/:sessionId/records',
  authenticate,
  authorize(...STAFF),
  validate(markAttendanceSchema),
  controller.markAttendance
);

/**
 * POST /api/attendance/sessions/:sessionId/records/bulk
 * Bulk mark attendance for multiple students.
 */
router.post(
  '/sessions/:sessionId/records/bulk',
  authenticate,
  authorize(...STAFF),
  validate(bulkMarkAttendanceSchema),
  controller.bulkMarkAttendance
);

/**
 * PATCH /api/attendance/sessions/:sessionId/records/:studentId
 * Update a student's attendance record.
 */
router.patch(
  '/sessions/:sessionId/records/:studentId',
  authenticate,
  authorize(...STAFF),
  validate(updateAttendanceSchema),
  controller.updateAttendance
);

// =============================================================================
// QUERIES
// =============================================================================

/**
 * GET /api/attendance/sessions/:sessionId/records
 * Get all records for a session.
 */
router.get(
  '/sessions/:sessionId/records',
  authenticate,
  authorize(...STAFF),
  controller.getSessionRecords
);

/**
 * GET /api/attendance/students/:studentId
 * Get attendance history for a student.
 */
router.get(
  '/students/:studentId',
  authenticate,
  authorize(...STAFF),
  controller.getStudentAttendance
);

/**
 * GET /api/attendance/class
 * Get class attendance summary.
 */
router.get('/class', authenticate, authorize(...STAFF), controller.getClassAttendance);

export default router;
