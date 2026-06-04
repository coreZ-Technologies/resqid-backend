// school-admin/sessions/sessions.validation.js
import { z } from 'zod';

export const createSessionSchema = z.object({
  name: z.string().min(1).max(100),
  academicYear: z.string().min(1).max(20),
  term: z.string().max(50).optional(),
  startDate: z.string().datetime({ offset: true }),
  endDate: z.string().datetime({ offset: true }),
  isCurrent: z.boolean().default(false),
  isActive: z.boolean().default(true),
}).refine(data => new Date(data.startDate) < new Date(data.endDate), {
  message: 'Start date must be before end date',
  path: ['startDate'],
});

export const updateSessionSchema = createSessionSchema.partial();

export const listSessionsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(15),
  search: z.string().optional(),
  isActive: z.enum(['true', 'false']).optional(),
  isCurrent: z.enum(['true', 'false']).optional(),
  academicYear: z.string().optional(),
  term: z.string().optional(),
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
});