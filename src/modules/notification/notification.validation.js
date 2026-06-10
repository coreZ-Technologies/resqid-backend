// =============================================================================
// notification.validation.js — RESQID
// Zod validation schemas for all notification endpoints.
// =============================================================================

import { z } from 'zod';

// ─── Reusable Fragments ──────────────────────────────────────────────────────

const objectId = z
  .string()
  .min(10)
  .max(30)
  .regex(/^[a-zA-Z0-9_-]+$/);

const channelEnum = z.enum(['SMS', 'EMAIL', 'PUSH', 'IN_APP', 'WHATSAPP']);

const notificationTypeEnum = z.enum([
  'ANNOUNCEMENT',
  'EMERGENCY',
  'REMINDER',
  'EVENT',
  'ATTENDANCE',
  'GENERAL',
  'FEE',
  'PTM',
  'EXAM',
  'REPORT_CARD',
  'HOMEWORK',
  'SYSTEM',
]);

const priorityEnum = z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL');

const statusEnum = z.enum([
  'PENDING',
  'QUEUED',
  'SENT',
  'DELIVERED',
  'READ',
  'FAILED',
  'CANCELLED',
]);

const isoDate = z.string().datetime().or(z.date());

// ─── Pagination ──────────────────────────────────────────────────────────────

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ─── Filters ─────────────────────────────────────────────────────────────────

export const notificationFilterSchema = z.object({
  type: z.union([notificationTypeEnum, z.array(notificationTypeEnum)]).optional(),
  status: z.union([statusEnum, z.array(statusEnum)]).optional(),
  channel: z.union([channelEnum, z.array(channelEnum)]).optional(),
  priority: priorityEnum.optional(),
  search: z.string().max(200).optional(),
  dateFrom: isoDate.optional(),
  dateTo: isoDate.optional(),
});

// ─── Recipients ──────────────────────────────────────────────────────────────

export const recipientIndividualSchema = z.object({
  type: z.literal('individual'),
  ids: z.array(objectId).min(1).max(100),
});

export const recipientClassSchema = z.object({
  type: z.literal('class'),
  ids: z.array(objectId).min(1).max(20),
});

export const recipientSectionSchema = z.object({
  type: z.literal('section'),
  ids: z.array(objectId).min(1).max(50),
});

export const recipientAllSchema = z.object({
  type: z.literal('all'),
});

export const recipientsSchema = z.discriminatedUnion('type', [
  recipientIndividualSchema,
  recipientClassSchema,
  recipientSectionSchema,
  recipientAllSchema,
]);

// ─── Send Notification ──────────────────────────────────────────────────────

export const sendNotificationSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(2000),
  type: notificationTypeEnum,
  channels: z.array(channelEnum).min(1).max(5),
  priority: priorityEnum,
  recipients: recipientsSchema,
  scheduledFor: isoDate.optional().nullable(),
  actionUrl: z.string().url().optional().nullable(),
  actionLabel: z.string().max(50).optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  templateId: objectId.optional().nullable(),
});

// ─── Bulk Notification ──────────────────────────────────────────────────────

export const bulkNotificationSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(2000),
  type: notificationTypeEnum,
  channels: z.array(channelEnum).min(1).max(5),
  priority: priorityEnum,
  recipients: recipientsSchema,
  scheduledFor: isoDate.optional().nullable(),
});

// ─── Update Preferences ─────────────────────────────────────────────────────

export const updatePreferencesSchema = z
  .object({
    smsEnabled: z.boolean().optional(),
    emailEnabled: z.boolean().optional(),
    pushEnabled: z.boolean().optional(),
    inAppEnabled: z.boolean().optional(),
    whatsappEnabled: z.boolean().optional(),
    onScan: z.boolean().optional(),
    onAttendance: z.boolean().optional(),
    onAbsent: z.boolean().optional(),
    onLate: z.boolean().optional(),
    onFee: z.boolean().optional(),
    onExam: z.boolean().optional(),
    onEvent: z.boolean().optional(),
    onEmergency: z.boolean().optional(),
    onAnnouncement: z.boolean().optional(),
    onHomework: z.boolean().optional(),
    onReportCard: z.boolean().optional(),
    quietHoursEnabled: z.boolean().optional(),
    quietHoursStart: z
      .string()
      .regex(/^\d{2}:\d{2}$/)
      .optional(),
    quietHoursEnd: z
      .string()
      .regex(/^\d{2}:\d{2}$/)
      .optional(),
    quietHoursTimezone: z.string().optional(),
    language: z.string().length(2).optional(),
    digestMode: z.boolean().optional(),
    maxPerHour: z.number().int().min(1).max(50).optional(),
  })
  .refine(
    (data) => {
      if (data.quietHoursEnabled && (!data.quietHoursStart || !data.quietHoursEnd)) {
        return false;
      }
      return true;
    },
    {
      message: 'quietHoursStart and quietHoursEnd are required when quietHoursEnabled is true',
    }
  );

// ─── Register Device ────────────────────────────────────────────────────────

export const registerDeviceSchema = z.object({
  token: z.string().min(10).max(500),
  platform: z.enum(['ios', 'android', 'web']),
  deviceModel: z.string().max(100).optional(),
  appVersion: z.string().max(20).optional(),
});

// ─── Unregister Device ──────────────────────────────────────────────────────

export const unregisterDeviceSchema = z.object({
  token: z.string().min(10).max(500),
});

// ─── Create Template ────────────────────────────────────────────────────────

export const createTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  category: notificationTypeEnum,
  titleTemplate: z.string().min(1).max(200),
  bodyTemplate: z.string().min(1).max(2000),
  smsTemplate: z.string().max(500).optional().nullable(),
  defaultChannel: channelEnum.default('PUSH'),
  variables: z.array(z.string()).optional(),
});

// ─── Update Template ────────────────────────────────────────────────────────

export const updateTemplateSchema = createTemplateSchema.partial();

// ─── Query Schemas (for GET endpoints) ──────────────────────────────────────

export const getNotificationsQuerySchema = paginationSchema.merge(notificationFilterSchema);

export const getNotificationByIdSchema = z.object({
  id: objectId,
});

export const markAsReadSchema = z.object({
  id: objectId,
});

export const resendNotificationSchema = z.object({
  id: objectId,
  channels: z.array(channelEnum).min(1).max(5).optional(),
});

export const deleteNotificationSchema = z.object({
  id: objectId,
});

export const webhookDeliverySchema = z.object({
  notificationId: z.string().min(1),
  channel: channelEnum,
  status: z.enum(['delivered', 'failed', 'bounced', 'complaint']),
  providerMessageId: z.string().optional(),
  error: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const getStatsQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).default(30),
  dateFrom: isoDate.optional(),
  dateTo: isoDate.optional(),
});

// ─── Export All ──────────────────────────────────────────────────────────────

export default {
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
  paginationSchema,
  notificationFilterSchema,
  recipientsSchema,
};
