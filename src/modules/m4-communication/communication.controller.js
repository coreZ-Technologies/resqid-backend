// src/modules/m4-communication/communication.controller.js
import { ApiResponse } from '#shared/response/ApiResponse.js';
import { asyncHandler } from '#shared/response/asyncHandler.js';
import { CommunicationService } from './communication.service.js';

const service = new CommunicationService();

// ─── Announcements ────────────────────────────────────────────────
export const createAnnouncement = asyncHandler(async (req, res) => {
  const data = req.body;
  const schoolId = req.user.schoolId;
  const authorId = req.user.id;
  const announcement = await service.createAnnouncement(data, schoolId, authorId);
  return ApiResponse.created(res, announcement, 'Announcement created and queued for delivery');
});

export const updateAnnouncement = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const data = req.body;
  const schoolId = req.user.schoolId;
  const updated = await service.updateAnnouncement(id, data, schoolId);
  return ApiResponse.ok(res, updated, 'Announcement updated');
});

export const deleteAnnouncement = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const schoolId = req.user.schoolId;
  await service.deleteAnnouncement(id, schoolId);
  return ApiResponse.ok(res, null, 'Announcement archived');
});

export const listAnnouncements = asyncHandler(async (req, res) => {
  const query = req.query;
  const schoolId = req.user.schoolId;
  const result = await service.listAnnouncements(query, schoolId);
  return ApiResponse.paginated(res, result.items, result.meta);
});

export const getAnnouncementStats = asyncHandler(async (req, res) => {
  const schoolId = req.user.schoolId;
  const stats = await service.getAnnouncementStats(schoolId);
  return ApiResponse.ok(res, stats);
});

// ─── Delivery Logs ────────────────────────────────────────────────
export const getDeliveryLogs = asyncHandler(async (req, res) => {
  const query = req.query;
  const schoolId = req.user.schoolId;
  const result = await service.getDeliveryLogs(query, schoolId);
  return ApiResponse.paginated(res, result.items, result.meta);
});

export const getDeliveryStats = asyncHandler(async (req, res) => {
  const schoolId = req.user.schoolId;
  const stats = await service.getDeliveryStats(schoolId);
  return ApiResponse.ok(res, stats);
});

export const retryDelivery = asyncHandler(async (req, res) => {
  const { deliveryId } = req.params;
  const schoolId = req.user.schoolId;
  const result = await service.retryDelivery(deliveryId, schoolId);
  return ApiResponse.ok(res, result, 'Retry queued');
});

// ─── Messages ─────────────────────────────────────────────────────
export const sendMessage = asyncHandler(async (req, res) => {
  const data = req.body;
  const schoolId = req.user.schoolId;
  const senderId = req.user.id;
  const message = await service.sendMessage(data, schoolId, senderId);
  return ApiResponse.created(res, message, 'Message sent');
});

export const getMessages = asyncHandler(async (req, res) => {
  const query = req.query;
  const schoolId = req.user.schoolId;
  const result = await service.getMessages(query, schoolId);
  return ApiResponse.paginated(res, result.items, result.meta);
});

export const getThreads = asyncHandler(async (req, res) => {
  const query = req.query;
  const schoolId = req.user.schoolId;
  const result = await service.getThreads(schoolId, query);
  return ApiResponse.paginated(res, result.threads, result.meta);
});

// Thread-level mark as read (replaces single message version)
export const markThreadRead = asyncHandler(async (req, res) => {
  const { parentId } = req.params;
  const schoolId = req.user.schoolId;
  const result = await service.markThreadRead(parentId, schoolId);
  return ApiResponse.ok(res, result, 'Thread marked as read');
});
