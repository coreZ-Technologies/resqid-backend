// src/modules/share/notification/notification.repository.js
import { prisma } from '#config/prisma.js';

export const NotificationRepository = {
  // ─── Notification Logs ─────────────────────────────────────────
  async createLog(data) {
    return prisma.notificationLog.create({ data });
  },

  async findLogById(id) {
    return prisma.notificationLog.findUnique({ where: { id } });
  },

  async updateLog(id, data) {
    return prisma.notificationLog.update({ where: { id }, data });
  },

  async listLogs(filters = {}, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where = {};
    if (filters.userId) where.userId = filters.userId;
    if (filters.channel) where.channel = filters.channel;
    if (filters.status) where.status = filters.status;
    const [logs, total] = await Promise.all([
      prisma.notificationLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notificationLog.count({ where }),
    ]);
    return { logs, total };
  },

  // ─── User Preferences ──────────────────────────────────────────
  async getUserPreferences(userId) {
    return prisma.userNotificationPreferences.findUnique({
      where: { userId },
    });
  },

  async upsertUserPreferences(userId, preferences) {
    return prisma.userNotificationPreferences.upsert({
      where: { userId },
      update: preferences,
      create: { userId, ...preferences },
    });
  },

  // ─── In-App Notifications ──────────────────────────────────────
  async createInApp(data) {
    return prisma.inAppNotification.create({ data });
  },

  async markInAppRead(notificationId, userId) {
    return prisma.inAppNotification.update({
      where: { id: notificationId, userId },
      data: { read: true, readAt: new Date() },
    });
  },

  async listInApp(userId, page = 1, limit = 20, unreadOnly = false) {
    const skip = (page - 1) * limit;
    const where = { userId };
    if (unreadOnly) where.read = false;
    const [notifications, total] = await Promise.all([
      prisma.inAppNotification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.inAppNotification.count({ where }),
    ]);
    return { notifications, total };
  },

  // ─── Templates ─────────────────────────────────────────────────
  async getTemplate(name) {
    return prisma.notificationTemplate.findUnique({
      where: { name },
    });
  },

  async saveTemplate(name, data) {
    return prisma.notificationTemplate.upsert({
      where: { name },
      update: data,
      create: { name, ...data },
    });
  },
};