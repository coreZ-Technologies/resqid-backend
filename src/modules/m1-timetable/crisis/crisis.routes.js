// =============================================================================
// modules/m1-timetable/crisis/crisis.routes.js — RESQID
// Mounted at /api/timetable/crisis
// =============================================================================

import { Router } from 'express';
import { authenticate } from '#middleware/auth/authenticate.middleware.js';
import { authorize } from '#middleware/auth/rbac.middleware.js';
import { ROLES } from '#shared/constants/roles.js';
import * as controller from './crisis.controller.js';

const router = Router();

const STAFF = [ROLES.TEACHER, ROLES.SCHOOL_ADMIN, ROLES.SUPER_ADMIN];
const ADMIN = [ROLES.SCHOOL_ADMIN, ROLES.SUPER_ADMIN];

router.get('/level', authenticate, authorize(STAFF), controller.getCrisisLevel);
router.post('/execute', authenticate, authorize(ADMIN), controller.executeCrisisStrategy);
router.post(
  '/override',
  authenticate,
  authorize(ROLES.SUPER_ADMIN),
  controller.overrideCrisisLevel
);

export default router;
