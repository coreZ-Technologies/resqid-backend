// =============================================================================
// modules/attendance/attendance.routes.js — RESQID
// =============================================================================
import { Router } from 'express';
import attendanceController from './attendance.controller.js';
import { authenticate } from '#middleware/auth/authenticate.middleware.js';
import { authorize } from '#middleware/auth/authorize.middleware.js';
import { tenantScope } from '#middleware/auth/tenantScope.middleware.js';
import { validate } from '#middleware/validate.middleware.js';
import { auditLog } from '#middleware/logging/auditLog.middleware.js';
import { requireModule } from '#middleware/requireModule.middleware.js';
import attendanceValidation from './attendance.validation.js';

const router = Router();

router.use(authenticate);
router.use(tenantScope);
router.use(requireModule('attendance'));

// All routes require at least teacher access
router.use(authorize(['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER']));

router.get('/', validate(attendanceValidation.getAttendance, 'query'), attendanceController.list);
router.get('/stats', validate(attendanceValidation.stats, 'query'), attendanceController.stats);
router.get('/monthly', validate(attendanceValidation.monthly, 'query'), attendanceController.monthly);

router.post('/mark', validate(attendanceValidation.markAttendance), auditLog('attendance.mark'), attendanceController.mark);
router.post('/bulk', validate(attendanceValidation.bulkMark), auditLog('attendance.bulk'), attendanceController.bulkMark);

const attendanceRoutes = Router();
attendanceRoutes.use('/attendance', router);

export default attendanceRoutes;