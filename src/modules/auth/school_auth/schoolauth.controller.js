// modules/auth/school-auth.controller.js — RESQID
// School-level authentication handlers

import * as schoolLoginService from './schoolauth.service.js';
import { ApiResponse } from '#shared/response/ApiResponse.js';
import { asyncHandler } from '#shared/response/asyncHandler.js';
import { ApiError } from '#shared/response/ApiError.js';
import { setAuthCookies, clearAuthCookies, clearCsrfCookie } from '#config/cookie.js';

// SCHOOL LOGIN
/**
 * POST /api/auth/school/login
 * Login with school code + password.
 * Returns school token for user login step.
 */
export const schoolLogin = asyncHandler(async (req, res) => {
  const { code, password, rememberMe } = req.body;

  const result = await schoolLoginService.schoolLogin({ code, password, rememberMe });

  setAuthCookies(res, result.tokens.schoolToken, null);

  return ApiResponse.ok(
    res,
    {
      school: {
        id: result.school.id,
        name: result.school.name,
        code: result.school.code,
        logoUrl: result.school.logoUrl,
        board: result.school.board,
        type: result.school.type,
        city: result.school.city,
        state: result.school.state,
        status: result.school.status,
      },
      schoolToken: result.tokens.schoolToken,
    },
    'School verified successfully'
  );
});

// SCHOOL LOGOUT

/**
 * POST /api/auth/school/logout
 * Clear school session.
 */
export const schoolLogout = asyncHandler(async (req, res) => {
  const schoolToken = req.cookies?.schoolToken || req.headers['x-school-token'];

  if (schoolToken) {
    await schoolLoginService.invalidateSchoolToken(schoolToken);
  }

  clearAuthCookies(res);
  clearCsrfCookie(res);

  return ApiResponse.ok(res, null, 'Logged out successfully');
});

// SCHOOL PASSWORD MANAGEMENT

/**
 * POST /api/auth/school/forgot-password
 * Send reset link to school email.
 */
export const forgotSchoolPassword = asyncHandler(async (req, res) => {
  const { email, code } = req.body;

  const result = await schoolLoginService.forgotSchoolPassword({ email, code });

  return ApiResponse.ok(res, result, 'Password reset link sent to school email');
});

/**
 * POST /api/auth/school/reset-password
 * Reset school password with token.
 */
export const resetSchoolPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;

  const result = await schoolLoginService.resetSchoolPassword({ token, newPassword });

  return ApiResponse.ok(res, result, 'School password reset. Please login again.');
});

// SCHOOL VERIFICATION

/**
 * GET /api/auth/school/verify
 * Verify school token is still valid.
 */
export const verifySchoolToken = asyncHandler(async (req, res) => {
  const schoolToken = req.cookies?.schoolToken || req.headers['x-school-token'];

  if (!schoolToken) {
    throw ApiError.unauthorized('School token required');
  }

  const school = await schoolLoginService.verifySchoolToken(schoolToken);

  return ApiResponse.ok(res, { school }, 'School token valid');
});

// SCHOOL PROFILE (for dashboard)

/**
 * GET /api/auth/school/profile
 * Get full school profile (authenticated).
 */
export const getSchoolProfile = asyncHandler(async (req, res) => {
  const schoolId = req.school?.id || req.user?.schoolId;

  if (!schoolId) {
    throw ApiError.unauthorized('School authentication required');
  }

  const school = await schoolLoginService.getSchoolProfile(schoolId);

  return ApiResponse.ok(res, { school }, 'School profile retrieved');
});
