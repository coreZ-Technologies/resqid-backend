// src/modules/activity-logs/activity-log.validation.js
import { z } from 'zod';

export const logQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  search: z.string().max(200).optional(),
  type: z
    .enum(['create', 'update', 'delete', 'export', 'login', 'logout', 'view', 'system'])
    .optional(),
  status: z.enum(['success', 'failed']).optional(),
  role: z.enum(['School Admin', 'Teacher', 'System']).optional(),
  fromDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  toDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});
