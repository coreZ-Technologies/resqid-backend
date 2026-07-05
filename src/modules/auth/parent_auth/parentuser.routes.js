// =============================================================================
// modules/auth/parent_user_auth/parent-user.routes.js — RESQID
// Parent user authentication routes
// =============================================================================

import { Router } from 'express';
import * as parentAuthController from './parentuser.controller.js';
import { validate } from '#middleware/validate.middleware.js';
import { authenticate } from '#middleware/auth/authenticate.middleware.js';
import { authLimiter, otpLimiter } from '#middleware/security/rateLimit.middleware.js';
import { authSlowDown } from '#middleware/security/slowDown.middleware.js';
import {
  sendOtpSchema,
  verifyOtpSchema,
  registerInitSchema,
  registerCompleteSchema,
  updateProfileSchema,
  refreshTokenSchema,
} from './parentuser.validation.js';

const router = Router();
// PUBLIC ROUTES (No authentication required)
/**
 * POST /api/auth/parent/send-otp
 * Send OTP to parent's phone for login or registration.
 */
router.post(
  '/send-otp',
  authSlowDown,
  otpLimiter,
  validate(sendOtpSchema),
  parentAuthController.sendOtp
);

/**
 * POST /api/auth/parent/verify-otp
 * Verify OTP and login parent.
 */
router.post(
  '/verify-otp',
  authSlowDown,
  authLimiter,
  validate(verifyOtpSchema),
  parentAuthController.verifyOtp
);

/**
 * POST /api/auth/parent/register/init
 * Step 1: Validate student card + send OTP for new parent registration.
 */
router.post(
  '/register/init',
  authSlowDown,
  otpLimiter,
  validate(registerInitSchema),
  parentAuthController.registerInit
);

/**
 * POST /api/auth/parent/register/verify
 * Step 2: Verify OTP + complete parent profile.
 */
router.post(
  '/register/verify',
  authSlowDown,
  authLimiter,
  validate(registerCompleteSchema),
  parentAuthController.registerComplete
);
// PROTECTED ROUTES (JWT required)
/**
 * POST /api/auth/parent/refresh
 * Refresh access token.
 */
router.post(
  '/refresh',
  authLimiter,
  validate(refreshTokenSchema),
  parentAuthController.refreshToken
);

/**
 * POST /api/auth/parent/logout
 * Logout parent user.
 */
router.post('/logout', authenticate, parentAuthController.logout);

/**
 * GET /api/auth/parent/me
 * Get current parent profile with linked students.
 */
router.get('/me', authenticate, parentAuthController.getMe);

/**
 * PATCH /api/auth/parent/profile
 * Update parent profile.
 */
router.patch(
  '/profile',
  authenticate,
  validate(updateProfileSchema),
  parentAuthController.updateProfile
);

export default router;
