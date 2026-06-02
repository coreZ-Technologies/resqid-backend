// TODO: Add implementation
// school-admin/qr/qr.service.js
import { prisma } from '#config/prisma.js';
import { ApiError } from '#shared/response/ApiError.js';
import { getStorage, StoragePath } from '#infrastructure/storage/storage.index.js';
import { generateId } from '#services/IdGenerator.service.js';
import { TOKEN_STATUS } from '#shared/constants/status.js';
import QRCode from 'qrcode';
import QRCodeSVG from 'qrcode-svg';
import PDFDocument from 'pdfkit';
import { Readable } from 'stream';
import { QrRepository } from './qr.repository.js';

const repo = new QrRepository();

export class QrService {
  async listTokens(query, schoolId) {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.min(100, parseInt(query.limit) || 20);
    const skip = (page - 1) * limit;
    const { items, total } = await repo.listTokens(schoolId, query.search, skip, limit);
    const transformed = items.map(token => ({
      id: token.id,
      token_hash: token.qrCode || token.id,
      status: token.status,
      student_id: token.studentId,
      student_name: token.student ? `${token.student.firstName} ${token.student.lastName}` : null,
      student_class: token.student?.grade,
      student_section: token.student?.section,
      school_id: token.schoolId,
      expires_at: token.expiresAt,
      created_at: token.createdAt,
      qr_asset: token.qrGenerated ? {
        id: token.id,
        format: token.qrFormat,
        width_px: token.qrWidthPx,
        height_px: token.qrHeightPx,
        file_size_kb: token.qrFileSizeKb,
        public_url: token.qrAssetUrl,
        generated_at: token.qrGeneratedAt,
      } : null,
    }));
    return { items: transformed, total, page, limit };
  }

  async getTokenDetails(id, schoolId) {
    const token = await repo.findTokenById(id, schoolId);
    if (!token) throw ApiError.notFound('Token not found');
    return {
      id: token.id,
      token_hash: token.qrCode || token.id,
      status: token.status,
      student_id: token.studentId,
      student_name: token.student ? `${token.student.firstName} ${token.student.lastName}` : null,
      student_class: token.student?.grade,
      student_section: token.student?.section,
      school_id: token.schoolId,
      expires_at: token.expiresAt,
      created_at: token.createdAt,
      qr_asset: token.qrGenerated ? {
        id: token.id,
        format: token.qrFormat,
        width_px: token.qrWidthPx,
        height_px: token.qrHeightPx,
        file_size_kb: token.qrFileSizeKb,
        public_url: token.qrAssetUrl,
        generated_at: token.qrGeneratedAt,
      } : null,
    };
  }

  async generateQr(tokenId, format, width, height, schoolId) {
    const token = await repo.findTokenById(tokenId, schoolId);
    if (!token) throw ApiError.notFound('Token not found');
    if (token.status !== 'ACTIVE') {
      throw ApiError.badRequest('QR codes can only be generated for active tokens');
    }

    // Generate QR code as buffer based on format
    const qrData = token.qrCode || token.id; // Use existing QR code or fallback to token ID
    let buffer;
    let mimeType;
    let fileSizeKb;

    if (format === 'PNG') {
      buffer = await QRCode.toBuffer(qrData, { width, margin: 2, errorCorrectionLevel: 'M' });
      mimeType = 'image/png';
      fileSizeKb = buffer.length / 1024;
    } else if (format === 'SVG') {
      const svg = new QRCodeSVG({ content: qrData, width, height, join: true });
      buffer = Buffer.from(svg.svg());
      mimeType = 'image/svg+xml';
      fileSizeKb = buffer.length / 1024;
    } else if (format === 'PDF') {
      const doc = new PDFDocument({ size: [width, height], layout: 'landscape' });
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      const pdfPromise = new Promise((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));
      // Draw QR code as image inside PDF
      const pngBuffer = await QRCode.toBuffer(qrData, { width: Math.min(width, height), margin: 2 });
      doc.image(pngBuffer, 0, 0, { fit: [width, height], align: 'center', valign: 'center' });
      doc.end();
      buffer = await pdfPromise;
      mimeType = 'application/pdf';
      fileSizeKb = buffer.length / 1024;
    } else {
      throw ApiError.badRequest('Unsupported format');
    }

    // Upload to storage
    const storage = getStorage();
    const key = StoragePath.studentQr(schoolId, token.studentId || 'unassigned', token.id);
    const upload = await storage.upload(buffer, key, { contentType: mimeType });
    const publicUrl = upload.location;

    // Update token with QR asset data
    const updatedToken = await repo.updateToken(token.id, {
      qrGenerated: true,
      qrFormat: format,
      qrWidthPx: width,
      qrHeightPx: height,
      qrFileSizeKb: fileSizeKb,
      qrAssetUrl: publicUrl,
      qrGeneratedAt: new Date(),
      qrRegeneratedAt: token.qrGenerated ? new Date() : null,
      qrRegenerationCount: token.qrRegenerationCount + (token.qrGenerated ? 1 : 0),
    });

    return {
      id: updatedToken.id,
      format: updatedToken.qrFormat,
      width_px: updatedToken.qrWidthPx,
      height_px: updatedToken.qrHeightPx,
      file_size_kb: updatedToken.qrFileSizeKb,
      public_url: updatedToken.qrAssetUrl,
      generated_at: updatedToken.qrGeneratedAt,
    };
  }

  async regenerateQr(tokenId, format, width, height, schoolId) {
    // Same as generate, but increments regeneration count
    return this.generateQr(tokenId, format, width, height, schoolId);
  }

  async assignToken(tokenId, studentId, schoolId) {
    const token = await repo.findTokenById(tokenId, schoolId);
    if (!token) throw ApiError.notFound('Token not found');
    const updated = await repo.assignTokenToStudent(tokenId, studentId, schoolId);
    return {
      id: updated.id,
      student_id: updated.studentId,
      student_name: updated.student ? `${updated.student.firstName} ${updated.student.lastName}` : null,
      student_class: updated.student?.grade,
      student_section: updated.student?.section,
      status: updated.status,
    };
  }

  async getStats(schoolId) {
    return repo.getStats(schoolId);
  }
}