// =============================================================================
// modules/parents/parent.service.js — RESQID
// =============================================================================

import crypto from 'crypto';
import * as repo from './parent.repository.js';
import { prisma } from '#config/prisma.js';
import { middlewareRedis as redis } from '#config/redis.js';
import { logger } from '#config/logger.js';
import { ApiError } from '#shared/response/ApiError.js';
import { generateOtp } from '#services/Otp.service.js';
import { getEmail } from '#infrastructure/email/email.index.js';
import { getSms } from '#infrastructure/sms/sms.index.js';
import { publish } from '#orchestrator/events/event.publisher.js';
import { EVENTS } from '#orchestrator/events/event.types.js';
import { invalidateScanCache } from '#shared/cache/scan.cache.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const hashOtp = (otp) => crypto.createHash('sha256').update(otp).digest('hex');

const maskPhone = (phone) => {
  if (!phone) return 'Unknown';
  return phone.slice(0, 3) + '****' + phone.slice(-4);
};

const HOME_CACHE_KEY = (id) => `parent:home:${id}`;
const HOME_CACHE_TTL = 5 * 60;

async function invalidateHomeCache(parentId) {
  await redis.del(HOME_CACHE_KEY(parentId)).catch(() => {});
}

async function cacheAside(key, ttl, fn) {
  try {
    const cached = await redis.get(key);
    if (cached) return JSON.parse(cached);
  } catch {}
  const data = await fn();
  if (data) await redis.set(key, JSON.stringify(data), 'EX', ttl).catch(() => {});
  return data;
}

// ─── GET /me ──────────────────────────────────────────────────────────────────

export const getParentHome = (parentId) =>
  cacheAside(HOME_CACHE_KEY(parentId), HOME_CACHE_TTL, () => repo.getParentHome(parentId));

// ─── PATCH /me/profile ────────────────────────────────────────────────────────

export const updateProfile = async (parentId, body) => {
  const { studentId, firstName, lastName, grade, section, photoUrl, emergency, contacts } = body;

  // Verify parent-child link
  const link = await repo.findParentStudentLink(parentId, studentId);
  if (!link) throw ApiError.forbidden('Student not linked to your account');

  await repo.updateStudentProfile(studentId, { firstName, lastName, grade, section, photoUrl });

  if (emergency) {
    await repo.upsertEmergencyProfile(studentId, emergency);
  }

  if (contacts) {
    await repo.replaceEmergencyContacts(studentId, contacts);
  }

  // Invalidate scan cache
  await invalidateScanCache(studentId);
  await invalidateHomeCache(parentId);

  return { success: true };
};

// ─── PATCH /me/visibility ─────────────────────────────────────────────────────

export const updateVisibility = async (parentId, { studentId, visibility }) => {
  const link = await repo.findParentStudentLink(parentId, studentId);
  if (!link) throw ApiError.forbidden('Student not linked');

  await repo.updateCardVisibility(studentId, visibility);
  await invalidateScanCache(studentId);
  await invalidateHomeCache(parentId);

  return { success: true };
};

// ─── PATCH /me/notifications ──────────────────────────────────────────────────

export const updateNotifications = async (parentId, prefs) => {
  await repo.upsertNotificationPrefs(parentId, prefs);
  await invalidateHomeCache(parentId);
  return { success: true };
};

// ─── POST /me/lock-card ───────────────────────────────────────────────────────

export const lockCard = async (parentId, { studentId }) => {
  const link = await repo.findParentStudentLink(parentId, studentId);
  if (!link) throw ApiError.forbidden('Student not linked');

  const result = await repo.lockStudentCard(studentId);
  await invalidateScanCache(studentId);
  await invalidateHomeCache(parentId);

  // Notify
  await publish({
    type: EVENTS.PARENT_CARD_LOCKED,
    actorId: parentId,
    actorType: 'PARENT',
    payload: { studentId },
  }).catch(() => {});

  return result;
};

// ─── POST /me/device-token ────────────────────────────────────────────────────

export const registerDeviceToken = (parentId, body) => repo.upsertParentDevice(parentId, body);

// ─── POST /me/link-card ───────────────────────────────────────────────────────

export const linkCard = async (parentId, { cardNumber }) => {
  const card = await repo.findCardByNumber(cardNumber);
  if (!card) throw ApiError.notFound('Card not found');

  if (card.studentId) {
    const existingLink = await repo.findParentStudentLink(parentId, card.studentId);
    if (existingLink) throw ApiError.conflict('Already linked');
  }

  let studentId = card.studentId;
  if (!studentId) {
    const student = await repo.createStubStudent(card.schoolId);
    studentId = student.id;
    await repo.createEmergencyProfile(studentId);
    await repo.activateCard(card.id, studentId);
  }

  const count = await repo.countParentChildren(parentId);
  await repo.createParentStudentLink(parentId, studentId, count === 0);

  await invalidateHomeCache(parentId);

  return { success: true, studentId };
};

// ─── PATCH /me/active-student ─────────────────────────────────────────────────

export const setActiveStudent = async (parentId, studentId) => {
  const link = await repo.findParentStudentLink(parentId, studentId);
  if (!link) throw ApiError.forbidden('Student not linked');

  await repo.setActiveStudent(parentId, studentId);
  await invalidateHomeCache(parentId);

  return { success: true };
};

// ─── POST /me/unlink-child ────────────────────────────────────────────────────

export const unlinkChild = async (parentId, studentId) => {
  const link = await repo.findParentStudentLink(parentId, studentId);
  if (!link) throw ApiError.forbidden('Student not linked');

  await repo.deleteParentStudentLink(parentId, studentId);

  const remaining = await repo.countParentChildren(parentId);
  if (remaining === 0) {
    await repo.setActiveStudent(parentId, null);
  }

  await invalidateHomeCache(parentId);

  return { success: true, remainingChildren: remaining };
};

// ─── Scan History ─────────────────────────────────────────────────────────────

export const getScanHistory = (parentId, query) => repo.getScanHistory(parentId, query);

// ─── Parent Profile ───────────────────────────────────────────────────────────

export const updateParentProfile = async (parentId, { name }) => {
  await prisma.parentUser.update({ where: { id: parentId }, data: { name } });
  await invalidateHomeCache(parentId);
  return { success: true };
};
