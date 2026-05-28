// TODO: Add implementation
// =============================================================================
// notification.module.service.js — RESQID
// Business logic for the notification module.
// Coordinates repository, publisher, preference checks, and channel fan-out.
// =============================================================================

import { publishNotification } from '#orchestrator/notifications/notification.publisher.js';
import { logger } from '#config/logger.js';
import { ApiError } from '#shared/errors/ApiError.js';
import {
  createNotification,
  createManyNotifications,
  findNotificationById,
  findNotificationsByParent,
  findNotificationsBySchool,
  countUnreadInApp,
  markAsRead,
  markAllReadForParent,
  markAsFailed,
  upsertPreferences,
  findPreferencesByParent,
  deletePreferences,
} from './notification.repository.js';
import {
  NOTIFICATION_CHANNEL,
  NOTIFICATION_STATUS,
  NOTIFICATION_TYPE,
  DEFAULT_NOTIFICATION_PREFERENCES,
} from './notification.constants.js';
import {
  isTerminalStatus,
  resolveEnabledChannels,
  isEventEnabled,
  parsePagination,
  paginatedResponse,
  formatNotification,
  buildNotificationData,
} from './notification.utils.js';

// ─── In-App Persistence ───────────────────────────────────────────────────────

/**
 * Persist an IN_APP notification directly (no queue / no publish step).
 * Called internally by handlers that have already dispatched SMS/push and only
 * need to write the in-app record for the inbox feed.
 *
 * @param {object} opts
 * @param {string|null}  opts.parentId
 * @param {string|null}  opts.schoolUserId
 * @param {string|null}  opts.schoolId
 * @param {string}       opts.title
 * @param {string}       opts.body
 * @param {string}       opts.type
 * @param {object|null}  [opts.data]
 * @returns {Promise<object>}
 */
export const saveInAppNotification = async ({ parentId, schoolUserId, schoolId, title, body, type, data = null }) => {
  return createNotification({
    parentId,
    schoolUserId,
    schoolId,
    title,
    body,
    type,
    data: buildNotificationData(type, data ?? {}),
    channel: NOTIFICATION_CHANNEL.IN_APP,
    status: NOTIFICATION_STATUS.SENT, // in-app is immediately "sent"
  });
};

/**
 * Fan-out a notification to multiple channels at once, respecting parent prefs.
 * Writes one DB row per channel and publishes to the event bus.
 *
 * @param {object} opts
 * @param {string|null}  opts.parentId
 * @param {string|null}  opts.schoolUserId
 * @param {string|null}  opts.schoolId
 * @param {string}       opts.title
 * @param {string}       opts.body
 * @param {string}       opts.type
 * @param {object}       [opts.data]
 * @param {string[]}     opts.channels         - desired channels e.g. ['SMS','PUSH','IN_APP']
 * @param {string}       [opts.eventSlug]      - prefs gate: 'onScan' | 'onEmergency' …
 * @param {object}       [opts.publishPayload] - forwarded to publishNotification.*
 * @returns {Promise<{ count: number }>}
 */
export const fanOutNotification = async ({
  parentId,
  schoolUserId,
  schoolId,
  title,
  body,
  type,
  data = {},
  channels,
  eventSlug = null,
  publishPayload = {},
}) => {
  // Resolve prefs (parent only — school users always receive)
  let activeChannels = channels;
  if (parentId) {
    const prefs = await findPreferencesByParent(parentId);

    // Gate on per-event toggle first
    if (eventSlug && !isEventEnabled(prefs, eventSlug)) {
      logger.debug({ parentId, eventSlug }, 'Notification suppressed by parent preference');
      return { count: 0 };
    }

    activeChannels = resolveEnabledChannels(prefs, channels);
  }

  if (!activeChannels.length) return { count: 0 };

  const jsonData = buildNotificationData(type, data);

  const rows = activeChannels.map((channel) => ({
    parentId: parentId ?? null,
    schoolUserId: schoolUserId ?? null,
    schoolId: schoolId ?? null,
    title,
    body,
    type,
    data: jsonData,
    channel,
    status: NOTIFICATION_STATUS.PENDING,
  }));

  const result = await createManyNotifications(rows);

  logger.info(
    { parentId, schoolUserId, type, channels: activeChannels, count: result.count },
    'Notifications created'
  );

  return result;
};

// ─── Inbox (parent-facing) ────────────────────────────────────────────────────

/**
 * Paginated IN_APP inbox for a parent.
 *
 * @param {string}  parentId
 * @param {object}  query    - { page, limit }
 * @returns {Promise<object>} Paginated response envelope
 */
export const getInbox = async (parentId, query = {}) => {
  const { skip, take, page } = parsePagination(query);

  const [rows, total] = await findNotificationsByParent(parentId, {
    skip,
    take,
    channels: [NOTIFICATION_CHANNEL.IN_APP],
  });

  return paginatedResponse(rows.map(formatNotification), total, page, take);
};

/**
 * Get unread count for parent badge.
 *
 * @param {string} parentId
 * @returns {Promise<{ unread: number }>}
 */
export const getUnreadCount = async (parentId) => {
  const unread = await countUnreadInApp(parentId);
  return { unread };
};

/**
 * Mark a single notification as read. Validates ownership.
 *
 * @param {string} notificationId
 * @param {string} parentId
 * @returns {Promise<object>}
 */
export const readNotification = async (notificationId, parentId) => {
  const notification = await findNotificationById(notificationId);

  if (!notification) throw ApiError.notFound('Notification not found');
  if (notification.parentId !== parentId) throw ApiError.forbidden('Access denied');
  if (isTerminalStatus(notification.status) && notification.status === NOTIFICATION_STATUS.READ) {
    return formatNotification(notification); // already read — idempotent
  }

  const updated = await markAsRead(notificationId);
  return formatNotification(updated);
};

/**
 * Mark all IN_APP notifications as read for a parent.
 *
 * @param {string} parentId
 * @returns {Promise<{ updated: number }>}
 */
export const readAllNotifications = async (parentId) => {
  const result = await markAllReadForParent(parentId);
  return { updated: result.count };
};

// ─── Admin / School-facing ────────────────────────────────────────────────────

/**
 * Paginated list of all notifications for a school.
 *
 * @param {string} schoolId
 * @param {object} query    - { page, limit, channels, statuses }
 * @returns {Promise<object>}
 */
export const getSchoolNotifications = async (schoolId, query = {}) => {
  const { skip, take, page } = parsePagination(query);

  const channels = query.channels ? query.channels.split(',') : undefined;
  const statuses = query.statuses ? query.statuses.split(',') : undefined;

  const [rows, total] = await findNotificationsBySchool(schoolId, { skip, take, channels, statuses });

  return paginatedResponse(rows.map(formatNotification), total, page, take);
};

// ─── Notification Preferences ─────────────────────────────────────────────────

/**
 * Get preferences for a parent, falling back to defaults if none exist.
 *
 * @param {string} parentId
 * @returns {Promise<object>}
 */
export const getPreferences = async (parentId) => {
  const prefs = await findPreferencesByParent(parentId);
  if (!prefs) return { parentId, ...DEFAULT_NOTIFICATION_PREFERENCES };
  return prefs;
};

/**
 * Update (upsert) preferences for a parent.
 *
 * @param {string} parentId
 * @param {object} updates  - partial preference fields
 * @returns {Promise<object>}
 */
export const updatePreferences = async (parentId, updates) => {
  // Strip unknown keys — only allow known preference fields
  const allowed = ['smsEnabled', 'emailEnabled', 'pushEnabled', 'onScan', 'onAttendance', 'onEmergency', 'onAnnouncement'];
  const safe = Object.fromEntries(Object.entries(updates).filter(([k]) => allowed.includes(k)));

  if (!Object.keys(safe).length) throw ApiError.badRequest('No valid preference fields provided');

  return upsertPreferences(parentId, safe);
};

/**
 * Reset preferences to defaults (on account deletion or explicit reset).
 *
 * @param {string} parentId
 * @returns {Promise<null>}
 */
export const resetPreferences = async (parentId) => {
  await deletePreferences(parentId);
  return null;
};

// ─── Delivery Status Webhooks ─────────────────────────────────────────────────
// Called by SMS/email/push provider webhooks after external dispatch.

/**
 * Record a delivery failure from a provider callback.
 *
 * @param {string} notificationId
 * @param {string} [reason]
 * @returns {Promise<object>}
 */
export const recordDeliveryFailure = async (notificationId, reason) => {
  const notification = await findNotificationById(notificationId);
  if (!notification) throw ApiError.notFound('Notification not found');

  if (isTerminalStatus(notification.status)) {
    logger.warn({ notificationId, status: notification.status }, 'Ignoring failure — already terminal');
    return formatNotification(notification);
  }

  const updated = await markAsFailed(notificationId, reason ?? null);
  logger.warn({ notificationId, reason }, 'Notification delivery failed');
  return formatNotification(updated);
};

// ─── Event-driven Helpers ─────────────────────────────────────────────────────
// Thin wrappers that orchestrator event handlers call to trigger notifications
// via the event bus (publishNotification) while also persisting in-app records.

/**
 * Handle a QR scan notification — push + in-app.
 *
 * @param {object} opts
 * @param {string}   opts.parentId
 * @param {string}   opts.schoolId
 * @param {string}   opts.studentName
 * @param {string|null} opts.location
 * @param {string[]} opts.parentExpoTokens
 */
export const notifyQrScanned = async ({ parentId, schoolId, studentName, location, parentExpoTokens }) => {
  const title = 'QR Scanned';
  const body = location
    ? `${studentName}'s ID was scanned at ${location}.`
    : `${studentName}'s ID was scanned.`;

  await Promise.all([
    saveInAppNotification({
      parentId,
      schoolId,
      title,
      body,
      type: NOTIFICATION_TYPE.STUDENT_QR_SCANNED,
      data: { studentName, location },
    }),
    publishNotification.studentQrScanned({
      schoolId,
      actorId: parentId,
      payload: { studentName, location, parentExpoTokens, notifyEnabled: true },
      meta: {},
    }),
  ]);
};

/**
 * Handle an emergency alert notification — SMS + push + in-app.
 *
 * @param {object} opts
 * @param {string}   opts.schoolId
 * @param {string}   opts.actorId
 * @param {string}   opts.parentId     - for in-app record
 * @param {string}   opts.studentName
 * @param {string}   opts.schoolName
 * @param {string}   opts.scannedAt
 * @param {string[]} opts.parentContacts
 * @param {string[]} opts.parentExpoTokens
 * @param {string}   opts.alertId
 * @param {string}   opts.studentId
 */
export const notifyEmergencyAlert = async ({
  schoolId,
  actorId,
  parentId,
  studentName,
  schoolName,
  scannedAt,
  parentContacts,
  parentExpoTokens,
  alertId,
  studentId,
}) => {
  const title = '🚨 Emergency Alert';
  const body = `An emergency has been triggered for ${studentName} at ${schoolName}.`;

  await Promise.all([
    saveInAppNotification({
      parentId,
      schoolId,
      title,
      body,
      type: NOTIFICATION_TYPE.EMERGENCY_ALERT,
      data: { studentName, schoolName, scannedAt, alertId },
    }),
    publishNotification.emergencyAlertTriggered({
      schoolId,
      actorId,
      payload: { studentName, schoolName, scannedAt, parentContacts, parentExpoTokens },
      meta: { alertId, studentId },
    }),
  ]);
};