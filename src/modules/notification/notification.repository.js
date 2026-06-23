// src/modules/notification/notification.repository.js
import { prisma } from '#config/prisma.js';
import { DEFAULT_PREFERENCE } from './notification.constants.js';

export class NotificationRepository {
  // ─── Notifications ──────────────────────────────────────────
  async create(data) {
    return prisma.notification.create({ data });
  }

  async findById(id, schoolId = null) {
    const where = { id };
    if (schoolId) where.schoolId = schoolId;
    return prisma.notification.findUnique({ where, include: { deliveries: true } });
  }

  async list({ page, limit, search, type, status, startDate, endDate, schoolId }) {
    const skip = (page - 1) * limit;
    const where = { schoolId };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { body: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (type) where.category = type;
    if (status) where.status = status;
    if (startDate) where.createdAt = { gte: new Date(startDate) };
    if (endDate) where.createdAt = { lte: new Date(endDate) };

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { deliveries: { take: 100 } }, // limit for performance
      }),
      prisma.notification.count({ where }),
    ]);
    return { notifications, total };
  }

  async updateStatus(id, status, failReason = null) {
    return prisma.notification.update({
      where: { id },
      data: { status, failReason, ...(status === 'SENT' && { sentAt: new Date() }) },
    });
  }

  async markAsRead(notificationId, recipientId) {
    // This assumes a separate Delivery model or a field on Notification
    // We'll use the Notification model's `isRead` and `readAt` – but that's per user.
    // For now, assume each notification has a recipient. If multiple recipients,
    // we need a delivery table. Your schema has `Notification` with single recipient.
    // We'll update the notification itself.
    return prisma.notification.updateMany({
      where: { id: notificationId, parentId: recipientId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  // ─── Preferences ────────────────────────────────────────────
  async getPreferences(parentId) {
    let prefs = await prisma.notificationPreference.findUnique({
      where: { parentId },
    });
    if (!prefs) {
      prefs = await prisma.notificationPreference.create({
        data: { parentId, ...DEFAULT_PREFERENCE },
      });
    }
    return prefs;
  }

  async updatePreferences(parentId, data) {
    return prisma.notificationPreference.update({
      where: { parentId },
      data,
    });
  }

  // ─── Stats ──────────────────────────────────────────────────
  async getStats(schoolId) {
    const aggregate = await prisma.notification.aggregate({
      where: { schoolId },
      _sum: {
        // You need to store counts in notifications or have a deliveries table
        // For now, we'll count directly
      },
    });
    // Simpler: count by status
    const totalSent = await prisma.notification.count({ where: { schoolId, status: 'SENT' } });
    const totalDelivered = await prisma.notification.count({ where: { schoolId, status: 'DELIVERED' } });
    const totalRead = await prisma.notification.count({ where: { schoolId, isRead: true } });
    const avgOpenRate = totalSent ? ((totalRead / totalSent) * 100).toFixed(1) : '0';
    return { totalSent, totalDelivered, totalRead, avgOpenRate };
  }
}