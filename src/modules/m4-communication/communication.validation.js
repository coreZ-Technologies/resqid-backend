// src/modules/communication/communication.validation.js
import { z } from 'zod';
import {
  ANNOUNCEMENT_CATEGORIES,
  ANNOUNCEMENT_AUDIENCES,
  ANNOUNCEMENT_STATUS,
  DELIVERY_CHANNELS,
  DELIVERY_STATUS,
  DELIVERY_TYPES,
} from './communication.constants.js';

// ─── Announcement ───────────────────────────────────────────
export const createAnnouncementSchema = z.object({
  title: z.string().min(1).max(100),
  body: z.string().min(1).max(2000),
  category: z.enum(ANNOUNCEMENT_CATEGORIES).default('General'),
  audience: z.enum(ANNOUNCEMENT_AUDIENCES).default('All Students'),
  specificClass: z.string().optional(),
  status: z.enum(ANNOUNCEMENT_STATUS).default('Draft'),
  pinned: z.boolean().default(false),
  scheduledFor: z.string().datetime().optional(),
});

export const updateAnnouncementSchema = createAnnouncementSchema.partial();

export const listAnnouncementsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(12),
  search: z.string().optional(),
  category: z.enum(ANNOUNCEMENT_CATEGORIES).optional(),
  status: z.enum(ANNOUNCEMENT_STATUS).optional(),
  audience: z.enum(ANNOUNCEMENT_AUDIENCES).optional(),
});

export const scheduleAnnouncementSchema = z.object({
  scheduledFor: z.string().datetime(),
});

// ─── Delivery Log ──────────────────────────────────────────
export const listDeliveryLogsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(15),
  channel: z.enum(DELIVERY_CHANNELS).optional(),
  status: z.enum(DELIVERY_STATUS).optional(),
  type: z.enum(DELIVERY_TYPES).optional(),
  search: z.string().optional(),
});

// ─── Messages ───────────────────────────────────────────────
export const createThreadSchema = z.object({
  parentId: z.string().min(1),
  studentName: z.string().optional(),
  studentClass: z.string().optional(),
});

export const sendMessageSchema = z.object({
  threadId: z.string().optional(),
  parentId: z.string().optional(),
  text: z.string().min(1).max(2000),
  attachments: z.array(z.string().url()).optional(),
}).refine(data => data.threadId || data.parentId, {
  message: 'Either threadId or parentId is required',
});

export const listThreadsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  search: z.string().optional(),
});

// ─── Stats & Unread ────────────────────────────────────────
export const unreadCountQuerySchema = z.object({}).optional();