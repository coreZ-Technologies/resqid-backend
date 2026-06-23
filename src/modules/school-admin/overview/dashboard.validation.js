// school-admin/dashboard/dashboard.validation.js
import { z } from 'zod';

export const activityQuerySchema = z.object({
  type: z.enum(['all', 'check_in', 'late', 'absent']).optional().default('all'),
  limit: z.coerce.number().int().positive().max(50).default(10),
});

export const timetableQuerySchema = z.object({
  class: z.string().optional(),
  section: z.string().optional(),
});

// No validation needed for other endpoints (stats, class breakdown, weekly trend, low attendance, notifications, subscription)