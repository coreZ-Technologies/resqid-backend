// modules/auth/super_admin_auth/superadmin.service.js — RESQID
// Super admin authentication business logic

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { superAdminRepo } from './superadmin.repository.js';
import { ENV } from '#config/env.js';
import { logger } from '#config/logger.js';
import { ApiError } from '#shared/response/ApiError.js';

// LOGIN
export async function superAdminLogin({ email, password }) {
  // 1. Find super admin by email
  const admin = await superAdminRepo.findByEmail(email);

  if (!admin) {
    logger.warn({ email }, 'Super admin login failed: email not found');
    throw ApiError.unauthorized('Invalid email or password');
  }

  // 2. Check if active
  if (!admin.isActive) {
    logger.warn({ adminId: admin.id, email }, 'Super admin login failed: inactive');
    throw ApiError.forbidden('Account is deactivated. Contact support.');
  }

  // 3. Verify password
  const isPasswordValid = await bcrypt.compare(password, admin.passwordHash);

  if (!isPasswordValid) {
    logger.warn({ adminId: admin.id, email }, 'Super admin login failed: wrong password');
    throw ApiError.unauthorized('Invalid email or password');
  }

  // 4. Generate tokens
  const tokenPayload = {
    type: 'super_admin',
    userId: admin.id,
    email: admin.email,
    role: 'SUPER_ADMIN',
  };

  const accessToken = jwt.sign(tokenPayload, ENV.JWT_ACCESS_SECRET, {
    expiresIn: ENV.JWT_ACCESS_EXPIRY || '15m',
  });

  const refreshToken = jwt.sign(tokenPayload, ENV.JWT_REFRESH_SECRET, {
    expiresIn: ENV.JWT_REFRESH_EXPIRY || '7d',
  });

  // 5. Update last login
  await superAdminRepo.updateLastLogin(admin.id);

  logger.info({ adminId: admin.id, email }, 'Super admin login successful');

  // 6. Return user (exclude password)
  const { passwordHash: _, ...adminWithoutPassword } = admin;

  return {
    user: {
      ...adminWithoutPassword,
      role: 'SUPER_ADMIN',
    },
    tokens: { accessToken, refreshToken },
  };
}

// REFRESH TOKEN
export async function refreshAccessToken(refreshToken) {
  try {
    const decoded = jwt.verify(refreshToken, ENV.JWT_REFRESH_SECRET);

    if (decoded.type !== 'super_admin') {
      throw ApiError.unauthorized('Invalid token type');
    }

    const tokenPayload = {
      type: 'super_admin',
      userId: decoded.userId,
      email: decoded.email,
      role: 'SUPER_ADMIN',
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
  // TODO: Invalidate session in DB or Redis
  logger.info({ sessionId }, 'Super admin logout');
  return true;
}

// CHANGE PASSWORD (authenticated)
export async function changePassword(userId, currentPassword, newPassword) {
  // 1. Find admin
  const admin = await superAdminRepo.findByEmail(
    (await superAdminRepo.findProfileById(userId))?.email || ''
  );

  if (!admin) {
    throw ApiError.notFound('Super admin not found');
  }

  // 2. Verify current password
  const isPasswordValid = await bcrypt.compare(currentPassword, admin.passwordHash);

  if (!isPasswordValid) {
    throw ApiError.badRequest('Current password is incorrect');
  }

  // 3. Hash new password
  const saltRounds = ENV.BCRYPT_SALT_ROUNDS || 12;
  const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

  // 4. Update password
  await superAdminRepo.updatePassword(userId, hashedPassword);

  logger.info({ adminId: userId }, 'Super admin password changed');

  return { message: 'Password changed successfully. Please login again.' };
}

// FORGOT PASSWORD
export async function forgotPassword({ email }) {
  // 1. Find super admin by email
  const admin = await superAdminRepo.findByEmail(email);

  if (!admin) {
    logger.warn({ email }, 'Forgot password: super admin email not found');
    // Same response — don't reveal if email exists
    return {
      message: 'If a super admin account with that email exists, a reset link has been sent.',
    };
  }

  // 2. Generate reset token
  const resetToken = jwt.sign(
    {
      type: 'super_admin_password_reset',
      userId: admin.id,
      email: admin.email,
      role: 'SUPER_ADMIN',
    },
    ENV.JWT_ACCESS_SECRET,
    { expiresIn: ENV.JWT_RESET_EXPIRY || '15m' }
  );

  // 3. TODO: Send email with reset link
  logger.info({ adminId: admin.id, email }, 'Super admin password reset token generated');
  // await sendPasswordResetEmail(email, resetToken);

  return {
    message: 'If a super admin account with that email exists, a reset link has been sent.',
    ...(ENV.IS_DEV && { devToken: resetToken }),
  };
}

// RESET PASSWORD
export async function resetPassword({ token, newPassword }) {
  // 1. Verify token
  let decoded;
  try {
    decoded = jwt.verify(token, ENV.JWT_ACCESS_SECRET);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw ApiError.badRequest('Reset link has expired. Please request a new one.');
    }
    throw ApiError.badRequest('Invalid reset link.');
  }

  // 2. Verify it's a super admin reset token
  if (decoded.type !== 'super_admin_password_reset' || decoded.role !== 'SUPER_ADMIN') {
    throw ApiError.badRequest('Invalid reset link.');
  }

  // 3. Hash new password
  const saltRounds = ENV.BCRYPT_SALT_ROUNDS || 12;
  const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

  // 4. Update password
  await superAdminRepo.updatePassword(decoded.userId, hashedPassword);

  logger.info({ adminId: decoded.userId }, 'Super admin password reset successful');

  return { message: 'Password has been reset. Please login with your new password.' };
}

// GET PROFILE
export async function getProfile(userId) {
  const admin = await superAdminRepo.findProfileById(userId);

  if (!admin) {
    throw ApiError.notFound('Super admin not found');
  }

  return {
    ...admin,
    role: 'SUPER_ADMIN',
  };
}
