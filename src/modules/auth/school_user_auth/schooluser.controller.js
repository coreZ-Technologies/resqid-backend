// modules/auth/school_user_auth/school-user.controller.js — RESQID
// School user authentication handlers

import * as schoolUserService from './schooluser.service.js';
import { ApiResponse } from '#shared/response/ApiResponse.js';
import { ApiError } from '#shared/response/ApiError.js';
import asyncHandler from '#shared/response/asyncHandler.js';
import { setAuthCookies, clearAuthCookies, clearCsrfCookie } from '#config/cookie.js';
import { issueCsrfToken } from '#middleware/security/csrf.middleware.js';

// LOGIN
export const login = asyncHandler(async (req, res) => {
  const { email, password, rememberMe } = req.body;

  const result = await schoolUserService.schoolUserLogin({ email, password, rememberMe });

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
export const logout = asyncHandler(async (req, res) => {
  const sessionId = req.user?.sessionId;

  await schoolUserService.logout(sessionId);

  clearAuthCookies(res);
  clearCsrfCookie(res);

  return ApiResponse.ok(res, null, 'Logged out successfully');
});

// REFRESH TOKEN
export const refreshToken = asyncHandler(async (req, res) => {
  const refreshTokenValue = req.body?.refreshToken || req.cookies?.refreshToken;

  if (!refreshTokenValue) {
    throw ApiError.unauthorized('Refresh token required');
  }

  const result = await schoolUserService.refreshAccessToken(refreshTokenValue);

  setAuthCookies(res, result.accessToken, refreshTokenValue);

  return ApiResponse.ok(res, { accessToken: result.accessToken }, 'Token refreshed');
});

// CHANGE PASSWORD
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  const result = await schoolUserService.changePassword(userId, currentPassword, newPassword);

  clearAuthCookies(res);

  return ApiResponse.ok(res, result, 'Password changed. Please login again.');
});

// FORGOT PASSWORD
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const result = await schoolUserService.forgotPassword({ email });

  return ApiResponse.ok(res, result, 'If an account exists, a reset link has been sent.');
});

// RESET PASSWORD
export const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;

  const result = await schoolUserService.resetPassword({ token, newPassword });

  clearAuthCookies(res);

  return ApiResponse.ok(res, result, 'Password reset. Please login with your new password.');
});

// GET PROFILE
export const getMe = asyncHandler(async (req, res) => {
  const user = await schoolUserService.getProfile(req.user.id);

  return ApiResponse.ok(res, { user }, 'Profile retrieved');
});
