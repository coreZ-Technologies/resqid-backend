// =============================================================================
// modules/m4-communication/communication.controller.js — RESQID
// Thin HTTP layer.
// =============================================================================

import { ApiResponse } from '#shared/response/ApiResponse.js';
import * as service from './communication.service.js';

// ═══════════════════════════════════════════════════════════════════════════════
// ANNOUNCEMENTS (Teacher/Admin)
// ═══════════════════════════════════════════════════════════════════════════════

export const createAnnouncement = async (req, res) => {
  const result = await service.createAnnouncement({
    schoolId: req.schoolId,
    authorId: req.user.id,
    ...req.body,
  });
  return ApiResponse.created(res, result, 'Announcement queued for delivery');
};

export const listAnnouncements = async (req, res) => {
  const { page, limit } = req.query;
  const result = await service.listAnnouncements(req.schoolId, page, limit);
  return ApiResponse.paginated(res, result.announcements, {
    page: result.page,
    limit: result.limit,
    total: result.total,
  });
};

export const getAnnouncement = async (req, res) => {
  const announcement = await service.getAnnouncement(req.params.id, req.schoolId);
  return ApiResponse.ok(res, announcement);
};

// ═══════════════════════════════════════════════════════════════════════════════
// DIRECT MESSAGES (Teacher/Admin → Parent)
// ═══════════════════════════════════════════════════════════════════════════════

export const sendMessage = async (req, res) => {
  const message = await service.sendMessage({
    schoolId: req.schoolId,
    senderId: req.user.id,
    ...req.body,
  });
  return ApiResponse.created(res, message, 'Message sent');
};

// ═══════════════════════════════════════════════════════════════════════════════
// MESSAGES (Parent view)
// ═══════════════════════════════════════════════════════════════════════════════

export const listMessages = async (req, res) => {
  const { page, limit, studentId } = req.query;
  const result = await service.listMessages(req.user.id, page, limit, studentId);
  return ApiResponse.paginated(res, result.messages, {
    page: result.page,
    limit: result.limit,
    total: result.total,
  });
};

export const markRead = async (req, res) => {
  await service.markMessageRead(req.params.id, req.user.id);
  return ApiResponse.ok(res, null, 'Marked as read');
};
