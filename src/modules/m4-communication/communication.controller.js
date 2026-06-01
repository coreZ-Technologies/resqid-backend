// src/modules/communication/communication.controller.js
import { CommunicationService } from './communication.service.js';
import { ApiResponse } from '#shared/response/ApiResponse.js';
import { asyncHandler } from '#shared/response/asyncHandler.js';
import {
  createAnnouncementSchema,
  updateAnnouncementSchema,
  listAnnouncementsQuerySchema,
  scheduleAnnouncementSchema,
  listDeliveryLogsQuerySchema,
  createThreadSchema,
  sendMessageSchema,
  listThreadsQuerySchema,
} from './communication.validation.js';

const service = new CommunicationService();

// ─── Announcements ─────────────────────────────────────────
export const createAnnouncement = asyncHandler(async (req, res) => {
  const validated = createAnnouncementSchema.parse(req.body);
  const result = await service.createAnnouncement(validated, req.user.id, req.schoolId, req);
  res.status(201).json(ApiResponse.success('Announcement created', result));
});

export const updateAnnouncement = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const validated = updateAnnouncementSchema.parse(req.body);
  const result = await service.updateAnnouncement(id, validated, req.user.id, req.schoolId, req);
  res.json(ApiResponse.success('Announcement updated', result));
});

export const deleteAnnouncement = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await service.deleteAnnouncement(id, req.user.id, req.schoolId, req);
  res.json(ApiResponse.success('Announcement deleted'));
});

export const listAnnouncements = asyncHandler(async (req, res) => {
  const query = listAnnouncementsQuerySchema.parse(req.query);
  const { announcements, total } = await service.listAnnouncements(query, req.schoolId);
  res.json(ApiResponse.paginate(announcements, total, query.page, query.limit));
});

export const getAnnouncementStats = asyncHandler(async (req, res) => {
  const stats = await service.getAnnouncementStats(req.schoolId);
  res.json(ApiResponse.success('Stats', stats));
});

export const incrementAnnouncementViews = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await service.incrementAnnouncementViews(id, req.schoolId);
  res.json(ApiResponse.success('View counted'));
});

export const scheduleAnnouncement = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { scheduledFor } = scheduleAnnouncementSchema.parse(req.body);
  await service.scheduleAnnouncement(id, scheduledFor, req.schoolId);
  res.json(ApiResponse.success('Announcement scheduled'));
});

// ─── Delivery Logs ─────────────────────────────────────────
export const listDeliveryLogs = asyncHandler(async (req, res) => {
  const query = listDeliveryLogsQuerySchema.parse(req.query);
  const { logs, total } = await service.listDeliveryLogs(query, req.schoolId);
  res.json(ApiResponse.paginate(logs, total, query.page, query.limit));
});

export const getDeliveryStats = asyncHandler(async (req, res) => {
  const stats = await service.getDeliveryStats(req.schoolId);
  res.json(ApiResponse.success('Delivery stats', stats));
});

export const retryDelivery = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await service.retryDelivery(id, req.schoolId);
  res.json(ApiResponse.accepted(result, 'Retry queued'));
});

// ─── Messages & Threads ────────────────────────────────────
export const createThread = asyncHandler(async (req, res) => {
  const { parentId, studentName, studentClass } = createThreadSchema.parse(req.body);
  const thread = await service.getOrCreateThread(parentId, req.user.id, req.schoolId, studentName, studentClass);
  res.status(201).json(ApiResponse.success('Thread created', thread));
});

export const sendMessage = asyncHandler(async (req, res) => {
  const validated = sendMessageSchema.parse(req.body);
  const message = await service.sendMessage(validated, req.user.id, req.user.role.toLowerCase(), req.schoolId, req);
  res.status(201).json(ApiResponse.success('Message sent', message));
});

export const listThreads = asyncHandler(async (req, res) => {
  const query = listThreadsQuerySchema.parse(req.query);
  const { threads, total } = await service.listThreads(query, req.user.id, req.schoolId);
  res.json(ApiResponse.paginate(threads, total, query.page, query.limit));
});

export const getThreadDetails = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const thread = await service.getThreadDetails(id, req.user.id, req.schoolId);
  res.json(ApiResponse.success('Thread details', thread));
});

export const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await service.getUnreadCount(req.user.id, req.schoolId);
  res.json(ApiResponse.success('Unread count', { count }));
});