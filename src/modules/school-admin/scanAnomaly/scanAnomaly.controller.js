// TODO: Add implementation
// =============================================================================
// scanAnomaly.controller.js — RESQID
//
// HTTP layer only — no business logic here.
// Delegates everything to scanAnomaly.service.js.
// =============================================================================

import { ApiResponse } from '#shared/response/ApiResponse.js';
import { asyncHandler } from '#shared/response/asyncHandler.js';
import { requireSchoolId } from '#middleware/tenantScope.middleware.js';
import * as service from './scanAnomaly.service.js';

// ─── List & Detail ────────────────────────────────────────────────────────────

/**
 * GET /school-admin/scan-anomalies
 * List anomalies for the authenticated school admin's school.
 *
 * Query params: status, severity, type, studentId, cardId, from, to, page, limit
 */
export const listAnomalies = asyncHandler(async (req, res) => {
  const schoolId = requireSchoolId(req);

  const result = await service.listAnomalies({ schoolId, query: req.query });

  return ApiResponse.paginated(res, result.data, result.meta.pagination, 'Anomalies retrieved');
});

/**
 * GET /school-admin/scan-anomalies/:id
 * Full detail for a single anomaly.
 */
export const getAnomaly = asyncHandler(async (req, res) => {
  const schoolId = requireSchoolId(req);
  const { id }   = req.params;

  const anomaly = await service.getAnomaly(id, schoolId);

  return ApiResponse.ok(res, anomaly, 'Anomaly retrieved');
});

// ─── Stats ────────────────────────────────────────────────────────────────────

/**
 * GET /school-admin/scan-anomalies/stats
 * Summary stats and trend data for the school dashboard.
 *
 * Query params: days (default 7, max 30)
 */
export const getStats = asyncHandler(async (req, res) => {
  const schoolId = requireSchoolId(req);

  const stats = await service.getSchoolStats({ schoolId, query: req.query });

  return ApiResponse.ok(res, stats, 'Anomaly stats retrieved');
});

/**
 * GET /super-admin/scan-anomalies/stats
 * Platform-wide anomaly stats for super admin.
 */
export const getGlobalStats = asyncHandler(async (req, res) => {
  const stats = await service.getGlobalStats();

  return ApiResponse.ok(res, stats, 'Global anomaly stats retrieved');
});

// ─── Resolution ───────────────────────────────────────────────────────────────

/**
 * PATCH /school-admin/scan-anomalies/:id/resolve
 * Resolve an anomaly — requires a resolution note.
 */
export const resolveAnomaly = asyncHandler(async (req, res) => {
  const schoolId   = requireSchoolId(req);
  const { id }     = req.params;
  const resolvedBy = req.user.id;
  const { resolution } = req.body;

  const result = await service.resolveAnomaly(id, schoolId, { resolvedBy, resolution });

  return ApiResponse.ok(res, result, 'Anomaly resolved');
});

/**
 * PATCH /school-admin/scan-anomalies/:id/ignore
 * Mark anomaly as a false positive.
 */
export const ignoreAnomaly = asyncHandler(async (req, res) => {
  const schoolId   = requireSchoolId(req);
  const { id }     = req.params;
  const resolvedBy = req.user.id;
  const { resolution } = req.body;

  const result = await service.ignoreAnomaly(id, schoolId, { resolvedBy, resolution });

  return ApiResponse.ok(res, result, 'Anomaly ignored');
});

/**
 * PATCH /school-admin/scan-anomalies/student/:studentId/resolve-all
 * Bulk-resolve all open anomalies for a student.
 */
export const resolveAllForStudent = asyncHandler(async (req, res) => {
  const schoolId        = requireSchoolId(req);
  const { studentId }   = req.params;
  const resolvedBy      = req.user.id;
  const { resolution }  = req.body;

  const result = await service.resolveAllForStudent(studentId, schoolId, {
    resolvedBy,
    resolution,
  });

  return ApiResponse.ok(res, result, `Resolved ${result.resolved} anomalies for student`);
});