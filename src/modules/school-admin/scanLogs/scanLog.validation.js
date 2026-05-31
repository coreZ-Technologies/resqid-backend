// TODO: Add implementation
// =============================================================================
// scanLog.validation.js — RESQID
// Zod validation schemas for scan log endpoints.
// =============================================================================

import { z } from 'zod';

// ─── Shared Enums ─────────────────────────────────────────────────────────────

export const SCAN_OUTCOME = Object.freeze({
  SUCCESS:        'SUCCESS',
  CARD_NOT_FOUND: 'CARD_NOT_FOUND',
  CARD_INACTIVE:  'CARD_INACTIVE',
  CARD_REVOKED:   'CARD_REVOKED',
  CARD_EXPIRED:   'CARD_EXPIRED',
  RATE_LIMITED:   'RATE_LIMITED',
  BLOCKED:        'BLOCKED',
});

const scanOutcomeEnum = z.enum(Object.values(SCAN_OUTCOME));

// ─── List Query ───────────────────────────────────────────────────────────────

/**
 * GET /school-admin/scan-logs
 * All filters optional.
 */
export const listScanLogsSchema = z.object({
  query: z.object({
    outcome:   scanOutcomeEnum.optional(),
    studentId: z.string().cuid().optional(),
    cardId:    z.string().cuid().optional(),
    schoolId:  z.string().cuid().optional(), // super admin override
    from:      z.string().datetime({ offset: true }).optional(),
    to:        z.string().datetime({ offset: true }).optional(),
    page:      z.coerce.number().int().positive().default(1),
    limit:     z.coerce.number().int().positive().max(100).default(20),
  }),
});

// ─── ID Param ─────────────────────────────────────────────────────────────────

export const scanLogIdSchema = z.object({
  params: z.object({
    id: z.string().cuid({ message: 'Invalid scan log ID' }),
  }),
});

// ─── Student ID Param ─────────────────────────────────────────────────────────

export const studentIdParamSchema = z.object({
  params: z.object({
    studentId: z.string().cuid({ message: 'Invalid student ID' }),
  }),
});

// ─── Stats Query ──────────────────────────────────────────────────────────────

export const statsQuerySchema = z.object({
  query: z.object({
    days: z.coerce.number().int().positive().max(30).default(7),
    from: z.string().datetime({ offset: true }).optional(),
    to:   z.string().datetime({ offset: true }).optional(),
  }),
});

// ─── Internal: Record Scan ────────────────────────────────────────────────────
// Used by the emergency scan handler to create scan log entries.
// Not an HTTP endpoint — validated at service entry when called internally.

export const recordScanSchema = z.object({
  schoolId:     z.string().cuid(),
  studentId:    z.string().cuid().optional(),
  cardId:       z.string().cuid().optional(),
  outcome:      scanOutcomeEnum,
  scannerIp:    z.string().ip().optional(),
  scannerAgent: z.string().max(500).optional(),
  location:     z.string().max(200).optional(),
  metadata:     z.record(z.unknown()).optional(),
  scannedAt:    z.date().optional(),
});