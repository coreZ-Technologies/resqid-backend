// src/modules/school-admin/reports.routes.js
import { Router } from 'express';
import * as ctrl from '#modules/reports/report.controller.js';

const router = Router();

router.get('/stats', ctrl.getStats);
router.get('/filter-options', ctrl.getFilterOptions);
router.get('/export', ctrl.exportReport);
router.get('/attendance', ctrl.getAttendanceReport);
router.get('/scan-logs', ctrl.getScanLogsReport);
router.get('/students', ctrl.getStudentsReport);
router.get('/sessions', ctrl.getSessionsReport);

export default router;
