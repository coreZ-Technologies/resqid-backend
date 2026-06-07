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
// =============================================================================

import { z } from 'zod';

const cuid = z.string().min(1, 'Invalid ID format');
const phoneRegex = /^[6-9]\d{9}$/;

// ─── Create Parent ───────────────────────────────────────────────────────────

<<<<<<< HEAD
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
=======
export const createParentSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  phone: z.string().regex(phoneRegex, 'Invalid Indian phone number'),
  email: z.string().email().max(254).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  pincode: z.string().max(10).optional().nullable(),
  occupation: z.string().max(200).optional().nullable(),
  photoUrl: z.string().url().optional().nullable(),
  canCall: z.boolean().default(true),
  canWhatsapp: z.boolean().default(true),
  canEmail: z.boolean().default(true),
  canSMS: z.boolean().default(true),
  childIds: z.array(z.string()).optional().default([]), // Student IDs to link
});

// ─── Update Parent (School Admin) ────────────────────────────────────────────

export const updateParentSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  email: z.string().email().max(254).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  pincode: z.string().max(10).optional().nullable(),
  occupation: z.string().max(200).optional().nullable(),
  canCall: z.boolean().optional(),
  canWhatsapp: z.boolean().optional(),
  canEmail: z.boolean().optional(),
  canSMS: z.boolean().optional(),
  isActive: z.boolean().optional(),
>>>>>>> 29c3ec21ee207f590fb533e851f49fc2e7b35588
});

// ─── Update Own Profile (Parent self) ────────────────────────────────────────

export const updateOwnProfileSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  email: z.string().email().max(254).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  pincode: z.string().max(10).optional().nullable(),
  occupation: z.string().max(200).optional().nullable(),
  photoUrl: z.string().url().optional().nullable(),
  canCall: z.boolean().optional(),
  canWhatsapp: z.boolean().optional(),
  canEmail: z.boolean().optional(),
  canSMS: z.boolean().optional(),
});

// ─── List Query ───────────────────────────────────────────────────────────────

export const parentListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  sortBy: z.enum(['name', 'phone', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ─── Params ───────────────────────────────────────────────────────────────────

export const parentIdParamsSchema = z.object({ id: cuid });

// ─── Export Query ─────────────────────────────────────────────────────────────

export const parentExportQuerySchema = z.object({
  grade: z.string().optional(),
  section: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  format: z.enum(['csv', 'xlsx']).default('csv'),
});
>>>>>>> f769c34b07b38ef93f84fb7ec946cdc6fdb91efd
