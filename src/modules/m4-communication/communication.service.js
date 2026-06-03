<<<<<<< HEAD
// src/modules/m4-communication/communication.service.js
import { prisma } from '#config/prisma.js';
import { ApiError } from '#shared/response/ApiError.js';
import { notificationsQueue } from '#orchestrator/queues/queue.config.js';
import { generateId } from '#services/IdGenerator.service.js';
import { CommunicationRepository } from './communication.repository.js';
import { getPagination, paginateMeta } from '#shared/response/paginate.js';

const repo = new CommunicationRepository();

export class CommunicationService {
  // ─── Announcements ──────────────────────────────────────────────
  async createAnnouncement(data, schoolId, authorId) {
    // 1. Create announcement record
    const announcement = await repo.createAnnouncement({
      id: generateId('ANM'),
      schoolId,
      authorId,
      title: data.title,
      body: data.body,
      imageUrl: data.imageUrl,
      attachments: data.attachments || [],
      priority: data.priority,
      target: data.target,
      targetGrades: data.targetGrades || [],
      targetSections: data.targetSections || [],
      targetClassIds: data.targetClassIds || [],
      targetStudentIds: data.targetStudentIds || [],
      isPublic: data.isPublic || false,
      publishedAt: data.scheduledFor ? null : new Date(),
      scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : null,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      status: data.scheduledFor ? 'SCHEDULED' : 'SENT',
    });

    // 2. Resolve recipients
    let parentIds = [];
    if (data.target === 'ALL') {
      const parents = await prisma.parentUser.findMany({
        where: { students: { some: { student: { schoolId } } }, isActive: true },
        select: { id: true },
      });
      parentIds = parents.map(p => p.id);
    } else if (data.target === 'GRADE' && data.targetGrades.length) {
      const students = await prisma.student.findMany({
        where: { schoolId, grade: { in: data.targetGrades }, section: { in: data.targetSections || [] } },
        select: { parentLinks: { select: { parentId: true } } },
      });
      parentIds = [...new Set(students.flatMap(s => s.parentLinks.map(pl => pl.parentId)))];
    } else if (data.target === 'STUDENT' && data.targetStudentIds.length) {
      const links = await prisma.parentStudent.findMany({
        where: { studentId: { in: data.targetStudentIds } },
        select: { parentId: true },
      });
      parentIds = [...new Set(links.map(l => l.parentId))];
    } else if (data.target === 'PARENT' && data.targetParentIds?.length) {
      parentIds = data.targetParentIds;
    }

    if (!parentIds.length) {
      throw ApiError.badRequest('No recipients found for the given target');
    }

    // 3. Update announcement with recipient count
    await repo.updateAnnouncement(announcement.id, { totalRecipients: parentIds.length });

    // 4. Queue delivery for each parent
    const jobs = parentIds.map(parentId => ({
      name: 'send-announcement',
      data: {
        type: 'ANNOUNCEMENT',
        announcementId: announcement.id,
        recipientId: parentId,
        channels: data.channels || ['EMAIL', 'SMS', 'PUSH'],
        title: announcement.title,
        body: announcement.body,
        priority: data.priority === 'URGENT' ? 1 : data.priority === 'HIGH' ? 2 : 5,
        schoolId,
      },
      opts: {
        priority: data.priority === 'URGENT' ? 1 : data.priority === 'HIGH' ? 2 : 5,
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      },
    }));

    await Promise.all(jobs.map(job => notificationsQueue.add(job.name, job.data, job.opts)));

    // 5. Create initial delivery records
    for (const parentId of parentIds) {
      for (const channel of data.channels || ['EMAIL']) {
        await repo.createDelivery({
          announcementId: announcement.id,
          parentId,
          channel,
          status: 'PENDING',
        });
      }
    }

    return announcement;
  }

  async updateAnnouncement(id, data, schoolId) {
    const existing = await repo.findAnnouncementById(id, schoolId);
    if (!existing) throw ApiError.notFound('Announcement not found');
    return repo.updateAnnouncement(id, data);
  }

  async deleteAnnouncement(id, schoolId) {
    const existing = await repo.findAnnouncementById(id, schoolId);
    if (!existing) throw ApiError.notFound('Announcement not found');
    return repo.updateAnnouncement(id, { isArchived: true });
  }

  async listAnnouncements(query, schoolId) {
    const { page, limit, skip } = getPagination(query);
    const where = { schoolId, isArchived: false };
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { body: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.category) where.category = query.category;
    if (query.status) where.status = query.status;
    if (query.fromDate) where.createdAt = { gte: new Date(query.fromDate) };
    if (query.toDate) where.createdAt = { lte: new Date(query.toDate) };

    const { items, total } = await repo.listAnnouncements(where, skip, limit);
    const meta = paginateMeta(total, page, limit);
    return { items, meta };
  }

  async getAnnouncementStats(schoolId) {
    return repo.getAnnouncementStats(schoolId);
  }

  // ─── Delivery Logs ──────────────────────────────────────────────
  async getDeliveryLogs(query, schoolId) {
    const { page, limit, skip } = getPagination(query);
    const where = { announcement: { schoolId, isArchived: false } };
    if (query.channel) where.channel = query.channel;
    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [
        { announcement: { title: { contains: query.search, mode: 'insensitive' } } },
        { parent: { phone: { contains: query.search } } },
        { parent: { firstName: { contains: query.search, mode: 'insensitive' } } },
      ];
    }
    if (query.fromDate) where.createdAt = { gte: new Date(query.fromDate) };
    if (query.toDate) where.createdAt = { lte: new Date(query.toDate) };

    const { items, total } = await repo.listDeliveries(where, skip, limit);
    const meta = paginateMeta(total, page, limit);
    return { items, meta };
  }

  async getDeliveryStats(schoolId) {
    return repo.getDeliveryStats(schoolId);
  }

  async retryDelivery(deliveryId, schoolId) {
    const delivery = await repo.findDeliveryById(deliveryId);
    if (!delivery) throw ApiError.notFound('Delivery record not found');
    if (delivery.announcement.schoolId !== schoolId) throw ApiError.schoolAccessDenied();
    if (delivery.status !== 'FAILED') {
      throw ApiError.badRequest('Only failed deliveries can be retried');
    }

    await notificationsQueue.add('retry-announcement', {
      type: 'ANNOUNCEMENT',
      announcementId: delivery.announcementId,
      recipientId: delivery.parentId,
      channels: [delivery.channel],
      title: delivery.announcement.title,
      body: delivery.announcement.body,
      priority: delivery.announcement.priority === 'URGENT' ? 1 : 5,
      schoolId,
    }, {
      priority: delivery.announcement.priority === 'URGENT' ? 1 : 5,
      attempts: 3,
    });

    await repo.updateDelivery(deliveryId, { status: 'PENDING', retryCount: { increment: 1 } });
    return { success: true };
  }

  // ─── Messages ──────────────────────────────────────────────────
  async sendMessage(data, schoolId, senderId) {
    const message = await repo.createMessage({
      id: generateId('MSG'),
      schoolId,
      senderId,
      parentId: data.parentId,
      studentId: data.studentId,
      subject: data.subject,
      body: data.body,
      type: data.type,
      attachments: data.attachments || [],
      direction: 'SCHOOL_TO_PARENT',
      status: 'SENT',
      channels: ['PUSH', 'EMAIL'],
    });

    await notificationsQueue.add('send-message', {
      type: 'MESSAGE',
      messageId: message.id,
      recipientId: data.parentId,
      channels: ['PUSH', 'EMAIL'],
      title: data.subject || 'New message from school',
      body: data.body,
      priority: 5,
      schoolId,
    }, { priority: 5 });

    return message;
  }

  async getMessages(query, schoolId) {
    const { page, limit, skip } = getPagination(query);
    const where = { schoolId };
    if (query.parentId) where.parentId = query.parentId;
    if (query.studentId) where.studentId = query.studentId;
    if (query.type) where.type = query.type;
    if (query.unreadOnly) where.isRead = false;

    const { items, total } = await repo.listMessages(where, skip, limit);
    const meta = paginateMeta(total, page, limit);
    return { items, meta };
  }

  async getThreads(schoolId, query) {
    const { page, limit, skip } = getPagination(query);
    const threads = await repo.getThreads(schoolId, skip, limit, query.search);
    const total = threads.length;
    const meta = paginateMeta(total, page, limit);
    return { threads, meta };
  }

  async markThreadRead(parentId, schoolId) {
    const result = await repo.markThreadRead(parentId, schoolId);
    return { updatedCount: result.count };
  }
}
=======
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
>>>>>>> f769c34b07b38ef93f84fb7ec946cdc6fdb91efd
