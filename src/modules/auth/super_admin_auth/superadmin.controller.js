// modules/auth/super_admin_auth/superadmin.controller.js — RESQID
// Super admin authentication handlers

import * as superAdminService from './superadmin.service.js';
import { ApiResponse } from '#shared/response/ApiResponse.js';
import { ApiError } from '#shared/response/ApiError.js';
import asyncHandler from '#shared/response/asyncHandler.js';
import { setAuthCookies, clearAuthCookies, clearCsrfCookie } from '#config/cookie.js';
import { issueCsrfToken } from '#middleware/security/csrf.middleware.js';

// LOGIN
/**
 * POST /api/auth/super-admin/login
 * Super admin login with email + password.
 */
export const superAdminLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const result = await superAdminService.superAdminLogin({ email, password });

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

// LOGOUT
/**
 * POST /api/auth/super-admin/logout
 * Logout super admin.
 */
export const logout = asyncHandler(async (req, res) => {
  const sessionId = req.user?.sessionId;

  await superAdminService.logout(sessionId);

  clearAuthCookies(res);
  clearCsrfCookie(res);

  return ApiResponse.ok(res, null, 'Logged out successfully');
});

// TOKEN REFRESH
/**
 * POST /api/auth/super-admin/refresh
 * Refresh access token.
 */
export const refreshToken = asyncHandler(async (req, res) => {
  const refreshTokenValue = req.body?.refreshToken || req.cookies?.refreshToken;

  if (!refreshTokenValue) {
    throw ApiError.unauthorized('Refresh token required');
  }

  const result = await superAdminService.refreshAccessToken(refreshTokenValue);

  setAuthCookies(res, result.accessToken, refreshTokenValue);

  return ApiResponse.ok(res, { accessToken: result.accessToken }, 'Token refreshed');
});

// CHANGE PASSWORD (authenticated)
/**
 * POST /api/auth/super-admin/change-password
 * Change password for authenticated super admin.
 */
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  // Verify role is SUPER_ADMIN
  if (req.user.role !== 'SUPER_ADMIN') {
    throw ApiError.forbidden('Access denied. Super admin only.');
  }

  const result = await superAdminService.changePassword(userId, currentPassword, newPassword);

  clearAuthCookies(res);

  return ApiResponse.ok(res, result, 'Password changed. Please login again.');
});

// FORGOT PASSWORD (unauthenticated — super admin only)
/**
 * POST /api/auth/super-admin/forgot-password
 * Send password reset link for SUPER_ADMIN role only.
 * Verifies the email belongs to a SUPER_ADMIN before sending.
 */
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const result = await superAdminService.forgotPassword({ email });

  // Always return same message — don't reveal if email exists
  return ApiResponse.ok(
    res,
    result,
    'If a super admin account with that email exists, a reset link has been sent.'
  );
});

// RESET PASSWORD (unauthenticated — super admin only)
/**
 * POST /api/auth/super-admin/reset-password
 * Reset password with token for SUPER_ADMIN role only.
 * Verifies token is for a SUPER_ADMIN before resetting.
 */
export const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;

  const result = await superAdminService.resetPassword({ token, newPassword });

  clearAuthCookies(res);

  return ApiResponse.ok(
    res,
    result,
    'Password reset successful. Please login with your new password.'
  );
});

// GET PROFILE
/**
 * GET /api/auth/super-admin/me
 * Get current super admin profile.
 */
export const getMe = asyncHandler(async (req, res) => {
  if (req.user.role !== 'SUPER_ADMIN') {
    throw ApiError.forbidden('Access denied. Super admin only.');
  }

  const user = await superAdminService.getProfile(req.user.id);

  return ApiResponse.ok(res, { user }, 'Profile retrieved');
});
