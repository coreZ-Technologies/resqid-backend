// TODO: Add implementation
// =============================================================================
// notification.repository.js — RESQID
// All Prisma access for the Notification + NotificationPreference models.
// No business logic here — pure data layer.
// =============================================================================

import { prisma } from '#config/prisma.js';
import { logger } from '#config/logger.js';
import { NOTIFICATION_STATUS, NOTIFICATION_CHANNEL } from './notification.constants.js';

// ─── Notification CRUD ────────────────────────────────────────────────────────

/**
 * Create a single notification row.
 *
 * @param {object} data
 * @param {string|null}  data.parentId
 * @param {string|null}  data.schoolUserId
 * @param {string|null}  data.schoolId
 * @param {string}       data.title
 * @param {string}       data.body
 * @param {string}       data.type           - NOTIFICATION_TYPE value
 * @param {object|null}  data.data           - JSON payload for deep-link
 * @param {string}       data.channel        - NOTIFICATION_CHANNEL value
 * @param {string}       [data.status]       - defaults to PENDING
 * @returns {Promise<object>}
 */
export const createNotification = async (data) => {
  return prisma.notification.create({
    data: {
      parentId: data.parentId ?? null,
      schoolUserId: data.schoolUserId ?? null,
      schoolId: data.schoolId ?? null,
      title: data.title,
      body: data.body,
      type: data.type,
      data: data.data ?? undefined,
      channel: data.channel,
      status: data.status ?? NOTIFICATION_STATUS.PENDING,
    },
  });
};

/**
 * Create many notifications in a single transaction (e.g. multi-channel fan-out).
 *
 * @param {object[]} rows - Array of objects with same shape as createNotification
 * @returns {Promise<{ count: number }>}
 */
export const createManyNotifications = async (rows) => {
  return prisma.notification.createMany({ data: rows, skipDuplicates: false });
};

/**
 * Find a notification by its primary key.
 *
 * @param {string} id
 * @returns {Promise<object|null>}
 */
export const findNotificationById = async (id) => {
  return prisma.notification.findUnique({ where: { id } });
};

/**
 * Paginated list of notifications for a parent — newest first.
 *
 * @param {string}   parentId
 * @param {object}   opts
 * @param {number}   opts.skip
 * @param {number}   opts.take
 * @param {string[]} [opts.channels]  - filter by channel(s)
 * @param {string[]} [opts.statuses]  - filter by status(es)
 * @returns {Promise<[object[], number]>}  [rows, total]
 */
export const findNotificationsByParent = async (parentId, { skip = 0, take = 20, channels, statuses } = {}) => {
  const where = {
    parentId,
    ...(channels?.length ? { channel: { in: channels } } : {}),
    ...(statuses?.length ? { status: { in: statuses } } : {}),
  };

  const [rows, total] = await prisma.$transaction([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.notification.count({ where }),
  ]);

  return [rows, total];
};

/**
 * Paginated list of notifications for a school.
 *
 * @param {string} schoolId
 * @param {object} opts  - same shape as findNotificationsByParent opts
 * @returns {Promise<[object[], number]>}
 */
export const findNotificationsBySchool = async (schoolId, { skip = 0, take = 20, channels, statuses } = {}) => {
  const where = {
    schoolId,
    ...(channels?.length ? { channel: { in: channels } } : {}),
    ...(statuses?.length ? { status: { in: statuses } } : {}),
  };

  const [rows, total] = await prisma.$transaction([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.notification.count({ where }),
  ]);

  return [rows, total];
};

/**
 * Count unread IN_APP notifications for a parent.
 *
 * @param {string} parentId
 * @returns {Promise<number>}
 */
export const countUnreadInApp = async (parentId) => {
  return prisma.notification.count({
    where: {
      parentId,
      channel: NOTIFICATION_CHANNEL.IN_APP,
      status: { notIn: [NOTIFICATION_STATUS.READ, NOTIFICATION_STATUS.CANCELLED] },
    },
  });
};

// ─── Status Transitions ───────────────────────────────────────────────────────

/**
 * Mark a single notification as SENT (records sentAt).
 *
 * @param {string} id
 * @returns {Promise<object>}
 */
export const markAsSent = async (id) => {
  return prisma.notification.update({
    where: { id },
    data: { status: NOTIFICATION_STATUS.SENT, sentAt: new Date() },
  });
};

/**
 * Mark a single notification as DELIVERED.
 *
 * @param {string} id
 * @returns {Promise<object>}
 */
export const markAsDelivered = async (id) => {
  return prisma.notification.update({
    where: { id },
    data: { status: NOTIFICATION_STATUS.DELIVERED },
  });
};

/**
 * Mark a notification as READ (sets readAt timestamp).
 *
 * @param {string} id
 * @returns {Promise<object>}
 */
export const markAsRead = async (id) => {
  return prisma.notification.update({
    where: { id },
    data: { status: NOTIFICATION_STATUS.READ, readAt: new Date() },
  });
};

/**
 * Mark all unread IN_APP notifications for a parent as READ in one query.
 *
 * @param {string} parentId
 * @returns {Promise<{ count: number }>}
 */
export const markAllReadForParent = async (parentId) => {
  return prisma.notification.updateMany({
    where: {
      parentId,
      channel: NOTIFICATION_CHANNEL.IN_APP,
      status: { notIn: [NOTIFICATION_STATUS.READ, NOTIFICATION_STATUS.CANCELLED, NOTIFICATION_STATUS.FAILED] },
    },
    data: { status: NOTIFICATION_STATUS.READ, readAt: new Date() },
  });
};

/**
 * Mark a notification as FAILED with an optional reason.
 *
 * @param {string} id
 * @param {string} [reason]
 * @returns {Promise<object>}
 */
export const markAsFailed = async (id, reason = null) => {
  return prisma.notification.update({
    where: { id },
    data: {
      status: NOTIFICATION_STATUS.FAILED,
      failReason: reason,
    },
  });
};

/**
 * Transition multiple notifications to QUEUED (batch, by IDs).
 *
 * @param {string[]} ids
 * @returns {Promise<{ count: number }>}
 */
export const markManyQueued = async (ids) => {
  return prisma.notification.updateMany({
    where: { id: { in: ids } },
    data: { status: NOTIFICATION_STATUS.QUEUED },
  });
};

// ─── Notification Preferences ─────────────────────────────────────────────────

/**
 * Upsert (create or update) notification preferences for a parent.
 *
 * @param {string}  parentId
 * @param {object}  prefs  - partial fields to update
 * @returns {Promise<object>}
 */
export const upsertPreferences = async (parentId, prefs) => {
  return prisma.notificationPreference.upsert({
    where: { parentId },
    create: { parentId, ...prefs },
    update: prefs,
  });
};

/**
 * Fetch preferences for a parent. Returns null if not yet created.
 *
 * @param {string} parentId
 * @returns {Promise<object|null>}
 */
export const findPreferencesByParent = async (parentId) => {
  return prisma.notificationPreference.findUnique({ where: { parentId } });
};

/**
 * Delete the preferences row for a parent (e.g. on account deletion).
 *
 * @param {string} parentId
 * @returns {Promise<object>}
 */
export const deletePreferences = async (parentId) => {
  try {
    return await prisma.notificationPreference.delete({ where: { parentId } });
  } catch (err) {
    // P2025 = record not found — safe to ignore
    if (err.code === 'P2025') return null;
    throw err;
  }
};

// ─── Maintenance / Cleanup ────────────────────────────────────────────────────

/**
 * Hard-delete notifications older than `days` days.
 * Intended for a scheduled cron job, not user-facing endpoints.
 *
 * @param {number} days
 * @returns {Promise<{ count: number }>}
 */
export const deleteOldNotifications = async (days = 90) => {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const result = await prisma.notification.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });

  logger.info({ type: 'notification_cleanup', deleted: result.count, cutoffDays: days }, 'Old notifications pruned');

  return result;
};