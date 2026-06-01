// src/modules/notification/notification.service.js
import { NotificationRepository } from './notification.repository.js';
import { notificationsQueue } from '#orchestrator/queues/queue.config.js';
import { getEmail } from '#infrastructure/email/email.index.js';
import { getSms } from '#infrastructure/sms/sms.index.js';
import { getPush } from '#infrastructure/push/push.index.js';
import { logger } from '#config/logger.js';
import { renderTemplate } from './notification.utils.js';
import { TYPE_TO_CATEGORY } from './notification.constants.js';

const repo = new NotificationRepository();

export class NotificationService {
  async sendNotification(data, actorId, schoolId) {
    const { title, message, type, priority, channel, recipientType, selectedClass, selectedSection, selectedParents, scheduleLater, scheduledTime } = data;

    // Resolve recipients (simplified: just get parent IDs based on recipientType)
    let recipientIds = [];
    if (recipientType === 'all') {
      // Fetch all parents in this school
      const parents = await prisma.parentUser.findMany({
        where: { school: { id: schoolId }, isActive: true },
        select: { id: true },
      });
      recipientIds = parents.map(p => p.id);
    } else if (recipientType === 'class' && selectedClass) {
      // Fetch parents of students in that class
      const students = await prisma.student.findMany({
        where: { schoolId, grade: selectedClass, section: selectedSection },
        select: { parentLinks: { select: { parentId: true } } },
      });
      recipientIds = [...new Set(students.flatMap(s => s.parentLinks.map(pl => pl.parentId)))];
    } else if (recipientType === 'individual' && selectedParents?.length) {
      recipientIds = selectedParents;
    }

    if (!recipientIds.length) throw new Error('No recipients found');

    const category = TYPE_TO_CATEGORY[type] || 'OTHER';
    const channels = Array.isArray(channel) ? channel : [channel];

    // Create notification record (one per recipient? Better to create one with batch)
    // For simplicity, create a single notification record and track deliveries separately.
    // We'll create a "batch" notification that groups all recipients.
    const notification = await repo.create({
      title,
      body: message,
      category,
      priority: priority.toUpperCase(),
      channel: channels[0], // primary channel
      status: 'PENDING',
      schoolId,
      createdBy: actorId,
      scheduledFor: scheduleLater && scheduledTime ? new Date(scheduledTime) : null,
      metadata: { channels, recipientType, recipientCount: recipientIds.length },
    });

    // Queue each recipient as a separate job (or one job with list)
    for (const recipientId of recipientIds) {
      await notificationsQueue.add('send-notification', {
        notificationId: notification.id,
        recipientId,
        recipientType: 'parent',
        title,
        body: message,
        category,
        priority,
        channels,
        scheduledFor: notification.scheduledFor,
      }, {
        priority: priority === 'urgent' ? 1 : priority === 'high' ? 2 : 3,
        delay: notification.scheduledFor ? new Date(notification.scheduledFor).getTime() - Date.now() : 0,
      });
    }

    return { queued: recipientIds.length, notificationId: notification.id };
  }

  async processQueuedNotification(jobData) {
    const { notificationId, recipientId, title, body, category, channels } = jobData;

    // Get recipient's contact info
    const parent = await prisma.parentUser.findUnique({
      where: { id: recipientId },
      select: { email: true, phone: true, devices: { where: { isActive: true }, select: { expoPushToken: true } } },
    });
    if (!parent) return { success: false, error: 'Parent not found' };

    // Get preferences
    const prefs = await repo.getPreferences(recipientId);
    const results = [];

    for (const ch of channels) {
      if (ch === 'email' && prefs.emailEnabled && parent.email) {
        try {
          const email = getEmail();
          await email.send({ to: parent.email, subject: title, html: `<p>${body}</p>` });
          results.push({ channel: 'email', success: true });
        } catch (err) {
          results.push({ channel: 'email', success: false, error: err.message });
        }
      }
      if (ch === 'sms' && prefs.smsEnabled && parent.phone) {
        try {
          const sms = getSms();
          await sms.send(parent.phone, body);
          results.push({ channel: 'sms', success: true });
        } catch (err) {
          results.push({ channel: 'sms', success: false, error: err.message });
        }
      }
      if (ch === 'push' && prefs.pushEnabled && parent.devices.length) {
        try {
          const push = getPush();
          const tokens = parent.devices.map(d => d.expoPushToken).filter(Boolean);
          if (tokens.length) await push.sendToDevices(tokens, { title, body });
          results.push({ channel: 'push', success: true });
        } catch (err) {
          results.push({ channel: 'push', success: false, error: err.message });
        }
      }
      if (ch === 'inapp' && prefs.inAppEnabled) {
        // Already stored in DB as notification record – mark as in-app delivered
        results.push({ channel: 'inapp', success: true });
      }
    }

    const anySuccess = results.some(r => r.success);
    const status = anySuccess ? (results.every(r => r.success) ? 'DELIVERED' : 'PARTIAL') : 'FAILED';
    await prisma.notificationDelivery.upsert({
      where: { notificationId_recipientId: { notificationId, recipientId } },
      create: { notificationId, recipientId, status, channelResults: results, deliveredAt: anySuccess ? new Date() : null },
      update: { status, channelResults: results, deliveredAt: anySuccess ? new Date() : null },
    });

    // Update main notification status if all deliveries completed
    const pendingCount = await prisma.notificationDelivery.count({ where: { notificationId, status: { notIn: ['DELIVERED', 'FAILED', 'PARTIAL'] } } });
    if (pendingCount === 0) {
      const allDeliveries = await prisma.notificationDelivery.findMany({ where: { notificationId } });
      const allSuccess = allDeliveries.every(d => d.status === 'DELIVERED');
      await repo.updateStatus(notificationId, allSuccess ? 'SENT' : 'FAILED');
    }

    return results;
  }

  async listNotifications(query, schoolId) {
    const { notifications, total } = await repo.list({ ...query, schoolId });
    // Enrich with delivery stats
    const enriched = notifications.map(n => ({
      ...n,
      recipients: {
        total: n.deliveries?.length || 0,
        delivered: n.deliveries?.filter(d => d.status === 'DELIVERED').length || 0,
        read: n.deliveries?.filter(d => d.status === 'READ').length || 0,
        failed: n.deliveries?.filter(d => d.status === 'FAILED').length || 0,
      },
    }));
    return { notifications: enriched, total };
  }

  async getNotificationDetails(id, schoolId) {
    return repo.findById(id, schoolId);
  }

  async getStats(schoolId) {
    return repo.getStats(schoolId);
  }

  async markAsRead(notificationId, recipientId) {
    return repo.markAsRead(notificationId, recipientId);
  }
}