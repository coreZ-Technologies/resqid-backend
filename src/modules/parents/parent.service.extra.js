// =============================================================================
// modules/parents/parent.service.extra.js — RESQID
// Deferred/nice-to-have parent functions.
// Import these when building the corresponding features.
// =============================================================================

import crypto from 'crypto';
import { prisma } from '#config/prisma.js';
import { middlewareRedis as redis } from '#config/redis.js';
import { logger } from '#config/logger.js';
import { ApiError } from '#shared/response/ApiError.js';
import { generateOtp } from '#services/Otp.service.js';
import { getEmail } from '#infrastructure/email/email.index.js';
import { getSms } from '#infrastructure/sms/sms.index.js';
import { publish } from '#orchestrator/events/event.publisher.js';
import { EVENTS } from '#orchestrator/events/event.types.js';
import * as repo from './parent.repository.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const hashOtp = (otp) => crypto.createHash('sha256').update(otp).digest('hex');

const maskPhone = (phone) => {
  if (!phone) return 'Unknown';
  return phone.slice(0, 3) + '****' + phone.slice(-4);
};

const invalidateHomeCache = async (parentId) => {
  await redis.del(`parent:home:${parentId}`).catch(() => {});
};

// ═══════════════════════════════════════════════════════════════════════════════
// PHONE CHANGE
// ═══════════════════════════════════════════════════════════════════════════════

export const changePhone = async (parentId, newPhone, otp) => {
  const storedData = await redis.get(`otp:phone_change:${newPhone}`);
  if (!storedData) throw ApiError.badRequest('OTP expired or not requested');

  const otpData = JSON.parse(storedData);
  const inputHash = hashOtp(otp);

  const valid = crypto.timingSafeEqual(
    Buffer.from(inputHash, 'hex'),
    Buffer.from(otpData.hash, 'hex')
  );
  if (!valid) throw ApiError.badRequest('Invalid OTP');

  await prisma.parentUser.update({
    where: { id: parentId },
    data: { phone: newPhone },
  });

  // Revoke all sessions
  await prisma.userSession.updateMany({
    where: { parentUserId: parentId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  await redis.del(`otp:phone_change:${newPhone}`);
  await invalidateHomeCache(parentId);

  return { message: 'Phone updated. Please login again.' };
};

// ═══════════════════════════════════════════════════════════════════════════════
// EMAIL VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

export const sendEmailVerificationOtp = async (parentId, email) => {
  const rateKey = `otp:email_verify:rate:${parentId}`;
  const count = await redis.incr(rateKey);
  if (count === 1) await redis.expire(rateKey, 3600);
  if (count > 3) throw ApiError.tooManyRequests('Too many OTP requests');

  const existing = await prisma.parentUser.findFirst({
    where: { email, NOT: { id: parentId } },
  });
  if (existing) throw ApiError.conflict('Email already in use');

  const otp = generateOtp();
  const hashed = hashOtp(otp);

  await redis.set(
    `otp:email_verify:${parentId}`,
    JSON.stringify({ hash: hashed, email, attempts: 0 }),
    'EX',
    300
  );

  const emailService = getEmail();
  await emailService.send({
    to: email,
    subject: 'RESQID — Email Verification',
    html: `<p>Your verification code is: <strong>${otp}</strong></p><p>Valid for 5 minutes.</p>`,
  });

  return { success: true, expiresIn: 300 };
};

export const verifyEmail = async (parentId, email, otp) => {
  const stored = await redis.get(`otp:email_verify:${parentId}`);
  if (!stored) throw ApiError.badRequest('OTP expired');

  const data = JSON.parse(stored);
  if (data.email !== email) throw ApiError.badRequest('Email mismatch');
  if (data.attempts >= 3) {
    await redis.del(`otp:email_verify:${parentId}`);
    throw ApiError.tooManyRequests('Too many attempts');
  }

  const inputHash = hashOtp(otp);
  const valid = crypto.timingSafeEqual(
    Buffer.from(inputHash, 'hex'),
    Buffer.from(data.hash, 'hex')
  );

  if (!valid) {
    data.attempts += 1;
    await redis.set(`otp:email_verify:${parentId}`, JSON.stringify(data), 'EX', 300);
    throw ApiError.badRequest('Invalid OTP');
  }

  await prisma.parentUser.update({
    where: { id: parentId },
    data: { email, isEmailVerified: true },
  });

  await redis.del(`otp:email_verify:${parentId}`);
  await invalidateHomeCache(parentId);

  return { success: true };
};

// ═══════════════════════════════════════════════════════════════════════════════
// EMAIL CHANGE
// ═══════════════════════════════════════════════════════════════════════════════

export const sendEmailChangeOtp = async (parentId, newEmail) => {
  const rateKey = `otp:email_change:rate:${parentId}`;
  const count = await redis.incr(rateKey);
  if (count === 1) await redis.expire(rateKey, 3600);
  if (count > 3) throw ApiError.tooManyRequests('Too many requests');

  const existing = await prisma.parentUser.findFirst({
    where: { email: newEmail, NOT: { id: parentId } },
  });
  if (existing) throw ApiError.conflict('Email already in use');

  const otp = generateOtp();
  const hashed = hashOtp(otp);

  await redis.set(
    `otp:email_change:${parentId}`,
    JSON.stringify({ hash: hashed, email: newEmail, attempts: 0 }),
    'EX',
    300
  );

  const emailService = getEmail();
  await emailService.send({
    to: newEmail,
    subject: 'RESQID — Confirm New Email',
    html: `<p>Your verification code is: <strong>${otp}</strong></p>`,
  });

  return { success: true, expiresIn: 300 };
};

export const verifyEmailChange = async (parentId, newEmail, otp) => {
  const stored = await redis.get(`otp:email_change:${parentId}`);
  if (!stored) throw ApiError.badRequest('OTP expired');

  const data = JSON.parse(stored);
  if (data.email !== newEmail) throw ApiError.badRequest('Email mismatch');
  if (data.attempts >= 3) {
    await redis.del(`otp:email_change:${parentId}`);
    throw ApiError.tooManyRequests('Too many attempts');
  }

  const inputHash = hashOtp(otp);
  const valid = crypto.timingSafeEqual(
    Buffer.from(inputHash, 'hex'),
    Buffer.from(data.hash, 'hex')
  );

  if (!valid) {
    data.attempts += 1;
    await redis.set(`otp:email_change:${parentId}`, JSON.stringify(data), 'EX', 300);
    throw ApiError.badRequest('Invalid OTP');
  }

  const parent = await prisma.parentUser.findUnique({
    where: { id: parentId },
    select: { email: true, name: true },
  });

  const oldEmail = parent?.email;

  await prisma.parentUser.update({
    where: { id: parentId },
    data: { email: newEmail },
  });

  await redis.del(`otp:email_change:${parentId}`);
  await invalidateHomeCache(parentId);

  // Notify old email
  if (oldEmail) {
    await publish({
      type: EVENTS.PARENT_EMAIL_CHANGED,
      actorId: parentId,
      actorType: 'PARENT',
      payload: { parentName: parent?.name, oldEmail, newEmail },
    }).catch(() => {});
  }

  return { success: true };
};

// ═══════════════════════════════════════════════════════════════════════════════
// CARD REPLACEMENT REQUEST
// ═══════════════════════════════════════════════════════════════════════════════

export const requestCardReplacement = async (parentId, { studentId, reason }) => {
  const link = await repo.findParentStudentLink(parentId, studentId);
  if (!link) throw ApiError.forbidden('Student not linked');

  await publish({
    type: EVENTS.PARENT_CARD_REPLACE_REQUESTED,
    actorId: parentId,
    actorType: 'PARENT',
    payload: { studentId, reason },
  }).catch(() => {});

  return { success: true, message: 'Replacement request submitted' };
};

// ═══════════════════════════════════════════════════════════════════════════════
// ACCOUNT DELETION
// ═══════════════════════════════════════════════════════════════════════════════

export const deleteAccount = async (parentId) => {
  // Soft delete
  await prisma.parentUser.update({
    where: { id: parentId },
    data: { isActive: false, deletedAt: new Date() },
  });

  // Revoke all sessions
  await prisma.userSession.updateMany({
    where: { parentUserId: parentId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  await invalidateHomeCache(parentId);

  await publish({
    type: EVENTS.PARENT_ACCOUNT_DELETED,
    actorId: parentId,
    actorType: 'PARENT',
    payload: { parentId },
  }).catch(() => {});

  return { success: true };
};

// ═══════════════════════════════════════════════════════════════════════════════
// SCAN HISTORY
// ═══════════════════════════════════════════════════════════════════════════════

export const getScanHistory = (parentId, query) => repo.getScanHistory(parentId, query);

// ═══════════════════════════════════════════════════════════════════════════════
// LOCATION HISTORY
// ═══════════════════════════════════════════════════════════════════════════════

export const getLocationHistory = (parentId, query) => repo.getLocationHistory(parentId, query);

// ═══════════════════════════════════════════════════════════════════════════════
// ANOMALIES
// ═══════════════════════════════════════════════════════════════════════════════

export const getAnomalies = (parentId, query) => repo.getAnomalies(parentId, query);

// ═══════════════════════════════════════════════════════════════════════════════
// STUDENT BASIC INFO
// ═══════════════════════════════════════════════════════════════════════════════

export const updateStudentBasicInfo = async (parentId, studentId, data) => {
  const link = await repo.findParentStudentLink(parentId, studentId);
  if (!link) throw ApiError.forbidden('Student not linked');

  await prisma.student.update({
    where: { id: studentId },
    data: {
      ...(data.firstName !== undefined && { firstName: data.firstName?.trim() }),
      ...(data.lastName !== undefined && { lastName: data.lastName?.trim() }),
      ...(data.grade !== undefined && { grade: data.grade?.trim() }),
      ...(data.section !== undefined && { section: data.section?.trim() }),
      ...(data.gender !== undefined && { gender: data.gender }),
      ...(data.dateOfBirth !== undefined && { dateOfBirth: new Date(data.dateOfBirth) }),
    },
  });

  await invalidateHomeCache(parentId);
  return { success: true };
};

// ═══════════════════════════════════════════════════════════════════════════════
// PHOTO UPLOAD CONFIRMATION
// ═══════════════════════════════════════════════════════════════════════════════

export const confirmPhotoUpload = async (parentId, studentId, key, nonce) => {
  const nonceKey = `upload:nonce:${nonce}`;
  const nonceData = await redis.get(nonceKey);

  if (!nonceData) throw ApiError.badRequest('Upload session expired');

  const { parentId: storedParentId, studentId: storedStudentId } = JSON.parse(nonceData);
  if (storedParentId !== parentId || storedStudentId !== studentId) {
    throw ApiError.forbidden('Invalid upload confirmation');
  }

  const cdnDomain = process.env.AWS_CDN_DOMAIN || 'assets.getresqid.in';
  const photoUrl = `https://${cdnDomain}/${key}`;

  await prisma.student.update({
    where: { id: studentId },
    data: { photoUrl },
  });

  await redis.del(nonceKey);
  await invalidateHomeCache(parentId);

  return { photoUrl };
};
