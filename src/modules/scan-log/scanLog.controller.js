// =============================================================================
// modules/scan/scan.controller.js — RESQID
// Scan Controller — HTTP request handlers for scan logs
// =============================================================================

import { scanService } from './scanLog.service.js';
import { scanValidation } from './scanLog.validation.js';
import { ApiError } from '#shared/response/ApiError.js';
import { asyncHandler, asyncController } from '#shared/response/asyncHandler.js';
import { ApiResponse } from '#shared/response/ApiResponse.js';
import { logger } from '#config/logger.js';

// ─── Controller Object ────────────────────────────────────────────────────────

const scanController = {
  // ===========================================================================
  // QUERY OPERATIONS
  // ===========================================================================

  /**
   * GET /api/scans
   * List scan logs with filtering
   * Access: Super Admin, School Admin
   */
  list: asyncHandler(async (req, res) => {
    const schoolId = req.user.schoolId || req.query.schoolId;

    if (!schoolId) {
      throw ApiError.tenantRequired();
    }

    const result = await scanService.getScans(schoolId, req.query);

    return ApiResponse.success(res, result, 'Scan logs retrieved successfully');
  }),

  /**
   * GET /api/scans/:scanId
   * Get scan log by ID
   * Access: Super Admin, School Admin
   */
  getById: asyncHandler(async (req, res) => {
    const { scanId } = req.params;
    const schoolId = req.user.schoolId;

    const scan = await scanService.getScanById(scanId, schoolId);

    return ApiResponse.success(res, scan);
  }),

  /**
   * GET /api/scans/token/:tokenId
   * Get scans by token ID
   * Access: Super Admin, School Admin, Teacher
   */
  getByToken: asyncHandler(async (req, res) => {
    const { tokenId } = req.params;
    const { page, limit } = req.query;

    const result = await scanService.getScansByToken(tokenId, page, limit);

    return ApiResponse.success(res, result);
  }),

  /**
   * GET /api/scans/student/:studentId
   * Get scans by student ID
   * Access: Super Admin, School Admin, Parent (own child)
   */
  getByStudent: asyncHandler(async (req, res) => {
    const { studentId } = req.params;
    const { page, limit } = req.query;

    const result = await scanService.getScansByStudent(studentId, page, limit);

    return ApiResponse.success(res, result);
  }),

  // ===========================================================================
  // CREATE OPERATIONS
  // ===========================================================================

  /**
   * POST /api/scans
   * Create a scan log (called when QR is scanned)
   * Access: Public (with rate limiting) or Authenticated
   */
  create: asyncHandler(async (req, res) => {
    // This endpoint can be called by scanning devices
    const scan = await scanService.createScanLog(req.body);

    return ApiResponse.created(res, scan, 'Scan logged successfully');
  }),

  // ===========================================================================
  // STATISTICS
  // ===========================================================================

  /**
   * GET /api/scans/stats
   * Get scan statistics
   * Access: Super Admin, School Admin
   */
  stats: asyncHandler(async (req, res) => {
    const schoolId = req.user.schoolId || req.query.schoolId;

    if (!schoolId) {
      throw ApiError.tenantRequired();
    }

    const stats = await scanService.getScanStats(schoolId, req.query);

    return ApiResponse.success(res, stats);
  }),

  /**
   * GET /api/scans/dashboard
   * Get dashboard summary
   * Access: Super Admin, School Admin
   */
  dashboard: asyncHandler(async (req, res) => {
    const schoolId = req.user.schoolId;

    const summary = await scanService.getDashboardSummary(schoolId);

    return ApiResponse.success(res, summary);
  }),

  /**
   * GET /api/scans/anomalies
   * Detect scan anomalies
   * Access: Super Admin, School Admin
   */
  anomalies: asyncHandler(async (req, res) => {
    const schoolId = req.user.schoolId;

    const anomalies = await scanService.detectAnomalies(schoolId);

    return ApiResponse.success(res, anomalies);
  }),

  // ===========================================================================
  // EXPORT
  // ===========================================================================

  /**
   * GET /api/scans/export
   * Export scan logs as CSV
   * Access: Super Admin, School Admin
   */
  export: asyncHandler(async (req, res) => {
    const schoolId = req.user.schoolId || req.query.schoolId;

    if (!schoolId) {
      throw ApiError.tenantRequired();
    }

    const data = await scanService.exportScans(schoolId, req.query);

    // Convert to CSV
    const csv = convertToCSV(data);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=scan-logs-${Date.now()}.csv`);

    return res.send(csv);
  }),

  // ===========================================================================
  // DELETE OPERATIONS
  // ===========================================================================

  /**
   * DELETE /api/scans/:scanId
   * Delete a scan log
   * Access: Super Admin, School Admin
   */
  delete: asyncHandler(async (req, res) => {
    const { scanId } = req.params;

    await scanService.deleteScan(scanId);

    return ApiResponse.success(res, null, 'Scan log deleted successfully');
  }),

  /**
   * POST /api/scans/bulk-delete
   * Bulk delete scan logs
   * Access: Super Admin, School Admin
   */
  bulkDelete: asyncHandler(async (req, res) => {
    const { scanIds } = req.body;

    const result = await scanService.bulkDeleteScans(scanIds);

    return ApiResponse.success(res, result, `${result.deleted} scan logs deleted`);
  }),

  /**
   * POST /api/scans/cleanup
   * Cleanup old scan logs
   * Access: Super Admin
   */
  cleanup: asyncHandler(async (req, res) => {
    const schoolId = req.user.schoolId;
    const { beforeDate } = req.body;

    if (!beforeDate) {
      throw ApiError.badRequest('beforeDate is required');
    }

    const result = await scanService.cleanupOldScans(schoolId, beforeDate);

    return ApiResponse.success(res, result, `${result.deleted} old scan logs cleaned up`);
  }),
};

// ─── Helper Functions ─────────────────────────────────────────────────────────

/**
 * Convert array of objects to CSV
 */
function convertToCSV(data) {
  if (!data || data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const csvRows = [];

  csvRows.push(headers.join(','));

  for (const row of data) {
    const values = headers.map((header) => {
      const value = row[header];
      const escaped = String(value || '').replace(/"/g, '""');
      return escaped.includes(',') || escaped.includes('"') || escaped.includes('\n')
        ? `"${escaped}"`
        : escaped;
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export default asyncController(scanController);

export const {
  list,
  getById,
  getByToken,
  getByStudent,
  create,
  stats,
  dashboard,
  anomalies,
  export: exportScans,
  delete: deleteScan,
  bulkDelete,
  cleanup,
} = scanController;
