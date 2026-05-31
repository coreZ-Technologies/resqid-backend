// =============================================================================
// modules/scan/scan.validation.js — RESQID
// Scan Log Validation Schemas
// =============================================================================

import { z } from 'zod';

// ─── Enums ────────────────────────────────────────────────────────────────────

const SCAN_RESULTS = [
  'ALL',
  'SUCCESS',
  'INVALID',
  'UNREGISTERED',
  'ISSUED',
  'INACTIVE',
  'REVOKED',
  'ACTIVE',
  'BLOCKED',
  'SUSPICIOUS',
  'EXPIRED',
  'ERROR',
];

const SCAN_TYPES = ['QR', 'RFID', 'NFC', 'MANUAL'];

const SCAN_PURPOSES = ['EMERGENCY', 'REGISTRATION', 'ATTENDANCE', 'VERIFICATION', 'UNKNOWN'];

const PERIODS = [
  'TODAY',
  'YESTERDAY',
  'LAST_7_DAYS',
  'LAST_30_DAYS',
  'THIS_MONTH',
  'LAST_MONTH',
  'CUSTOM',
];

// ─── Schemas ──────────────────────────────────────────────────────────────────

/**
 * Query Scan Logs Schema
 */
export const queryScansSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(15),

  // Filters
  search: z.string().optional(),
  result: z.enum(SCAN_RESULTS).optional(),
  scanType: z.enum(SCAN_TYPES).optional(),
  scanPurpose: z.enum(SCAN_PURPOSES).optional(),

  // Scanner filter
  scannerId: z.string().optional(),
  scannerName: z.string().optional(),

  // Student filter
  studentId: z.string().optional(),

  // Token filter
  tokenId: z.string().optional(),

  // Location filter
  city: z.string().optional(),
  country: z.string().optional(),

  // Security filter
  isSuspicious: z.coerce.boolean().optional(),
  isBot: z.coerce.boolean().optional(),

  // Date range
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  period: z.enum(PERIODS).optional(),

  // Response time filter
  minResponseTime: z.coerce.number().int().optional(),
  maxResponseTime: z.coerce.number().int().optional(),

  // Sorting
  sortBy: z
    .enum([
      'scannedAt',
      'createdAt',
      'result',
      'responseTimeMs',
      'studentName',
      'city',
      'riskScore',
    ])
    .default('scannedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * Scan Log ID Schema
 */
export const scanIdSchema = z.object({
  scanId: z.string().min(1, 'Scan ID is required'),
});

/**
 * Token ID Schema (for getting scans by token)
 */
export const tokenIdParamSchema = z.object({
  tokenId: z.string().min(1, 'Token ID is required'),
});

/**
 * Create Scan Log Schema
 */
export const createScanLogSchema = z.object({
  tokenId: z.string().min(1, 'Token ID is required'),
  schoolId: z.string().min(1, 'School ID is required'),

  // Scan Details
  result: z.enum(SCAN_RESULTS.filter((r) => r !== 'ALL')),
  scanType: z.enum(SCAN_TYPES).default('QR'),
  scanPurpose: z.enum(SCAN_PURPOSES).default('UNKNOWN'),

  // Scanner Info
  scannerId: z.string().optional(),
  scannerName: z.string().optional(),

  // Location
  ipAddress: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),

  // Device
  device: z.string().optional(),
  deviceModel: z.string().optional(),
  os: z.string().optional(),
  browser: z.string().optional(),
  userAgent: z.string().optional(),

  // Security
  isBot: z.boolean().default(false),
  isSuspicious: z.boolean().default(false),
  riskScore: z.number().min(0).max(100).optional(),

  // Performance
  responseTimeMs: z.number().int().min(0).optional(),

  // Student Snapshot (at time of scan)
  studentName: z.string().optional(),
  studentClass: z.string().optional(),
  studentSection: z.string().optional(),

  // Emergency data shown
  emergencyDataShown: z.boolean().default(false),

  // Metadata
  metadata: z.record(z.any()).optional(),
});

/**
 * Scan Statistics Schema
 */
export const scanStatsSchema = z.object({
  period: z.enum(PERIODS).default('TODAY'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  scannerId: z.string().optional(),
  tokenId: z.string().optional(),
});

/**
 * Bulk Delete Scans Schema
 */
export const bulkDeleteScansSchema = z.object({
  scanIds: z.array(z.string()).min(1).max(100),
  beforeDate: z.string().datetime().optional(), // Delete scans before this date
});

// ─── Exports ──────────────────────────────────────────────────────────────────

export const scanValidation = {
  queryScans: queryScansSchema,
  scanId: scanIdSchema,
  tokenIdParam: tokenIdParamSchema,
  createScanLog: createScanLogSchema,
  scanStats: scanStatsSchema,
  bulkDelete: bulkDeleteScansSchema,
};

export default scanValidation;
