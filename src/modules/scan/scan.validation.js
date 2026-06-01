// src/modules/scan/scan.validation.js
import { z } from 'zod';
import { SCAN_RESULTS, SCAN_PURPOSE, SCAN_TYPES } from './scan.constants.js';

// ===========================================================================
// EXISTING SCAN VALIDATION
// ===========================================================================

/**
 * Validate scan code from URL parameters
 */
export const scanCodeParamsSchema = z.object({
  code: z.string().min(1).max(255),
});

/**
 * Validate scan callback data (for webhook responses)
 */
export const scanCallbackSchema = z.object({
  token: z.string().optional(),
  result: z.string().optional(),
  timestamp: z.string().datetime().optional(),
});

// ===========================================================================
// SCAN LOGS VALIDATION
// ===========================================================================

/**
 * Validate query parameters for listing scan logs
 */
export const listScanLogsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(15),
  result: z.enum(['ALL', ...Object.values(SCAN_RESULTS)]).default('ALL'),
  search: z.string().max(100).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  sortBy: z.enum(['created_at', 'result', 'student_name']).default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * Validate query parameters for exporting scan logs
 */
export const exportScanLogsQuerySchema = z.object({
  format: z.enum(['csv', 'json', 'xlsx']).default('csv'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  result: z.enum(['ALL', ...Object.values(SCAN_RESULTS)]).default('ALL'),
  includeHeaders: z.coerce.boolean().default(true),
});

/**
 * Validate scan log ID parameter
 */
export const getScanLogParamsSchema = z.object({
  id: z.string().min(1),
});

// ===========================================================================
// STATISTICS VALIDATION
// ===========================================================================

/**
 * Validate query parameters for scan summary
 */
export const scanSummaryQuerySchema = z.object({
  period: z.enum(['day', 'week', 'month', 'year']).default('week'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

/**
 * Validate query parameters for daily scan stats
 */
export const dailyScanStatsQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).default(7),
});

/**
 * Validate query parameters for peak hours analysis
 */
export const peakHoursQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(30).default(7),
});

/**
 * Validate query parameters for recent scans
 */
export const recentScansQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

// ===========================================================================
// SCAN OPERATION VALIDATION
// ===========================================================================

/**
 * Validate scan code validation request
 */
export const validateScanCodeQuerySchema = z.object({
  code: z.string().min(1),
});

/**
 * Validate bulk scan creation
 */
export const bulkScanCreateSchema = z.object({
  scans: z.array(z.object({
    tokenId: z.string().optional(),
    studentId: z.string().optional(),
    schoolId: z.string().min(1),
    result: z.enum(Object.values(SCAN_RESULTS)),
    type: z.enum(Object.values(SCAN_TYPES)),
    deviceIp: z.string().ip().optional(),
    userAgent: z.string().optional(),
    metadata: z.record(z.any()).optional(),
  })).min(1).max(1000),
});

// ===========================================================================
// SCAN FILTER SCHEMA (reusable)
// ===========================================================================

/**
 * Reusable scan filter schema for various endpoints
 */
export const scanFilterSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  result: z.enum(Object.values(SCAN_RESULTS)).optional(),
  studentId: z.string().optional(),
  schoolId: z.string().optional(),
  tokenId: z.string().optional(),
}).partial();

// ===========================================================================
// HELPER FUNCTIONS FOR VALIDATION
// ===========================================================================

/**
 * Validate date range (startDate must be before endDate)
 */
export const validateDateRange = (startDate, endDate) => {
  if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
    throw new Error('startDate must be before endDate');
  }
  return true;
};

/**
 * Sanitize search string
 */
export const sanitizeSearch = (search) => {
  if (!search) return null;
  // Remove special characters that could cause injection
  return search.replace(/[^\w\s\-]/gi, '').trim();
};

/**
 * Parse and validate pagination params
 */
export const parsePagination = (query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 15));
  return { page, limit, skip: (page - 1) * limit };
};