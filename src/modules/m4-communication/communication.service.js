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