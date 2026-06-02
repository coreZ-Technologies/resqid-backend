/**
 * Timetable validation schemas.
 */

import { z } from 'zod';

// ─── Generate Schema ──────────────────────────────────────────────────────────

export const generateSchema = z.object({
  templateId: z.string().min(1, 'templateId is required'),
  opts: z
    .object({
      timeoutMs: z.number().int().min(5000).max(300000).optional().default(60000),
      mode: z.enum(['full', 'class-by-class', 'incremental']).optional().default('class-by-class'),
      savePartial: z.boolean().optional().default(true),
    })
    .optional()
    .default({}),
});

// ─── Validate Schema ──────────────────────────────────────────────────────────

export const validateTimetableSchema = z.object({
  timetableId: z.string().min(1, 'timetableId is required'),
});

// ─── Upload Existing Schema ───────────────────────────────────────────────────

export const uploadTimetableSchema = z.object({
  templateId: z.string().min(1, 'templateId is required'),
  assignments: z
    .array(
      z.object({
        day: z.number().int().min(1).max(7),
        period: z.number().int().min(1).max(12),
        classId: z.string().min(1),
        subjectId: z.string().min(1),
        teacherId: z.string().min(1),
        roomId: z.string().nullable().optional(),
        periodType: z.string().optional().default('REGULAR'),
        notes: z.string().max(200).optional(),
      })
    )
    .min(1, 'assignments must have at least 1 slot'),
});

// ─── Params Schemas ───────────────────────────────────────────────────────────

export const timetableIdParamsSchema = z.object({
  id: z.string().min(1, 'Timetable ID is required'),
});

export const jobIdParamsSchema = z.object({
  jobId: z.string().min(1, 'Job ID is required'),
});

export const templateIdParamsSchema = z.object({
  templateId: z.string().min(1, 'Template ID is required'),
});

// ─── List Query Schema ────────────────────────────────────────────────────────

export const timetableListQuerySchema = z.object({
  status: z
    .enum(['DRAFT', 'GENERATING', 'GENERATED', 'PUBLISHED', 'ARCHIVED', 'FAILED'])
    .optional(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

// ─── Status Update Schema ─────────────────────────────────────────────────────

export const updateTimetableStatusSchema = z.object({
  status: z.enum(['PUBLISHED', 'ARCHIVED', 'DRAFT']),
});
