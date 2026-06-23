// =============================================================================
// modules/m4-communication/communication.service.js — RESQID
// Business logic for announcements, messages, templates, and campaigns.
// =============================================================================

import { ApiError } from '#shared/response/ApiError.js';
import { logger } from '#config/logger.js';
import * as repo from './communication.repository.js';
import { publishNotification } from '#orchestrator/notifications/notification.publisher.js';
import { EVENTS } from '#orchestrator/events/event.types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// ANNOUNCEMENTS
// ═══════════════════════════════════════════════════════════════════════════════

export const createAnnouncement = async ({
  schoolId,
  authorId,
  title,
  body,
  target,
  targetGrades,
  targetSections,
  priority,
}) => {
  // 1. Save to DB
  const announcement = await repo.createAnnouncement({
    schoolId,
    authorId,
    title,
    body,
    target,
    targetGrades,
    targetSections,
    priority,
  });

  // 2. Count estimated recipients
  const recipients = await repo.findRecipients(schoolId, targetGrades, target === 'ALL');
  const estimatedCount = recipients.length;

  // 3. Publish for async delivery via notification publisher
  publishNotification
    .emergencyAlertTriggered?.({
      schoolId,
      actorId: authorId,
      payload: {
        announcementId: announcement.id,
        title,
        body,
        recipientCount: estimatedCount,
        targetGrades,
        target,
      },
    })
    .catch((err) => logger.error({ err: err.message }, '[comm] Publish failed'));

  return {
    id: announcement.id,
    title: announcement.title,
    priority: announcement.priority,
    estimatedRecipients: estimatedCount,
    status: 'QUEUED',
  };
};

export const listAnnouncements = async (schoolId, page, limit) => {
  const [announcements, total] = await repo.listAnnouncements(schoolId, page, limit);
  return { announcements, total, page: parseInt(page) || 1, limit: parseInt(limit) || 20 };
};

export const getAnnouncement = async (id, schoolId) => {
  const announcement = await repo.findAnnouncement(id, schoolId);
  if (!announcement) throw ApiError.notFound('Announcement not found');
  return announcement;
};

export const deleteAnnouncement = async (id, schoolId) => {
  const announcement = await repo.findAnnouncement(id, schoolId);
  if (!announcement) throw ApiError.notFound('Announcement not found');
  await repo.deleteAnnouncement(id, schoolId);
};

// ═══════════════════════════════════════════════════════════════════════════════
// DIRECT MESSAGES
// ═══════════════════════════════════════════════════════════════════════════════

export const sendMessage = async ({
  schoolId,
  senderId,
  parentId,
  studentId,
  subject,
  body,
  type,
}) => {
  const message = await repo.createMessage({
    schoolId,
    senderId,
    parentId,
    studentId,
    subject,
    body,
    type,
  });

  // Notify parent via push
  publishNotification
    .emergencyAlertTriggered?.({
      schoolId,
      actorId: senderId,
      payload: {
        messageId: message.id,
        parentId,
        studentId,
        subject,
        body: body?.slice(0, 100),
        type: 'DIRECT_MESSAGE',
      },
    })
    .catch((err) => logger.error({ err: err.message }, '[comm] Message notify failed'));

  return message;
};

export const listMessages = async (parentId, page, limit, studentId) => {
  const [messages, total] = await repo.listMessages(parentId, page, limit, studentId);
  return { messages, total, page: parseInt(page) || 1, limit: parseInt(limit) || 20 };
};

export const getThread = async (threadId, userId) => {
  const messages = await repo.findThread(threadId);
  if (!messages.length) throw ApiError.notFound('Thread not found');
  return messages;
};

export const markMessageRead = async (messageId, parentId) => {
  await repo.markMessageRead(messageId, parentId);
};

// ═══════════════════════════════════════════════════════════════════════════════
// MESSAGE TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════════

export const createTemplate = async ({
  schoolId,
  createdById,
  name,
  type,
  subject,
  body,
  variables,
}) => {
  return repo.createTemplate({ schoolId, createdById, name, type, subject, body, variables });
};

export const listTemplates = async (schoolId) => {
  return repo.listTemplates(schoolId);
};

export const deleteTemplate = async (id, schoolId) => {
  const templates = await repo.listTemplates(schoolId);
  const exists = templates.some((t) => t.id === id);
  if (!exists) throw ApiError.notFound('Template not found');
  await repo.deleteTemplate(id, schoolId);
};

// ═══════════════════════════════════════════════════════════════════════════════
// CAMPAIGNS
// ═══════════════════════════════════════════════════════════════════════════════

export const createCampaign = async ({
  schoolId,
  createdById,
  name,
  type,
  subject,
  body,
  target,
  targetGrades,
}) => {
  return repo.createCampaign({
    schoolId,
    createdById,
    name,
    type,
    subject,
    body,
    target,
    targetGrades,
  });
};

export const listCampaigns = async (schoolId) => {
  return repo.listCampaigns(schoolId);
};

export const getCampaign = async (id, schoolId) => {
  const campaign = await repo.findCampaign(id, schoolId);
  if (!campaign) throw ApiError.notFound('Campaign not found');
  return campaign;
};
