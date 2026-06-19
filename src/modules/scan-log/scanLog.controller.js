// =============================================================================
// modules/scan-log/scanLog.controller.js — RESQID
// Scan Log Controller — HTTP request handlers for scan history/audit
// =============================================================================

import * as scanLogService from './scanLog.service.js';
import { ApiError } from '#shared/response/ApiError.js';
import { asyncHandler } from '#shared/response/asyncHandler.js';
import { ApiResponse } from '#shared/response/ApiResponse.js';

// =============================================================================
// QUERY OPERATIONS
// =============================================================================

/**
 * GET /api/scan-logs
 * List scan logs with filtering.
 * Access: Super Admin, School Admin
 */
export const list = asyncHandler(async (req, res) => {
  const schoolId = req.schoolId || req.query.schoolId;
  if (!schoolId) throw ApiError.tenantRequired();

  const result = await scanLogService.getScans(schoolId, req.query);
  ApiResponse.ok(res, result, 'Scan logs retrieved');
});

/**
 * GET /api/scan-logs/:scanId
 * Get scan log by ID.
 * Access: Super Admin, School Admin
 */
export const getById = asyncHandler(async (req, res) => {
  const { scanId } = req.params;
  const scan = await scanLogService.getScanById(scanId, req.schoolId);
  ApiResponse.ok(res, scan);
});

/**
 * GET /api/scan-logs/token/:tokenId
 * Get scans by token ID.
 * Access: Super Admin, School Admin, Teacher
 */
export const getByToken = asyncHandler(async (req, res) => {
  const { tokenId } = req.params;
  const { page, limit } = req.query;
  const result = await scanLogService.getScansByToken(tokenId, page, limit);
  ApiResponse.ok(res, result);
});

/**
 * GET /api/scan-logs/student/:studentId
 * Get scans by student ID.
 * Access: Super Admin, School Admin, Parent (own child)
 */
export const getByStudent = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const { page, limit } = req.query;
  const result = await scanLogService.getScansByStudent(studentId, page, limit);
  ApiResponse.ok(res, result);
});

// =============================================================================
// CREATE OPERATIONS
// =============================================================================

/**
 * POST /api/scan-logs
 * Create a scan log manually.
 * Access: Authenticated
 */
export const create = asyncHandler(async (req, res) => {
  const scan = await scanLogService.createScanLog(req.body);
  ApiResponse.created(res, scan, 'Scan logged');
});

// =============================================================================
// STATISTICS
// =============================================================================

/**
 * GET /api/scan-logs/stats
 * Get scan statistics.
 * Access: Super Admin, School Admin
 */
export const stats = asyncHandler(async (req, res) => {
  const schoolId = req.schoolId || req.query.schoolId;
  if (!schoolId) throw ApiError.tenantRequired();

  const result = await scanLogService.getScanStats(schoolId, req.query);
  ApiResponse.ok(res, result);
});

/**
 * GET /api/scan-logs/dashboard
 * Get dashboard summary.
 * Access: Super Admin, School Admin
 */
export const dashboard = asyncHandler(async (req, res) => {
  const summary = await scanLogService.getDashboardSummary(req.schoolId);
  ApiResponse.ok(res, summary);
});

/**
 * GET /api/scan-logs/anomalies
 * Detect scan anomalies.
 * Access: Super Admin, School Admin
 */
export const anomalies = asyncHandler(async (req, res) => {
  const result = await scanLogService.detectAnomalies(req.schoolId);
  ApiResponse.ok(res, result);
});

// =============================================================================
// EXPORT
// =============================================================================

/**
 * GET /api/scan-logs/export
 * Export scan logs as CSV.
 * Access: Super Admin, School Admin
 */
export const exportScans = asyncHandler(async (req, res) => {
  const schoolId = req.schoolId || req.query.schoolId;
  if (!schoolId) throw ApiError.tenantRequired();

  const data = await scanLogService.exportScans(schoolId, req.query);
  const csv = convertToCSV(data);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=scan-logs-${Date.now()}.csv`);
  return res.send(csv);
});

// =============================================================================
// DELETE OPERATIONS
// =============================================================================

/**
 * DELETE /api/scan-logs/:scanId
 * Delete a scan log.
 * Access: Super Admin, School Admin
 */
export const deleteScan = asyncHandler(async (req, res) => {
  const { scanId } = req.params;
  await scanLogService.deleteScan(scanId, req.schoolId);
  ApiResponse.ok(res, null, 'Scan log deleted');
});

/**
 * POST /api/scan-logs/bulk-delete
 * Bulk delete scan logs.
 * Access: Super Admin, School Admin
 */
export const bulkDelete = asyncHandler(async (req, res) => {
  const { scanIds } = req.body;
  if (!scanIds?.length) throw ApiError.badRequest('scanIds required');

  const result = await scanLogService.bulkDeleteScans(scanIds);
  ApiResponse.ok(res, result, `${result.deleted} scan logs deleted`);
});

/**
 * POST /api/scan-logs/cleanup
 * Cleanup old scan logs.
 * Access: Super Admin
 */
export const cleanup = asyncHandler(async (req, res) => {
  const { beforeDate } = req.body;
  if (!beforeDate) throw ApiError.badRequest('beforeDate is required');

  const result = await scanLogService.cleanupOldScans(req.schoolId, beforeDate);
  ApiResponse.ok(res, result, `${result.deleted} old scan logs cleaned up`);
});

<<<<<<< HEAD
export const stats = asyncHandler(async (req, res) => {
  const result = await service.getStats(req.schoolId);
  ApiResponse.ok(res, result);
});
=======
// ─── Helper ───────────────────────────────────────────────────────────────────

function convertToCSV(data) {
  if (!data?.length) return '';
  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];

  for (const row of data) {
    const values = headers.map((header) => {
      const val = String(row[header] ?? '').replace(/"/g, '""');
      return val.includes(',') || val.includes('"') || val.includes('\n') ? `"${val}"` : val;
    });
    csvRows.push(values.join(','));
  }
  return csvRows.join('\n');
}
>>>>>>> fc2f457f3fe5f95777ea9ced16e959883f9d995e
