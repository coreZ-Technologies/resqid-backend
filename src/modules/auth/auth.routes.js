// =============================================================================
// modules/auth/auth.routes.js — RESQID
// Mounted at /api/auth
// =============================================================================

import { Router } from 'express';

import { validate } from '#middleware/validate.middleware.js';
import { authenticate } from '#middleware/auth/authenticate.middleware.js';
import { authLimiter, otpLimiter } from '#middleware/security/rateLimit.middleware.js';
import { authSlowDown } from '#middleware/security/slowDown.middleware.js';

// ─── Validation ──────────────────────────────────────────────────────────────
import {
  sendOtpSchema,
  verifyOtpSchema,
  registerParentSchema,
  registerInitSchema,
  teacherLoginSchema,
  schoolAdminLoginSchema,
  superAdminLoginSchema,
  refreshTokenSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './auth.validation.js';

// ─── Controllers ─────────────────────────────────────────────────────────────
import {
  sendOtp,
  verifyOtp,
  registerInit,
  registerParent,
  teacherLogin,
  schoolAdminLogin,
  superAdminLogin,
  refreshToken,
  changePassword,
  forgotPassword,
  resetPassword,
  logout,
  getMe,
} from './auth.controller.js';

const router = Router();

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC ROUTES (No JWT required)
// ═══════════════════════════════════════════════════════════════════════════════

// ── Parent: Send OTP ─────────────────────────────────────────────────────────
router.post('/send-otp', authSlowDown, otpLimiter, validate(sendOtpSchema), sendOtp);

// ── Parent: Verify OTP + Login ───────────────────────────────────────────────
router.post('/verify-otp', authSlowDown, authLimiter, validate(verifyOtpSchema), verifyOtp);

// ── Parent: Register Step 1 — Validate Card + Send OTP ──────────────────────
router.post('/register/init', authSlowDown, otpLimiter, validate(registerInitSchema), registerInit);

// ── Parent: Register Step 2 — Complete Profile ──────────────────────────────
router.post(
  '/register/verify',
  authSlowDown,
  authLimiter,
  validate(registerParentSchema),
  registerParent
);

// ── Teacher: Phone + Password Login ──────────────────────────────────────────
router.post(
  '/teacher/login',
  authSlowDown,
  authLimiter,
  validate(teacherLoginSchema),
  teacherLogin
);

// ── School Admin: Phone + Password Login ─────────────────────────────────────
router.post(
  '/school/login',
  authSlowDown,
  authLimiter,
  validate(schoolAdminLoginSchema),
  schoolAdminLogin
);

// ── Super Admin: Email + Password Login ──────────────────────────────────────
router.post(
  '/super-admin',
  authSlowDown,
  authLimiter,
  validate(superAdminLoginSchema),
  superAdminLogin
);

// ── Refresh Token ────────────────────────────────────────────────────────────
router.post('/refresh', authLimiter, validate(refreshTokenSchema), refreshToken);

// ── Forgot Password (Request Reset OTP) ──────────────────────────────────────
router.post(
  '/forgot-password',
  authSlowDown,
  otpLimiter,
  validate(forgotPasswordSchema),
  forgotPassword
);

// ── Reset Password (With OTP) ────────────────────────────────────────────────
router.post(
  '/reset-password',
  authSlowDown,
  authLimiter,
  validate(resetPasswordSchema),
  resetPassword
);

// ═══════════════════════════════════════════════════════════════════════════════
// PROTECTED ROUTES (JWT required)
// ═══════════════════════════════════════════════════════════════════════════════

// ── Change Password ──────────────────────────────────────────────────────────
router.post(
  '/change-password',
  authenticate,
  authLimiter,
  validate(changePasswordSchema),
  changePassword
);

// ── Logout ────────────────────────────────────────────────────────────────────
router.post('/logout', authenticate, logout);

// ── Get Current User ─────────────────────────────────────────────────────────
router.get('/me', authenticate, getMe);

export default router;
