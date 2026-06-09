import { Router } from 'express';
import * as attendanceCtrl from '#modules/m3-attendance/attendance.controller.js';
import { validate } from '#middleware/validate.middleware.js';
import {
  openSessionSchema,
  markAttendanceSchema,
} from '#modules/m3-attendance/attendance.validation.js';

const router = Router();

router.get('/sessions', attendanceCtrl.listSessions);
router.post('/sessions', validate(openSessionSchema), attendanceCtrl.openSession);
router.post('/sessions/:sessionId/close', attendanceCtrl.closeSession);
router.get('/sessions/:sessionId/records', attendanceCtrl.getSessionRecords);
router.post(
  '/sessions/:sessionId/records',
  validate(markAttendanceSchema),
  attendanceCtrl.markAttendance
);
router.get('/class', attendanceCtrl.getClassAttendance);
router.get('/students/:studentId', attendanceCtrl.getStudentAttendance);

export default router;
