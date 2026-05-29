// TODO: Add implementation
// =============================================================================
// scanLog.controller.js — RESQID
//
// HTTP layer only — no business logic here.
// Delegates everything to scanLog.service.js.
// =============================================================================

import { ApiResponse }     from '#shared/response/ApiResponse.js';
import { asyncHandler }    from '#shared/response/asyncHandler.js';
import { getEffectiveSchoolId } from '#middleware/tenantScope.middleware.js';
import * as service        from './scanLog.service.js';

// ─── List & Detail ────────────────────────────────────────────────────────────

/**
 * GET /school-admin/scan-logs
 * List scan logs for the authenticated school admin's school.
 *
 * Query params: outcome, studentId, cardId, from, to, page, limit
 */
export const listScanLogs = asyncHandler(async (req, res) => {
  const schoolId = getEffectiveSchoolId(req);

  const result = await service.listScanLogs({
    user:     req.user,
    schoolId,
    query:    req.query,
  });

  return ApiResponse.paginated(res, result.data, result.meta, 'Scan logs retrieved');
});

/**
 * GET /school-admin/scan-logs/:id
 * Full detail for a single scan log record.
 */
export const getScanLog = asyncHandler(async (req, res) => {
  const schoolId = getEffectiveSchoolId(req);
  const { id }   = req.params;

  const log = await service.getScanLog(id, {
    user:     req.user,
    schoolId,
  });

  return ApiResponse.ok(res, log, 'Scan log retrieved');
});

// ─── Stats ────────────────────────────────────────────────────────────────────

/**
 * GET /school-admin/scan-logs/stats
 * Summary stats + trend data for the school admin dashboard.
 *
 * Query params: days (1–30, default 7), from, to
 */
export const getStats = asyncHandler(async (req, res) => {
  const schoolId = getEffectiveSchoolId(req);
  if (!schoolId) {
    return res.status(400).json({ message: 'School context required' });
  }

  const stats = await service.getSchoolStats({ schoolId, query: req.query });

  return ApiResponse.ok(res, stats, 'Scan log stats retrieved');
});

/**
 * GET /super-admin/scan-logs/stats
 * Platform-wide scan stats for super admin.
 */
export const getGlobalStats = asyncHandler(async (req, res) => {
  const stats = await service.getGlobalStats();
  return ApiResponse.ok(res, stats, 'Global scan stats retrieved');
});

// ─── Student History (shared — school staff + parent) ─────────────────────────

/**
 * GET /school-admin/scan-logs/student/:studentId
 * Recent scans for a specific student.
 * School staff see all outcomes; parents see SUCCESS only (enforced in service).
 */
export const getStudentScanHistory = asyncHandler(async (req, res) => {
  const schoolId         = getEffectiveSchoolId(req);
  const { studentId }    = req.params;

  const logs = await service.getStudentScanHistory(studentId, {
    user:     req.user,
    schoolId,
  });

  return ApiResponse.list(res, logs, logs.length, 'Student scan history retrieved');
});