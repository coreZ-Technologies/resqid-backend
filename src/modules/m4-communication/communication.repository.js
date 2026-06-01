// src/modules/communication/communication.repository.js
import { prisma } from '#config/prisma.js';

export class CommunicationRepository {
  // ─── Announcements ─────────────────────────────────────────
  async createAnnouncement(data) {
    return prisma.announcement.create({ data });
  }

  async findAnnouncementById(id, schoolId) {
    return prisma.announcement.findFirst({
      where: { id, schoolId },
      include: { deliveries: true },
    });
  }

  async updateAnnouncement(id, schoolId, data) {
    return prisma.announcement.updateMany({
      where: { id, schoolId },
      data,
    });
  }

  async deleteAnnouncement(id, schoolId) {
    return prisma.announcement.deleteMany({
      where: { id, schoolId },
    });
  }

  async listAnnouncements({ page, limit, search, category, status, audience, schoolId }) {
    const skip = (page - 1) * limit;
    const where = { schoolId };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { body: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (category) where.category = category;
    if (status) where.status = status;
    if (audience) where.audience = audience;

    const [announcements, total] = await Promise.all([
      prisma.announcement.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
        include: { deliveries: true },
      }),
      prisma.announcement.count({ where }),
    ]);
    return { announcements, total };
  }

  async getAnnouncementStats(schoolId) {
    const [total, published, pinned, viewsSum] = await Promise.all([
      prisma.announcement.count({ where: { schoolId } }),
      prisma.announcement.count({ where: { schoolId, status: 'Published' } }),
      prisma.announcement.count({ where: { schoolId, pinned: true } }),
      prisma.announcement.aggregate({
        where: { schoolId },
        _sum: { views: true },
      }),
    ]);
    return { total, published, pinned, totalViews: viewsSum._sum.views || 0 };
  }

  async incrementAnnouncementViews(id) {
    return prisma.announcement.update({
      where: { id },
      data: { views: { increment: 1 } },
    });
  }

  // ─── Delivery Logs ─────────────────────────────────────────
  async createDeliveryLog(data) {
    return prisma.deliveryLog.create({ data });
  }

  async listDeliveryLogs({ page, limit, channel, status, type, search, schoolId }) {
    const skip = (page - 1) * limit;
    const where = { schoolId };

    if (channel) where.channel = channel;
    if (status) where.status = status;
    if (type) where.type = type;
    if (search) {
      where.OR = [
        { recipientName: { contains: search, mode: 'insensitive' } },
        { message: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.deliveryLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { sentAt: 'desc' },
      }),
      prisma.deliveryLog.count({ where }),
    ]);
    return { logs, total };
  }

  async getDeliveryStats(schoolId) {
    const [total, delivered, failed, pending] = await Promise.all([
      prisma.deliveryLog.count({ where: { schoolId } }),
      prisma.deliveryLog.count({ where: { schoolId, status: 'Delivered' } }),
      prisma.deliveryLog.count({ where: { schoolId, status: 'Failed' } }),
      prisma.deliveryLog.count({ where: { schoolId, status: 'Pending' } }),
    ]);
    const rate = total ? Math.round((delivered / total) * 100) : 0;
    return { total, delivered, failed, pending, rate };
  }

  async findDeliveryLogById(id, schoolId) {
    return prisma.deliveryLog.findFirst({
      where: { id, schoolId },
    });
  }

  async updateDeliveryLogStatus(id, status, errorDetails = null) {
    return prisma.deliveryLog.update({
      where: { id },
      data: {
        status,
        deliveredAt: status === 'Delivered' ? new Date() : undefined,
        errorDetails,
        retries: { increment: 1 },
      },
    });
  }

  // ─── Message Threads ──────────────────────────────────────
  async createThread(data) {
    return prisma.messageThread.create({ data });
  }

  async findOrCreateThread(parentId, schoolAdminId, schoolId, studentName, studentClass) {
    let thread = await prisma.messageThread.findFirst({
      where: { parentId, schoolAdminId, schoolId, isActive: true },
    });
    if (!thread) {
      thread = await prisma.messageThread.create({
        data: {
          parentId,
          schoolAdminId,
          schoolId,
          studentName,
          studentClass,
        },
      });
    }
    return thread;
  }

  async listThreads({ page, limit, search, schoolAdminId, schoolId }) {
    const skip = (page - 1) * limit;
    const where = { schoolId, schoolAdminId, isActive: true };

    if (search) {
      where.OR = [
        { studentName: { contains: search, mode: 'insensitive' } },
        { parent: { firstName: { contains: search, mode: 'insensitive' } } },
        { parent: { lastName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [threads, total] = await Promise.all([
      prisma.messageThread.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          messages: { orderBy: { createdAt: 'desc' }, take: 1 },
          parent: { select: { firstName: true, lastName: true, phone: true } },
        },
      }),
      prisma.messageThread.count({ where }),
    ]);
    return { threads, total };
  }

  async findThreadById(id, schoolId) {
    return prisma.messageThread.findFirst({
      where: { id, schoolId, isActive: true },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        parent: true,
      },
    });
  }

  async updateThreadLastMessage(threadId, lastMessage, senderRole) {
    const unreadDelta = senderRole === 'parent' ? 1 : 0; // if parent sends, admin unread increases
    return prisma.messageThread.update({
      where: { id: threadId },
      data: {
        lastMessage,
        lastMessageAt: new Date(),
        unreadCount: { increment: unreadDelta },
      },
    });
  }

  async markThreadAsRead(threadId) {
    await prisma.messageThread.update({
      where: { id: threadId },
      data: { unreadCount: 0 },
    });
    await prisma.message.updateMany({
      where: { threadId, isRead: false, senderRole: 'parent' },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async getTotalUnreadCount(schoolAdminId, schoolId) {
    const result = await prisma.messageThread.aggregate({
      where: { schoolAdminId, schoolId, isActive: true },
      _sum: { unreadCount: true },
    });
    return result._sum.unreadCount || 0;
  }

  // ─── Messages ─────────────────────────────────────────────
  async createMessage(data) {
    return prisma.message.create({ data });
  }
}