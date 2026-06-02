// src/modules/share/notification/notification.controller.js
import { NotificationService } from './notification.service.js';
import { asyncHandler } from '#shared/response/asyncHandler.js';
import { ApiResponse } from '#shared/response/ApiResponse.js';
import { sendNotificationSchema, bulkSendSchema, preferencesSchema, queryLogsSchema } from './notification.validation.js';

export const NotificationController = {
  send: asyncHandler(async (req, res) => {
    const validated = sendNotificationSchema.parse(req.body);
    const result = await NotificationService.send(validated);
    return ApiResponse.created(res, result, 'Notification queued');
  }),

  sendBulk: asyncHandler(async (req, res) => {
    const validated = bulkSendSchema.parse(req.body);
    const results = await NotificationService.sendBulk(validated);
    return ApiResponse.created(res, results, `${results.length} notifications queued`);
  }),

  getLogs: asyncHandler(async (req, res) => {
    const { page, limit, userId, channel, status } = queryLogsSchema.parse(req.query);
    const result = await NotificationService.getLogs({ userId, channel, status }, page, limit);
    return ApiResponse.paginated(res, result.logs, result.total, page, limit);
  }),

  getLog: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const log = await NotificationService.getLogById(id);
    if (!log) return ApiResponse.notFound(res, 'Log not found');
    return ApiResponse.success(res, log);
  }),

  getPreferences: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const prefs = await NotificationService.getUserPreferences(userId);
    return ApiResponse.success(res, prefs);
  }),

  updatePreferences: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const validated = preferencesSchema.parse(req.body);
    const updated = await NotificationService.updateUserPreferences(userId, validated);
    return ApiResponse.success(res, updated, 'Preferences updated');
  }),

  getInApp: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { page, limit, unreadOnly } = req.query;
    const result = await NotificationService.getInAppNotifications(userId, parseInt(page) || 1, parseInt(limit) || 20, unreadOnly === 'true');
    return ApiResponse.paginated(res, result.notifications, result.total, page, limit);
  }),

  markInAppRead: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { notificationId } = req.params;
    const updated = await NotificationService.markInAppRead(notificationId, userId);
    return ApiResponse.success(res, updated, 'Marked as read');
  }),

  getTemplate: asyncHandler(async (req, res) => {
    const { name } = req.params;
    const template = await NotificationService.getTemplate(name);
    if (!template) return ApiResponse.notFound(res, 'Template not found');
    return ApiResponse.success(res, template);
  }),

  saveTemplate: asyncHandler(async (req, res) => {
    const { name } = req.params;
    const data = req.body;
    const template = await NotificationService.saveTemplate(name, data);
    return ApiResponse.success(res, template, 'Template saved');
  }),
};