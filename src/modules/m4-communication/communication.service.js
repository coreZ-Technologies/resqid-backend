// src/modules/communication/communication.service.js
import { CommunicationRepository } from './communication.repository.js';
import { notificationsQueue } from '#orchestrator/queues/queue.config.js';
import { getEmail } from '#infrastructure/email/email.index.js';
import { getSms } from '#infrastructure/sms/sms.index.js';
import { getPush } from '#infrastructure/push/push.index.js';
import { logger } from '#config/logger.js';
import { auditLog, AUDIT_ACTION } from '#shared/helpers/auditLogger.js';
import { ApiError } from '#shared/response/ApiError.js';

const repo = new CommunicationRepository();

export class CommunicationService {
  // ─── Announcements ─────────────────────────────────────────
  async createAnnouncement(data, actorId, schoolId, req) {
    const announcement = await repo.createAnnouncement({
      ...data,
      createdBy: actorId,
      schoolId,
      publishedAt: data.status === 'Published' ? new Date() : null,
    });

    await auditLog(req, AUDIT_ACTION.ANNOUNCEMENT_CREATED, {
      actorId,
      targetId: announcement.id,
      metadata: { title: announcement.title },
    });

    // If published immediately, queue deliveries
    if (data.status === 'Published' && !data.scheduledFor) {
      await this._queueAnnouncementDeliveries(announcement, schoolId);
    }
    // If scheduled, will be handled by a cron job
    return announcement;
  }

  async updateAnnouncement(id, data, actorId, schoolId, req) {
    const existing = await repo.findAnnouncementById(id, schoolId);
    if (!existing) throw ApiError.notFound('Announcement not found');

    const updated = await repo.updateAnnouncement(id, schoolId, data);

    await auditLog(req, AUDIT_ACTION.ANNOUNCEMENT_UPDATED, {
      actorId,
      targetId: id,
      metadata: { changes: Object.keys(data) },
    });

    // If status changed to Published and no scheduled date, queue now
    if (data.status === 'Published' && !existing.publishedAt && !existing.scheduledFor) {
      await this._queueAnnouncementDeliveries({ ...existing, ...data }, schoolId);
    }
    return updated;
  }

  async deleteAnnouncement(id, actorId, schoolId, req) {
    const existing = await repo.findAnnouncementById(id, schoolId);
    if (!existing) throw ApiError.notFound('Announcement not found');

    await repo.deleteAnnouncement(id, schoolId);
    await auditLog(req, AUDIT_ACTION.ANNOUNCEMENT_DELETED, {
      actorId,
      targetId: id,
    });
    return { success: true };
  }

  async listAnnouncements(query, schoolId) {
    const { announcements, total } = await repo.listAnnouncements({ ...query, schoolId });
    // Enrich with delivery stats
    const enriched = announcements.map(a => ({
      ...a,
      recipients: {
        total: a.deliveries?.length || 0,
        delivered: a.deliveries?.filter(d => d.status === 'Delivered').length || 0,
        read: a.deliveries?.filter(d => d.status === 'Read').length || 0,
        failed: a.deliveries?.filter(d => d.status === 'Failed').length || 0,
      },
    }));
    return { announcements: enriched, total };
  }

  async getAnnouncementStats(schoolId) {
    return repo.getAnnouncementStats(schoolId);
  }

  async incrementAnnouncementViews(id, schoolId) {
    const announcement = await repo.findAnnouncementById(id, schoolId);
    if (!announcement) throw ApiError.notFound('Announcement not found');
    await repo.incrementAnnouncementViews(id);
  }

  async scheduleAnnouncement(id, scheduledFor, schoolId) {
    const announcement = await repo.findAnnouncementById(id, schoolId);
    if (!announcement) throw ApiError.notFound('Announcement not found');
    await repo.updateAnnouncement(id, schoolId, {
      status: 'Scheduled',
      scheduledFor: new Date(scheduledFor),
    });
    // Future cron will pick up scheduled announcements
  }

  // ─── Delivery Logs ─────────────────────────────────────────
  async listDeliveryLogs(query, schoolId) {
    return repo.listDeliveryLogs({ ...query, schoolId });
  }

  async getDeliveryStats(schoolId) {
    return repo.getDeliveryStats(schoolId);
  }

  async retryDelivery(logId, schoolId) {
    const log = await repo.findDeliveryLogById(logId, schoolId);
    if (!log) throw ApiError.notFound('Delivery log not found');
    if (log.status !== 'Failed') throw ApiError.badRequest('Only failed deliveries can be retried');

    // Re-queue the notification
    await notificationsQueue.add('retry-delivery', {
      logId: log.id,
      recipientId: log.recipientId,
      channel: log.channel,
      message: log.message,
      type: log.type,
    }, {
      priority: 3,
      attempts: 3,
    });

    await repo.updateDeliveryLogStatus(log.id, 'Pending');
    return { queued: true };
  }

  // ─── Messages & Threads ───────────────────────────────────
  async getOrCreateThread(parentId, schoolAdminId, schoolId, studentName, studentClass) {
    return repo.findOrCreateThread(parentId, schoolAdminId, schoolId, studentName, studentClass);
  }

  async sendMessage(data, senderId, senderRole, schoolId, req) {
    let thread;
    if (data.threadId) {
      thread = await repo.findThreadById(data.threadId, schoolId);
      if (!thread) throw ApiError.notFound('Thread not found');
    } else if (data.parentId) {
      thread = await repo.findOrCreateThread(data.parentId, senderId, schoolId, null, null);
    } else {
      throw ApiError.badRequest('Either threadId or parentId required');
    }

    const message = await repo.createMessage({
      threadId: thread.id,
      senderId,
      senderRole,
      text: data.text,
      attachments: data.attachments || [],
    });

    await repo.updateThreadLastMessage(thread.id, data.text, senderRole);

    // If sender is admin, mark thread as read for admin (no unread for admin)
    if (senderRole === 'school_admin') {
      await repo.markThreadAsRead(thread.id);
    }

    // Send push notification to the other party
    if (senderRole === 'school_admin') {
      // Notify parent
      await this._notifyParent(thread.parentId, data.text);
    } else if (senderRole === 'parent') {
      // Notify admin (already unread increment handled)
      // Optionally send email/SMS
    }

    await auditLog(req, AUDIT_ACTION.MESSAGE_SENT, {
      actorId: senderId,
      targetId: message.id,
      metadata: { threadId: thread.id, role: senderRole },
    });

    return message;
  }

  async listThreads(query, schoolAdminId, schoolId) {
    return repo.listThreads({ ...query, schoolAdminId, schoolId });
  }

  async getThreadDetails(threadId, schoolAdminId, schoolId) {
    const thread = await repo.findThreadById(threadId, schoolId);
    if (!thread || thread.schoolAdminId !== schoolAdminId) {
      throw ApiError.forbidden('Access denied');
    }
    // Mark as read when opened
    await repo.markThreadAsRead(threadId);
    return thread;
  }

  async getUnreadCount(schoolAdminId, schoolId) {
    return repo.getTotalUnreadCount(schoolAdminId, schoolId);
  }

  // ─── Private helpers ──────────────────────────────────────
  async _queueAnnouncementDeliveries(announcement, schoolId) {
    // Resolve recipients based on audience
    const recipients = await this._resolveRecipients(announcement, schoolId);
    for (const recipient of recipients) {
      await notificationsQueue.add('announcement-delivery', {
        announcementId: announcement.id,
        recipientId: recipient.id,
        recipientName: recipient.name,
        phone: recipient.phone,
        email: recipient.email,
        pushToken: recipient.pushToken,
        title: announcement.title,
        body: announcement.body,
        category: announcement.category,
      }, {
        priority: announcement.priority === 'Urgent' ? 1 : 3,
      });
    }
  }

  async _resolveRecipients(announcement, schoolId) {
    // Simplified – implement based on your user tables
    const { audience, specificClass } = announcement;
    let parents = [];

    if (audience === 'All Students' || audience === 'All') {
      parents = await prisma.parentUser.findMany({
        where: { schoolId: { equals: schoolId }, isActive: true },
        select: { id: true, firstName: true, lastName: true, phone: true, email: true, devices: true },
      });
    } else if (audience === 'All Parents') {
      parents = await prisma.parentUser.findMany({
        where: { schoolId: { equals: schoolId }, isActive: true },
        select: { id: true, firstName: true, lastName: true, phone: true, email: true, devices: true },
      });
    } else if (audience === 'Specific Class' && specificClass) {
      const students = await prisma.student.findMany({
        where: { schoolId, grade: specificClass },
        select: { parentLinks: { select: { parentId: true } } },
      });
      const parentIds = [...new Set(students.flatMap(s => s.parentLinks.map(pl => pl.parentId)))];
      parents = await prisma.parentUser.findMany({
        where: { id: { in: parentIds } },
        select: { id: true, firstName: true, lastName: true, phone: true, email: true, devices: true },
      });
    }
    // For 'All Teachers' – similar logic
    return parents.map(p => ({
      id: p.id,
      name: `${p.firstName} ${p.lastName}`,
      phone: p.phone,
      email: p.email,
      pushToken: p.devices?.[0]?.expoPushToken,
    }));
  }

  async _notifyParent(parentId, message) {
    const parent = await prisma.parentUser.findUnique({
      where: { id: parentId },
      select: { email: true, phone: true, devices: true },
    });
    if (!parent) return;

    // Push
    if (parent.devices?.length) {
      const push = getPush();
      const tokens = parent.devices.map(d => d.expoPushToken).filter(Boolean);
      if (tokens.length) {
        await push.sendToDevices(tokens, { title: 'New message from school', body: message });
      }
    }
    // Email (optional)
    if (parent.email) {
      const email = getEmail();
      await email.send({ to: parent.email, subject: 'New message from school', html: `<p>${message}</p>` });
    }
    // SMS (optional)
    if (parent.phone) {
      const sms = getSms();
      await sms.send(parent.phone, `School message: ${message.slice(0, 140)}`);
    }
  }
}