<<<<<<< HEAD
// src/modules/scan-log/scanLog.validation.js
=======
// =============================================================================
// modules/scan-log/scanLog.validation.js — RESQID
// =============================================================================

>>>>>>> 2306bae69da370bc7bfb048c15cfd0f99e474bff
import { z } from 'zod';
import { SCAN_RESULTS } from './scanLog.constants.js';

<<<<<<< HEAD
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
=======
const cuid = z.string().min(1, 'Invalid ID format');

export const scanLogQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(15),
  search: z.string().optional(),
  result: z
    .enum(['ALL', 'SUCCESS', 'INVALID', 'REVOKED', 'EXPIRED', 'RATE_LIMITED', 'ERROR'])
    .optional()
    .default('ALL'),
  studentId: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  sortBy: z.enum(['scannedAt', 'result', 'responseTimeMs']).default('scannedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const scanLogIdParamsSchema = z.object({ id: cuid });

export const cleanupSchema = z.object({
  beforeDate: z.string().datetime('beforeDate must be ISO date'),
});
>>>>>>> 2306bae69da370bc7bfb048c15cfd0f99e474bff
