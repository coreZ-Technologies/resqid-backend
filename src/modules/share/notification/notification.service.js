// src/modules/share/notification/notification.service.js
import { v4 as uuidv4 } from 'uuid';
import { NotificationRepository } from './notification.repository.js';
import { notificationQueue } from './notification.queue.js';
import { eventBus } from './notification.eventBus.js';
import { NotificationEvents } from './notification.events.js';
import { logger } from '#config/logger.js';

export const NotificationService = {
  async send(payload) {
    const notificationId = uuidv4();
    const logData = {
      id: notificationId,
      userId: payload.userId,
      channel: payload.channel,
      title: payload.title,
      body: payload.body,
      data: payload.data || null,
      priority: payload.priority || 'medium',
      status: 'pending',
      createdAt: new Date(),
    };
    await NotificationRepository.createLog(logData);

    // Add to queue
    const job = await notificationQueue.add({
      notificationId,
      payload: { ...payload, id: notificationId },
    });

    eventBus.emit(NotificationEvents.NOTIFICATION_CREATED, { notificationId, payload });
    logger.info({ notificationId, jobId: job.id }, 'Notification queued');
    return { notificationId, jobId: job.id };
  },

  async sendBulk(notifications) {
    const results = [];
    for (const notif of notifications) {
      const result = await this.send(notif);
      results.push(result);
    }
    eventBus.emit(NotificationEvents.NOTIFICATION_BULK_CREATED, { count: results.length });
    return results;
  },

  async getLogs(filters, page, limit) {
    return NotificationRepository.listLogs(filters, page, limit);
  },

  async getLogById(id) {
    return NotificationRepository.findLogById(id);
  },

  async getUserPreferences(userId) {
    let prefs = await NotificationRepository.getUserPreferences(userId);
    if (!prefs) {
      prefs = { userId, email: { enabled: true }, push: { enabled: true }, sms: { enabled: true }, inapp: { enabled: true } };
    }
    return prefs;
  },

  async updateUserPreferences(userId, preferences) {
    const updated = await NotificationRepository.upsertUserPreferences(userId, preferences);
    eventBus.emit(NotificationEvents.PREFERENCE_UPDATED, { userId, preferences });
    return updated;
  },

  async getInAppNotifications(userId, page, limit, unreadOnly) {
    return NotificationRepository.listInApp(userId, page, limit, unreadOnly);
  },

  async markInAppRead(notificationId, userId) {
    const result = await NotificationRepository.markInAppRead(notificationId, userId);
    eventBus.emit(NotificationEvents.IN_APP_READ, { notificationId, userId });
    return result;
  },

  async getTemplate(name) {
    return NotificationRepository.getTemplate(name);
  },

  async saveTemplate(name, data) {
    return NotificationRepository.saveTemplate(name, data);
  },
};