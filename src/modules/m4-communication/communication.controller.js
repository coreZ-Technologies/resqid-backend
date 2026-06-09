// src/modules/m4-communication/communication.controller.js
import { ApiResponse } from '#shared/response/ApiResponse.js';
import { asyncHandler } from '#shared/response/asyncHandler.js';
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
