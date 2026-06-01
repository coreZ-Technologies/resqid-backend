// =============================================================================
// modules/qr/qr.validation.js — RESQID
// QR Management Validation Schemas
// =============================================================================

import { z } from 'zod';

// ─── Enums ────────────────────────────────────────────────────────────────────

const QR_FORMATS = ['PNG', 'SVG', 'PDF'];
const TOKEN_STATUSES = [
  'UNREGISTERED',
  'ISSUED',
  'ACTIVE',
  'INACTIVE',
  'REVOKED',
  'LOST',
  'EXPIRED',
];
const ERROR_CORRECTION_LEVELS = ['L', 'M', 'Q', 'H'];
const QR_SIZES = [256, 512, 1024, 2048];

// ─── Schemas ──────────────────────────────────────────────────────────────────

/**
 * Generate QR Code Schema
 */
export const generateQrSchema = z.object({
  format: z
    .enum(QR_FORMATS, {
      errorMap: () => ({ message: 'Format must be PNG, SVG, or PDF' }),
    })
    .default('PNG'),

  width: z
    .number()
    .int()
    .refine((val) => QR_SIZES.includes(val), {
      message: 'Size must be 256, 512, 1024, or 2048',
    })
    .default(512),

  height: z
    .number()
    .int()
    .refine((val) => QR_SIZES.includes(val), {
      message: 'Size must be 256, 512, 1024, or 2048',
    })
    .default(512),

  // QR Customization (Optional)
  foregroundColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color')
    .default('#000000'),

  backgroundColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color')
    .default('#FFFFFF'),

  logoUrl: z.string().url().optional(),

  errorCorrection: z
    .enum(ERROR_CORRECTION_LEVELS, {
      errorMap: () => ({ message: 'Error correction must be L, M, Q, or H' }),
    })
    .default('M'),

  includeStudentName: z.boolean().default(false),
  includeStudentClass: z.boolean().default(false),
  includeSchoolName: z.boolean().default(false),
});

/**
 * Regenerate QR Code Schema
 */
export const regenerateQrSchema = generateQrSchema.partial();

/**
 * Bulk Generate QR Schema
 */
export const bulkGenerateQrSchema = z.object({
  tokenIds: z
    .array(z.string())
    .min(1, 'At least one token ID is required')
    .max(500, 'Maximum 500 tokens per batch'),

  format: z.enum(QR_FORMATS).default('PNG'),
  width: z.number().int().default(512),
  height: z.number().int().default(512),
  errorCorrection: z.enum(ERROR_CORRECTION_LEVELS).default('M'),

  batchName: z.string().optional(),
});

/**
 * Query Tokens Schema (For listing/filtering)
 */
export const queryTokensSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),

  search: z.string().optional(),
  status: z.enum(TOKEN_STATUSES).optional(),
  type: z.enum(['RFID', 'QR', 'NFC', 'COMBO']).optional(),

  hasQr: z.coerce.boolean().optional(), // Filter tokens with/without QR
  isAssigned: z.coerce.boolean().optional(), // Assigned to student or not

  class: z.string().optional(),
  section: z.string().optional(),

  sortBy: z.enum(['createdAt', 'updatedAt', 'qrGeneratedAt', 'status']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),

  batchId: z.string().optional(),
});

/**
 * Token ID Param Schema
 */
export const tokenIdSchema = z.object({
  tokenId: z.string().min(1, 'Token ID is required'),
});

/**
 * Assign Token to Student Schema
 */
export const assignTokenSchema = z.object({
  studentId: z.string().min(1, 'Student ID is required'),
  type: z.enum(['RFID', 'QR', 'NFC', 'COMBO']).default('QR'),
  rfidUid: z.string().optional(),
  label: z.string().optional(),
});

/**
 * Update Token Status Schema
 */
export const updateTokenStatusSchema = z.object({
  status: z.enum(TOKEN_STATUSES, {
    errorMap: () => ({ message: 'Invalid token status' }),
  }),
  reason: z.string().max(500).optional(),
});

/**
 * Download QR Schema
 */
export const downloadQrSchema = z.object({
  format: z.enum(QR_FORMATS).default('PNG'),
});

// ─── Exports ──────────────────────────────────────────────────────────────────

export const qrValidation = {
  generateQr: generateQrSchema,
  regenerateQr: regenerateQrSchema,
  bulkGenerateQr: bulkGenerateQrSchema,
  queryTokens: queryTokensSchema,
  tokenId: tokenIdSchema,
  assignToken: assignTokenSchema,
  updateTokenStatus: updateTokenStatusSchema,
  downloadQr: downloadQrSchema,
};

export default qrValidation;
