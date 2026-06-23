// school-admin/notification/notification.service.js
import { prisma } from '#config/prisma.js';
import { ApiError } from '#shared/response/ApiError.js';
import { getPagination, paginateMeta } from '#shared/response/paginate.js';
import { getEmail } from '#infrastructure/email/email.index.js';
import { getSms } from '#infrastructure/sms/sms.index.js';
import { getPush } from '#infrastructure/push/push.index.js';
import { notificationsQueue } from '#orchestrator/queues/queue.config.js';
import { NotificationRepository } from './notification.repository.js';
import { NOTIFICATION_TYPES, CHANNELS, PRIORITY } from '#modules/notification/notification.constants.js';
import { generateId } from '#services/IdGenerator.service.js';

const repo = new NotificationRepository();

export class NotificationService {
  async createNotification(data, schoolId, createdByUserId) {
    const recipientIds = await repo.getRecipientParentIds(
      schoolId,
      data.recipientType,
      data.selectedClass,
      data.selectedSection,
      data.selectedParents,
    );
    if (!recipientIds.length) {
      throw ApiError.badRequest('No recipients found for the given selection');
    }

    const scheduledFor = data.scheduleLater && data.scheduledTime ? new Date(data.scheduledTime) : null;
    const status = scheduledFor ? 'PENDING' : 'SENT';

    const notification = await repo.create({
      id: generateId('NOT'),
      schoolId,
      title: data.title,
      body: data.message,
      category: data.type,
      priority: data.priority.toUpperCase(),
      channel: data.channel[0], // primary channel
      status,
      createdBy: createdByUserId,
      scheduledFor,
      metadata: {
        channels: data.channel,
        recipientType: data.recipientType,
        selectedClass: data.selectedClass,
        selectedSection: data.selectedSection,
        selectedParents: data.selectedParents,
        totalRecipients: recipientIds.length,
        delivered: 0,
        read: 0,
        failed: 0,
      },
    });

    // Queue delivery for each recipient (if not scheduled)
    if (!scheduledFor) {
      for (const parentId of recipientIds) {
        await notificationsQueue.add('send-notification', {
          notificationId: notification.id,
          recipientId: parentId,
          title: data.title,
          body: data.message,
          category: data.type,
          priority: data.priority,
          channels: data.channel,
          schoolId,
        }, {
          priority: data.priority === 'high' ? 1 : data.priority === 'urgent' ? 0 : 3,
        });
      }
    }

    return notification;
  }

  async listNotifications(query, schoolId) {
    const { page, limit, skip } = getPagination(query);
    const where = { schoolId };
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { body: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.type) where.category = query.type;
    // ✅ FIX: Map frontend lowercase status to DB uppercase enum
    if (query.status) {
      const statusMap = {
        sent: 'SENT',
        delivered: 'DELIVERED',
        read: 'READ',
        failed: 'FAILED'
      };
      where.status = statusMap[query.status];
    }
    if (query.fromDate) where.createdAt = { gte: new Date(query.fromDate) };
    if (query.toDate) where.createdAt = { lte: new Date(query.toDate) };

    const { items, total } = await repo.list(where, skip, limit);
    const meta = paginateMeta(total, page, limit);

    // ✅ FIX: Include createdBy user to get name, and ensure recipients from metadata
    const enriched = items.map(n => ({
      id: n.id,
      title: n.title,
      message: n.body,
      type: n.category,
      channel: n.channel,
      recipients: {
        total: n.metadata?.totalRecipients || 0,
        delivered: n.metadata?.delivered || 0,
        read: n.metadata?.read || 0,
        failed: n.metadata?.failed || 0,
      },
      status: n.status.toLowerCase(),
      sentBy: n.createdByUser?.name || 'System',   // ✅ now uses real name
      sentAt: n.sentAt || n.createdAt,
      scheduledFor: n.scheduledFor,
      priority: n.priority?.toLowerCase() || 'normal',
      attachments: n.metadata?.attachments || [],
    }));
    return { items: enriched, meta };
  }

  async getNotificationStats(schoolId) {
    return repo.getStats(schoolId);
  }

  async getNotificationDetails(id, schoolId) {
    const notification = await repo.findById(id, schoolId);
    if (!notification) throw ApiError.notFound('Notification not found');
    return {
      id: notification.id,
      title: notification.title,
      message: notification.body,
      type: notification.category,
      channel: notification.channel,
      recipients: {
        total: notification.metadata?.totalRecipients || 0,
        delivered: notification.metadata?.delivered || 0,
        read: notification.metadata?.read || 0,
        failed: notification.metadata?.failed || 0,
      },
      status: notification.status.toLowerCase(),
      sentBy: notification.createdByUser?.name || 'System',
      sentAt: notification.sentAt || notification.createdAt,
      scheduledFor: notification.scheduledFor,
      priority: notification.priority?.toLowerCase() || 'normal',
      attachments: notification.metadata?.attachments || [],
    };
  }

  // ✅ FIX: Complete resend logic – re‑fetch recipients from metadata and queue individual jobs
  async resendNotification(id, schoolId) {
    const notification = await repo.findById(id, schoolId);
    if (!notification) throw ApiError.notFound('Notification not found');

    const metadata = notification.metadata || {};
    const { recipientType, selectedClass, selectedSection, selectedParents, channels } = metadata;

    // Re‑fetch recipient IDs using the stored targeting parameters
    const recipientIds = await repo.getRecipientParentIds(
      schoolId,
      recipientType,
      selectedClass,
      selectedSection,
      selectedParents,
    );
    if (!recipientIds.length) {
      throw ApiError.badRequest('No recipients found for resend – targeting parameters missing');
    }

    // Queue each recipient individually (same as original send)
    for (const parentId of recipientIds) {
      await notificationsQueue.add('send-notification', {
        notificationId: notification.id,
        recipientId: parentId,
        title: notification.title,
        body: notification.body,
        category: notification.category,
        priority: notification.priority?.toLowerCase() || 'normal',
        channels: channels || [notification.channel],
        schoolId,
      }, {
        priority: notification.priority === 'HIGH' ? 1 : 3,
      });
    }

    // Optionally reset status to SENT if it was failed
    await repo.update(notification.id, { status: 'SENT' });

    return { success: true };
  }

  async deleteNotification(id, schoolId) {
    await repo.delete(id);
    return { success: true };
  }

  // ✅ NEW: Get recipient options for frontend dropdown (counts)
  async getRecipientOptions(schoolId) {
    // All parents count
    const allParentsCount = await prisma.parentUser.count({
      where: { students: { some: { student: { schoolId } } }, isActive: true }
    });

    // Classes and their parent counts
    const classes = await prisma.student.groupBy({
      by: ['grade'],
      where: { schoolId, isActive: true },
      _count: { id: true },
    });
    const classOptions = await Promise.all(classes.map(async (cls) => {
      // For each class, get distinct parents of students in that class
      const parentCount = await prisma.parentStudent.count({
        where: { student: { schoolId, grade: cls.grade }, isActive: true },
      });
      return { class: cls.grade, parentCount };
    }));

    // Sections (static or dynamic)
    const sections = ['A', 'B', 'C', 'D']; // or fetch from DB

    return {
      allParents: allParentsCount,
      classes: classOptions.map(c => ({ name: c.class, parentCount: c.parentCount })),
      sections,
    };
  }
}