// =============================================================================
// modules/auth/school_user_auth/school-user.service.js — RESQID
// School user authentication business logic
// =============================================================================

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { schoolUserRepo } from './schooluser.repository.js';
import { ENV } from '#config/env.js';
import { logger } from '#config/logger.js';
import { ApiError } from '#shared/response/ApiError.js';

// LOGIN
/**
 * Login school user with email + password.
 * Role is automatically fetched from DB — user doesn't need to provide it.
 */
export async function schoolUserLogin({ email, password, rememberMe = false }) {
  // 1. Find user by email
  const user = await schoolUserRepo.findByEmail(email);

  if (!user) {
    logger.warn({ email }, 'School user login failed: email not found');
    throw ApiError.unauthorized('Invalid email or password');
  }

  // 2. Check if user can login (active + school not suspended)
  const canLogin = await schoolUserRepo.canLogin(user.id);
  if (!canLogin) {
    logger.warn(
      { userId: user.id, email },
      'School user login failed: inactive or school suspended'
    );
    throw ApiError.forbidden('Account is inactive or school is suspended. Contact admin.');
  }

  // 3. Verify password
  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

  if (!isPasswordValid) {
    logger.warn({ userId: user.id, email }, 'School user login failed: wrong password');
    throw ApiError.unauthorized('Invalid email or password');
  }

  // 4. Generate tokens with role from DB
  const tokenPayload = {
    type: 'school_user',
    userId: user.id,
    schoolId: user.schoolId,
    email: user.email,
    role: user.role, // ← Role from DB (SUPER_ADMIN, SCHOOL_ADMIN, TEACHER)
  };

  const accessExpiry = rememberMe ? '24h' : ENV.JWT_ACCESS_EXPIRY || '15m';
  const refreshExpiry = rememberMe ? '30d' : ENV.JWT_REFRESH_EXPIRY || '7d';

  const accessToken = jwt.sign(tokenPayload, ENV.JWT_ACCESS_SECRET, { expiresIn: accessExpiry });
  const refreshToken = jwt.sign(tokenPayload, ENV.JWT_REFRESH_SECRET, { expiresIn: refreshExpiry });

  // 5. Update last login
  await schoolUserRepo.updateLastLogin(user.id);

  logger.info({ userId: user.id, email, role: user.role }, 'School user login successful');

  // 6. Return user (exclude password)
  const { passwordHash: _, ...userWithoutPassword } = user;

  return {
    user: userWithoutPassword,
    tokens: { accessToken, refreshToken },
  };
}

// REFRESH TOKEN
export async function refreshAccessToken(refreshToken) {
  try {
    const decoded = jwt.verify(refreshToken, ENV.JWT_REFRESH_SECRET);

    if (decoded.type !== 'school_user') {
      throw ApiError.unauthorized('Invalid token type');
    }

    const tokenPayload = {
      type: 'school_user',
      userId: decoded.userId,
      schoolId: decoded.schoolId,
      email: decoded.email,
      role: decoded.role,
    };

    const accessToken = jwt.sign(tokenPayload, ENV.JWT_ACCESS_SECRET, {
      expiresIn: ENV.JWT_ACCESS_EXPIRY || '15m',
    });

    return { accessToken };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err.name === 'TokenExpiredError') {
      throw ApiError.unauthorized('Refresh token expired. Please login again.');
    }
    throw ApiError.unauthorized('Invalid refresh token');
  }
}

// LOGOUT
export async function logout(sessionId) {
  logger.info({ sessionId }, 'School user logout');
  return true;
}

// CHANGE PASSWORD
export async function changePassword(userId, currentPassword, newPassword) {
  const user = await schoolUserRepo.findProfileById(userId);

  if (!user) {
    throw ApiError.notFound('User not found');
  }

  // Get full user with password hash
  const fullUser = await schoolUserRepo.findByEmail(user.email);
  if (!fullUser) {
    throw ApiError.notFound('User not found');
  }

  const isPasswordValid = await bcrypt.compare(currentPassword, fullUser.passwordHash);
  if (!isPasswordValid) {
    throw ApiError.badRequest('Current password is incorrect');
  }

  const saltRounds = ENV.BCRYPT_SALT_ROUNDS || 12;
  const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

  await schoolUserRepo.updatePassword(userId, hashedPassword);

  logger.info({ userId }, 'School user password changed');

  return { message: 'Password changed. Please login again.' };
}

// FORGOT PASSWORD
export async function forgotPassword({ email }) {
  const user = await schoolUserRepo.findByEmail(email);

  if (!user) {
    logger.warn({ email }, 'Forgot password: school user email not found');
    return { message: 'If an account with that email exists, a reset link has been sent.' };
  }

  const resetToken = jwt.sign(
    {
      type: 'school_user_password_reset',
      userId: user.id,
      email: user.email,
      role: user.role,
    },
    ENV.JWT_ACCESS_SECRET,
    { expiresIn: ENV.JWT_RESET_EXPIRY || '15m' }
  );

  logger.info({ userId: user.id, email }, 'School user password reset token generated');

  return {
    message: 'If an account with that email exists, a reset link has been sent.',
    ...(ENV.IS_DEV && { devToken: resetToken }),
  };
}

// RESET PASSWORD
export async function resetPassword({ token, newPassword }) {
  let decoded;
  try {
    decoded = jwt.verify(token, ENV.JWT_ACCESS_SECRET);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw ApiError.badRequest('Reset link has expired. Please request a new one.');
    }
    throw ApiError.badRequest('Invalid reset link.');
  }

  if (decoded.type !== 'school_user_password_reset') {
    throw ApiError.badRequest('Invalid reset link.');
  }

  const saltRounds = ENV.BCRYPT_SALT_ROUNDS || 12;
  const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

  await schoolUserRepo.updatePassword(decoded.userId, hashedPassword);

  logger.info({ userId: decoded.userId }, 'School user password reset successful');

  return { message: 'Password has been reset. Please login with your new password.' };
}

// GET PROFILE
export async function getProfile(userId) {
  const user = await schoolUserRepo.findProfileById(userId);

  if (!user) {
    throw ApiError.notFound('User not found');
  }

  return user;
}
