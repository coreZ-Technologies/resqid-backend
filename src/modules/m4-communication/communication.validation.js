// =============================================================================
// modules/m4-communication/communication.validation.js — RESQID
// Zod schemas for communication endpoints.
// =============================================================================

import { z } from 'zod';

const cuid = z.string().min(1, 'Invalid ID format');

// ─── Announcement ─────────────────────────────────────────────────────────────

export const createAnnouncementSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  body: z.string().min(1, 'Body is required').max(5000),
  target: z
    .enum(['ALL', 'GRADE', 'SECTION', 'STUDENT', 'PARENT', 'STAFF', 'CUSTOM'])
    .default('ALL'),
  targetGrades: z.array(z.string()).optional().default([]),
  targetSections: z.array(z.string()).optional().default([]),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
});

// ─── Direct Message ───────────────────────────────────────────────────────────

export const sendMessageSchema = z.object({
  parentId: cuid,
  studentId: cuid.optional(),
  subject: z.string().max(200).optional(),
  body: z.string().min(1, 'Message body is required').max(2000),
  type: z
    .enum([
      'GENERAL',
      'ATTENDANCE',
      'FEE_REMINDER',
      'EVENT_INVITATION',
      'REPORT_CARD',
      'EMERGENCY',
      'ABSENT_NOTIFICATION',
      'HOMEWORK',
      'EXAM_SCHEDULE',
      'PAYMENT_RECEIPT',
      'TIMETABLE_CHANGE',
      'SUBSTITUTION_ALERT',
      'CRISIS_ALERT',
    ])
    .default('GENERAL'),
});

// ─── Message Template ─────────────────────────────────────────────────────────

export const createTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required').max(200),
  type: z
    .enum([
      'GENERAL',
      'ATTENDANCE',
      'FEE_REMINDER',
      'EVENT_INVITATION',
      'REPORT_CARD',
      'EMERGENCY',
      'ABSENT_NOTIFICATION',
      'HOMEWORK',
      'EXAM_SCHEDULE',
      'PAYMENT_RECEIPT',
    ])
    .default('GENERAL'),
  subject: z.string().min(1, 'Subject is required').max(200),
  body: z.string().min(1, 'Body is required').max(5000),
  variables: z.array(z.string()).optional().default([]),
});

// ─── Campaign ─────────────────────────────────────────────────────────────────

export const createCampaignSchema = z.object({
  name: z.string().min(1, 'Campaign name is required').max(200),
  description: z.string().max(1000).optional(),
  type: z
    .enum([
      'GENERAL',
      'ATTENDANCE',
      'FEE_REMINDER',
      'EVENT_INVITATION',
      'EMERGENCY',
      'EXAM_SCHEDULE',
    ])
    .default('GENERAL'),
  subject: z.string().min(1, 'Subject is required').max(200),
  body: z.string().min(1, 'Body is required').max(5000),
  target: z.enum(['ALL', 'GRADE', 'SECTION', 'PARENT', 'STAFF', 'CUSTOM']).default('ALL'),
  targetGrades: z.array(z.string()).optional().default([]),
  targetSections: z.array(z.string()).optional().default([]),
});
