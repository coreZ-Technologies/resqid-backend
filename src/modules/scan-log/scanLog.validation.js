// src/modules/scan-log/scanLog.validation.js
import { z } from 'zod';
import { SCAN_RESULTS } from './scanLog.constants.js';

export const listScanLogsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(15),
  result: z.enum(['ALL', ...SCAN_RESULTS]).default('ALL'),
  search: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const exportScanLogsQuerySchema = z.object({
  format: z.enum(['csv', 'json', 'xlsx']).default('csv'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  result: z.enum(['ALL', ...SCAN_RESULTS]).default('ALL'),
});

export const getScanLogParamsSchema = z.object({
  id: z.string().min(1),
});