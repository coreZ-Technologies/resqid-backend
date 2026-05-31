// =============================================================================
// modules/qr/qr.service.js — RESQID
// QR Service — Business logic for QR code generation and token management
// =============================================================================

import qrRepository from './qr.repository.js';
import { qrValidation } from './qr.validation.js';
import { ApiError } from '#shared/response/ApiError.js';
import { logger } from '#config/logger.js';

// ─── Service Class ────────────────────────────────────────────────────────────

class QrService {
  // ===========================================================================
  // TOKEN OPERATIONS
  // ===========================================================================

  /**
   * Get tokens list with filters
   */
  async getTokens(schoolId, query = {}) {
    const validatedQuery = qrValidation.queryTokens.parse(query);
    return qrRepository.findTokens(schoolId, validatedQuery);
  }

  /**
   * Get token by ID
   */
  async getTokenById(tokenId, schoolId = null) {
    const token = await qrRepository.findTokenById(tokenId, schoolId);

    if (!token) {
      throw ApiError.notFound('Token not found', 'TOKEN_NOT_FOUND');
    }

    return token;
  }

  /**
   * Create new token
   */
  async createToken(schoolId, data) {
    const validated = qrValidation.assignToken.parse(data);

    // If assigning to student, verify student exists
    if (validated.studentId) {
      await this.verifyStudent(validated.studentId, schoolId);
    }

    const token = await qrRepository.createToken(schoolId, validated);

    logger.info(`Token created: ${token.id} (${token.qrCode})`);

    return token;
  }

  /**
   * Bulk create tokens
   */
  async bulkCreateTokens(schoolId, count, type = 'QR') {
    if (count < 1 || count > 1000) {
      throw ApiError.badRequest('Count must be between 1 and 1000');
    }

    const batchId = `BATCH-${Date.now()}`;
    const tokens = await qrRepository.bulkCreateTokens(schoolId, count, batchId, type);

    logger.info(`Bulk tokens created: ${count} tokens in batch ${batchId}`);

    return { tokens, batchId, count };
  }

  /**
   * Assign token to student
   */
  async assignTokenToStudent(tokenId, studentId, schoolId) {
    const token = await qrRepository.findTokenById(tokenId, schoolId);

    if (!token) {
      throw ApiError.notFound('Token not found', 'TOKEN_NOT_FOUND');
    }

    if (token.studentId) {
      throw ApiError.conflict('Token is already assigned to a student');
    }

    await this.verifyStudent(studentId, schoolId);

    return qrRepository.assignTokenToStudent(tokenId, studentId);
  }

  /**
   * Update token status
   */
  async updateTokenStatus(tokenId, status, reason, userId) {
    const token = await qrRepository.findTokenById(tokenId);

    if (!token) {
      throw ApiError.notFound('Token not found', 'TOKEN_NOT_FOUND');
    }

    const validated = qrValidation.updateTokenStatus.parse({ status, reason });

    return qrRepository.updateTokenStatus(tokenId, validated.status, validated.reason, userId);
  }

  // ===========================================================================
  // QR GENERATION
  // ===========================================================================

  /**
   * Generate QR code for a token
   */
  async generateQr(tokenId, qrOptions, schoolId) {
    // Validate options
    const validated = qrValidation.generateQr.parse(qrOptions);

    // Get token
    const token = await qrRepository.findTokenById(tokenId, schoolId);
    if (!token) {
      throw ApiError.notFound('Token not found', 'TOKEN_NOT_FOUND');
    }

    // Check if token is assigned to a student
    if (!token.studentId) {
      throw ApiError.badRequest('Cannot generate QR for unassigned token');
    }

    // Check if token is active
    if (!['ISSUED', 'ACTIVE'].includes(token.status)) {
      throw ApiError.badRequest(`Cannot generate QR for ${token.status.toLowerCase()} token`);
    }

    // Generate QR code (this would call QR generation library/service)
    const qrAsset = await this.createQrImage(token, validated);

    // Save QR asset to token
    const updated = await qrRepository.updateQrAsset(tokenId, {
      format: validated.format,
      widthPx: validated.width,
      heightPx: validated.height,
      fileSizeKb: qrAsset.fileSizeKb,
      assetUrl: qrAsset.url,
      foregroundColor: validated.foregroundColor,
      backgroundColor: validated.backgroundColor,
      logoUrl: validated.logoUrl,
      errorCorrection: validated.errorCorrection,
      generatedAt: new Date(),
      isRegeneration: false,
    });

    logger.info(`QR generated for token: ${tokenId}`);

    return updated;
  }

  /**
   * Regenerate QR code
   */
  async regenerateQr(tokenId, qrOptions, schoolId) {
    const validated = qrValidation.regenerateQr.parse(qrOptions);

    const token = await qrRepository.findTokenById(tokenId, schoolId);
    if (!token) {
      throw ApiError.notFound('Token not found', 'TOKEN_NOT_FOUND');
    }

    // Merge with existing settings if not provided
    const options = {
      format: validated.format || token.qrFormat || 'PNG',
      width: validated.width || token.qrWidthPx || 512,
      height: validated.height || token.qrHeightPx || 512,
      foregroundColor: validated.foregroundColor || token.qrForegroundColor || '#000000',
      backgroundColor: validated.backgroundColor || token.qrBackgroundColor || '#FFFFFF',
      logoUrl: validated.logoUrl || token.qrLogoUrl,
      errorCorrection: validated.errorCorrection || token.qrErrorCorrection || 'M',
    };

    // Generate new QR
    const qrAsset = await this.createQrImage(token, options);

    // Update token
    const updated = await qrRepository.updateQrAsset(tokenId, {
      ...options,
      fileSizeKb: qrAsset.fileSizeKb,
      assetUrl: qrAsset.url,
      generatedAt: new Date(),
      isRegeneration: true,
    });

    logger.info(`QR regenerated for token: ${tokenId}`);

    return updated;
  }

  /**
   * Bulk generate QR codes
   */
  async bulkGenerateQr(schoolId, data) {
    const validated = qrValidation.bulkGenerateQr.parse(data);

    // Get tokens without QR
    const tokens = await qrRepository.getTokensWithoutQr(schoolId, validated.tokenIds);

    if (tokens.length === 0) {
      throw ApiError.badRequest('No eligible tokens found for QR generation');
    }

    // Create batch record
    const batch = await qrRepository.createBatchGeneration(schoolId, {
      name: validated.batchName,
      totalCount: tokens.length,
      format: validated.format,
      width: validated.width,
      height: validated.height,
      errorCorrection: validated.errorCorrection,
      userId: data.userId,
    });

    // Generate QRs in background (could use queue)
    let successCount = 0;
    let failedCount = 0;
    const errors = [];

    for (const token of tokens) {
      try {
        await this.generateQr(token.id, validated, schoolId);
        successCount++;
      } catch (error) {
        failedCount++;
        errors.push({ tokenId: token.id, error: error.message });
      }
    }

    // Update batch
    await qrRepository.updateBatchGeneration(batch.batchId, {
      successCount,
      failedCount,
      status: 'COMPLETED',
      errorLog: errors.length > 0 ? errors : null,
    });

    logger.info(`Bulk QR generation completed: ${successCount} success, ${failedCount} failed`);

    return { batch, successCount, failedCount, errors };
  }

  /**
   * Get QR download URL
   */
  async getQrDownloadUrl(tokenId, format, schoolId) {
    const token = await qrRepository.findTokenById(tokenId, schoolId);

    if (!token) {
      throw ApiError.notFound('Token not found', 'TOKEN_NOT_FOUND');
    }

    if (!token.qrAssetUrl) {
      throw ApiError.badRequest('QR code not generated yet');
    }

    // If requesting different format, regenerate
    if (format && format !== token.qrFormat) {
      return this.regenerateQr(tokenId, { format }, schoolId);
    }

    return {
      downloadUrl: token.qrAssetUrl,
      format: token.qrFormat,
      fileName: `qr_${token.qrCode}_${token.student?.firstName || 'token'}.${token.qrFormat?.toLowerCase()}`,
      fileSize: token.qrFileSizeKb,
    };
  }

  // ===========================================================================
  // SCAN LOGS
  // ===========================================================================

  /**
   * Get scan logs for a token
   */
  async getScanLogs(tokenId, page = 1, limit = 20) {
    return qrRepository.getScanLogs(tokenId, page, limit);
  }

  /**
   * Log a scan event
   */
  async logScan(tokenId, scanData) {
    return qrRepository.logScan(tokenId, scanData);
  }

  // ===========================================================================
  // STATISTICS
  // ===========================================================================

  /**
   * Get token statistics
   */
  async getTokenStats(schoolId) {
    return qrRepository.getTokenStats(schoolId);
  }

  /**
   * Get recent scans
   */
  async getRecentScans(schoolId) {
    return qrRepository.getRecentScans(schoolId);
  }

  // ===========================================================================
  // HELPER METHODS
  // ===========================================================================

  /**
   * Create QR image (mock implementation - replace with actual QR library)
   */
  async createQrImage(token, options) {
    // In production, use a QR library like 'qrcode' or external service
    // This is a mock implementation

    const { v4: uuidv4 } = await import('uuid');
    const fileName = `qr_${token.qrCode}_${uuidv4().slice(0, 8)}.${options.format.toLowerCase()}`;

    // Simulate QR generation
    const fileSizeKb = Math.floor(Math.random() * 100) + 20;

    // In production, upload to S3/Cloud Storage
    const url = `https://storage.resqid.com/qr/${fileName}`;

    return {
      url,
      fileName,
      fileSizeKb,
      format: options.format,
      width: options.width,
      height: options.height,
    };
  }

  /**
   * Verify student exists
   */
  async verifyStudent(studentId, schoolId) {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, schoolId: true },
    });

    if (!student) {
      throw ApiError.studentNotFound();
    }

    if (student.schoolId !== schoolId) {
      throw ApiError.schoolAccessDenied();
    }

    return student;
  }
}

// ─── Export Singleton ─────────────────────────────────────────────────────────

export const qrService = new QrService();
export default qrService;
