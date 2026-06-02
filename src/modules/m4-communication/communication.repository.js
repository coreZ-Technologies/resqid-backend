// src/modules/m4-communication/communication.repository.js
import { prisma } from '#config/prisma.js';

export class CommunicationRepository {
  // ─── Announcements ──────────────────────────────────────────────
  async createAnnouncement(data) {
    return prisma.announcement.create({ data });
  }

  async updateAnnouncement(id, data) {
    return prisma.announcement.update({ where: { id }, data });
  }

  async deleteAnnouncement(id) {
    return prisma.announcement.update({ where: { id }, data: { isArchived: true } });
  }

  async findAnnouncementById(id, schoolId) {
    return prisma.announcement.findFirst({ where: { id, schoolId } });
  }

  async listAnnouncements(where, skip, take, orderBy = { createdAt: 'desc' }) {
    const [items, total] = await Promise.all([
      prisma.announcement.findMany({ where, skip, take, orderBy }),
      prisma.announcement.count({ where }),
    ]);
    return { items, total };
  }

  // ─── Announcement Deliveries ────────────────────────────────────
  async createDelivery(data) {
    return prisma.announcementDelivery.create({ data });
  }

  async updateDelivery(id, data) {
    return prisma.announcementDelivery.update({ where: { id }, data });
  }

  async findDeliveryById(id) {
    return prisma.announcementDelivery.findUnique({
      where: { id },
      include: { announcement: true, parent: true },
    });
  }

  async listDeliveries(where, skip, take) {
    const [items, total] = await Promise.all([
      prisma.announcementDelivery.findMany({
        where,
        skip,
        take,
        include: {
          announcement: { select: { title: true, type: true, category: true } },
          parent: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } }
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.announcementDelivery.count({ where }),
    ]);
    return { items, total };
  }

  // ─── Messages ───────────────────────────────────────────────────
  async createMessage(data) {
    return prisma.message.create({ data });
  }

  async findMessageById(id, schoolId) {
    return prisma.message.findFirst({ where: { id, schoolId } });
  }

  async listMessages(where, skip, take) {
    const [items, total] = await Promise.all([
      prisma.message.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { parent: true, student: true },
      }),
      prisma.message.count({ where }),
    ]);
    return { items, total };
  }

  // Mark a single message as read (used internally)
  async markMessageRead(messageId, parentId) {
    return prisma.message.updateMany({
      where: { id: messageId, parentId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  // Mark all messages in a thread (from a specific parent) as read
  async markThreadRead(parentId, schoolId) {
    return prisma.message.updateMany({
      where: {
        schoolId,
        parentId,
        direction: 'PARENT_TO_SCHOOL',
        isRead: false
      },
      data: { isRead: true, readAt: new Date() }
    });
  }

  // ─── Threads (group messages by parent) ─────────────────────────
  async getThreads(schoolId, skip, take, search) {
    // Simplified: group by parentId, get last message
    const threads = await prisma.message.groupBy({
      by: ['parentId'],
      where: { schoolId },
      _count: { id: true },
      _max: { createdAt: true, id: true },
      orderBy: { _max: { createdAt: 'desc' } },
      skip,
      take,
    });
    
    const parentIds = threads.map(t => t.parentId).filter(Boolean);
    const parents = await prisma.parentUser.findMany({
      where: { id: { in: parentIds } },
      select: { id: true, firstName: true, lastName: true, phone: true },
    });
    
    const unreadCounts = await prisma.message.groupBy({
      by: ['parentId'],
      where: { schoolId, isRead: false, direction: 'PARENT_TO_SCHOOL' },
      _count: { id: true },
    });
    const unreadMap = Object.fromEntries(unreadCounts.map(u => [u.parentId, u._count.id]));
    
    return threads.map(t => ({
      parentId: t.parentId,
      parent: parents.find(p => p.id === t.parentId),
      lastMessageAt: t._max.createdAt,
      lastMessageId: t._max.id,
      totalMessages: t._count.id,
      unreadCount: unreadMap[t.parentId] || 0,
    }));
  }

  // ─── Stats ──────────────────────────────────────────────────────
  async getAnnouncementStats(schoolId) {
    const [total, published, pinned, totalViews] = await Promise.all([
      prisma.announcement.count({ where: { schoolId, isArchived: false } }),
      prisma.announcement.count({ where: { schoolId, status: 'SENT', isArchived: false } }),
      prisma.announcement.count({ where: { schoolId, pinned: true, isArchived: false } }),
      prisma.announcement.aggregate({ where: { schoolId, isArchived: false }, _sum: { views: true } }),
    ]);
    return { total, published, pinned, totalViews: totalViews._sum.views || 0 };
  }

  async getDeliveryStats(schoolId) {
    const where = { announcement: { schoolId, isArchived: false } };
    const [total, delivered, failed] = await Promise.all([
      prisma.announcementDelivery.count({ where }),
      prisma.announcementDelivery.count({ where: { ...where, status: 'DELIVERED' } }),
      prisma.announcementDelivery.count({ where: { ...where, status: 'FAILED' } })
    ]);
    const rate = total ? Math.round((delivered / total) * 100) : 0;
    return { total, delivered, failed, rate };
  }
}