// src/modules/school-admin/tokens/token.service.js
import { prisma } from '#config/prisma.js';
import { TokenRepository } from './token.repository.js';
import { ApiError } from '#shared/response/ApiError.js';
import { generateTokenId } from '#services/IdGenerator.service.js';
import qrService from '#modules/QR/qr.service.js';
import { logger } from '#config/logger.js';

// Helper to generate a unique QR code string (like "RESQID-SCH001-1734567890-ABC12")
async function generateUniqueQrCode(schoolId) {
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { shortCode: true, id: true },
  });
  const prefix = school?.shortCode || schoolId.slice(-6).toUpperCase();
  const timestamp = Date.now().toString(36).toUpperCase();
  let unique = false;
  let qrCode = '';
  while (!unique) {
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    qrCode = `RESQID-${prefix}-${timestamp}-${random}`;
    const existing = await TokenRepository.findByQrCode(qrCode);
    if (!existing) unique = true;
  }
  return qrCode;
}

export const TokenService = {
  async createToken(schoolId, data) {
    const { studentId, type, label, notes, expiresAt } = data;

    if (studentId) {
      const student = await prisma.student.findFirst({
        where: { id: studentId, schoolId },
      });
      if (!student) throw ApiError.notFound('Student not found in your school');
      const existingToken = await TokenRepository.findByStudentId(studentId, schoolId);
      if (existingToken) throw ApiError.conflict('Student already has a token');
    }

    const qrCode = await generateUniqueQrCode(schoolId);
    const qrCodeHash = await import('crypto').then(crypto => crypto.createHash('sha256').update(qrCode).digest('hex'));

    const expiryDate = expiresAt || new Date(Date.now() + 365 * 86400000);
    const status = studentId ? 'ISSUED' : 'UNREGISTERED';

    const newToken = await TokenRepository.create({
      id: generateTokenId(),
      qrCode,
      qrCodeHash,
      schoolId,
      studentId: studentId || null,
      type: type || 'QR',
      status,
      label: label || null,
      notes: notes || null,
      expiresAt: expiryDate,
      issuedAt: studentId ? new Date() : null,
    });

    logger.info(`Token created: ${newToken.id} (${newToken.qrCode})`);
    return newToken;
  },

  async getTokenById(schoolId, tokenId) {
    const token = await TokenRepository.findById(tokenId, schoolId);
    if (!token) throw ApiError.notFound('Token not found');
    return token;
  },

  async listTokens(schoolId, query) {
    return TokenRepository.findMany({ schoolId, ...query });
  },

  async assignToken(schoolId, tokenId, { studentId }) {
    const token = await TokenRepository.findById(tokenId, schoolId);
    if (!token) throw ApiError.notFound('Token not found');
    if (token.studentId) throw ApiError.badRequest('Token already assigned');

    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId },
    });
    if (!student) throw ApiError.notFound('Student not found');

    const existing = await TokenRepository.findByStudentId(studentId, schoolId);
    if (existing) throw ApiError.conflict('Student already has another token');

    const updated = await TokenRepository.update(tokenId, {
      studentId,
      status: 'ISSUED',
      issuedAt: new Date(),
    });
    return updated;
  },

  async unassignToken(schoolId, tokenId, { reason }) {
    const token = await TokenRepository.findById(tokenId, schoolId);
    if (!token) throw ApiError.notFound('Token not found');
    if (!token.studentId) throw ApiError.badRequest('Token is not assigned');

    const updated = await TokenRepository.update(tokenId, {
      studentId: null,
      status: 'UNREGISTERED',
      issuedAt: null,
    });
    // Optionally log reason in audit
    return updated;
  },

  async updateToken(schoolId, tokenId, updateData) {
    const token = await TokenRepository.findById(tokenId, schoolId);
    if (!token) throw ApiError.notFound('Token not found');

    if (updateData.status === 'REVOKED' && token.studentId) {
      updateData.studentId = null;
      updateData.revokedAt = new Date();
    }
    if (updateData.status === 'ACTIVE' && token.status === 'UNREGISTERED') {
      updateData.activatedAt = new Date();
    }

    const updated = await TokenRepository.update(tokenId, updateData);
    return updated;
  },

  async renewToken(schoolId, tokenId, { newExpiryDate }) {
    const token = await TokenRepository.findById(tokenId, schoolId);
    if (!token) throw ApiError.notFound('Token not found');
    if (token.status === 'REVOKED') throw ApiError.badRequest('Cannot renew a revoked token');

    const updated = await TokenRepository.update(tokenId, {
      expiresAt: newExpiryDate,
      status: token.status === 'EXPIRED' ? (token.studentId ? 'ISSUED' : 'UNREGISTERED') : token.status,
    });
    return updated;
  },

  async revokeToken(schoolId, tokenId, { reason }) {
    const token = await TokenRepository.findById(tokenId, schoolId);
    if (!token) throw ApiError.notFound('Token not found');

    const updated = await TokenRepository.update(tokenId, {
      status: 'REVOKED',
      studentId: null,
      revokedAt: new Date(),
      revokeReason: reason,
    });
    return updated;
  },

  async deleteToken(schoolId, tokenId) {
    const token = await TokenRepository.findById(tokenId, schoolId);
    if (!token) throw ApiError.notFound('Token not found');
    await TokenRepository.delete(tokenId);
    return { success: true };
  },

  async regenerateQr(schoolId, tokenId, options = {}) {
    const token = await TokenRepository.findById(tokenId, schoolId);
    if (!token) throw ApiError.notFound('Token not found');
    if (!token.studentId) throw ApiError.badRequest('Cannot generate QR for unassigned token');
    if (!['ISSUED', 'ACTIVE'].includes(token.status)) {
      throw ApiError.badRequest(`Cannot regenerate QR for ${token.status.toLowerCase()} token`);
    }

    // Delegate to the existing QR service
    const updatedToken = await qrService.regenerateQr(tokenId, options, schoolId);
    return updatedToken;
  },
};