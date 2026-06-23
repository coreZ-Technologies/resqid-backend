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
  preferences: z
    .object({
      notifyAttendance: z.boolean().default(true),
      notifyAbsent: z.boolean().default(true),
      notifyLate: z.boolean().default(false),
      notifyEmergency: z.boolean().default(true),
      weeklyReport: z.boolean().default(false),
      notifChannel: NotificationChannel.default('PUSH'),
    })
    .optional(),
  studentIds: z.array(z.string()).optional(),
});

// ─── Update Parent ──────────────────────────────────────────────
export const updateParentSchema = createParentSchema.partial();

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
  dateRange: z
    .enum(['all', 'this_month', 'last_month', 'this_year', 'last_quarter'])
    .default('all'),
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
