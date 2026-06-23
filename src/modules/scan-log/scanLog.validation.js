<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> c52277545acdf32472792738285dea3300df0ace
// =============================================================================
// modules/scan-log/scanLog.validation.js — RESQID
// =============================================================================

<<<<<<< HEAD
=======
// src/modules/scan-log/scanLog.validation.js
>>>>>>> 8077b3074a48cb1da7a7cf9128d6f67564a49aa0
import { z } from 'zod';
import { SCAN_RESULTS } from './scanLog.constants.js';

<<<<<<< HEAD
=======
import { z } from 'zod';
import { SCAN_RESULTS } from './scanLog.constants.js';

>>>>>>> c52277545acdf32472792738285dea3300df0ace
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
<<<<<<< HEAD
=======
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
>>>>>>> 8077b3074a48cb1da7a7cf9128d6f67564a49aa0
=======
>>>>>>> c52277545acdf32472792738285dea3300df0ace
