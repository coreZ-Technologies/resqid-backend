// TODO: Add implementation
// =============================================================================
// notification.service.js — RESQID School Admin
//
// Business logic layer — orchestrates repository calls, enforces ownership,
// formats responses. Controllers call this; service calls repository.
// =============================================================================

import { ApiError } from '#shared/response/ApiError.js';
import { logger }   from '#config/logger.js';
import { NOTIFICATION_TYPES } from './notification.validation.js';
import * as repo from './notification.repository.js';

// ─── List ─────────────────────────────────────────────────────────────────────

/**
 * Returns paginated notifications for the requesting school.
 */
export async function listNotifications({ schoolId, filters, page, limit }) {
  const { notifications, total } = await repo.findNotifications({
    schoolId,
    filters,
    page,
    limit,
  });

  return {
    notifications,
    pagination: {
      page,
      limit,
      total,
    },
  };
}

// ─── Get single ───────────────────────────────────────────────────────────────

export async function getNotification({ notificationId, schoolId }) {
  const notification = await repo.findNotificationById({ notificationId, schoolId });

  if (!notification) {
    throw ApiError.notFound('Notification not found', 'NOTIFICATION_NOT_FOUND');
  }

  return notification;
}

// ─── Unread count ─────────────────────────────────────────────────────────────

export async function getUnreadCount({ schoolId }) {
  const count = await repo.countUnread({ schoolId });
  return { unreadCount: count };
}

// ─── Mark single read / unread ────────────────────────────────────────────────

export async function markRead({ notificationId, schoolId, isRead }) {
  // Verify ownership before mutating
  const existing = await repo.findNotificationById({ notificationId, schoolId });

  if (!existing) {
    throw ApiError.notFound('Notification not found', 'NOTIFICATION_NOT_FOUND');
  }

  // No-op if already in desired state
  if (existing.isRead === isRead) {
    return existing;
  }

  await repo.markNotificationRead({ notificationId, schoolId, isRead });

  logger.debug(
    { notificationId, schoolId, isRead },
    `Notification marked ${isRead ? 'read' : 'unread'}`
  );

  return { ...existing, isRead, readAt: isRead ? new Date().toISOString() : null };
}

// ─── Bulk mark read ───────────────────────────────────────────────────────────

export async function bulkMarkRead({ schoolId, ids, markAll }) {
  const result = await repo.bulkMarkRead({ schoolId, ids, markAll });

  logger.info(
    { schoolId, count: result.count, markAll: markAll ?? false },
    'Bulk mark-read complete'
  );

  return { updatedCount: result.count };
}

// ─── Delete single ────────────────────────────────────────────────────────────

export async function deleteNotification({ notificationId, schoolId }) {
  // Ownership check
  const existing = await repo.findNotificationById({ notificationId, schoolId });

  if (!existing) {
    throw ApiError.notFound('Notification not found', 'NOTIFICATION_NOT_FOUND');
  }

  await repo.deleteNotification({ notificationId, schoolId });

  logger.info({ notificationId, schoolId }, 'Notification deleted');

  return { deleted: true };
}

// ─── Bulk delete ──────────────────────────────────────────────────────────────

export async function bulkDelete({ schoolId, ids, deleteAll, onlyRead }) {
  const result = await repo.bulkDeleteNotifications({
    schoolId,
    ids,
    deleteAll,
    onlyRead,
  });

  logger.info(
    { schoolId, count: result.count, deleteAll: deleteAll ?? false },
    'Bulk delete complete'
  );

  return { deletedCount: result.count };
}

// ─── Preferences ─────────────────────────────────────────────────────────────

/**
 * Get preferences — fills in defaults for any type not yet saved.
 */
export async function getPreferences({ schoolId }) {
  const saved = await repo.findPreferences({ schoolId });
  const savedMap = new Map(saved.map((p) => [p.type, p]));

  // Return a complete set — one entry per allowed type with sensible defaults
  const preferences = NOTIFICATION_TYPES.map((type) =>
    savedMap.get(type) ?? {
      type,
      inApp:       true,
      email:       type === 'EMERGENCY_ALERT_TRIGGERED' || type === 'EMERGENCY_ALERT_ESCALATED',
      sms:         false,
      pushEnabled: true,
    }
  );

  return { preferences };
}

/**
 * Upsert preferences — partial update supported (only passed types are touched).
 */
export async function upsertPreferences({ schoolId, preferences }) {
  await repo.upsertPreferences({ schoolId, preferences });

  logger.info(
    { schoolId, count: preferences.length },
    'Notification preferences updated'
  );

  // Return the full refreshed set after upsert
  return getPreferences({ schoolId });
}

// ─── Internal: push a notification (called by event handlers) ────────────────

/**
 * Create a notification record from an internal event.
 * Respects per-school preferences — skips inApp if disabled.
 *
 * @param {{ schoolId, type, severity, title, body, meta }} opts
 */
export async function pushNotification({ schoolId, type, severity = 'INFO', title, body, meta }) {
  // Check school preference for inApp channel
  const prefs = await repo.findPreferences({ schoolId });
  const pref  = prefs.find((p) => p.type === type);

  // Default: inApp enabled unless explicitly set to false
  if (pref && pref.inApp === false) {
    logger.debug({ schoolId, type }, 'Notification suppressed by school preference');
    return null;
  }

  const notification = await repo.createNotification({
    schoolId,
    type,
    severity,
    title,
    body,
    meta,
  });

  return notification;
}