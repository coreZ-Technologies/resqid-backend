// TODO: Add implementation
// =============================================================================
// notification.controller.js — RESQID School Admin
//
// Thin HTTP layer — extracts request data, calls service, sends response.
// No business logic lives here.
// =============================================================================

import { ApiResponse } from '#shared/response/ApiResponse.js';
import * as service    from './notification.service.js';

// ─── List ─────────────────────────────────────────────────────────────────────

/**
 * GET /api/school/notifications
 * Paginated list of safety/emergency notifications for this school.
 */
export async function list(req, res) {
  const schoolId = req.schoolId;
  const { page, limit, isRead, type, severity, from, to } = req.query;

  const result = await service.listNotifications({
    schoolId,
    filters: { isRead, type, severity, from, to },
    page:  Number(page)  || 1,
    limit: Number(limit) || 20,
  });

  return ApiResponse.paginated(
    res,
    result.notifications,
    result.pagination,
    'Notifications fetched'
  );
}

// ─── Get single ───────────────────────────────────────────────────────────────

/**
 * GET /api/school/notifications/:notificationId
 */
export async function getOne(req, res) {
  const notification = await service.getNotification({
    notificationId: req.params.notificationId,
    schoolId:       req.schoolId,
  });

  return ApiResponse.ok(res, notification, 'Notification fetched');
}

// ─── Unread count ─────────────────────────────────────────────────────────────

/**
 * GET /api/school/notifications/unread-count
 * Returns a single { unreadCount: N } — used by dashboard badge.
 */
export async function unreadCount(req, res) {
  const data = await service.getUnreadCount({ schoolId: req.schoolId });
  return ApiResponse.ok(res, data, 'Unread count fetched');
}

// ─── Mark single read / unread ────────────────────────────────────────────────

/**
 * PATCH /api/school/notifications/:notificationId/read
 * Body: { isRead: boolean }
 */
export async function markRead(req, res) {
  const notification = await service.markRead({
    notificationId: req.params.notificationId,
    schoolId:       req.schoolId,
    isRead:         req.body.isRead,
  });

  const label = req.body.isRead ? 'Notification marked as read' : 'Notification marked as unread';
  return ApiResponse.ok(res, notification, label);
}

// ─── Bulk mark read ───────────────────────────────────────────────────────────

/**
 * PATCH /api/school/notifications/bulk-read
 * Body: { ids: string[] } | { markAll: true }
 */
export async function bulkMarkRead(req, res) {
  const { ids, markAll } = req.body;

  const result = await service.bulkMarkRead({
    schoolId: req.schoolId,
    ids,
    markAll,
  });

  return ApiResponse.ok(res, result, `${result.updatedCount} notification(s) marked as read`);
}

// ─── Delete single ────────────────────────────────────────────────────────────

/**
 * DELETE /api/school/notifications/:notificationId
 */
export async function remove(req, res) {
  await service.deleteNotification({
    notificationId: req.params.notificationId,
    schoolId:       req.schoolId,
  });

  return ApiResponse.noContent(res);
}

// ─── Bulk delete ──────────────────────────────────────────────────────────────

/**
 * DELETE /api/school/notifications/bulk
 * Body: { ids: string[] } | { deleteAll: true } | { deleteAll: true, onlyRead: true }
 */
export async function bulkDelete(req, res) {
  const { ids, deleteAll, onlyRead } = req.body;

  const result = await service.bulkDelete({
    schoolId: req.schoolId,
    ids,
    deleteAll,
    onlyRead,
  });

  return ApiResponse.ok(res, result, `${result.deletedCount} notification(s) deleted`);
}

// ─── Preferences ─────────────────────────────────────────────────────────────

/**
 * GET /api/school/notifications/preferences
 * Returns full preference set — defaults filled for any unsaved type.
 */
export async function getPreferences(req, res) {
  const data = await service.getPreferences({ schoolId: req.schoolId });
  return ApiResponse.ok(res, data, 'Notification preferences fetched');
}

/**
 * PUT /api/school/notifications/preferences
 * Body: { preferences: [{ type, inApp, email, sms, pushEnabled }] }
 */
export async function upsertPreferences(req, res) {
  const data = await service.upsertPreferences({
    schoolId:    req.schoolId,
    preferences: req.body.preferences,
  });

  return ApiResponse.ok(res, data, 'Notification preferences updated');
}