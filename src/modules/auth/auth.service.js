// =============================================================================
// modules/auth/auth.service.js — RESQID
// Business logic for all auth operations.
// Uses Redis for OTP rate limiting + session caching.
// =============================================================================

import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { prisma } from '#config/prisma.js';
import { middlewareRedis as redis } from '#config/redis.js';
import { ApiError } from '#shared/response/ApiError.js';
import { logger } from '#config/logger.js';
import { ENV } from '#config/env.js';

// ─── Repository ──────────────────────────────────────────────────────────────
import * as authRepo from './auth.repository.js';

// ─── Utilities ───────────────────────────────────────────────────────────────
import { hashPassword, verifyPassword } from '#shared/security/hashUtil.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '#shared/security/jwt.js';
import { generateOtp } from '#services/Otp.service.js';
import { normalizePhoneNumber } from '#shared/utils/phoneNormalize.js';
import { encryptField, hashForLookup } from '#shared/security/encryption.js';

// ─── Events ──────────────────────────────────────────────────────────────────
import { publish } from '#orchestrator/events/event.publisher.js';
import { EVENTS } from '#orchestrator/events/event.types.js';

// ─── Behavioral Security ─────────────────────────────────────────────────────
import {
  recordFailedAuth,
  recordSuccessfulAuth,
} from '#middleware/security/behavioralSecurity.middleware.js';

// ─── Redis Keys ──────────────────────────────────────────────────────────────
const OTP_KEY = (phone) => `otp:login:${phone}`;
const OTP_ATTEMPTS_KEY = (phone) => `otp:attempts:login:${phone}`;
const OTP_COOLDOWN_KEY = (phone) => `otp:cooldown:${phone}`;
const OTP_PHONE_RATE_KEY = (phone) => `otp:phone:${hashForLookup(phone)}`;
const REFRESH_BLACKLIST_KEY = (hash) => `blacklist:${hash}`;

// ─── Constants ───────────────────────────────────────────────────────────────
const OTP_TTL_SECONDS = 10 * 60; // 10 minutes
const OTP_MAX_ATTEMPTS = 5;
const OTP_COOLDOWN_SECONDS = 60; // 60s between OTPs

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

const hashOtp = (otp) => crypto.createHash('sha256').update(otp).digest('hex');

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const generateTokens = (user, userType) => {
  const sessionId = crypto.randomUUID();

  const accessToken = signAccessToken({
    userId: user.userId,
    email: user.email,
    role: user.role,
    schoolId: user.schoolId,
    sessionId,
  });

  const refreshTokenValue = signRefreshToken({
    userId: user.userId,
    sessionId,
  });

  const refreshTokenHash = hashToken(refreshTokenValue);

  return { accessToken, refreshToken: refreshTokenValue, refreshTokenHash, sessionId };
};

async function validateOtp(phone, otp) {
  const attemptsKey = OTP_ATTEMPTS_KEY(phone);
  const otpKey = OTP_KEY(phone);

  const [attemptsRaw, storedData] = await Promise.all([redis.get(attemptsKey), redis.get(otpKey)]);

  const attempts = parseInt(attemptsRaw || '0', 10);

  if (attempts >= OTP_MAX_ATTEMPTS) {
    throw ApiError.tooManyRequests('Too many OTP attempts. Request a new OTP.', 'OTP_MAX_ATTEMPTS');
  }

  if (!storedData) {
    throw ApiError.badRequest('OTP expired. Please request a new one.', [], 'OTP_EXPIRED');
  }

  const otpData = JSON.parse(storedData);
  const inputHash = hashOtp(otp);

  const isValid = crypto.timingSafeEqual(
    Buffer.from(inputHash, 'hex'),
    Buffer.from(otpData.hash, 'hex')
  );

  if (!isValid) {
    await redis.incr(attemptsKey);
    await redis.expire(attemptsKey, OTP_TTL_SECONDS);
    throw ApiError.badRequest('Invalid OTP', [], 'INVALID_OTP');
  }

  // Clear OTP on success
  await Promise.all([
    redis.del(otpKey),
    redis.del(attemptsKey),
    redis.del(OTP_PHONE_RATE_KEY(phone)),
  ]);

  return true;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PARENT — OTP LOGIN
// ═══════════════════════════════════════════════════════════════════════════════

export const sendOtp = async ({ phone, cardNumber, purpose = 'login' }) => {
  const normalizedPhone = normalizePhoneNumber(phone);

  // 1. Rate limit: cooldown between OTPs
  const cooldownKey = OTP_COOLDOWN_KEY(normalizedPhone);
  const cooldownExists = await redis.exists(cooldownKey);
  if (cooldownExists) {
    const ttl = await redis.ttl(cooldownKey);
    throw ApiError.tooManyRequests(`Wait ${ttl}s before requesting another OTP`, 'OTP_COOLDOWN');
  }

  // 2. Rate limit: max OTPs per phone per hour
  const phoneRateKey = OTP_PHONE_RATE_KEY(normalizedPhone);
  const phoneAttempts = await redis.incr(phoneRateKey);
  if (phoneAttempts === 1) await redis.expire(phoneRateKey, 3600);
  if (phoneAttempts > 5) {
    throw ApiError.tooManyRequests(
      'Too many OTP requests. Try after 1 hour.',
      'OTP_LIMIT_EXCEEDED'
    );
  }

  // 3. Verify card if provided
  if (cardNumber) {
    const card = await authRepo.findCardByNumber(cardNumber);
    if (!card) {
      throw ApiError.badRequest('Card not found', [], 'CARD_NOT_FOUND');
    }
  }

  // 4. Generate + store OTP
  const otp = generateOtp();
  const otpHash = hashOtp(otp);

  await redis.set(
    OTP_KEY(normalizedPhone),
    JSON.stringify({ hash: otpHash, phone: normalizedPhone, createdAt: Date.now() }),
    'EX',
    OTP_TTL_SECONDS
  );
  await redis.set(OTP_COOLDOWN_KEY(normalizedPhone), '1', 'EX', OTP_COOLDOWN_SECONDS);
  await redis.del(OTP_ATTEMPTS_KEY(normalizedPhone));

  // 5. Send OTP via notification queue
  await publish({
    type: EVENTS.USER_OTP_REQUESTED,
    actorId: normalizedPhone,
    actorType: 'PARENT',
    payload: { phone: normalizedPhone, otp, purpose },
  }).catch((err) => logger.error({ err: err.message }, '[auth] OTP publish failed'));

  // Dev mode: return OTP
  const devOtp = ENV.IS_DEV ? otp : undefined;

  return { message: 'OTP sent successfully', expiresIn: OTP_TTL_SECONDS, devOtp };
};

export const verifyOtpAndLogin = async ({ phone, otp }) => {
  const normalizedPhone = normalizePhoneNumber(phone);

  // Validate OTP
  await validateOtp(normalizedPhone, otp);

  // Find parent
  const parent = await authRepo.findParentByPhone(normalizedPhone);

  if (!parent) {
    return {
      requiresRegistration: true,
      phone: normalizedPhone,
      message: 'Account not found. Please register using your card.',
    };
  }

  if (!parent.isActive) throw ApiError.accountDeactivated();

  // Generate tokens
  const { accessToken, refreshToken, refreshTokenHash, sessionId } = generateTokens(
    { userId: parent.id, role: 'PARENT' },
    'PARENT'
  );

  // Create session
  await authRepo.createSession({
    parentUserId: parent.id,
    refreshTokenHash,
  });

  // Update last login
  await authRepo.updateParentLastLogin(parent.id);
  await recordSuccessfulAuth('0.0.0.0', parent.id, 'PARENT');

  // Format response
  const students =
    parent.students?.map((link) => ({
      id: link.student.id,
      name: `${link.student.firstName || ''} ${link.student.lastName || ''}`.trim(),
      grade: link.student.grade,
      section: link.student.section,
      photoUrl: link.student.photoUrl,
      schoolName: link.student.school?.name,
      cardNumber: link.student.tokens?.[0]?.rfidUid || link.student.tokens?.[0]?.qrCode || null,
    })) || [];

  return {
    requiresRegistration: false,
    tokens: { accessToken, refreshToken },
    user: {
      id: parent.id,
      name: parent.name,
      role: 'PARENT',
      phone: parent.phone,
      email: parent.email,
      students,
    },
  };
};

export const registerParent = async ({ phone, otp, name, email }) => {
  const normalizedPhone = normalizePhoneNumber(phone);

  // Validate OTP
  await validateOtp(normalizedPhone, otp);

  // Find or update parent
  const existing = await authRepo.findParentByPhone(normalizedPhone);

  let parent;
  if (existing) {
    parent = await authRepo.updateParentProfile(existing.id, {
      name,
      email: email || null,
      isActive: true,
    });
  } else {
    throw ApiError.badRequest('Please start registration with your card number first.');
  }

  // Generate tokens
  const { accessToken, refreshToken, refreshTokenHash, sessionId } = generateTokens(
    { userId: parent.id, role: 'PARENT' },
    'PARENT'
  );

  await authRepo.createSession({ parentUserId: parent.id, refreshTokenHash });
  await authRepo.updateParentLastLogin(parent.id);

  await publish({
    type: EVENTS.PARENT_REGISTERED,
    actorId: parent.id,
    actorType: 'PARENT',
    payload: { phone: normalizedPhone, parentName: name },
  }).catch(() => {});

  const fullParent = await authRepo.findParentByPhone(normalizedPhone);

  return {
    tokens: { accessToken, refreshToken },
    user: {
      id: fullParent.id,
      name: fullParent.name,
      role: 'PARENT',
      phone: fullParent.phone,
      email: fullParent.email,
    },
  };
};

// ═══════════════════════════════════════════════════════════════════════════════
// TEACHER / SCHOOL ADMIN / SUPER ADMIN — PASSWORD LOGIN
// ═══════════════════════════════════════════════════════════════════════════════

async function passwordLogin({ phone, email, password, role }) {
  let user;

  if (role === 'SUPER_ADMIN') {
    user = await authRepo.findSuperAdminByEmail(email);
  } else {
    user = await authRepo.findSchoolUserByPhone(phone);
    if (user && user.role !== role) {
      throw ApiError.forbidden(`This account is not a ${role} account`, 'ROLE_REQUIRED');
    }
  }

  if (!user) throw ApiError.invalidCredentials();

  const isValid = await verifyPassword(password, user.passwordHash || '');
  if (!isValid) {
    await recordFailedAuth('0.0.0.0', phone || email, 'INVALID_CREDENTIALS');
    throw ApiError.invalidCredentials();
  }

  if (!user.isActive) throw ApiError.accountDeactivated();
  if (user.school && user.school.status !== 'ACTIVE') throw ApiError.schoolInactive();

  // Update last login
  if (role === 'SUPER_ADMIN') {
    await authRepo.updateSuperAdminLastLogin(user.id);
  } else {
    await authRepo.updateSchoolUserLastLogin(user.id);
  }

  await recordSuccessfulAuth('0.0.0.0', user.id, role);

  // Generate tokens
  const { accessToken, refreshToken, refreshTokenHash, sessionId } = generateTokens(
    { userId: user.id, role, schoolId: user.schoolId, email: user.email },
    role
  );

  await authRepo.createSession({
    ...(role === 'SUPER_ADMIN' ? { superAdminId: user.id } : { schoolUserId: user.id }),
    refreshTokenHash,
  });

  return {
    tokens: { accessToken, refreshToken },
    requiresPasswordChange: user.isPasswordDefault || false,
    user: {
      id: user.id,
      name: user.name,
      role,
      phone: user.phone,
      email: user.email,
      schoolId: user.schoolId || null,
      schoolName: user.school?.name || null,
    },
  };
}

export const teacherLogin = (params) => passwordLogin({ ...params, role: 'TEACHER' });
export const schoolAdminLogin = (params) => passwordLogin({ ...params, role: 'SCHOOL_ADMIN' });
export const superAdminLogin = (params) => passwordLogin({ ...params, role: 'SUPER_ADMIN' });

// ═══════════════════════════════════════════════════════════════════════════════
// TOKEN MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

export const refreshAccessToken = async (refreshTokenValue) => {
  let decoded;
  try {
    decoded = verifyRefreshToken(refreshTokenValue);
  } catch {
    throw ApiError.invalidToken();
  }

  const refreshHash = hashToken(refreshTokenValue);

  // Check blacklist
  const blacklisted = await redis.get(REFRESH_BLACKLIST_KEY(refreshHash));
  if (blacklisted) throw ApiError.invalidToken();

  const session = await authRepo.findSessionByRefreshHash(refreshHash);
  if (!session || session.revokedAt) throw ApiError.invalidToken();
  if (new Date(session.expiresAt) < new Date()) throw ApiError.tokenExpired();

  // Determine user
  let userId, role, email, schoolId;
  if (session.superAdminId) {
    userId = session.superAdminId;
    role = 'SUPER_ADMIN';
  } else if (session.schoolUserId) {
    const user = await authRepo.findSchoolUserById(session.schoolUserId);
    userId = user.id;
    role = user.role;
    schoolId = user.schoolId;
  } else if (session.parentUserId) {
    userId = session.parentUserId;
    role = 'PARENT';
  }

  // Generate new access token
  const accessToken = signAccessToken({ userId, role, email, schoolId, sessionId: session.id });

  return { accessToken };
};

export const changePassword = async (userId, currentPassword, newPassword) => {
  const user = await authRepo.findSchoolUserById(userId);
  if (!user) throw ApiError.notFound('User not found');

  const isValid = await verifyPassword(currentPassword, user.passwordHash);
  if (!isValid) throw ApiError.badRequest('Current password is incorrect');

  const newHash = await hashPassword(newPassword);
  await authRepo.updateSchoolUserPassword(userId, newHash);

  // Revoke all other sessions
  await authRepo.revokeAllUserSessions(userId, user.role);

  return { message: 'Password changed. Please login again.' };
};

export const logout = async (sessionId) => {
  if (sessionId) await authRepo.revokeSession(sessionId);
  return { message: 'Logged out' };
};
