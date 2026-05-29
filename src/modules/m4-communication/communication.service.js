// =============================================================================
// modules/m4-communication/communication.service.js — RESQID
// Business logic for announcements and direct messages.
// =============================================================================

import { ApiError } from '#shared/response/ApiError.js';
import { logger } from '#config/logger.js';
import * as repo from './communication.repository.js';
import { publish } from '#orchestrator/events/event.publisher.js';
import { EVENTS } from '#orchestrator/events/event.types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// ANNOUNCEMENTS
// ═══════════════════════════════════════════════════════════════════════════════

export const createAnnouncement = async ({
  schoolId,
  authorId,
  title,
  body,
  targetAll,
  targetGrades,
  channels,
}) => {
  // 1. Save to DB
  const announcement = await repo.createAnnouncement({
    schoolId,
    authorId,
    title,
    body,
    targetAll,
    targetGrades,
    channels,
  });

  // 2. Count estimated recipients
  const recipients = await repo.findRecipients(schoolId, targetGrades, targetAll);
  const estimatedCount = recipients.length;

  // 3. Publish to BullMQ for async delivery
  await publish({
    type: EVENTS.NOTIFICATION_SENT,
    actorId: authorId,
    actorType: 'TEACHER',
    schoolId,
    payload: {
      announcementId: announcement.id,
      title,
      body,
      channels,
      recipientCount: estimatedCount,
      targetGrades,
      targetAll,
    },
  }).catch((err) => logger.error({ err: err.message }, '[comm] Publish failed'));

  return {
    id: announcement.id,
    title: announcement.title,
    channels: announcement.channels,
    estimatedRecipients: estimatedCount,
    status: 'QUEUED',
  };
};

export const listAnnouncements = async (schoolId, page, limit) => {
  const [announcements, total] = await repo.listAnnouncements(schoolId, page, limit);
  return { announcements, total, page, limit };
};

export const getAnnouncement = async (id, schoolId) => {
  const announcement = await repo.findAnnouncement(id, schoolId);
  if (!announcement) throw ApiError.notFound('Announcement not found');

  // Get delivery stats
  const stats = await getAnnouncementDeliveryStats(id);

  return { ...announcement, deliveryStats: stats };
};

// ═══════════════════════════════════════════════════════════════════════════════
// DIRECT MESSAGES
// ═══════════════════════════════════════════════════════════════════════════════

export const sendMessage = async ({ schoolId, senderId, parentId, studentId, body }) => {
  const message = await repo.createMessage({ schoolId, senderId, parentId, studentId, body });

  // Notify parent via push
  await publish({
    type: EVENTS.NOTIFICATION_SENT,
    actorId: senderId,
    actorType: 'TEACHER',
    schoolId,
    payload: {
      messageId: message.id,
      parentId,
      studentId,
      body: body.slice(0, 100), // Truncate for push preview
      type: 'DIRECT_MESSAGE',
    },
  }).catch((err) => logger.error({ err: err.message }, '[comm] Message notify failed'));

  return message;
};

export const listMessages = async (parentId, page, limit, studentId) => {
  const [messages, total] = await repo.listMessages(parentId, page, limit, studentId);
  return { messages, total, page, limit };
};

export const markMessageRead = async (messageId, parentId) => {
  await repo.markMessageRead(messageId, parentId);
};

// ═══════════════════════════════════════════════════════════════════════════════
// DELIVERY STATS (for announcement detail view)
// ═══════════════════════════════════════════════════════════════════════════════

import { prisma } from '#config/prisma.js';

const getAnnouncementDeliveryStats = async (announcementId) => {
  const stats = await prisma.notification.groupBy({
    by: ['channel', 'status'],
    where: {
      type: 'ANNOUNCEMENT',
      data: { path: ['announcementId'], equals: announcementId },
    },
    _count: { id: true },
  });

  const result = {
    PUSH: { sent: 0, failed: 0 },
    SMS: { sent: 0, failed: 0 },
    EMAIL: { sent: 0, failed: 0 },
  };

  for (const s of stats) {
    if (result[s.channel]) {
      result[s.channel][s.status === 'SENT' ? 'sent' : 'failed'] = s._count.id;
    }
  }

  return result;
};
