// =============================================================================
// modules/m3-attendance/attendance.routes.js — RESQID
// Mounted at /api/attendance
// =============================================================================

import { Router } from 'express';
import { validate, validateAll } from '#middleware/validate.middleware.js';
import { authenticate } from '#middleware/auth/authenticate.middleware.js';
import { authorize } from '#middleware/auth/rbac.middleware.js';
import { ROLES } from '#shared/constants/roles.js';
import * as controller from './attendance.controller.js';
import {
  openSessionSchema,
  closeSessionSchema,
  listSessionsSchema,
  tapSchema,
  bulkTapSchema,
  markAttendanceSchema,
  bulkMarkAttendanceSchema,
  updateAttendanceSchema,
  sessionRecordsSchema,
  studentAttendanceSchema,
  classAttendanceSchema,
  registerDeviceSchema,
} from './attendance.validation.js';

const router = Router();

const STAFF = [ROLES.TEACHER, ROLES.SCHOOL_ADMIN, ROLES.SUPER_ADMIN];
const ADMIN = [ROLES.SCHOOL_ADMIN, ROLES.SUPER_ADMIN];

// ═══════════════════════════════════════════════════════════════════════════════
// SESSIONS
// ═══════════════════════════════════════════════════════════════════════════════

router.post(
  '/sessions',
  authenticate,
  authorize(STAFF),
  validate(openSessionSchema),
  controller.openSession
);
router.post(
  '/sessions/:sessionId/close',
  authenticate,
  authorize(STAFF),
  validateAll(closeSessionSchema),
  controller.closeSession
);
router.get('/sessions', authenticate, authorize(STAFF), controller.listSessions);

// ═══════════════════════════════════════════════════════════════════════════════
// RFID TAP — Device Auth (no JWT)
// ═══════════════════════════════════════════════════════════════════════════════

router.post('/tap', validate(tapSchema), controller.processTap);

// ═══════════════════════════════════════════════════════════════════════════════
// BULK SYNC — ESP32 Offline
// ═══════════════════════════════════════════════════════════════════════════════

router.post('/bulk', validate(bulkTapSchema), controller.processBulkTaps);

// ═══════════════════════════════════════════════════════════════════════════════
// DEVICE
// ═══════════════════════════════════════════════════════════════════════════════

router.post('/device/heartbeat', controller.deviceHeartbeat);
router.post(
  '/device/register',
  authenticate,
  authorize(ADMIN),
  validate(registerDeviceSchema),
  controller.registerDevice
);
router.get('/devices', authenticate, authorize(ADMIN), controller.listDevices);

// ═══════════════════════════════════════════════════════════════════════════════
// MANUAL MARKS
// ═══════════════════════════════════════════════════════════════════════════════

router.post(
  '/sessions/:sessionId/records',
  authenticate,
  authorize(STAFF),
  validateAll(markAttendanceSchema),
  controller.markAttendance
);
router.post(
  '/sessions/:sessionId/records/bulk',
  authenticate,
  authorize(STAFF),
  validateAll(bulkMarkAttendanceSchema),
  controller.bulkMarkAttendance
);
router.patch(
  '/sessions/:sessionId/records/:studentId',
  authenticate,
  authorize(STAFF),
  validateAll(updateAttendanceSchema),
  controller.updateAttendance
);

// ═══════════════════════════════════════════════════════════════════════════════
// QUERIES
// ═══════════════════════════════════════════════════════════════════════════════

router.get(
  '/sessions/:sessionId/records',
  authenticate,
  authorize(STAFF),
  controller.getSessionRecords
);
router.get('/students/:studentId', authenticate, authorize(STAFF), controller.getStudentAttendance);
router.get('/class', authenticate, authorize(STAFF), controller.getClassAttendance);

export default router;
