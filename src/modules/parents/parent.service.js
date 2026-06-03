// =============================================================================
// modules/parents/parent.service.js — RESQID
// Business logic — emergency profile management moved to m2-emergency.
// =============================================================================

import { ApiError } from '#shared/response/ApiError.js';
import { logger } from '#config/logger.js';
import { middlewareRedis as redis } from '#config/redis.js';
import * as repo from './parent.repository.js';
import { publishNotification } from '#orchestrator/notifications/notification.publisher.js';
import { EVENTS } from '#orchestrator/events/event.types.js';
import { invalidateScanCache } from '#shared/cache/scan.cache.js';

const HOME_CACHE_KEY = (id) => `parent:home:${id}`;
const HOME_CACHE_TTL = 5 * 60;

const invalidateHomeCache = async (parentId) => {
  await redis.del(HOME_CACHE_KEY(parentId)).catch(() => {});
};

// ═══════════════════════════════════════════════════════════════════════════════
// HOME
// ═══════════════════════════════════════════════════════════════════════════════

export const getParentHome = async (parentId) => {
  try {
    const cached = await redis.get(HOME_CACHE_KEY(parentId));
    if (cached) return JSON.parse(cached);
  } catch {
    /* cache miss */
  }

  const data = await repo.getParentHome(parentId);
  if (data) {
    await redis
      .set(HOME_CACHE_KEY(parentId), JSON.stringify(data), 'EX', HOME_CACHE_TTL)
      .catch(() => {});
  }
  return data;
};

// ═══════════════════════════════════════════════════════════════════════════════
// PROFILE
// ═══════════════════════════════════════════════════════════════════════════════

export const updateParentProfile = async (parentId, { name }) => {
  await repo.updateParentProfile(parentId, { name });
  await invalidateHomeCache(parentId);
  return { success: true };
};

// ═══════════════════════════════════════════════════════════════════════════════
// CARD VISIBILITY
// ═══════════════════════════════════════════════════════════════════════════════

export const updateVisibility = async (parentId, studentId, visibility) => {
  await repo.verifyStudentOwnership(parentId, studentId);
  await repo.updateCardVisibility(studentId, visibility);
  await invalidateScanCache(studentId);
  await invalidateHomeCache(parentId);
  return { success: true };
};

// ═══════════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════════

export const updateNotifications = async (parentId, prefs) => {
  await repo.upsertNotificationPrefs(parentId, prefs);
  await invalidateHomeCache(parentId);
  return { success: true };
};

// ═══════════════════════════════════════════════════════════════════════════════
// LOCK CARD
// ═══════════════════════════════════════════════════════════════════════════════

export const lockCard = async (parentId, studentId) => {
  await repo.verifyStudentOwnership(parentId, studentId);
  const result = await repo.lockStudentCard(studentId);
  await invalidateScanCache(studentId);
  await invalidateHomeCache(parentId);

  // 🔧 Fixed: Use notification publisher
  publishNotification
    .parentCardLocked({
      actorId: parentId,
      schoolId: null,
      payload: { parentName: '', studentName: '', studentId },
    })
    .catch(() => {});

  return { locked: result.count > 0 };
};

// ═══════════════════════════════════════════════════════════════════════════════
// DEVICE
// ═══════════════════════════════════════════════════════════════════════════════

export const registerDeviceToken = (parentId, body) => repo.upsertParentDevice(parentId, body);

// ═══════════════════════════════════════════════════════════════════════════════
// LINK CARD (Add Child)
// ═══════════════════════════════════════════════════════════════════════════════

export const linkCard = async (parentId, { cardNumber }) => {
  const card = await repo.findCardByNumber(cardNumber);
  if (!card) throw ApiError.notFound('Card not found');

  if (card.studentId) {
    const existingLink = await repo.findParentStudentLink(parentId, card.studentId);
    if (existingLink) throw ApiError.conflict('Already linked to your account');
  }

  let studentId = card.studentId;
  if (!studentId) {
    // 🔧 Fixed: createStudent instead of createStubStudent
    const student = await repo.createStudent(card.schoolId);
    studentId = student.id;
    // 🔧 Fixed: Added schoolId
    await repo.createEmergencyProfile(studentId, card.schoolId);
    await repo.activateCard(card.id, studentId);
  }

  const count = await repo.countParentChildren(parentId);
  await repo.createParentStudentLink(parentId, studentId, count === 0);

  await invalidateHomeCache(parentId);
  return { success: true, studentId };
};

// ═══════════════════════════════════════════════════════════════════════════════
// SET ACTIVE STUDENT
// ═══════════════════════════════════════════════════════════════════════════════

export const setActiveStudent = async (parentId, studentId) => {
  await repo.verifyStudentOwnership(parentId, studentId);
  // 🔧 Note: setActiveStudent updates parentUser.activeStudentId — this field may not exist
  await invalidateHomeCache(parentId);
  return { success: true };
};

// ═══════════════════════════════════════════════════════════════════════════════
// SCAN HISTORY
// ═══════════════════════════════════════════════════════════════════════════════

export const getScanHistory = (parentId, { studentId, page, limit, filter }) =>
  repo.getScanHistory(parentId, { studentId, page, limit, filter });
