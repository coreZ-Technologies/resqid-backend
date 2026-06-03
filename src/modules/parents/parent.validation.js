<<<<<<< HEAD
// src/modules/m5-parents/parent.validation.js
import { z } from 'zod';

// Enums matching Prisma
const RelationEnum = z.enum(['FATHER', 'MOTHER', 'GUARDIAN', 'GRANDPARENT', 'SIBLING', 'OTHER']);
const NotificationChannel = z.enum(['SMS', 'EMAIL', 'PUSH', 'IN_APP', 'WHATSAPP']);
const EngagementLevel = z.enum(['high', 'medium', 'low']);

// ─── Create Parent ──────────────────────────────────────────────
export const createParentSchema = z.object({
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  email: z.string().email(),
  phone: z.string().min(10).max(15),
  relation: RelationEnum,
  address: z.string().optional(),
  password: z.string().min(8),
  preferences: z.object({
    notifyAttendance: z.boolean().default(true),
    notifyAbsent: z.boolean().default(true),
    notifyLate: z.boolean().default(false),
    notifyEmergency: z.boolean().default(true),
    weeklyReport: z.boolean().default(false),
    notifChannel: NotificationChannel.default('PUSH'),
  }).optional(),
  studentIds: z.array(z.string()).optional(),
=======
// =============================================================================
// modules/parents/parent.validation.js — RESQID
// Zod schemas for parent module endpoints.
// 🔧 Flat schemas for use with validate() middleware.
// =============================================================================

import { z } from 'zod';

const cuid = z.string().min(1, 'Invalid ID format');

// ─── Profile ──────────────────────────────────────────────────────────────────

export const parentProfileSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(100)
    .transform((v) => v.trim()),
  email: z.string().email().toLowerCase().optional(),
>>>>>>> f769c34b07b38ef93f84fb7ec946cdc6fdb91efd
});

// ─── Update Parent ──────────────────────────────────────────────
export const updateParentSchema = createParentSchema.partial();

<<<<<<< HEAD
// ─── List Parents Query ─────────────────────────────────────────
export const listParentsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  engagement: EngagementLevel.optional(),
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
});

// ─── Link Children ──────────────────────────────────────────────
export const linkChildrenSchema = z.object({
  studentIds: z.array(z.string()).min(1),
});

// ─── Export Query ───────────────────────────────────────────────
export const exportParentsQuerySchema = z.object({
  format: z.enum(['csv', 'xlsx', 'pdf', 'json']).default('csv'),
  dateRange: z.enum(['all', 'this_month', 'last_month', 'this_year', 'last_quarter']).default('all'),
  engagement: EngagementLevel.optional(),
  fields: z.array(z.string()).optional(),
  emailDelivery: z.boolean().default(false),
});

// ─── Send Message to Parent ────────────────────────────────────
export const sendMessageSchema = z.object({
  subject: z.string().max(200).optional(),
  body: z.string().min(1).max(5000),
  type: z.string().optional(),
});
=======
export const updateVisibilitySchema = z.object({
  visibility: z.enum(['PUBLIC', 'MINIMAL', 'HIDDEN']),
});

// ─── Notification Preferences ─────────────────────────────────────────────────

export const updateNotificationsSchema = z.object({
  pushEnabled: z.boolean().optional(),
  smsEnabled: z.boolean().optional(),
  emailEnabled: z.boolean().optional(),
  onScan: z.boolean().optional(),
  onAttendance: z.boolean().optional(),
  onEmergency: z.boolean().optional(),
  onAnnouncement: z.boolean().optional(),
});

// ─── Device Token ─────────────────────────────────────────────────────────────

export const registerDeviceTokenSchema = z.object({
  token: z.string().min(10, 'Token is required'),
  platform: z.enum(['IOS', 'ANDROID', 'WEB']),
  deviceName: z.string().max(100).optional(),
  deviceModel: z.string().max(100).optional(),
  osVersion: z.string().max(50).optional(),
});

// ─── Link Card (Add Child) ───────────────────────────────────────────────────

export const linkCardSchema = z.object({
  cardNumber: z
    .string()
    .trim()
    .min(5)
    .max(20)
    .transform((v) => v.toUpperCase().replace(/[^A-Z0-9-]/g, '')),
});

// ─── Set Active Student ──────────────────────────────────────────────────────

export const setActiveStudentSchema = z.object({
  studentId: cuid,
});

// ─── Photo Upload ────────────────────────────────────────────────────────────

export const generateUploadUrlSchema = z.object({
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  fileSize: z
    .number()
    .int()
    .positive()
    .max(5 * 1024 * 1024, 'Max 5MB'),
});

export const confirmUploadSchema = z.object({
  key: z.string().min(10),
  nonce: z.string().min(10),
});
>>>>>>> f769c34b07b38ef93f84fb7ec946cdc6fdb91efd
