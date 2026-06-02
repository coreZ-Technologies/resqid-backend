// =============================================================================
// modules/m2-emergency/emergency.routes.js — RESQID
// Mounted at /api/emergency/profile
// =============================================================================

import { Router } from 'express';
import { validate, validateAll } from '#middleware/validate.middleware.js';
import { authenticate } from '#middleware/auth/authenticate.middleware.js';
import { authorize } from '#middleware/auth/rbac.middleware.js';
import { ROLES } from '#shared/constants/roles.js';
import * as controller from './emergency.controller.js';
import { getProfileSchema, updateProfileSchema } from './emergency.validation.js';

const router = Router();

// Parent only — manage their children's emergency profiles
router.get(
  '/:studentId',
  authenticate,
  authorize(ROLES.PARENT),
  validateAll(getProfileSchema),
  controller.getProfile
);

router.patch(
  '/:studentId',
  authenticate,
  authorize(ROLES.PARENT),
  validateAll(updateProfileSchema),
  controller.updateProfile
);

export default router;
