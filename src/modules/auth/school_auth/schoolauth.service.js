// =============================================================================
// modules/auth/school-auth.service.js — RESQID
// School authentication business logic
// =============================================================================

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { schoolAuthRepo } from './schoolauth.repository.js';
import { ENV } from '#config/env.js';
import { logger } from '#config/logger.js';
import { ApiError } from '#shared/response/ApiError.js';

// SCHOOL LOGIN
/**
 * Authenticate school with code + password.
 * @param {object} params
 * @param {string} params.code - School unique code
 * @param {string} params.password - School password
 * @param {boolean} [params.rememberMe=false] - Extend token expiry
 * @returns {Promise<{school: object, tokens: {schoolToken: string}}>}
 */
export async function schoolLogin({ code, password, rememberMe = false }) {
  // 1. Find school
  const school = await schoolAuthRepo.findByCode(code);

  if (!school) {
    logger.warn({ code }, 'School login failed: invalid code');
    throw ApiError.unauthorized('Invalid school code or password');
  }

  // 2. Check status
  if (school.status === 'SUSPENDED') {
    logger.warn({ schoolId: school.id, code }, 'School login failed: suspended');
    throw ApiError.forbidden('School account is suspended. Contact support.');
  }

  if (school.status === 'INACTIVE') {
    logger.warn({ schoolId: school.id, code }, 'School login failed: inactive');
    throw ApiError.forbidden('School account is inactive. Contact support.');
  }

  // 3. Verify password
  const isPasswordValid = await bcrypt.compare(password, school.password);

  if (!isPasswordValid) {
    logger.warn({ schoolId: school.id, code }, 'School login failed: wrong password');
    throw ApiError.unauthorized('Invalid school code or password');
  }

  // 4. Generate school token
  const tokenPayload = {
    type: 'school',
    schoolId: school.id,
    code: school.code,
  };

  const expiresIn = rememberMe
    ? ENV.JWT_SCHOOL_REMEMBER_EXPIRY || '30d'
    : ENV.JWT_SCHOOL_EXPIRY || '24h';

  const schoolToken = jwt.sign(tokenPayload, ENV.JWT_SCHOOL_SECRET || ENV.JWT_ACCESS_SECRET, {
    expiresIn,
  });

  logger.info({ schoolId: school.id, code }, 'School login successful');

  // 5. Return school info (exclude password)
  const { password: _, ...schoolWithoutPassword } = school;

  return {
    school: schoolWithoutPassword,
    tokens: { schoolToken },
  };
}

// VERIFY SCHOOL TOKEN
/**
 * Verify school token and return school info.
 * @param {string} token - School JWT token
 * @returns {Promise<object>} School profile
 */
export async function verifySchoolToken(token) {
  try {
    const decoded = jwt.verify(token, ENV.JWT_SCHOOL_SECRET || ENV.JWT_ACCESS_SECRET);

    if (decoded.type !== 'school') {
      throw ApiError.unauthorized('Invalid school token');
    }

    const school = await schoolAuthRepo.findProfileById(decoded.schoolId);

    if (!school) {
      throw ApiError.unauthorized('School not found');
    }

    if (school.status === 'SUSPENDED' || school.status === 'INACTIVE') {
      throw ApiError.forbidden('School account is not active');
    }

    return school;
  } catch (err) {
    if (err instanceof ApiError) throw err;

    if (err.name === 'TokenExpiredError') {
      throw ApiError.unauthorized('School session expired. Please login again.');
    }

    throw ApiError.unauthorized('Invalid school token');
  }
}

// INVALIDATE SCHOOL TOKEN (LOGOUT)
/**
 * Invalidate a school token.
 * For now, tokens are stateless — client just deletes the token.
 * In future, add token to blacklist in Redis.
 * @param {string} token - School token
 */
export async function invalidateSchoolToken(token) {
  // TODO: Add to Redis blacklist with TTL matching token expiry
  logger.info('School token invalidated (client-side)');
  return true;
}

// FORGOT PASSWORD
/**
 * Send password reset link to school email.
 * @param {object} params
 * @param {string} params.email - School email
 * @param {string} params.code - School code (for verification)
 * @returns {Promise<{message: string}>}
 */
export async function forgotSchoolPassword({ email, code }) {
  // 1. Find school by code
  const school = await schoolAuthRepo.findByCode(code);

  if (!school) {
    // Don't reveal if school exists — same response
    logger.warn({ code }, 'Forgot password: invalid code');
    return { message: 'If the school exists, a reset link has been sent to the registered email.' };
  }

  // 2. Verify email matches
  if (school.email !== email) {
    logger.warn({ schoolId: school.id, email }, 'Forgot password: email mismatch');
    return { message: 'If the school exists, a reset link has been sent to the registered email.' };
  }

  // 3. Generate reset token
  const resetToken = jwt.sign(
    {
      type: 'school_password_reset',
      schoolId: school.id,
    },
    ENV.JWT_SCHOOL_SECRET || ENV.JWT_ACCESS_SECRET,
    { expiresIn: ENV.JWT_RESET_EXPIRY || '15m' }
  );

  // 4. TODO: Send email with reset link
  logger.info({ schoolId: school.id, email }, 'School password reset token generated');
  // await sendPasswordResetEmail(email, resetToken);

  return {
    message: 'If the school exists, a reset link has been sent to the registered email.',
    // Remove in production:
    ...(ENV.IS_DEV && { devToken: resetToken }),
  };
}

// RESET PASSWORD
/**
 * Reset school password with token.
 * @param {object} params
 * @param {string} params.token - Reset token
 * @param {string} params.newPassword - New password
 * @returns {Promise<{message: string}>}
 */
export async function resetSchoolPassword({ token, newPassword }) {
  // 1. Verify token
  let decoded;
  try {
    decoded = jwt.verify(token, ENV.JWT_SCHOOL_SECRET || ENV.JWT_ACCESS_SECRET);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw ApiError.badRequest('Reset link has expired. Please request a new one.');
    }
    throw ApiError.badRequest('Invalid reset link.');
  }

  if (decoded.type !== 'school_password_reset') {
    throw ApiError.badRequest('Invalid reset link.');
  }

  // 2. Check school exists
  const school = await schoolAuthRepo.findById(decoded.schoolId);
  if (!school) {
    throw ApiError.notFound('School not found');
  }

  // 3. Hash new password
  const saltRounds = ENV.BCRYPT_SALT_ROUNDS || 12;
  const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

  // 4. Update password
  await schoolAuthRepo.updatePassword(decoded.schoolId, hashedPassword);

  logger.info({ schoolId: decoded.schoolId }, 'School password reset successful');

  return { message: 'Password has been reset. Please login with your new password.' };
}

// GET SCHOOL PROFILE
/**
 * Get full school profile.
 * @param {string} schoolId - School ID
 * @returns {Promise<object>} School profile
 */
export async function getSchoolProfile(schoolId) {
  const school = await schoolAuthRepo.findProfileById(schoolId);

  if (!school) {
    throw ApiError.notFound('School not found');
  }

  return school;
}
