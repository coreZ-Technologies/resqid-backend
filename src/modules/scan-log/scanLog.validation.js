<<<<<<< HEAD
// src/modules/scan-log/scanLog.validation.js
=======
// =============================================================================
// modules/scan-log/scanLog.validation.js — RESQID
// =============================================================================

>>>>>>> 29c3ec21ee207f590fb533e851f49fc2e7b35588
import { z } from 'zod';
import { SCAN_RESULTS } from './scanLog.constants.js';

<<<<<<< HEAD
// If SCAN_RESULTS is not defined, fallback to default array (optional)
const validScanResults = SCAN_RESULTS || ['SUCCESS', 'INVALID', 'REVOKED', 'EXPIRED', 'RATE_LIMITED', 'ERROR'];

export const listScanLogsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(15),
  result: z.enum(['ALL', ...validScanResults]).default('ALL'),
  search: z.string().optional(),
  startDate: z.string().date().optional(),        // ✅ changed from datetime() to date()
  endDate: z.string().date().optional(),          // ✅ changed from datetime() to date()
});

export const exportScanLogsQuerySchema = z.object({
  format: z.enum(['csv', 'json', 'xlsx']).default('csv'),
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
  result: z.enum(['ALL', ...validScanResults]).default('ALL'),
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
>>>>>>> 29c3ec21ee207f590fb533e851f49fc2e7b35588
