// =============================================================================
// notification.controller.js — RESQID
// HTTP handlers for notification endpoints.
// =============================================================================

import { ApiResponse } from '#shared/response/ApiResponse.js';
import * as service from './notification.module.service.js';

// ─── Parent Inbox ───────────────────────────────────────────────────────────

export const getInbox = async (req, res) => {
  const result = await service.getInbox(req.user.id, req.query);
  return ApiResponse.ok(res, result);
};

export const getUnreadCount = async (req, res) => {
  const result = await service.getUnreadCount(req.user.id);
  return ApiResponse.ok(res, result);
};

export const markAsRead = async (req, res) => {
  const result = await service.readNotification(req.params.id, req.user.id);
  return ApiResponse.ok(res, result);
};

export const markAllAsRead = async (req, res) => {
  const result = await service.readAllNotifications(req.user.id);
  return ApiResponse.ok(res, result);
};

// ─── Preferences (Parent) ───────────────────────────────────────────────────

export const getPreferences = async (req, res) => {
  const prefs = await service.getPreferences(req.user.id);
  return ApiResponse.ok(res, prefs);
};

export const updatePreferences = async (req, res) => {
  const updated = await service.updatePreferences(req.user.id, req.body);
  return ApiResponse.ok(res, updated);
};

// ─── School Admin View (all notifications for school) ───────────────────────

export const getSchoolNotifications = async (req, res) => {
  const result = await service.getSchoolNotifications(req.schoolId, req.query);
  return ApiResponse.ok(res, result);
};

// ─── Webhook for delivery status (optional, external providers) ────────────

export const webhookDeliveryFailure = async (req, res) => {
  const { notificationId, reason } = req.body;
  await service.recordDeliveryFailure(notificationId, reason);
  return ApiResponse.ok(res, null, 'Delivery failure recorded');
};