// src/modules/scan-log/scanLog.validation.js
import { z } from 'zod';
import { SCAN_RESULTS } from './scanLog.constants.js';

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