// school-admin/notification/notification.validation.js
import { z } from 'zod';

const NotificationTypeEnum = z.enum(['ANNOUNCEMENT', 'EMERGENCY', 'REMINDER', 'EVENT', 'ATTENDANCE', 'GENERAL']);
const ChannelEnum = z.enum(['email', 'sms', 'push', 'whatsapp']);
const PriorityEnum = z.enum(['low', 'normal', 'high', 'urgent']);
const RecipientTypeEnum = z.enum(['all', 'class', 'section', 'individual']);

export const createNotificationSchema = z.object({
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(5000),
  type: NotificationTypeEnum.default('GENERAL'),
  channel: z.array(ChannelEnum).min(1),
  recipientType: RecipientTypeEnum.default('all'),
  selectedClass: z.string().optional(),
  selectedSection: z.string().optional(),
  selectedParents: z.array(z.string()).optional(),
  scheduleLater: z.boolean().default(false),
  scheduledTime: z.string().datetime().optional(),
  priority: PriorityEnum.default('normal'),
  attachments: z.array(z.string().url()).optional(),
});

export const updateNotificationSchema = createNotificationSchema.partial();

export const listNotificationsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().optional(),
  type: NotificationTypeEnum.optional(),
  status: z.enum(['sent', 'delivered', 'read', 'failed']).optional(),
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
});

export const resendNotificationSchema = z.object({
  notificationId: z.string().min(1),
});