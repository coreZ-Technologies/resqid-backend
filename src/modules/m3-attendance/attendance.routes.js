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

router.post(
  '/sessions',
  authenticate,
  authorize(...STAFF),
  validate(openSessionSchema),
  controller.openSession
);

router.post(
  '/sessions/:sessionId/close',
  authenticate,
  authorize(...STAFF),
  controller.closeSession
);

router.get('/sessions', authenticate, authorize(...STAFF), controller.listSessions);

// =============================================================================
// RFID TAP — Device Auth
// =============================================================================

router.post('/tap', authenticate, validate(tapSchema), controller.processTap);

// =============================================================================
// BULK SYNC — ESP32 Offline
// =============================================================================

router.post('/bulk', authenticate, validate(bulkTapSchema), controller.processBulkTaps);

// =============================================================================
// DEVICE MANAGEMENT
// =============================================================================

router.post('/device/heartbeat', authenticate, controller.deviceHeartbeat);

router.post(
  '/device/register',
  authenticate,
  authorize(...ADMIN),
  validate(registerDeviceSchema),
  controller.registerDevice
);

router.get('/devices', authenticate, authorize(...ADMIN), controller.listDevices);

// =============================================================================
// MANUAL ATTENDANCE (WRITE)
// =============================================================================

router.post(
  '/sessions/:sessionId/records',
  authenticate,
  authorize(...STAFF),
  validate(markAttendanceSchema),
  controller.markAttendance
);

router.post(
  '/sessions/:sessionId/records/bulk',
  authenticate,
  authorize(...STAFF),
  validate(bulkMarkAttendanceSchema),
  controller.bulkMarkAttendance
);

router.patch(
  '/sessions/:sessionId/records/:studentId',
  authenticate,
  authorize(...STAFF),
  validate(updateAttendanceSchema),
  controller.updateAttendance
);

// =============================================================================
// QUERIES (READ) — ✅ PARENT & STUDENT added
// =============================================================================

router.get(
  '/sessions/:sessionId/records',
  authenticate,
  authorize(...STAFF, ROLES.PARENT, ROLES.STUDENT),
  controller.getSessionRecords
);

router.get(
  '/students/:studentId',
  authenticate,
  authorize(...STAFF, ROLES.PARENT, ROLES.STUDENT),
  controller.getStudentAttendance
);

router.get(
  '/class',
  authenticate,
  authorize(...STAFF), // ❌ PARENT/STUDENT excluded for privacy
  controller.getClassAttendance
);

export default router;