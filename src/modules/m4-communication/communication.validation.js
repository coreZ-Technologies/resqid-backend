// =============================================================================
// modules/m4-communication/communication.validation.js — RESQID
// Zod schemas for communication endpoints.
// =============================================================================

import { z } from 'zod';

const cuid = z.string().min(1, 'Invalid ID format');

// ─── Announcement ─────────────────────────────────────────────────────────────

export const createAnnouncementSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Title is required').max(200),
    body: z.string().min(1, 'Body is required').max(2000),
    targetAll: z.boolean().default(true),
    targetGrades: z.array(z.string()).default([]),
    channels: z.array(z.enum(['PUSH', 'SMS', 'EMAIL'])).min(1, 'At least one channel required'),
  }),
});

export const listAnnouncementsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  }),
});

export const getAnnouncementSchema = z.object({
  params: z.object({ id: cuid }),
});

// ─── Direct Message ───────────────────────────────────────────────────────────

export const sendMessageSchema = z.object({
  body: z.object({
    parentId: cuid,
    studentId: cuid,
    body: z.string().min(1, 'Message body is required').max(1000),
  }),
});

export const listMessagesSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    studentId: cuid.optional(),
  }),
});
