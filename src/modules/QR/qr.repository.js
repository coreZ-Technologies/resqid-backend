// =============================================================================
// modules/qr/qr.repository.js — RESQID
// QR Repository — Database operations for tokens and QR codes
// =============================================================================

import { prisma } from '#config/prisma.js';

// ─── Token Selects ────────────────────────────────────────────────────────────

const tokenListSelect = {
  id: true,
  type: true,
  status: true,
  label: true,
  qrCode: true,
  qrCodeHash: true,
  rfidUid: true,

  // QR Asset
  qrGenerated: true,
  qrFormat: true,
  qrWidthPx: true,
  qrHeightPx: true,
  qrFileSizeKb: true,
  qrAssetUrl: true,
  qrGeneratedAt: true,
  qrRegeneratedAt: true,
  qrRegenerationCount: true,

  // Customization
  qrForegroundColor: true,
  qrBackgroundColor: true,
  qrLogoUrl: true,
  qrErrorCorrection: true,

  // Student Info
  studentId: true,
  student: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      grade: true,
      section: true,
      photoUrl: true,
      studentId: true,
    },
  },

  // Dates
  issuedAt: true,
  expiresAt: true,
  revokedAt: true,
  createdAt: true,
  updatedAt: true,
};

// ─── Repository Class ─────────────────────────────────────────────────────────

class QrRepository {
  // ===========================================================================
  // TOKEN QUERIES
  // ===========================================================================

  /**
   * Find tokens with filtering and pagination
   */
  async findTokens(schoolId, query = {}) {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      type,
      hasQr,
      isAssigned,
      class: className,
      section,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      batchId,
    } = query;

    // Build where clause
    const where = { schoolId };

    if (search) {
      where.OR = [
        { qrCode: { contains: search, mode: 'insensitive' } },
        { label: { contains: search, mode: 'insensitive' } },
        { student: { firstName: { contains: search, mode: 'insensitive' } } },
        { student: { lastName: { contains: search, mode: 'insensitive' } } },
        { rfidUid: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) where.status = status;
    if (type) where.type = type;
    if (batchId) where.batchId = batchId;

    // Filter by QR generated
    if (hasQr === true) where.qrGenerated = true;
    if (hasQr === false) where.qrGenerated = false;

    // Filter by student assignment
    if (isAssigned === true) where.studentId = { not: null };
    if (isAssigned === false) where.studentId = null;

    // Filter by student class/section
    if (className) where.student = { grade: className };
    if (section) where.student = { ...where.student, section };

    // Count total
    const total = await prisma.token.count({ where });

    // Fetch paginated results
    const tokens = await prisma.token.findMany({
      where,
      select: tokenListSelect,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
    });

    return {
      tokens,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrevious: page > 1,
      },
    };
  }

  /**
   * Find token by ID
   */
  async findTokenById(tokenId, schoolId = null) {
    const where = { id: tokenId };
    if (schoolId) where.schoolId = schoolId;

    return prisma.token.findUnique({
      where,
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            grade: true,
            section: true,
            photoUrl: true,
            studentId: true,
            bloodGroup: true,
            emergencyProfile: {
              select: {
                bloodGroup: true,
                allergies: true,
                conditions: true,
              },
            },
          },
        },
        scanLogs: {
          take: 10,
          orderBy: { scannedAt: 'desc' },
        },
      },
    });
  }

  /**
   * Find token by QR code
   */
  async findTokenByQrCode(qrCode) {
    return prisma.token.findUnique({
      where: { qrCode },
      include: {
        student: {
          include: {
            emergencyProfile: true,
            parentLinks: {
              where: { isPrimary: true },
              include: { parent: true },
            },
          },
        },
      },
    });
  }

  /**
   * Find token by scan code hash (for scanning)
   */
  async findTokenByScanCodeHash(scanCodeHash) {
    return prisma.token.findUnique({
      where: { scanCodeHash },
      include: {
        student: {
          include: {
            emergencyProfile: {
              include: {
                contacts: {
                  where: { isActive: true },
                  orderBy: { priority: 'asc' },
                },
              },
            },
          },
        },
      },
    });
  }

  // ===========================================================================
  // TOKEN CREATION & ASSIGNMENT
  // ===========================================================================

  /**
   * Create a new token
   */
  async createToken(schoolId, data) {
    const qrCode = await this.generateQrCodeId();

    return prisma.token.create({
      data: {
        schoolId,
        type: data.type || 'QR',
        rfidUid: data.rfidUid,
        qrCode,
        qrCodeHash: await this.hashData(qrCode),
        studentId: data.studentId,
        status: data.studentId ? 'ISSUED' : 'UNREGISTERED',
        issuedAt: data.studentId ? new Date() : null,
        label: data.label,
        batchId: data.batchId,
      },
      select: tokenListSelect,
    });
  }

  /**
   * Assign token to student
   */
  async assignTokenToStudent(tokenId, studentId) {
    return prisma.token.update({
      where: { id: tokenId },
      data: {
        studentId,
        status: 'ISSUED',
        issuedAt: new Date(),
      },
      select: tokenListSelect,
    });
  }

  /**
   * Bulk create tokens
   */
  async bulkCreateTokens(schoolId, count, batchId, type = 'QR') {
    const tokens = [];

    for (let i = 0; i < count; i++) {
      const qrCode = await this.generateQrCodeId();
      tokens.push({
        schoolId,
        type,
        qrCode,
        qrCodeHash: await this.hashData(qrCode),
        status: 'UNREGISTERED',
        batchId,
      });
    }

    await prisma.token.createMany({ data: tokens });

    return prisma.token.findMany({
      where: { batchId },
      select: { id: true, qrCode: true },
    });
  }

  // ===========================================================================
  // QR GENERATION
  // ===========================================================================

  /**
   * Update token with QR asset data
   */
  async updateQrAsset(tokenId, qrData) {
    return prisma.token.update({
      where: { id: tokenId },
      data: {
        qrGenerated: true,
        qrFormat: qrData.format,
        qrWidthPx: qrData.widthPx,
        qrHeightPx: qrData.heightPx,
        qrFileSizeKb: qrData.fileSizeKb,
        qrAssetUrl: qrData.assetUrl,
        qrForegroundColor: qrData.foregroundColor,
        qrBackgroundColor: qrData.backgroundColor,
        qrLogoUrl: qrData.logoUrl,
        qrErrorCorrection: qrData.errorCorrection,
        qrGeneratedAt: qrData.generatedAt || new Date(),
        qrRegenerationCount: { increment: qrData.isRegeneration ? 1 : 0 },
        qrRegeneratedAt: qrData.isRegeneration ? new Date() : null,
      },
      select: tokenListSelect,
    });
  }

  /**
   * Get tokens without QR (for batch generation)
   */
  async getTokensWithoutQr(schoolId, tokenIds = null) {
    const where = {
      schoolId,
      qrGenerated: false,
      status: { in: ['ISSUED', 'ACTIVE'] },
      studentId: { not: null },
    };

    if (tokenIds) {
      where.id = { in: tokenIds };
    }

    return prisma.token.findMany({ where });
  }

  // ===========================================================================
  // TOKEN STATUS
  // ===========================================================================

  /**
   * Update token status
   */
  async updateTokenStatus(tokenId, status, reason = null, userId = null) {
    const data = { status };

    if (status === 'ACTIVE') data.activatedAt = new Date();
    if (status === 'REVOKED') {
      data.revokedAt = new Date();
      data.revokedBy = userId;
      data.revokeReason = reason;
    }
    if (status === 'EXPIRED') {
      data.expiresAt = new Date();
    }

    return prisma.token.update({
      where: { id: tokenId },
      data,
      select: tokenListSelect,
    });
  }

  /**
   * Bulk update token status
   */
  async bulkUpdateTokenStatus(tokenIds, status) {
    return prisma.token.updateMany({
      where: { id: { in: tokenIds } },
      data: { status },
    });
  }

  // ===========================================================================
  // SCAN LOGS
  // ===========================================================================

  /**
   * Log a scan event
   */
  async logScan(tokenId, scanData) {
    return prisma.scanLog.create({
      data: {
        tokenId,
        schoolId: scanData.schoolId,
        result: scanData.result,
        scanType: scanData.scanType || 'QR',
        scannerId: scanData.scannerId,
        scannerName: scanData.scannerName,
        ipAddress: scanData.ipAddress,
        city: scanData.city,
        country: scanData.country,
        latitude: scanData.latitude,
        longitude: scanData.longitude,
        device: scanData.device,
        deviceModel: scanData.deviceModel,
        os: scanData.os,
        browser: scanData.browser,
        userAgent: scanData.userAgent,
        isBot: scanData.isBot || false,
        isSuspicious: scanData.isSuspicious || false,
        riskScore: scanData.riskScore,
        studentName: scanData.studentName,
        studentClass: scanData.studentClass,
        studentSection: scanData.studentSection,
      },
    });
  }

  /**
   * Get scan logs for a token
   */
  async getScanLogs(tokenId, page = 1, limit = 20) {
    const where = { tokenId };
    const total = await prisma.scanLog.count({ where });

    const logs = await prisma.scanLog.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { scannedAt: 'desc' },
    });

    return { logs, total, page, limit };
  }

  // ===========================================================================
  // STATISTICS
  // ===========================================================================

  /**
   * Get token statistics
   */
  async getTokenStats(schoolId) {
    const [
      total,
      assigned,
      unassigned,
      withQr,
      withoutQr,
      active,
      revoked,
      expired,
      byType,
      byStatus,
    ] = await Promise.all([
      prisma.token.count({ where: { schoolId } }),
      prisma.token.count({ where: { schoolId, studentId: { not: null } } }),
      prisma.token.count({ where: { schoolId, studentId: null } }),
      prisma.token.count({ where: { schoolId, qrGenerated: true } }),
      prisma.token.count({ where: { schoolId, qrGenerated: false } }),
      prisma.token.count({ where: { schoolId, status: 'ACTIVE' } }),
      prisma.token.count({ where: { schoolId, status: 'REVOKED' } }),
      prisma.token.count({ where: { schoolId, status: 'EXPIRED' } }),
      prisma.token.groupBy({ by: ['type'], where: { schoolId }, _count: true }),
      prisma.token.groupBy({ by: ['status'], where: { schoolId }, _count: true }),
    ]);

    return {
      total,
      assigned,
      unassigned,
      withQr,
      withoutQr,
      active,
      revoked,
      expired,
      byType: byType.map((t) => ({ type: t.type, count: t._count })),
      byStatus: byStatus.map((s) => ({ status: s.status, count: s._count })),
      qrGenerationRate: total > 0 ? Math.round((withQr / total) * 100) : 0,
    };
  }

  /**
   * Get recent scans
   */
  async getRecentScans(schoolId, limit = 10) {
    return prisma.scanLog.findMany({
      where: { schoolId },
      take: limit,
      orderBy: { scannedAt: 'desc' },
      include: {
        token: {
          select: {
            id: true,
            qrCode: true,
            student: {
              select: {
                firstName: true,
                lastName: true,
                grade: true,
                section: true,
              },
            },
          },
        },
      },
    });
  }

  // ===========================================================================
  // BATCH OPERATIONS
  // ===========================================================================

  /**
   * Create batch generation record
   */
  async createBatchGeneration(schoolId, data) {
    return prisma.qrBatchGeneration.create({
      data: {
        schoolId,
        name: data.name || `Batch ${new Date().toISOString()}`,
        batchId: data.batchId || `BATCH-${Date.now()}`,
        totalCount: data.totalCount,
        format: data.format || 'PNG',
        widthPx: data.width || 512,
        heightPx: data.height || 512,
        errorCorrection: data.errorCorrection || 'M',
        status: 'PROCESSING',
        createdById: data.userId,
      },
    });
  }

  /**
   * Update batch generation status
   */
  async updateBatchGeneration(batchId, data) {
    return prisma.qrBatchGeneration.update({
      where: { batchId },
      data: {
        successCount: data.successCount,
        failedCount: data.failedCount,
        status: data.status,
        errorLog: data.errorLog,
        completedAt: data.status === 'COMPLETED' ? new Date() : null,
      },
    });
  }

  // ===========================================================================
  // HELPER METHODS
  // ===========================================================================

  /**
   * Generate unique QR code ID
   */
  async generateQrCodeId() {
    const { v4: uuidv4 } = await import('uuid');
    return `RESQID-${uuidv4().slice(0, 8).toUpperCase()}`;
  }

  /**
   * Hash data for secure storage
   */
  async hashData(data) {
    const crypto = await import('crypto');
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Check if token exists
   */
  async tokenExists(tokenId) {
    const count = await prisma.token.count({ where: { id: tokenId } });
    return count > 0;
  }
}

// ─── Export Singleton ─────────────────────────────────────────────────────────

export const qrRepository = new QrRepository();
export default qrRepository;
