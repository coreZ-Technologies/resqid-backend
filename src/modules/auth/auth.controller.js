// =============================================================================
// modules/auth/auth.controller.js — RESQID
// Route handlers for all auth endpoints.
// =============================================================================

import * as authService from './auth.service.js';
import { ApiResponse } from '#shared/response/ApiResponse.js';
import { asyncHandler } from '#shared/response/asyncHandler.js';
import { extractIp } from '#shared/network/extractIp.js';
import { parseUserAgent } from '#shared/network/userAgent.js';
import { ApiError } from '#shared/response/ApiError.js';
import {
  setAuthCookies,
  clearAuthCookies,
  setCsrfCookie,
  clearCsrfCookie,
} from '#config/cookie.js';
import { issueCsrfToken } from '#middleware/security/csrf.middleware.js';

// ═══════════════════════════════════════════════════════════════════════════════
// PARENT — OTP Login
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/auth/send-otp
 * Send OTP to parent's phone.
 */
export const sendOtp = asyncHandler(async (req, res) => {
  const { phone, cardNumber, purpose } = req.body;

  const result = await authService.sendOtp({ phone, cardNumber, purpose });

  // In dev mode, include OTP in response for testing
  return ApiResponse.ok(
    res,
    {
      message: result.message,
      ...(result.devOtp && { devOtp: result.devOtp }),
    },
    'OTP sent successfully'
  );
});

/**
 * POST /api/auth/verify-otp
 * Verify OTP and login parent.
 */
export const verifyOtp = asyncHandler(async (req, res) => {
  const { phone, otp } = req.body;

  const result = await authService.verifyOtpAndLogin({ phone, otp });

  // If new parent, return registration required
  if (result.requiresRegistration) {
    return ApiResponse.ok(
      res,
      {
        requiresRegistration: true,
        phone: result.phone,
      },
      'Please complete your profile'
    );
  }

  // Set cookies
  setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken);

  return ApiResponse.ok(
    res,
    {
      user: result.user,
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
    },
    'Login successful'
  );
});

/**
 * POST /api/auth/register/verify
 * Complete parent registration after OTP verification.
 */
export const registerParent = asyncHandler(async (req, res) => {
  const { phone, otp, name, email } = req.body;

  const result = await authService.registerParent({
    phone,
    otp,
    name,
    email,
  });

  setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken);

  return ApiResponse.created(
    res,
    {
      user: result.user,
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
    },
    'Registration successful'
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEACHER — Password Login
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/auth/teacher/login
 * Teacher login with phone + password.
 */
export const teacherLogin = asyncHandler(async (req, res) => {
  const { phone, password } = req.body;

  const result = await authService.teacherLogin({ phone, password });

  setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken);

  return ApiResponse.ok(
    res,
    {
      user: result.user,
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
      requiresPasswordChange: result.requiresPasswordChange,
    },
    'Login successful'
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// SCHOOL ADMIN — Password Login
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/auth/school/login
 * School admin login with phone + password.
 */
export const schoolAdminLogin = asyncHandler(async (req, res) => {
  const { phone, password, schoolCode } = req.body;

  const result = await authService.schoolAdminLogin({ phone, password, schoolCode });

  // Set cookies
  setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken);

  // Issue CSRF token for web dashboard
  const csrfToken = issueCsrfToken(res);

  return ApiResponse.ok(
    res,
    {
      user: result.user,
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
      csrfToken,
      requiresPasswordChange: result.requiresPasswordChange,
    },
    'Login successful'
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// SUPER ADMIN — Email Login
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/auth/super-admin
 * Super admin login with email + password.
 */
export const superAdminLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const result = await authService.superAdminLogin({ email, password });

  setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken);
  const csrfToken = issueCsrfToken(res);

  return ApiResponse.ok(
    res,
    {
      user: result.user,
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
      csrfToken,
    },
    'Login successful'
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// TOKEN MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/auth/refresh
 * Refresh access token.
 */
export const refreshToken = asyncHandler(async (req, res) => {
  const refreshTokenValue = req.body?.refreshToken || req.cookies?.refreshToken;

  if (!refreshTokenValue) {
    throw ApiError.unauthorized('Refresh token required');
  }

  const result = await authService.refreshAccessToken(refreshTokenValue);

  setAuthCookies(res, result.accessToken, refreshTokenValue);

  return ApiResponse.ok(
    res,
    {
      accessToken: result.accessToken,
    },
    'Token refreshed'
  );
});

/**
 * POST /api/auth/change-password
 * Change password (first-time or regular).
 */
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const result = await authService.changePassword(req.user.id, currentPassword, newPassword);

  // Clear all sessions except current
  clearAuthCookies(res);

  return ApiResponse.ok(res, result, 'Password changed successfully');
});

/**
 * POST /api/auth/logout
 * Logout user.
 */
export const logout = asyncHandler(async (req, res) => {
  const sessionId = req.user?.sessionId;

  await authService.logout(sessionId);

  clearAuthCookies(res);
  clearCsrfCookie(res);

  return ApiResponse.ok(res, null, 'Logged out successfully');
});

/**
 * GET /api/auth/me
 * Get current user profile.
 */
export const getMe = asyncHandler(async (req, res) => {
  const user = {
    id: req.user.id,
    role: req.user.role,
    schoolId: req.user.schoolId || null,
  };

  return ApiResponse.ok(res, { user }, 'Profile retrieved');
});

// ─── Add after the PARENT section ────────────────────────────────────────────

/**
 * POST /api/auth/register/init
 * Validate card + send OTP for new parent registration.
 */
export const registerInit = asyncHandler(async (req, res) => {
  const { cardNumber, phone } = req.body;

  const result = await authService.registerInit({ cardNumber, phone });

  return ApiResponse.ok(
    res,
    {
      nonce: result.nonce,
      maskedPhone: result.maskedPhone,
      studentName: result.studentName,
    },
    'OTP sent to your phone'
  );
});

// ─── Add after TOKEN MANAGEMENT section ──────────────────────────────────────

/**
 * POST /api/auth/forgot-password
 * Send OTP for password reset (Teacher/Admin).
 */
export const forgotPassword = asyncHandler(async (req, res) => {
  const { phone, role } = req.body;

  const result = await authService.forgotPassword({ phone, role });

  return ApiResponse.ok(res, result, 'OTP sent to your registered phone');
});

/**
 * POST /api/auth/reset-password
 * Reset password with OTP (Teacher/Admin).
 */
export const resetPassword = asyncHandler(async (req, res) => {
  const { phone, otp, newPassword } = req.body;

  const result = await authService.resetPassword({ phone, otp, newPassword });

  clearAuthCookies(res);

  return ApiResponse.ok(res, result, 'Password reset. Please login with your new password.');
});
