// TODO: Add implementation
// =============================================================================
// scanAnomaly.validation.js — RESQID
// Zod validation schemas for scan anomaly endpoints.
// =============================================================================

import { z } from 'zod';
import { ANOMALY_TYPE, ANOMALY_SEVERITY } from './scanAnomaly.service.js';

// ─── Shared Enums ─────────────────────────────────────────────────────────────

const anomalyTypeEnum     = z.enum(Object.values(ANOMALY_TYPE));
const anomalySeverityEnum = z.enum(Object.values(ANOMALY_SEVERITY));
const anomalyStatusEnum   = z.enum(['OPEN', 'RESOLVED', 'IGNORED']);

// ─── List Query ───────────────────────────────────────────────────────────────

/**
 * GET /school-admin/scan-anomalies
 * All filters are optional — returns all anomalies when none supplied.
 */
export const listAnomaliesSchema = z.object({
  query: z.object({
    status:    anomalyStatusEnum.optional(),
    severity:  anomalySeverityEnum.optional(),
    type:      anomalyTypeEnum.optional(),
    studentId: z.string().cuid().optional(),
    cardId:    z.string().cuid().optional(),
    from:      z.string().datetime({ offset: true }).optional(),
    to:        z.string().datetime({ offset: true }).optional(),
    page:      z.coerce.number().int().positive().default(1),
    limit:     z.coerce.number().int().positive().max(100).default(20),
  }),
});

// ─── ID Param ─────────────────────────────────────────────────────────────────

export const anomalyIdSchema = z.object({
  params: z.object({
    id: z.string().cuid({ message: 'Invalid anomaly ID' }),
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
  }),
});

// ─── Resolve Body ─────────────────────────────────────────────────────────────

export const resolveSchema = z.object({
  params: z.object({
    id: z.string().cuid({ message: 'Invalid anomaly ID' }),
  }),
  body: z.object({
    resolution: z
      .string()
      .min(5,  { message: 'Resolution note must be at least 5 characters' })
      .max(500, { message: 'Resolution note must not exceed 500 characters' }),
  }),
});

// ─── Ignore Body ──────────────────────────────────────────────────────────────

export const ignoreSchema = z.object({
  params: z.object({
    id: z.string().cuid({ message: 'Invalid anomaly ID' }),
  }),
  body: z.object({
    resolution: z
      .string()
      .max(500, { message: 'Note must not exceed 500 characters' })
      .optional(),
  }),
});

// ─── Resolve All (student bulk) ───────────────────────────────────────────────

export const resolveAllSchema = z.object({
  params: z.object({
    studentId: z.string().cuid({ message: 'Invalid student ID' }),
  }),
  body: z.object({
    resolution: z
      .string()
      .min(5,  { message: 'Resolution note must be at least 5 characters' })
      .max(500, { message: 'Resolution note must not exceed 500 characters' }),
  }),
});

// ─── Internal: Detect Anomaly ─────────────────────────────────────────────────
// Used by the scan pipeline — not an HTTP endpoint, but validated at entry.

export const detectAnomalySchema = z.object({
  schoolId:    z.string().cuid(),
  studentId:   z.string().cuid(),
  cardId:      z.string().cuid(),
  scanLogId:   z.string().cuid().optional(),
  type:        anomalyTypeEnum,
  severity:    anomalySeverityEnum.optional(),
  description: z.string().max(500).optional(),
  metadata:    z.record(z.unknown()).optional(),
  detectedAt:  z.date().optional(),
});