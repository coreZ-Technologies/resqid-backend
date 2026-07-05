// =============================================================================
// modules/auth/school_user_auth/school-user.routes.js — RESQID
// School user authentication routes
// =============================================================================

import { Router } from 'express';
import * as schoolUserController from './schooluser.controller.js';
import { validate } from '#middleware/validate.middleware.js';
import { authenticate } from '#middleware/auth/authenticate.middleware.js';
import { authLimiter } from '#middleware/security/rateLimit.middleware.js';
import { authSlowDown } from '#middleware/security/slowDown.middleware.js';
import {
  schoolUserLoginSchema,
  schoolUserForgotPasswordSchema,
  schoolUserResetPasswordSchema,
  schoolUserChangePasswordSchema,
} from './schooluser.validation.js';

const router = Router();

// PUBLIC ROUTES
router.post(
  '/login',
  authSlowDown,
  authLimiter,
  validate(schoolUserLoginSchema),
  schoolUserController.login
);
router.post(
  '/forgot-password',
  authSlowDown,
  authLimiter,
  validate(schoolUserForgotPasswordSchema),
  schoolUserController.forgotPassword
);
router.post(
  '/reset-password',
  authSlowDown,
  authLimiter,
  validate(schoolUserResetPasswordSchema),
  schoolUserController.resetPassword
);

// PROTECTED ROUTES
router.post(
  '/change-password',
  authenticate,
  authLimiter,
  validate(schoolUserChangePasswordSchema),
  schoolUserController.changePassword
);
router.post('/refresh', authLimiter, schoolUserController.refreshToken);
router.post('/logout', authenticate, schoolUserController.logout);
router.get('/me', authenticate, schoolUserController.getMe);

export default router;
