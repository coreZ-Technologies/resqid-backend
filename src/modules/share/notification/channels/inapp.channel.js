// src/modules/share/notification/channels/inapp.channel.js
import { prisma } from '#config/prisma.js';
import { logger } from '#config/logger.js';

/**
 * Store in-app notification in database
 * @param {Object} payload - { userId, title, body, data?, read?, expiresAt? }
 * @returns {Promise<Object>} - created notification record
 */
export async function sendInApp(payload) {
  const { userId, title, body, data, read = false, expiresAt } = payload;

  if (!userId || !title) {
    throw new Error('Missing required in-app fields: userId, title');
  }

  try {
    const notification = await prisma.inAppNotification.create({
      data: {
        userId,
        title,
        body,
        data: data || null,
        read,
        expiresAt: expiresAt || null,
        createdAt: new Date(),
      },
    });
    logger.info({ userId, notificationId: notification.id, title }, 'In-app notification stored');
    return notification;
  } catch (error) {
    logger.error({ err: error, userId, title }, 'Failed to store in-app notification');
    throw error;
  }
}

/**
 * Mark in-app notification as read
 * @param {string} notificationId
 * @param {string} userId - optional user check
 */
export async function markAsRead(notificationId, userId) {
  try {
    const where = { id: notificationId };
    if (userId) where.userId = userId;

    const updated = await prisma.inAppNotification.update({
      where,
      data: { read: true, readAt: new Date() },
    });
    logger.info({ notificationId, userId }, 'In-app notification marked as read');
    return updated;
  } catch (error) {
    logger.error({ err: error, notificationId, userId }, 'Failed to mark as read');
    throw error;
  }
}

/**
 * Get unread notifications for a user
 * @param {string} userId
 * @param {number} limit
 */
export async function getUnreadNotifications(userId, limit = 50) {
  return prisma.inAppNotification.findMany({
    where: { userId, read: false },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}