// modules/auth/super_admin_auth/superadmin.routes.js — RESQID
// Super admin authentication routes

import { Router } from 'express';
import * as superAdminController from './superadmin.controller.js';
import { validate } from '#middleware/validate.middleware.js';
import { authenticate } from '#middleware/auth/authenticate.middleware.js';
import { authLimiter } from '#middleware/security/rateLimit.middleware.js';
import { authSlowDown } from '#middleware/security/slowDown.middleware.js';
import {
  superAdminLoginSchema,
  superAdminForgotPasswordSchema,
  superAdminResetPasswordSchema,
  superAdminChangePasswordSchema,
} from './superadmin.validation.js';

const router = Router();

// PUBLIC ROUTES (no authentication)
/**
 * POST /api/auth/super-admin/login
 * Super admin login with email + password.
 */
router.post(
  '/login',
  authSlowDown,
  authLimiter,
  validate(superAdminLoginSchema),
  superAdminController.superAdminLogin
);

/**
 * POST /api/auth/super-admin/forgot-password
 * Send password reset link.
 */
router.post(
  '/forgot-password',
  authSlowDown,
  authLimiter,
  validate(superAdminForgotPasswordSchema),
  superAdminController.forgotPassword
);

/**
 * POST /api/auth/super-admin/reset-password
 * Reset password with token.
 */
router.post(
  '/reset-password',
  authSlowDown,
  authLimiter,
  validate(superAdminResetPasswordSchema),
  superAdminController.resetPassword
);

// PROTECTED ROUTES (JWT required)
/**
 * POST /api/auth/super-admin/change-password
 * Change password (authenticated).
 */
router.post(
  '/change-password',
  authenticate,
  authLimiter,
  validate(superAdminChangePasswordSchema),
  superAdminController.changePassword
);

/**
 * POST /api/auth/super-admin/refresh
 * Refresh access token.
 */
router.post('/refresh', authLimiter, superAdminController.refreshToken);

/**
 * POST /api/auth/super-admin/logout
 * Logout super admin.
 */
router.post('/logout', authenticate, superAdminController.logout);

/**
 * GET /api/auth/super-admin/me
 * Get current super admin profile.
 */
router.get('/me', authenticate, superAdminController.getMe);

export default router;
