/**
 * Report validation schemas.
 */

import { z } from 'zod';

export const timetableIdParamsSchema = z.object({
  timetableId: z.string().min(1, 'timetableId is required'),
});

export const reportQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
  teacherId: z.string().optional(),
  classId: z.string().optional(),
  roomId: z.string().optional(),
  day: z.coerce.number().int().min(1).max(7).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  format: z.enum(['json', 'pdf', 'csv', 'excel']).optional().default('json'),
});

export const improvementQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  severity: z.enum(['ERROR', 'WARNING', 'SUGGESTION']).optional(),
  category: z.string().optional(),
});
