// school-admin/dashboard/dashboard.routes.js
import { Router } from 'express';
import { authenticate } from '#middleware/auth/authenticate.middleware.js';
import { authorize, ROLES } from '#middleware/auth/authorize.middleware.js';
import { validate } from '#middleware/validate.middleware.js';
import { activityQuerySchema, timetableQuerySchema } from './dashboard.validation.js';
import * as controller from './dashboard.controller.js';

const router = Router();

router.use(authenticate);
router.use(authorize(ROLES.SCHOOL_ADMIN));

router.get('/stats', controller.getStats);
router.get('/attendance/class-breakdown', controller.getClassAttendance);
router.get('/attendance/weekly-trend', controller.getWeeklyTrend);
router.get('/activity/recent', validate(activityQuerySchema, 'query'), controller.getRecentActivity);
router.get('/students/low-attendance', controller.getLowAttendance);
router.get('/notifications', controller.getNotifications);
router.get('/timetable/today', validate(timetableQuerySchema, 'query'), controller.getTimetable);
router.get('/school/subscription', controller.getSubscription);

export default router;