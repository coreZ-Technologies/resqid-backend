// =============================================================================
// notification.controller.js — RESQID
// Full API controller for the notification module.
// Handles: inbox, send, bulk, preferences, devices, templates, stats, webhooks
// =============================================================================

import { asyncHandler } from '#shared/response/asyncHandler.js';
import { ApiResponse } from '#shared/response/ApiResponse.js';
import { ApiError } from '#shared/response/ApiError.js';
import { logger } from '#config/logger.js';

import {
  saveInAppNotification,
  fanOutNotification,
  getInbox,
  getUnreadCount,
  readNotification,
  readAllNotifications,
  getSchoolNotifications,
  getPreferences,
  updatePreferences,
  resetPreferences,
  recordDeliveryFailure,
  notifyQrScanned,
  notifyEmergencyAlert,
} from './notification.module.service.js';

import {
  createNotification,
  createManyNotifications,
  findNotificationById,
  findNotificationsByParent,
  findNotificationsBySchool,
  countUnreadInApp,
  markAsRead,
  markAllReadForParent,
  markAsFailed,
  markAsSent,
  markAsDelivered,
  upsertPreferences,
  findPreferencesByParent,
  deletePreferences,
  deleteOldNotifications,
} from './notification.repository.js';

import {
  sendNotificationSchema,
  bulkNotificationSchema,
  updatePreferencesSchema,
  registerDeviceSchema,
  unregisterDeviceSchema,
  createTemplateSchema,
  updateTemplateSchema,
  getNotificationsQuerySchema,
  getNotificationByIdSchema,
  markAsReadSchema,
  resendNotificationSchema,
  deleteNotificationSchema,
  webhookDeliverySchema,
  getStatsQuerySchema,
} from './notification.validation.js';

import {
  checkAllRateLimits,
  getRateLimitStatus,
  checkBulkRateLimit,
} from '#orchestrator/policies/rate-limit.policy.js';
import { enqueueNotification } from '#orchestrator/queues/queue.config.js';
import { prisma } from '#config/prisma.js';
import {
  NOTIFICATION_CHANNEL,
  NOTIFICATION_STATUS,
  NOTIFICATION_TYPE,
} from './notification.constants.js';
import {
  formatNotification,
  paginatedResponse,
  parsePagination,
  buildNotificationData,
} from './notification.utils.js';
import { sendPushNotificationChannel } from '#orchestrator/notifications/channel/push.js';
import { sendSmsNotification } from '#orchestrator/notifications/channel/sms.js';
import { sendEmailNotification } from '#orchestrator/notifications/channel/email.js';

// ═══════════════════════════════════════════════════════════════════════════
// PARENT INBOX
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/notifications/inbox
 * Paginated IN_APP notifications for the authenticated parent.
 */
export const getInboxHandler = asyncHandler(async (req, res) => {
  const parentId = req.user.id;
  const query = getNotificationsQuerySchema.parse(req.query);

  const result = await getInbox(parentId, query);

  return ApiResponse.success(res, result, 'Inbox fetched');
});

/**
 * GET /api/notifications/unread-count
 * Badge count for parent's unread notifications.
 */
export const getUnreadCountHandler = asyncHandler(async (req, res) => {
  const parentId = req.user.id;
  const result = await getUnreadCount(parentId);

  return ApiResponse.success(res, result, 'Unread count fetched');
});

/**
 * PUT /api/notifications/:id/read
 * Mark a single notification as read.
 */
export const markAsReadHandler = asyncHandler(async (req, res) => {
  const parentId = req.user.id;
  const { id } = markAsReadSchema.parse({ id: req.params.id });

  const result = await readNotification(id, parentId);

  return ApiResponse.success(res, result, 'Notification marked as read');
});

/**
 * PUT /api/notifications/read-all
 * Mark all IN_APP notifications as read for the parent.
 */
export const markAllReadHandler = asyncHandler(async (req, res) => {
  const parentId = req.user.id;
  const result = await readAllNotifications(parentId);

  return ApiResponse.success(res, result, 'All notifications marked as read');
});

// ═══════════════════════════════════════════════════════════════════════════
// SCHOOL ADMIN — VIEW & MANAGE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/notifications/school
 * Paginated list of all notifications sent by this school.
 */
export const getSchoolNotificationsHandler = asyncHandler(async (req, res) => {
  const schoolId = req.user.schoolId;
  const query = getNotificationsQuerySchema.parse(req.query);

  const result = await getSchoolNotifications(schoolId, query);

  return ApiResponse.success(res, result, 'School notifications fetched');
});

/**
 * GET /api/notifications/:id
 * Get a single notification by ID.
 */
export const getNotificationByIdHandler = asyncHandler(async (req, res) => {
  const schoolId = req.user.schoolId;
  const { id } = getNotificationByIdSchema.parse({ id: req.params.id });

  const notification = await findNotificationById(id);

  if (!notification) {
    throw ApiError.notFound('Notification not found');
  }

  if (notification.schoolId !== schoolId) {
    throw ApiError.forbidden('Access denied');
  }

  return ApiResponse.success(res, formatNotification(notification), 'Notification fetched');
});

/**
 * DELETE /api/notifications/:id
 * Soft-delete/archive a notification.
 */
export const deleteNotificationHandler = asyncHandler(async (req, res) => {
  const schoolId = req.user.schoolId;
  const { id } = deleteNotificationSchema.parse({ id: req.params.id });

  const notification = await findNotificationById(id);

  if (!notification) {
    throw ApiError.notFound('Notification not found');
  }

  if (notification.schoolId !== schoolId) {
    throw ApiError.forbidden('Access denied');
  }

  await prisma.notification.update({
    where: { id },
    data: { status: NOTIFICATION_STATUS.CANCELLED },
  });

  return ApiResponse.success(res, null, 'Notification deleted');
});

// ═══════════════════════════════════════════════════════════════════════════
// SCHOOL ADMIN — SEND NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Resolve recipients based on type (all/class/section/individual).
 * Returns array of { parentId, phone, email, pushTokens }.
 */
async function resolveRecipients(schoolId, recipients) {
  const { type, ids } = recipients;

  switch (type) {
    case 'all': {
      const links = await prisma.parentStudent.findMany({
        where: {
          student: { schoolId },
          isActive: true,
          parent: { isActive: true },
        },
        select: {
          parent: {
            select: {
              id: true,
              phone: true,
              email: true,
              devices: {
                where: { isActive: true, expoPushToken: { not: null } },
                select: { expoPushToken: true },
              },
            },
          },
        },
      });

      // Deduplicate by parent ID
      const parentMap = new Map();
      for (const link of links) {
        if (link.parent && !parentMap.has(link.parent.id)) {
          parentMap.set(link.parent.id, {
            parentId: link.parent.id,
            phone: link.parent.phone,
            email: link.parent.email,
            pushTokens: link.parent.devices.map((d) => d.expoPushToken),
          });
        }
      }
      return Array.from(parentMap.values());
    }

    case 'class': {
      const links = await prisma.parentStudent.findMany({
        where: {
          student: { schoolId, classId: { in: ids } },
          isActive: true,
          parent: { isActive: true },
        },
        select: {
          parent: {
            select: {
              id: true,
              phone: true,
              email: true,
              devices: {
                where: { isActive: true, expoPushToken: { not: null } },
                select: { expoPushToken: true },
              },
            },
          },
        },
      });

      const parentMap = new Map();
      for (const link of links) {
        if (link.parent && !parentMap.has(link.parent.id)) {
          parentMap.set(link.parent.id, {
            parentId: link.parent.id,
            phone: link.parent.phone,
            email: link.parent.email,
            pushTokens: link.parent.devices.map((d) => d.expoPushToken),
          });
        }
      }
      return Array.from(parentMap.values());
    }

    case 'section': {
      const links = await prisma.parentStudent.findMany({
        where: {
          student: { schoolId, sectionId: { in: ids } },
          isActive: true,
          parent: { isActive: true },
        },
        select: {
          parent: {
            select: {
              id: true,
              phone: true,
              email: true,
              devices: {
                where: { isActive: true, expoPushToken: { not: null } },
                select: { expoPushToken: true },
              },
            },
          },
        },
      });

      const parentMap = new Map();
      for (const link of links) {
        if (link.parent && !parentMap.has(link.parent.id)) {
          parentMap.set(link.parent.id, {
            parentId: link.parent.id,
            phone: link.parent.phone,
            email: link.parent.email,
            pushTokens: link.parent.devices.map((d) => d.expoPushToken),
          });
        }
      }
      return Array.from(parentMap.values());
    }

    case 'individual': {
      // ids are student IDs
      const links = await prisma.parentStudent.findMany({
        where: {
          studentId: { in: ids },
          isActive: true,
          parent: { isActive: true },
        },
        select: {
          parent: {
            select: {
              id: true,
              phone: true,
              email: true,
              devices: {
                where: { isActive: true, expoPushToken: { not: null } },
                select: { expoPushToken: true },
              },
            },
          },
        },
      });

      const parentMap = new Map();
      for (const link of links) {
        if (link.parent && !parentMap.has(link.parent.id)) {
          parentMap.set(link.parent.id, {
            parentId: link.parent.id,
            phone: link.parent.phone,
            email: link.parent.email,
            pushTokens: link.parent.devices.map((d) => d.expoPushToken),
          });
        }
      }
      return Array.from(parentMap.values());
    }

    default:
      return [];
  }
}

/**
 * POST /api/notifications/send
 * Send a notification to selected recipients via selected channels.
 */
export const sendNotificationHandler = asyncHandler(async (req, res) => {
  const schoolId = req.user.schoolId;
  const data = sendNotificationSchema.parse(req.body);

  // Resolve recipients
  const recipients = await resolveRecipients(schoolId, data.recipients);

  if (recipients.length === 0) {
    throw ApiError.badRequest('No recipients found for the selected criteria');
  }

  // Rate limit check
  const isEmergency = data.type === 'EMERGENCY';
  const rateCheck = await checkAllRateLimits({
    schoolId,
    channels: data.channels,
    recipientCount: recipients.length,
    isEmergency,
  });

  if (!rateCheck.allowed) {
    throw ApiError.tooManyRequests(`Rate limit exceeded: ${rateCheck.violations?.join(', ')}`);
  }

  // Create notification record
  const notification = await createNotification({
    schoolId,
    title: data.title,
    body: data.body,
    type: data.type,
    data: buildNotificationData(data.type, {
      recipientType: data.recipients.type,
      recipientIds: data.recipients.type !== 'all' ? data.recipients.ids : [],
      actionUrl: data.actionUrl,
    }),
    channel: data.channels[0], // Primary channel for the record
    status: NOTIFICATION_STATUS.PENDING,
  });

  // Enqueue to notification worker
  await enqueueNotification({
    notificationId: notification.id,
    schoolId,
    title: data.title,
    body: data.body,
    type: data.type,
    channels: data.channels,
    priority: data.priority,
    recipients: recipients.map((r) => ({
      parentId: r.parentId,
      phone: r.phone,
      email: r.email,
      pushTokens: r.pushTokens,
    })),
    scheduledFor: data.scheduledFor,
    isEmergency,
  });

  logger.info(
    {
      notificationId: notification.id,
      schoolId,
      type: data.type,
      channels: data.channels,
      recipientCount: recipients.length,
    },
    '[controller] Notification queued'
  );

  return ApiResponse.created(
    res,
    {
      notification: formatNotification(notification),
      recipientCount: recipients.length,
      channels: data.channels,
    },
    'Notification sent successfully'
  );
});

/**
 * POST /api/notifications/bulk
 * Bulk send notification to all parents or large groups.
 */
export const bulkNotificationHandler = asyncHandler(async (req, res) => {
  const schoolId = req.user.schoolId;
  const data = bulkNotificationSchema.parse(req.body);

  // Bulk rate limit check
  const bulkCheck = await checkBulkRateLimit(schoolId);
  if (!bulkCheck.allowed) {
    throw ApiError.tooManyRequests(bulkCheck.reason);
  }

  const recipients = await resolveRecipients(schoolId, data.recipients);

  if (recipients.length === 0) {
    throw ApiError.badRequest('No recipients found');
  }

  if (recipients.length > 1000) {
    throw ApiError.badRequest('Maximum 1000 recipients per bulk send');
  }

  const isEmergency = data.type === 'EMERGENCY';
  const rateCheck = await checkAllRateLimits({
    schoolId,
    channels: data.channels,
    recipientCount: recipients.length,
    isEmergency,
  });

  if (!rateCheck.allowed) {
    throw ApiError.tooManyRequests(`Rate limit exceeded: ${rateCheck.violations?.join(', ')}`);
  }

  // Create batch record
  const batch = await prisma.notificationBatch.create({
    data: {
      schoolId,
      name: data.title,
      totalCount: recipients.length,
      status: 'PENDING',
      createdById: req.user.id,
    },
  });

  // Create notification
  const notification = await createNotification({
    schoolId,
    title: data.title,
    body: data.body,
    type: data.type,
    data: buildNotificationData(data.type, {
      recipientType: data.recipients.type,
      batchId: batch.id,
    }),
    channel: data.channels[0],
    status: NOTIFICATION_STATUS.QUEUED,
  });

  // Enqueue
  await enqueueNotification({
    notificationId: notification.id,
    batchId: batch.id,
    schoolId,
    title: data.title,
    body: data.body,
    type: data.type,
    channels: data.channels,
    priority: data.priority,
    recipients: recipients.map((r) => ({
      parentId: r.parentId,
      phone: r.phone,
      email: r.email,
      pushTokens: r.pushTokens,
    })),
    scheduledFor: data.scheduledFor,
    isEmergency,
    isBulk: true,
  });

  return ApiResponse.created(
    res,
    {
      notification: formatNotification(notification),
      batchId: batch.id,
      recipientCount: recipients.length,
    },
    'Bulk notification queued'
  );
});

/**
 * POST /api/notifications/:id/resend
 * Retry a failed notification.
 */
export const resendNotificationHandler = asyncHandler(async (req, res) => {
  const schoolId = req.user.schoolId;
  const { id, channels } = resendNotificationSchema.parse({
    id: req.params.id,
    ...req.body,
  });

  const notification = await findNotificationById(id);

  if (!notification) {
    throw ApiError.notFound('Notification not found');
  }

  if (notification.schoolId !== schoolId) {
    throw ApiError.forbidden('Access denied');
  }

  if (notification.status !== NOTIFICATION_STATUS.FAILED) {
    throw ApiError.badRequest('Only failed notifications can be resent');
  }

  // Reset status and re-queue
  await prisma.notification.update({
    where: { id },
    data: {
      status: NOTIFICATION_STATUS.QUEUED,
      failReason: null,
      retryCount: { increment: 1 },
    },
  });

  await enqueueNotification({
    notificationId: id,
    schoolId,
    title: notification.title,
    body: notification.body,
    type: notification.type,
    channels: channels || [notification.channel],
    priority: notification.priority || 'NORMAL',
    recipients: notification.data?.recipients || [],
    isEmergency: notification.type === 'EMERGENCY',
    isRetry: true,
  });

  return ApiResponse.success(res, formatNotification(notification), 'Notification re-queued');
});

// ═══════════════════════════════════════════════════════════════════════════
// NOTIFICATION PREFERENCES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/notifications/preferences
 * Get notification preferences for the authenticated user.
 */
export const getPreferencesHandler = asyncHandler(async (req, res) => {
  const parentId = req.user.id;
  const result = await getPreferences(parentId);

  return ApiResponse.success(res, result, 'Preferences fetched');
});

/**
 * PUT /api/notifications/preferences
 * Update notification preferences.
 */
export const updatePreferencesHandler = asyncHandler(async (req, res) => {
  const parentId = req.user.id;
  const updates = updatePreferencesSchema.parse(req.body);

  const result = await updatePreferences(parentId, updates);

  return ApiResponse.success(res, result, 'Preferences updated');
});

/**
 * DELETE /api/notifications/preferences
 * Reset preferences to defaults.
 */
export const resetPreferencesHandler = asyncHandler(async (req, res) => {
  const parentId = req.user.id;
  await resetPreferences(parentId);

  return ApiResponse.success(res, null, 'Preferences reset to defaults');
});

// ═══════════════════════════════════════════════════════════════════════════
// DEVICE TOKEN MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /api/notifications/devices
 * Register a device push token.
 */
export const registerDeviceHandler = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const userType = req.user.role; // 'PARENT' or 'SCHOOL_USER'
  const data = registerDeviceSchema.parse(req.body);

  const deviceData = {
    token: data.token,
    platform: data.platform,
    deviceModel: data.deviceModel,
    appVersion: data.appVersion,
    isActive: true,
    lastUsedAt: new Date(),
  };

  if (userType === 'PARENT') {
    deviceData.parentId = userId;
  } else {
    deviceData.schoolUserId = userId;
  }

  await prisma.notificationDeviceToken.upsert({
    where: { token: data.token },
    create: deviceData,
    update: {
      isActive: true,
      lastUsedAt: new Date(),
      platform: data.platform,
      deviceModel: data.deviceModel,
      appVersion: data.appVersion,
    },
  });

  logger.info({ userId, platform: data.platform }, '[controller] Device registered');

  return ApiResponse.success(res, null, 'Device registered');
});

/**
 * DELETE /api/notifications/devices/:token
 * Unregister a device push token.
 */
export const unregisterDeviceHandler = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { token } = unregisterDeviceSchema.parse({ token: req.params.token });

  await prisma.notificationDeviceToken.updateMany({
    where: {
      token,
      OR: [{ parentId: userId }, { schoolUserId: userId }],
    },
    data: {
      isActive: false,
      lastUsedAt: new Date(),
    },
  });

  logger.info({ userId, token: token.slice(0, 10) + '...' }, '[controller] Device unregistered');

  return ApiResponse.success(res, null, 'Device unregistered');
});

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATES (SCHOOL ADMIN)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/notifications/templates
 * List notification templates for the school.
 */
export const getTemplatesHandler = asyncHandler(async (req, res) => {
  const schoolId = req.user.schoolId;
  const query = paginationSchema.parse(req.query);

  const [templates, total] = await Promise.all([
    prisma.notificationTemplate.findMany({
      where: { OR: [{ schoolId }, { isSystem: true }] },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.notificationTemplate.count({
      where: { OR: [{ schoolId }, { isSystem: true }] },
    }),
  ]);

  return ApiResponse.success(
    res,
    paginatedResponse(templates, total, query.page, query.limit),
    'Templates fetched'
  );
});

/**
 * POST /api/notifications/templates
 * Create a new notification template.
 */
export const createTemplateHandler = asyncHandler(async (req, res) => {
  const schoolId = req.user.schoolId;
  const data = createTemplateSchema.parse(req.body);

  const template = await prisma.notificationTemplate.create({
    data: {
      ...data,
      schoolId,
      isSystem: false,
      variables: data.variables || [],
    },
  });

  return ApiResponse.created(res, template, 'Template created');
});

/**
 * PUT /api/notifications/templates/:id
 * Update a notification template.
 */
export const updateTemplateHandler = asyncHandler(async (req, res) => {
  const schoolId = req.user.schoolId;
  const { id } = req.params;
  const data = updateTemplateSchema.parse(req.body);

  const existing = await prisma.notificationTemplate.findUnique({ where: { id } });

  if (!existing) {
    throw ApiError.notFound('Template not found');
  }

  if (existing.schoolId !== schoolId) {
    throw ApiError.forbidden('Access denied');
  }

  if (existing.isSystem) {
    throw ApiError.badRequest('Cannot edit system templates');
  }

  const template = await prisma.notificationTemplate.update({
    where: { id },
    data,
  });

  return ApiResponse.success(res, template, 'Template updated');
});

/**
 * DELETE /api/notifications/templates/:id
 * Delete a notification template.
 */
export const deleteTemplateHandler = asyncHandler(async (req, res) => {
  const schoolId = req.user.schoolId;
  const { id } = req.params;

  const existing = await prisma.notificationTemplate.findUnique({ where: { id } });

  if (!existing) {
    throw ApiError.notFound('Template not found');
  }

  if (existing.schoolId !== schoolId) {
    throw ApiError.forbidden('Access denied');
  }

  if (existing.isSystem) {
    throw ApiError.badRequest('Cannot delete system templates');
  }

  await prisma.notificationTemplate.delete({ where: { id } });

  return ApiResponse.success(res, null, 'Template deleted');
});

// ═══════════════════════════════════════════════════════════════════════════
// STATS & ANALYTICS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/notifications/stats
 * Get notification statistics for the school dashboard.
 */
export const getStatsHandler = asyncHandler(async (req, res) => {
  const schoolId = req.user.schoolId;
  const query = getStatsQuerySchema.parse(req.query);

  const dateFrom = query.dateFrom
    ? new Date(query.dateFrom)
    : new Date(Date.now() - query.days * 24 * 60 * 60 * 1000);
  const dateTo = query.dateTo ? new Date(query.dateTo) : new Date();

  const where = {
    schoolId,
    createdAt: { gte: dateFrom, lte: dateTo },
  };

  const [totalSent, totalDelivered, totalRead, totalFailed, byType, byChannel, byDay] =
    await Promise.all([
      // Total counts
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { ...where, status: NOTIFICATION_STATUS.DELIVERED } }),
      prisma.notification.count({ where: { ...where, status: NOTIFICATION_STATUS.READ } }),
      prisma.notification.count({ where: { ...where, status: NOTIFICATION_STATUS.FAILED } }),

      // Group by type
      prisma.notification.groupBy({
        by: ['type'],
        where,
        _count: { id: true },
      }),

      // Group by channel
      prisma.notification.groupBy({
        by: ['channel'],
        where,
        _count: { id: true },
      }),

      // Daily breakdown (last 7 days)
      prisma.$queryRaw`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count,
        SUM(CASE WHEN status = 'DELIVERED' THEN 1 ELSE 0 END) as delivered,
        SUM(CASE WHEN status = 'READ' THEN 1 ELSE 0 END) as read_count,
        SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as failed
      FROM notifications
      WHERE school_id = ${schoolId}
        AND created_at >= ${dateFrom}
        AND created_at <= ${dateTo}
      GROUP BY DATE(created_at)
      ORDER BY date DESC
      LIMIT 30
    `,
    ]);

  const deliveryRate = totalSent > 0 ? ((totalDelivered / totalSent) * 100).toFixed(1) : 0;
  const readRate = totalDelivered > 0 ? ((totalRead / totalDelivered) * 100).toFixed(1) : 0;

  return ApiResponse.success(
    res,
    {
      overview: {
        totalSent,
        totalDelivered,
        totalRead,
        totalFailed,
        deliveryRate: `${deliveryRate}%`,
        readRate: `${readRate}%`,
      },
      byType: byType.map((t) => ({
        type: t.type,
        count: t._count.id,
      })),
      byChannel: byChannel.map((c) => ({
        channel: c.channel,
        count: c._count.id,
      })),
      byDay: (byDay || []).map((d) => ({
        date: d.date,
        sent: Number(d.count),
        delivered: Number(d.delivered),
        read: Number(d.read_count),
        failed: Number(d.failed),
      })),
    },
    'Stats fetched'
  );
});

/**
 * GET /api/notifications/rate-limit-status
 * Get current rate limit status for the school.
 */
export const getRateLimitStatusHandler = asyncHandler(async (req, res) => {
  const schoolId = req.user.schoolId;
  const status = await getRateLimitStatus(schoolId);

  return ApiResponse.success(res, status, 'Rate limit status fetched');
});

/**
 * GET /api/notifications/recipient-types
 * Get available recipient types with counts for the school.
 */
export const getRecipientTypesHandler = asyncHandler(async (req, res) => {
  const schoolId = req.user.schoolId;

  const [totalParents, classCount, sectionCount, studentCount] = await Promise.all([
    prisma.parentStudent.count({
      where: { student: { schoolId }, isActive: true },
      distinct: ['parentId'],
    }),
    prisma.class.count({ where: { schoolId } }),
    prisma.section.count({ where: { schoolId } }),
    prisma.student.count({ where: { schoolId, isActive: true } }),
  ]);

  return ApiResponse.success(
    res,
    [
      { id: 'all', label: 'All Parents', icon: 'Users', count: totalParents },
      { id: 'class', label: 'By Class', icon: 'GraduationCap', count: classCount },
      { id: 'section', label: 'By Section', icon: 'BookOpen', count: sectionCount },
      { id: 'individual', label: 'Individual Student', icon: 'User', count: studentCount },
    ],
    'Recipient types fetched'
  );
});

/**
 * GET /api/notifications/channels
 * Get available channel configurations.
 */
export const getChannelsHandler = asyncHandler(async (req, res) => {
  return ApiResponse.success(
    res,
    [
      { id: 'PUSH', label: 'Push Notification', icon: 'Bell', color: 'purple', enabled: true },
      { id: 'SMS', label: 'SMS', icon: 'Smartphone', color: 'green', enabled: true },
      { id: 'EMAIL', label: 'Email', icon: 'Mail', color: 'blue', enabled: true },
      {
        id: 'WHATSAPP',
        label: 'WhatsApp',
        icon: 'MessageSquare',
        color: 'emerald',
        enabled: false,
      },
      { id: 'IN_APP', label: 'In-App', icon: 'MessageSquare', color: 'orange', enabled: true },
    ],
    'Channels fetched'
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// WEBHOOKS — Provider Delivery Callbacks
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /api/webhooks/notifications/delivery
 * Handle delivery status webhooks from SMS/Email/Push providers.
 */
export const webhookDeliveryHandler = asyncHandler(async (req, res) => {
  const data = webhookDeliverySchema.parse(req.body);

  const notification = await findNotificationById(data.notificationId);

  if (!notification) {
    logger.warn({ notificationId: data.notificationId }, '[webhook] Notification not found');
    return ApiResponse.success(res, null, 'Acknowledged'); // Always 200 for webhooks
  }

  // Log webhook
  await prisma.notificationWebhookLog.create({
    data: {
      notificationId: data.notificationId,
      provider: data.channel.toLowerCase(),
      event: data.status,
      payload: data,
    },
  });

  // Update status
  if (data.status === 'delivered') {
    await markAsDelivered(data.notificationId);
    logger.info(
      { notificationId: data.notificationId, channel: data.channel },
      '[webhook] Delivery confirmed'
    );
  } else if (data.status === 'failed' || data.status === 'bounced') {
    await recordDeliveryFailure(data.notificationId, data.error || `Delivery ${data.status}`);
    logger.warn(
      { notificationId: data.notificationId, status: data.status },
      '[webhook] Delivery failed'
    );
  }

  return ApiResponse.success(res, null, 'Acknowledged');
});

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT ALL HANDLERS
// ═══════════════════════════════════════════════════════════════════════════

export default {
  // Parent inbox
  getInboxHandler,
  getUnreadCountHandler,
  markAsReadHandler,
  markAllReadHandler,

  // School admin
  getSchoolNotificationsHandler,
  getNotificationByIdHandler,
  deleteNotificationHandler,
  sendNotificationHandler,
  bulkNotificationHandler,
  resendNotificationHandler,

  // Preferences
  getPreferencesHandler,
  updatePreferencesHandler,
  resetPreferencesHandler,

  // Devices
  registerDeviceHandler,
  unregisterDeviceHandler,

  // Templates
  getTemplatesHandler,
  createTemplateHandler,
  updateTemplateHandler,
  deleteTemplateHandler,

  // Stats & config
  getStatsHandler,
  getRateLimitStatusHandler,
  getRecipientTypesHandler,
  getChannelsHandler,

  // Webhooks
  webhookDeliveryHandler,
};
