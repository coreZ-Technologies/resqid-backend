// src/modules/m4-communication/communication.controller.js
import { ApiResponse } from '#shared/response/ApiResponse.js';
import { asyncHandler } from '#shared/response/asyncHandler.js';
<<<<<<< HEAD
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
=======
import * as service from './communication.service.js';
import {
  createAnnouncementSchema,
  sendMessageSchema,
  createCampaignSchema,
  createTemplateSchema,
} from './communication.validation.js';

// =============================================================================
// ANNOUNCEMENTS
// =============================================================================

export const createAnnouncement = asyncHandler(async (req, res) => {
  const parsed = createAnnouncementSchema.parse(req.body);
  const result = await service.createAnnouncement({
    schoolId: req.schoolId,
    authorId: req.user.id,
    ...parsed,
  });
  ApiResponse.created(res, result, 'Announcement queued for delivery');
});

export const listAnnouncements = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const result = await service.listAnnouncements(req.schoolId, page, limit);
  ApiResponse.paginated(res, result.announcements, {
    page: result.page,
    limit: result.limit,
    total: result.total,
  });
});

export const getAnnouncement = asyncHandler(async (req, res) => {
  const announcement = await service.getAnnouncement(req.params.id, req.schoolId);
  ApiResponse.ok(res, announcement);
});

export const deleteAnnouncement = asyncHandler(async (req, res) => {
  await service.deleteAnnouncement(req.params.id, req.schoolId);
  ApiResponse.ok(res, null, 'Announcement deleted');
});

// =============================================================================
// DIRECT MESSAGES (Teacher/Admin → Parent)
// =============================================================================

export const sendMessage = asyncHandler(async (req, res) => {
  const parsed = sendMessageSchema.parse(req.body);
  const message = await service.sendMessage({
    schoolId: req.schoolId,
    senderId: req.user.id,
    ...parsed,
  });
  ApiResponse.created(res, message, 'Message sent');
});

export const listMessages = asyncHandler(async (req, res) => {
  const { page, limit, studentId } = req.query;
  const result = await service.listMessages(req.user.id, page, limit, studentId);
  ApiResponse.paginated(res, result.messages, {
    page: result.page,
    limit: result.limit,
    total: result.total,
  });
});

export const getThread = asyncHandler(async (req, res) => {
  const messages = await service.getThread(req.params.threadId, req.user.id);
  ApiResponse.ok(res, messages);
});

export const markRead = asyncHandler(async (req, res) => {
  await service.markMessageRead(req.params.id, req.user.id);
  ApiResponse.ok(res, null, 'Marked as read');
});

// =============================================================================
// MESSAGE TEMPLATES
// =============================================================================

export const createTemplate = asyncHandler(async (req, res) => {
  const parsed = createTemplateSchema.parse(req.body);
  const template = await service.createTemplate({
    schoolId: req.schoolId,
    createdById: req.user.id,
    ...parsed,
  });
  ApiResponse.created(res, template, 'Template created');
});

export const listTemplates = asyncHandler(async (req, res) => {
  const templates = await service.listTemplates(req.schoolId);
  ApiResponse.ok(res, templates);
});

export const deleteTemplate = asyncHandler(async (req, res) => {
  await service.deleteTemplate(req.params.id, req.schoolId);
  ApiResponse.ok(res, null, 'Template deleted');
});

// =============================================================================
// CAMPAIGNS (Bulk Communication)
// =============================================================================

export const createCampaign = asyncHandler(async (req, res) => {
  const parsed = createCampaignSchema.parse(req.body);
  const campaign = await service.createCampaign({
    schoolId: req.schoolId,
    createdById: req.user.id,
    ...parsed,
  });
  ApiResponse.created(res, campaign, 'Campaign created');
});

export const listCampaigns = asyncHandler(async (req, res) => {
  const campaigns = await service.listCampaigns(req.schoolId);
  ApiResponse.ok(res, campaigns);
});

export const getCampaign = asyncHandler(async (req, res) => {
  const campaign = await service.getCampaign(req.params.id, req.schoolId);
  ApiResponse.ok(res, campaign);
});
>>>>>>> f769c34b07b38ef93f84fb7ec946cdc6fdb91efd
