// =============================================================================
// modules/auth/parent_user_auth/parent-user.service.js — RESQID
// Parent user authentication business logic
// =============================================================================

import crypto from 'crypto';
import { middlewareRedis as redis } from '#config/redis.js';
import { ApiError } from '#shared/response/ApiError.js';
import { logger } from '#config/logger.js';
import { ENV } from '#config/env.js';
import * as parentRepo from './parentuser.repository.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '#shared/security/jwt.js';
import { normalizePhoneNumber } from '#shared/utils/phoneNormalize.js';
import { publishNotification } from '#orchestrator/notifications/notification.publisher.js';

// Redis Keys
const OTP_KEY = (phone) => `otp:parent:${phone}`;
const OTP_ATTEMPTS_KEY = (phone) => `otp:attempts:parent:${phone}`;
const OTP_COOLDOWN_KEY = (phone) => `otp:cooldown:parent:${phone}`;
const OTP_PHONE_RATE_KEY = (phone) => `otp:phone:parent:${phone}`;

// Constants const OTP_TTL_SECONDS = 10 * 60; // 10 minutes
const OTP_MAX_ATTEMPTS = 5;
const OTP_COOLDOWN_SECONDS = 60; // 1 minute between OTPs

// Helpers
const hashOtp = (otp) => crypto.createHash('sha256').update(otp).digest('hex');

const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));

const generateTokens = (user) => {
  const sessionId = crypto.randomUUID();
  const accessToken = signAccessToken({
    userId: user.id,
    phone: user.phone,
    role: 'PARENT',
    sessionId,
  });
  const refreshTokenValue = signRefreshToken({ userId: user.id, sessionId });
  return { accessToken, refreshToken: refreshTokenValue, sessionId };
};

// VALIDATE OTP
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

  // Clean up OTP data
  await Promise.all([
    redis.del(otpKey),
    redis.del(attemptsKey),
    redis.del(OTP_PHONE_RATE_KEY(phone)),
  ]);

  return true;
}

// SEND OTP
/**
 * Send OTP to parent's phone.
 * @param {object} params
 * @param {string} params.phone - Parent phone number
 * @param {string} [params.cardNumber] - Student card number (optional, for validation)
 * @param {string} [params.purpose='login'] - Purpose: 'login' or 'register'
 */
export async function sendOtp({ phone, cardNumber, purpose = 'login' }) {
  const normalizedPhone = normalizePhoneNumber(phone);

  // 1. Rate limit: cooldown between OTPs
  const cooldownKey = OTP_COOLDOWN_KEY(normalizedPhone);
  const cooldownExists = await redis.exists(cooldownKey);
  if (cooldownExists) {
    const ttl = await redis.ttl(cooldownKey);
    throw ApiError.tooManyRequests(
      `Please wait ${ttl} seconds before requesting another OTP.`,
      'OTP_COOLDOWN'
    );
  }

  // 2. Rate limit: max 5 OTPs per hour per phone
  const phoneRateKey = OTP_PHONE_RATE_KEY(normalizedPhone);
  const phoneAttempts = await redis.incr(phoneRateKey);
  if (phoneAttempts === 1) await redis.expire(phoneRateKey, 3600);
  if (phoneAttempts > 5) {
    throw ApiError.tooManyRequests('Too many OTP requests. Try again later.', 'OTP_LIMIT_EXCEEDED');
  }

  // 3. Validate card number if provided
  if (cardNumber) {
    const card = await parentRepo.findCardByNumber(cardNumber);
    if (!card) {
      throw ApiError.badRequest('Invalid card number', [], 'CARD_NOT_FOUND');
    }
  }

  // 4. Generate and store OTP
  const otp = generateOtp();
  const otpHash = hashOtp(otp);

  await redis.set(
    OTP_KEY(normalizedPhone),
    JSON.stringify({
      hash: otpHash,
      phone: normalizedPhone,
      purpose,
      createdAt: Date.now(),
    }),
    'EX',
    OTP_TTL_SECONDS
  );

  await redis.set(OTP_COOLDOWN_KEY(normalizedPhone), '1', 'EX', OTP_COOLDOWN_SECONDS);
  await redis.del(OTP_ATTEMPTS_KEY(normalizedPhone));

  // 5. Publish OTP event for SMS sending
  publishNotification
    .otpRequested({
      actorId: normalizedPhone,
      payload: { phone: normalizedPhone, otp, purpose },
    })
    .catch((err) => logger.error({ err: err.message }, '[parent-auth] OTP publish failed'));

  logger.info({ phone: normalizedPhone, purpose }, 'OTP sent to parent');

  return {
    message: 'OTP sent successfully',
    expiresIn: OTP_TTL_SECONDS,
    ...(ENV.IS_DEV && { devOtp: otp }),
  };
}

// VERIFY OTP & LOGIN
/**
 * Verify OTP and login parent.
 * @param {object} params
 * @param {string} params.phone - Parent phone number
 * @param {string} params.otp - OTP entered by user
 */
export async function verifyOtpAndLogin({ phone, otp }) {
  const normalizedPhone = normalizePhoneNumber(phone);

  // 1. Validate OTP
  await validateOtp(normalizedPhone, otp);

  // 2. Find parent by phone
  const parent = await parentRepo.findByPhone(normalizedPhone);

  // 3. If no parent found, return registration required
  if (!parent) {
    return {
      requiresRegistration: true,
      phone: normalizedPhone,
      message: 'Account not found. Please complete registration.',
    };
  }

  // 4. Check if parent is active
  if (!parent.isActive) {
    throw ApiError.forbidden('Account is deactivated. Contact school admin.');
  }

  // 5. Generate tokens
  const { accessToken, refreshToken, sessionId } = generateTokens(parent);

  // 6. Create session
  await parentRepo.createSession(parent.id, sessionId, refreshToken);

  // 7. Update last login
  await parentRepo.updateLastLogin(parent.id);

  // 8. Get linked students
  const students =
    parent.students?.map((link) => ({
      id: link.student.id,
      name: `${link.student.firstName || ''} ${link.student.lastName || ''}`.trim(),
      grade: link.student.grade,
      section: link.student.section,
      photoUrl: link.student.photoUrl,
      schoolName: link.student.school?.name,
      relationship: link.relation,
    })) || [];

  logger.info({ parentId: parent.id, phone: normalizedPhone }, 'Parent login successful');

  return {
    requiresRegistration: false,
    tokens: { accessToken, refreshToken },
    user: {
      id: parent.id,
      name: parent.name,
      firstName: parent.firstName,
      lastName: parent.lastName,
      role: 'PARENT',
      phone: parent.phone,
      email: parent.email,
      photoUrl: parent.photoUrl,
      students,
    },
  };
}

// REGISTER INIT (Validate Card + Send OTP)
/**
 * Validate student card and send OTP for new parent registration.
 * @param {object} params
 * @param {string} params.cardNumber - Student's QR card number
 * @param {string} params.phone - Parent phone number
 */
export async function registerInit({ cardNumber, phone }) {
  const normalizedPhone = normalizePhoneNumber(phone);

  // 1. Validate card exists and is active
  const card = await parentRepo.findCardByNumber(cardNumber);
  if (!card) {
    throw ApiError.badRequest('Invalid card number', [], 'CARD_NOT_FOUND');
  }

  if (!card.isActive) {
    throw ApiError.badRequest('This card is no longer active', [], 'CARD_INACTIVE');
  }

  // 2. Check if parent already registered with this phone
  const existingParent = await parentRepo.findByPhone(normalizedPhone);
  if (existingParent) {
    throw ApiError.conflict('Phone number already registered. Please login instead.');
  }

  // 3. Send OTP
  const result = await sendOtp({ phone: normalizedPhone, purpose: 'register' });

  return {
    nonce: crypto.randomUUID(),
    maskedPhone: normalizedPhone.replace(/(\d{6})(\d{4})/, '******$2'),
    studentName: `${card.student.firstName || ''} ${card.student.lastName || ''}`.trim(),
    studentId: card.student.id,
    ...(ENV.IS_DEV && { devOtp: result.devOtp }),
  };
}

// REGISTER COMPLETE (Verify OTP + Create Profile)
/**
 * Complete parent registration after OTP verification.
 * @param {object} params
 * @param {string} params.phone - Parent phone number
 * @param {string} params.otp - OTP entered by user
 * @param {string} params.firstName - Parent first name
 * @param {string} [params.lastName] - Parent last name
 * @param {string} [params.email] - Parent email
 */
export async function registerComplete({ phone, otp, firstName, lastName, email }) {
  const normalizedPhone = normalizePhoneNumber(phone);

  // 1. Validate OTP
  await validateOtp(normalizedPhone, otp);

  // 2. Check if already registered
  const existing = await parentRepo.findByPhone(normalizedPhone);
  if (existing) {
    throw ApiError.conflict('Phone number already registered. Please login instead.');
  }

  // 3. Create parent user
  const parent = await parentRepo.createParent({
    phone: normalizedPhone,
    firstName,
    lastName,
    name: `${firstName} ${lastName || ''}`.trim(),
    email: email || null,
    isPhoneVerified: true,
    isActive: true,
  });

  // 4. Generate tokens
  const { accessToken, refreshToken, sessionId } = generateTokens(parent);

  // 5. Create session
  await parentRepo.createSession(parent.id, sessionId, refreshToken);

  // 6. Update last login
  await parentRepo.updateLastLogin(parent.id);

  // 7. Publish registration event
  publishNotification
    .parentRegistered({
      actorId: parent.id,
      payload: { parentName: parent.name, phone: normalizedPhone },
    })
    .catch((err) => logger.error({ err: err.message }, '[parent-auth] Registration event failed'));

  logger.info({ parentId: parent.id, phone: normalizedPhone }, 'Parent registration successful');

  return {
    tokens: { accessToken, refreshToken },
    user: {
      id: parent.id,
      name: parent.name,
      firstName: parent.firstName,
      lastName: parent.lastName,
      role: 'PARENT',
      phone: parent.phone,
      email: parent.email,
    },
  };
}

// REFRESH TOKEN
export async function refreshAccessToken(refreshTokenValue) {
  let decoded;
  try {
    decoded = verifyRefreshToken(refreshTokenValue);
  } catch {
    throw ApiError.unauthorized('Invalid refresh token');
  }

  const session = await parentRepo.findSessionByToken(refreshTokenValue);
  if (!session || session.revokedAt) {
    throw ApiError.unauthorized('Session expired. Please login again.');
  }

  const accessToken = signAccessToken({
    userId: decoded.userId,
    role: 'PARENT',
    sessionId: session.id,
  });

  return { accessToken };
}

// LOGOUT
export async function logout(sessionId) {
  if (sessionId) {
    await parentRepo.revokeSession(sessionId);
  }
  logger.info({ sessionId }, 'Parent logout');
  return true;
}

// GET PROFILE
export async function getProfile(userId) {
  const parent = await parentRepo.findProfileById(userId);

  if (!parent) {
    throw ApiError.notFound('Parent not found');
  }

  const students =
    parent.students?.map((link) => ({
      id: link.student.id,
      name: `${link.student.firstName || ''} ${link.student.lastName || ''}`.trim(),
      grade: link.student.grade,
      section: link.student.section,
      photoUrl: link.student.photoUrl,
      schoolName: link.student.school?.name,
      schoolId: link.student.schoolId,
      relationship: link.relation,
      isPrimary: link.isPrimary,
      isEmergency: link.isEmergency,
    })) || [];

  return {
    id: parent.id,
    name: parent.name,
    firstName: parent.firstName,
    lastName: parent.lastName,
    role: 'PARENT',
    phone: parent.phone,
    email: parent.email,
    photoUrl: parent.photoUrl,
    address: parent.address,
    city: parent.city,
    state: parent.state,
    pincode: parent.pincode,
    occupation: parent.occupation,
    students,
  };
}

// UPDATE PROFILE
export async function updateProfile(userId, data) {
  const parent = await parentRepo.findProfileById(userId);

  if (!parent) {
    throw ApiError.notFound('Parent not found');
  }

  const updatedParent = await parentRepo.updateProfile(userId, {
    firstName: data.firstName ?? parent.firstName,
    lastName: data.lastName ?? parent.lastName,
    name: data.firstName
      ? `${data.firstName} ${data.lastName ?? parent.lastName ?? ''}`.trim()
      : parent.name,
    email: data.email ?? parent.email,
    address: data.address ?? parent.address,
    city: data.city ?? parent.city,
    state: data.state ?? parent.state,
    pincode: data.pincode ?? parent.pincode,
    occupation: data.occupation ?? parent.occupation,
  });

  logger.info({ parentId: userId }, 'Parent profile updated');

  return updatedParent;
}
