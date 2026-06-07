// src/modules/school-admin/activity-logs.routes.js
import { Router } from 'express';
import * as ctrl from '#modules/activity-logs/activity-log.controller.js';

const router = Router();

router.get('/stats', ctrl.getStats);
router.get('/filter-options', ctrl.getFilterOptions);
router.get('/export', ctrl.exportCsv);
router.get('/', ctrl.list);

export default router;
