// school-admin/scanAnomaly/scanAnomaly.validation.js
import { z } from 'zod';

export const listAnomaliesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(['open', 'investigating', 'resolved']).optional(),
  severity: z.enum(['high', 'medium', 'low']).optional(),
  search: z.string().optional(),
});

export const updateAnomalyStatusSchema = z.object({
  status: z.enum(['open', 'investigating', 'resolved']),
  resolution: z.string().optional(),
});

export const exportAnomaliesQuerySchema = z.object({
  format: z.enum(['csv', 'json']).default('csv'),
  status: z.enum(['open', 'investigating', 'resolved']).optional(),
  severity: z.enum(['high', 'medium', 'low']).optional(),
  search: z.string().optional(),
  emailDelivery: z.boolean().default(false),
});