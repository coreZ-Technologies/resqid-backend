// TODO: Add implementation
// =============================================================================
// notification.utils.js — RESQID
// Pure helpers for the notification module. No DB, no side-effects.
// =============================================================================

import {
  NOTIFICATION_STATUS,
  NOTIFICATION_CHANNEL,
  TERMINAL_STATUSES,
  NOTIFICATION_PAGE_SIZE,
  NOTIFICATION_MAX_PAGE_SIZE,
} from './notification.constants.js';

// ─── Status Helpers ───────────────────────────────────────────────────────────

/**
 * Whether a notification can still be transitioned to another status.
 * @param {string} status
 * @returns {boolean}
 */
export const isTerminalStatus = (status) => TERMINAL_STATUSES.includes(status);

/**
 * Whether a notification has been successfully delivered (DELIVERED or READ).
 * @param {string} status
 * @returns {boolean}
 */
export const isDelivered = (status) =>
  status === NOTIFICATION_STATUS.DELIVERED || status === NOTIFICATION_STATUS.READ;

/**
 * Whether a notification is still in-flight (PENDING or QUEUED).
 * @param {string} status
 * @returns {boolean}
 */
export const isInFlight = (status) =>
  status === NOTIFICATION_STATUS.PENDING || status === NOTIFICATION_STATUS.QUEUED;

// ─── Channel Helpers ──────────────────────────────────────────────────────────

/**
 * Return channels enabled for a given NotificationPreference record, filtered
 * against the channels the caller actually wants to send.
 *
 * @param {object} prefs          - NotificationPreference row from DB
 * @param {string[]} requested    - Channels the publisher wants to use
 * @returns {string[]}            - Intersection of enabled + requested
 */
export const resolveEnabledChannels = (prefs, requested = Object.values(NOTIFICATION_CHANNEL)) => {
  if (!prefs) return requested; // no prefs → respect caller

  const enabled = [];
  if (prefs.smsEnabled && requested.includes(NOTIFICATION_CHANNEL.SMS))
    enabled.push(NOTIFICATION_CHANNEL.SMS);
  if (prefs.emailEnabled && requested.includes(NOTIFICATION_CHANNEL.EMAIL))
    enabled.push(NOTIFICATION_CHANNEL.EMAIL);
  if (prefs.pushEnabled && requested.includes(NOTIFICATION_CHANNEL.PUSH))
    enabled.push(NOTIFICATION_CHANNEL.PUSH);
  // IN_APP is always enabled (not user-configurable)
  if (requested.includes(NOTIFICATION_CHANNEL.IN_APP))
    enabled.push(NOTIFICATION_CHANNEL.IN_APP);

  return enabled;
};

/**
 * Whether the parent wants to be notified for this event category.
 *
 * @param {object} prefs       - NotificationPreference row
 * @param {string} eventSlug   - 'onScan' | 'onAttendance' | 'onEmergency' | 'onAnnouncement'
 * @returns {boolean}
 */
export const isEventEnabled = (prefs, eventSlug) => {
  if (!prefs) return true; // default-allow if no prefs row
  return prefs[eventSlug] !== false;
};

// ─── Pagination Helpers ───────────────────────────────────────────────────────

/**
 * Normalise and clamp pagination params coming from a query string.
 *
 * @param {object} query
 * @param {number|string} [query.page]
 * @param {number|string} [query.limit]
 * @returns {{ skip: number, take: number, page: number }}
 */
export const parsePagination = ({ page = 1, limit = NOTIFICATION_PAGE_SIZE } = {}) => {
  const p = Math.max(1, parseInt(page, 10) || 1);
  const take = Math.min(parseInt(limit, 10) || NOTIFICATION_PAGE_SIZE, NOTIFICATION_MAX_PAGE_SIZE);
  return { skip: (p - 1) * take, take, page: p };
};

/**
 * Build a standard paginated response envelope.
 *
 * @param {object[]} data
 * @param {number} total
 * @param {number} page
 * @param {number} take
 * @returns {object}
 */
export const paginatedResponse = (data, total, page, take) => ({
  data,
  meta: {
    total,
    page,
    limit: take,
    totalPages: Math.ceil(total / take),
    hasNext: page * take < total,
    hasPrev: page > 1,
  },
});

// ─── Formatting Helpers ───────────────────────────────────────────────────────

/**
 * Strip internal DB fields before sending to the client.
 * @param {object} notification
 * @returns {object}
 */
export const formatNotification = (notification) => {
  if (!notification) return null;
  const { failReason: _fr, schoolId: _si, ...safe } = notification;
  return safe;
};

/**
 * Build the `data` JSON blob that gets stored alongside a notification and
 * forwarded to push/in-app payloads for deep-linking.
 *
 * @param {string} type   - NOTIFICATION_TYPE value
 * @param {object} extra  - Arbitrary extra fields (IDs, URLs …)
 * @returns {object}
 */
export const buildNotificationData = (type, extra = {}) => ({
  type,
  ...extra,
  _v: 1,
});