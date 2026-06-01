// =============================================================================
// modules/qr/qr.controller.js — RESQID
// QR Controller — HTTP request handlers for QR management
// =============================================================================

import { qrService } from './qr.service.js';
import { qrValidation } from './qr.validation.js';
import { ApiError } from '#shared/response/ApiError.js';
import { asyncHandler, asyncController } from '#shared/response/asyncHandler.js';
import { ApiResponse } from '#shared/response/ApiResponse.js';
import { logger } from '#config/logger.js';

// ─── Controller Object ────────────────────────────────────────────────────────

const qrController = {
  // ===========================================================================
  // TOKEN OPERATIONS
  // ===========================================================================

  /**
   * GET /api/qr/tokens
   * List tokens with filtering
   */
  listTokens: asyncHandler(async (req, res) => {
    const schoolId = req.user.schoolId || req.query.schoolId;

    if (!schoolId) {
      throw ApiError.tenantRequired();
    }

    const result = await qrService.getTokens(schoolId, req.query);

    return ApiResponse.success(res, result, 'Tokens retrieved successfully');
  }),

  /**
   * GET /api/qr/tokens/:tokenId
   * Get token by ID
   */
  getToken: asyncHandler(async (req, res) => {
    const { tokenId } = req.params;
    const schoolId = req.user.schoolId;

    const token = await qrService.getTokenById(tokenId, schoolId);

    return ApiResponse.success(res, token);
  }),

  /**
   * POST /api/qr/tokens
   * Create new token
   */
  createToken: asyncHandler(async (req, res) => {
    const schoolId = req.user.schoolId;

    if (!schoolId) {
      throw ApiError.tenantRequired();
    }

    const token = await qrService.createToken(schoolId, req.body);

    req.auditLog?.('token.create', { tokenId: token.id, schoolId });

    return ApiResponse.created(res, token, 'Token created successfully');
  }),

  /**
   * POST /api/qr/tokens/bulk
   * Bulk create tokens
   */
  bulkCreateTokens: asyncHandler(async (req, res) => {
    const schoolId = req.user.schoolId;
    const { count, type } = req.body;

    if (!count || count < 1) {
      throw ApiError.badRequest('Count is required and must be at least 1');
    }

    const result = await qrService.bulkCreateTokens(schoolId, count, type);

    req.auditLog?.('token.bulkCreate', { count, batchId: result.batchId, schoolId });

    return ApiResponse.created(res, result, `${result.count} tokens created`);
  }),

  /**
   * POST /api/qr/tokens/:tokenId/assign
   * Assign token to student
   */
  assignToken: asyncHandler(async (req, res) => {
    const { tokenId } = req.params;
    const { studentId } = req.body;
    const schoolId = req.user.schoolId;

    if (!studentId) {
      throw ApiError.badRequest('Student ID is required');
    }

    const token = await qrService.assignTokenToStudent(tokenId, studentId, schoolId);

    req.auditLog?.('token.assign', { tokenId, studentId, schoolId });

    return ApiResponse.success(res, token, 'Token assigned successfully');
  }),

  /**
   * PATCH /api/qr/tokens/:tokenId/status
   * Update token status
   */
  updateTokenStatus: asyncHandler(async (req, res) => {
    const { tokenId } = req.params;
    const { status, reason } = req.body;

    const token = await qrService.updateTokenStatus(tokenId, status, reason, req.user.id);

    req.auditLog?.('token.statusUpdate', { tokenId, status, reason });

    return ApiResponse.success(res, token, `Token status updated to ${status}`);
  }),

  // ===========================================================================
  // QR GENERATION
  // ===========================================================================

  /**
   * POST /api/qr/tokens/:tokenId/generate
   * Generate QR code for a token
   */
  generateQr: asyncHandler(async (req, res) => {
    const { tokenId } = req.params;
    const schoolId = req.user.schoolId;

    const token = await qrService.generateQr(tokenId, req.body, schoolId);

    req.auditLog?.('qr.generate', { tokenId, schoolId });

    return ApiResponse.success(res, token, 'QR code generated successfully');
  }),

  /**
   * POST /api/qr/tokens/:tokenId/regenerate
   * Regenerate QR code
   */
  regenerateQr: asyncHandler(async (req, res) => {
    const { tokenId } = req.params;
    const schoolId = req.user.schoolId;

    const token = await qrService.regenerateQr(tokenId, req.body, schoolId);

    req.auditLog?.('qr.regenerate', { tokenId, schoolId });

    return ApiResponse.success(res, token, 'QR code regenerated successfully');
  }),

  /**
   * POST /api/qr/bulk-generate
   * Bulk generate QR codes
   */
  bulkGenerateQr: asyncHandler(async (req, res) => {
    const schoolId = req.user.schoolId;

    const result = await qrService.bulkGenerateQr(schoolId, {
      ...req.body,
      userId: req.user.id,
    });

    req.auditLog?.('qr.bulkGenerate', {
      schoolId,
      successCount: result.successCount,
      failedCount: result.failedCount,
    });

    const message =
      result.failedCount > 0
        ? `${result.successCount} generated, ${result.failedCount} failed`
        : `All ${result.successCount} QR codes generated`;

    return ApiResponse.success(res, result, message);
  }),

  /**
   * GET /api/qr/tokens/:tokenId/download
   * Get QR download URL
   */
  downloadQr: asyncHandler(async (req, res) => {
    const { tokenId } = req.params;
    const { format } = req.query;
    const schoolId = req.user.schoolId;

    const result = await qrService.getQrDownloadUrl(tokenId, format, schoolId);

    // If download URL, redirect
    if (result.downloadUrl) {
      return res.redirect(result.downloadUrl);
    }

    return ApiResponse.success(res, result);
  }),

  /**
   * GET /api/qr/tokens/:tokenId/preview
   * Get QR preview (for display in browser)
   */
  previewQr: asyncHandler(async (req, res) => {
    const { tokenId } = req.params;
    const schoolId = req.user.schoolId;

    const token = await qrService.getTokenById(tokenId, schoolId);

    if (!token.qrAssetUrl) {
      throw ApiError.badRequest('QR code not generated yet');
    }

    // Set content type based on format
    const contentTypeMap = {
      PNG: 'image/png',
      SVG: 'image/svg+xml',
      PDF: 'application/pdf',
    };

    res.setHeader('Content-Type', contentTypeMap[token.qrFormat] || 'image/png');

    // In production, proxy the image from storage
    return res.redirect(token.qrAssetUrl);
  }),

  // ===========================================================================
  // SCAN LOGS
  // ===========================================================================

  /**
   * GET /api/qr/tokens/:tokenId/scans
   * Get scan logs for a token
   */
  getScanLogs: asyncHandler(async (req, res) => {
    const { tokenId } = req.params;
    const { page, limit } = req.query;

    const logs = await qrService.getScanLogs(tokenId, page, limit);

    return ApiResponse.success(res, logs);
  }),

  // ===========================================================================
  // STATISTICS
  // ===========================================================================

  /**
   * GET /api/qr/stats
   * Get token statistics
   */
  getStats: asyncHandler(async (req, res) => {
    const schoolId = req.user.schoolId || req.query.schoolId;

    if (!schoolId) {
      throw ApiError.tenantRequired();
    }

    const stats = await qrService.getTokenStats(schoolId);

    return ApiResponse.success(res, stats);
  }),

  /**
   * GET /api/qr/recent-scans
   * Get recent scans
   */
  getRecentScans: asyncHandler(async (req, res) => {
    const schoolId = req.user.schoolId;

    const scans = await qrService.getRecentScans(schoolId);

    return ApiResponse.success(res, scans);
  }),
};

// ─── Exports ──────────────────────────────────────────────────────────────────

export default asyncController(qrController);

export const {
  listTokens,
  getToken,
  createToken,
  bulkCreateTokens,
  assignToken,
  updateTokenStatus,
  generateQr,
  regenerateQr,
  bulkGenerateQr,
  downloadQr,
  previewQr,
  getScanLogs,
  getStats,
  getRecentScans,
} = qrController;
