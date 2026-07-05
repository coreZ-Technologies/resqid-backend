// modules/auth/parent_user_auth/parent-user.controller.js — RESQID
// Parent user authentication handlers

import * as parentAuthService from './parentuser.service.js';
import { ApiResponse } from '#shared/response/ApiResponse.js';
import { ApiError } from '#shared/response/ApiError.js';
import asyncHandler from '#shared/response/asyncHandler.js';
import { setAuthCookies, clearAuthCookies, clearCsrfCookie } from '#config/cookie.js';

// SEND OTP
/**
 * POST /api/auth/parent/send-otp
 * Send OTP to parent's phone number.
 */
export const sendOtp = asyncHandler(async (req, res) => {
  const { phone, cardNumber, purpose } = req.body;

  const result = await parentAuthService.sendOtp({ phone, cardNumber, purpose });

  return ApiResponse.ok(
    res,
    {
      message: result.message,
      ...(result.devOtp && { devOtp: result.devOtp }),
    },
    'OTP sent successfully'
  );
});

// VERIFY OTP & LOGIN
/**
 * POST /api/auth/parent/verify-otp
 * Verify OTP and login parent.
 */
export const verifyOtp = asyncHandler(async (req, res) => {
  const { phone, otp } = req.body;

  const result = await parentAuthService.verifyOtpAndLogin({ phone, otp });

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

  // Set auth cookies
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

// REGISTER INIT (Validate Card + Send OTP)
/**
 * POST /api/auth/parent/register/init
 * Validate student card + send OTP for new parent registration.
 */
export const registerInit = asyncHandler(async (req, res) => {
  const { cardNumber, phone } = req.body;

  const result = await parentAuthService.registerInit({ cardNumber, phone });

  return ApiResponse.ok(
    res,
    {
      nonce: result.nonce,
      maskedPhone: result.maskedPhone,
      studentName: result.studentName,
      ...(result.devOtp && { devOtp: result.devOtp }),
    },
    'OTP sent to your phone'
  );
});

// REGISTER COMPLETE (Verify OTP + Create Profile)
/**
 * POST /api/auth/parent/register/verify
 * Complete parent registration after OTP verification.
 */
export const registerComplete = asyncHandler(async (req, res) => {
  const { phone, otp, firstName, lastName, email } = req.body;

  const result = await parentAuthService.registerComplete({
    phone,
    otp,
    firstName,
    lastName,
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

// LOGOUT
/**
 * POST /api/auth/parent/logout
 * Logout parent user.
 */
export const logout = asyncHandler(async (req, res) => {
  const sessionId = req.user?.sessionId;

  await parentAuthService.logout(sessionId);

  clearAuthCookies(res);
  clearCsrfCookie(res);

  return ApiResponse.ok(res, null, 'Logged out successfully');
});

// REFRESH TOKEN
/**
 * POST /api/auth/parent/refresh
 * Refresh access token.
 */
export const refreshToken = asyncHandler(async (req, res) => {
  const refreshTokenValue = req.body?.refreshToken || req.cookies?.refreshToken;

  if (!refreshTokenValue) {
    throw ApiError.unauthorized('Refresh token required');
  }

  const result = await parentAuthService.refreshAccessToken(refreshTokenValue);

  setAuthCookies(res, result.accessToken, refreshTokenValue);

  return ApiResponse.ok(res, { accessToken: result.accessToken }, 'Token refreshed');
});

// GET PROFILE
/**
 * GET /api/auth/parent/me
 * Get current parent profile with linked students.
 */
export const getMe = asyncHandler(async (req, res) => {
  const user = await parentAuthService.getProfile(req.user.id);

  return ApiResponse.ok(res, { user }, 'Profile retrieved');
});

// UPDATE PROFILE
/**
 * PATCH /api/auth/parent/profile
 * Update parent profile.
 */
export const updateProfile = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, address, city, state, pincode, occupation } = req.body;

  const user = await parentAuthService.updateProfile(req.user.id, {
    firstName,
    lastName,
    email,
    address,
    city,
    state,
    pincode,
    occupation,
  });

  return ApiResponse.ok(res, { user }, 'Profile updated');
});
