// school-admin/scanLogs/scanLog.validation.js
import { z } from 'zod';

// Result values from ScanResult enum (frontend mock uses uppercase strings)
export const listScanLogsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(15),
  result: z.enum(['SUCCESS', 'INVALID', 'REVOKED', 'EXPIRED', 'RATE_LIMITED', 'ERROR']).optional(),
  search: z.string().optional(),
});

// No validation needed for stats endpoint