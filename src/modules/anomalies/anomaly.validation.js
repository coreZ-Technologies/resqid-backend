// src/modules/anomalies/anomaly.validation.js
import { z } from 'zod';

const cuid = z.string().min(1, 'Invalid ID format');

export const anomalyIdParamsSchema = z.object({
  id: cuid,
});

export const updateStatusSchema = z.object({
  status: z.enum(['open', 'investigating', 'resolved']),
});

export const anomalyQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  status: z.enum(['open', 'investigating', 'resolved']).optional(),
  severity: z.enum(['high', 'medium', 'low']).optional(),
  search: z.string().max(200).optional(),
  sortBy: z.enum(['time', 'severity']).optional().default('time'),
});
