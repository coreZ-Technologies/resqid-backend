// =============================================================================
// modules/m1-timetable/report/report.routes.js — RESQID
// Mounted at /api/timetable/report
// =============================================================================

import { Router } from 'express';
import { authenticate } from '#middleware/auth/authenticate.middleware.js';
import { authorize } from '#middleware/auth/rbac.middleware.js';
import { ROLES } from '#shared/constants/roles.js';
import * as controller from './report.controller.js';

const router = Router();

const STAFF = [ROLES.TEACHER, ROLES.SCHOOL_ADMIN, ROLES.SUPER_ADMIN];

router.get('/substitution', authenticate, authorize(STAFF), controller.getSubstitutionRegister);
router.get('/substitution/weekly', authenticate, authorize(STAFF), controller.getWeeklyAnalysis);
router.get('/compliance', authenticate, authorize(STAFF), controller.getComplianceReport);
router.get('/workload', authenticate, authorize(STAFF), controller.getWorkloadReport);

export default router;
