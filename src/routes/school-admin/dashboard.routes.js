import { Router } from 'express';
import * as dashboardCtrl from '#modules/dashboard/schoolAdmin.dashboard.controller.js';

const router = Router();

router.get('/overview', dashboardCtrl.getOverview);
router.get('/stats', dashboardCtrl.getStats);
router.get('/recent-activity', dashboardCtrl.getRecentActivity);

export default router;
