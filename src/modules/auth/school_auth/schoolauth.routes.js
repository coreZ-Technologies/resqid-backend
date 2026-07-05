// modules/auth/school-auth.routes.js — RESQID
// School authentication routes

import { Router } from 'express';
import * as schoolAuthController from './schoolauth.controller.js';
import { validate } from '#middleware/validate.middleware.js';
import {
  schoolLoginSchema,
  forgotSchoolPasswordSchema,
  resetSchoolPasswordSchema,
} from './schoolauth.validation.js';

const router = Router();

// PUBLIC ROUTES (no authentication required)
/**
 * POST /api/auth/school/login
 * Login with school code + password.
 */
router.post('/login', validate(schoolLoginSchema), schoolAuthController.schoolLogin);

/**
 * POST /api/auth/school/forgot-password
 * Send password reset link.
 */
router.post(
  '/forgot-password',
  validate(forgotSchoolPasswordSchema),
  schoolAuthController.forgotSchoolPassword
);

/**
 * POST /api/auth/school/reset-password
 * Reset password with token.
 */
router.post(
  '/reset-password',
  validate(resetSchoolPasswordSchema),
  schoolAuthController.resetSchoolPassword
);

// PROTECTED ROUTES (requires school token)
/**
 * GET /api/auth/school/verify
 * Verify school token is valid.
 */
router.get('/verify', schoolAuthController.verifySchoolToken);

/**
 * GET /api/auth/school/profile
 * Get school profile.
 */
router.get('/profile', schoolAuthController.getSchoolProfile);

/**
 * POST /api/auth/school/logout
 * Clear school session.
 */
router.post('/logout', schoolAuthController.schoolLogout);

export default router;
