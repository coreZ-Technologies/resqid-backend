// =============================================================================
// modules/scan/scan.repository.js — RESQID
// Scan Repository — Database operations for scan logs
// =============================================================================

import { prisma } from '#config/prisma.js';

// ─── Scan Selects ─────────────────────────────────────────────────────────────

const scanListSelect = {
  id: true,
  result: true,
  scanType: true,
  scanPurpose: true,

  // Token Info
  tokenId: true,
  token: {
    select: {
      id: true,
      qrCode: true,
      type: true,
      status: true,
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          grade: true,
          section: true,
          photoUrl: true,
        },
      },
    },
  },

  // Location
  ipAddress: true,
  city: true,
  country: true,
  latitude: true,
  longitude: true,

  // Device
  device: true,
  deviceModel: true,
  os: true,
  browser: true,

  // Scanner
  scannerId: true,
  scannerName: true,

  // Security
  isBot: true,
  isSuspicious: true,
  riskScore: true,

  // Performance
  responseTimeMs: true,

  // Student Snapshot
  studentName: true,
  studentClass: true,
  studentSection: true,

  // Emergency
  emergencyDataShown: true,

  // Timestamps
  scannedAt: true,
  createdAt: true,
};

const scanDetailSelect = {
  ...scanListSelect,
  userAgent: true,
  metadata: true,
  token: {
    select: {
      id: true,
      qrCode: true,
      qrCodeHash: true,
      type: true,
      status: true,
      issuedAt: true,
      expiresAt: true,
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          grade: true,
          section: true,
          photoUrl: true,
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
    },
  },
};

// ─── Repository Class ─────────────────────────────────────────────────────────

class ScanRepository {
  // ===========================================================================
  // QUERY OPERATIONS
  // ===========================================================================

  /**
   * Find scan logs with filtering and pagination
   */
  async findScans(schoolId, query = {}) {
    const {
      page = 1,
      limit = 15,
      search,
      result,
      scanType,
      scanPurpose,
      scannerId,
      scannerName,
      studentId,
      tokenId,
      city,
      country,
      isSuspicious,
      isBot,
      startDate,
      endDate,
      period,
      minResponseTime,
      maxResponseTime,
      sortBy = 'scannedAt',
      sortOrder = 'desc',
    } = query;

    // Build where clause
    const where = { schoolId };

    // Search across multiple fields
    if (search) {
      where.OR = [
        { studentName: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
        { ipAddress: { contains: search } },
        { token: { qrCode: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // Filters
    if (result && result !== 'ALL') where.result = result;
    if (scanType) where.scanType = scanType;
    if (scanPurpose) where.scanPurpose = scanPurpose;
    if (scannerId) where.scannerId = scannerId;
    if (scannerName) where.scannerName = { contains: scannerName, mode: 'insensitive' };
    if (tokenId) where.tokenId = tokenId;
    if (city) where.city = { contains: city, mode: 'insensitive' };
    if (country) where.country = country;
    if (isSuspicious !== undefined) where.isSuspicious = isSuspicious;
    if (isBot !== undefined) where.isBot = isBot;

    // Student filter
    if (studentId) {
      where.token = { studentId };
    }

    // Response time range
    if (minResponseTime !== undefined || maxResponseTime !== undefined) {
      where.responseTimeMs = {};
      if (minResponseTime !== undefined) where.responseTimeMs.gte = minResponseTime;
      if (maxResponseTime !== undefined) where.responseTimeMs.lte = maxResponseTime;
    }

    // Date range
    if (startDate || endDate || period) {
      where.scannedAt = {};

      if (period) {
        const dates = this.getPeriodDates(period);
        where.scannedAt.gte = dates.start;
        where.scannedAt.lte = dates.end;
      }

      if (startDate) where.scannedAt.gte = new Date(startDate);
      if (endDate) where.scannedAt.lte = new Date(endDate);
    }

    // Count total
    const total = await prisma.scanLog.count({ where });

    // Fetch paginated results
    const scans = await prisma.scanLog.findMany({
      where,
      select: scanListSelect,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
    });

    return {
      scans,
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
   * Find scan by ID
   */
  async findScanById(scanId, schoolId = null) {
    const where = { id: scanId };
    if (schoolId) where.schoolId = schoolId;

    return prisma.scanLog.findUnique({
      where,
      select: scanDetailSelect,
    });
  }

  /**
   * Find scans by token ID
   */
  async findScansByToken(tokenId, page = 1, limit = 20) {
    const where = { tokenId };
    const total = await prisma.scanLog.count({ where });

    const scans = await prisma.scanLog.findMany({
      where,
      select: scanListSelect,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { scannedAt: 'desc' },
    });

    return { scans, total, page, limit };
  }

  /**
   * Find scans by student ID
   */
  async findScansByStudent(studentId, page = 1, limit = 20) {
    const where = {
      token: { studentId },
    };

    const total = await prisma.scanLog.count({ where });

    const scans = await prisma.scanLog.findMany({
      where,
      select: scanListSelect,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { scannedAt: 'desc' },
    });

    return { scans, total, page, limit };
  }

  // ===========================================================================
  // CREATE OPERATIONS
  // ===========================================================================

  /**
   * Create a scan log
   */
  async createScanLog(data) {
    return prisma.scanLog.create({
      data: {
        tokenId: data.tokenId,
        schoolId: data.schoolId,
        result: data.result,
        scanType: data.scanType || 'QR',
        scanPurpose: data.scanPurpose || 'UNKNOWN',
        scannerId: data.scannerId,
        scannerName: data.scannerName,
        ipAddress: data.ipAddress,
        city: data.city,
        country: data.country,
        latitude: data.latitude,
        longitude: data.longitude,
        device: data.device,
        deviceModel: data.deviceModel,
        os: data.os,
        browser: data.browser,
        userAgent: data.userAgent,
        isBot: data.isBot || false,
        isSuspicious: data.isSuspicious || false,
        riskScore: data.riskScore,
        responseTimeMs: data.responseTimeMs,
        studentName: data.studentName,
        studentClass: data.studentClass,
        studentSection: data.studentSection,
        emergencyDataShown: data.emergencyDataShown || false,
        metadata: data.metadata,
      },
      select: scanListSelect,
    });
  }

  // ===========================================================================
  // STATISTICS
  // ===========================================================================

  /**
   * Get scan statistics
   */
  async getScanStats(schoolId, options = {}) {
    const { period = 'TODAY', startDate, endDate, scannerId, tokenId } = options;

    // Calculate date range
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    } else {
      const dates = this.getPeriodDates(period);
      dateFilter = {
        gte: dates.start,
        lte: dates.end,
      };
    }

    const where = {
      schoolId,
      scannedAt: dateFilter,
    };

    if (scannerId) where.scannerId = scannerId;
    if (tokenId) where.tokenId = tokenId;

    // Get stats
    const [
      total,
      byResult,
      avgResponseTime,
      suspiciousCount,
      byHour,
      byScanner,
      byCity,
      topStudents,
    ] = await Promise.all([
      // Total scans
      prisma.scanLog.count({ where }),

      // By result
      prisma.scanLog.groupBy({
        by: ['result'],
        where,
        _count: true,
      }),

      // Average response time
      prisma.scanLog.aggregate({
        where: { ...where, responseTimeMs: { not: null } },
        _avg: { responseTimeMs: true },
      }),

      // Suspicious count
      prisma.scanLog.count({ where: { ...where, isSuspicious: true } }),

      // By hour
      prisma.$queryRaw`
        SELECT 
          EXTRACT(HOUR FROM "scanned_at") as hour,
          COUNT(*) as count
        FROM "scan_logs"
        WHERE "school_id" = ${schoolId}
          AND "scanned_at" >= ${dateFilter.gte}
          AND "scanned_at" <= ${dateFilter.lte}
        GROUP BY hour
        ORDER BY hour
      `,

      // By scanner
      prisma.scanLog.groupBy({
        by: ['scannerName'],
        where: { ...where, scannerName: { not: null } },
        _count: true,
        orderBy: { _count: { scannerName: 'desc' } },
        take: 10,
      }),

      // By city
      prisma.scanLog.groupBy({
        by: ['city'],
        where: { ...where, city: { not: null } },
        _count: true,
        orderBy: { _count: { city: 'desc' } },
        take: 10,
      }),

      // Top scanned students
      prisma.scanLog.groupBy({
        by: ['studentName'],
        where: { ...where, studentName: { not: null } },
        _count: true,
        orderBy: { _count: { studentName: 'desc' } },
        take: 10,
      }),
    ]);

    // Calculate success/failed
    const success =
      byResult.find((r) => r.result === 'ACTIVE' || r.result === 'SUCCESS')?._count || 0;
    const failed = total - success;

    return {
      period,
      dateRange: {
        start: dateFilter.gte,
        end: dateFilter.lte,
      },
      total,
      success,
      failed,
      successRate: total > 0 ? Math.round((success / total) * 100) : 0,
      avgResponseMs: Math.round(avgResponseTime._avg?.responseTimeMs || 0),
      suspiciousCount,
      byResult: byResult.map((r) => ({ result: r.result, count: r._count })),
      byHour: byHour || [],
      byScanner: byScanner.map((s) => ({ scanner: s.scannerName, count: s._count })),
      byCity: byCity.map((c) => ({ city: c.city, count: c._count })),
      topStudents: topStudents.map((s) => ({ name: s.studentName, count: s._count })),
    };
  }

  /**
   * Get real-time stats (last 5 minutes)
   */
  async getRealtimeStats(schoolId) {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const [total, success, failed] = await Promise.all([
      prisma.scanLog.count({
        where: { schoolId, scannedAt: { gte: fiveMinutesAgo } },
      }),
      prisma.scanLog.count({
        where: {
          schoolId,
          scannedAt: { gte: fiveMinutesAgo },
          result: { in: ['ACTIVE', 'SUCCESS'] },
        },
      }),
      prisma.scanLog.count({
        where: {
          schoolId,
          scannedAt: { gte: fiveMinutesAgo },
          result: { notIn: ['ACTIVE', 'SUCCESS'] },
        },
      }),
    ]);

    return { last5Minutes: { total, success, failed } };
  }

  // ===========================================================================
  // DELETE OPERATIONS
  // ===========================================================================

  /**
   * Delete scan log
   */
  async deleteScan(scanId) {
    return prisma.scanLog.delete({ where: { id: scanId } });
  }

  /**
   * Bulk delete scans
   */
  async bulkDeleteScans(scanIds) {
    return prisma.scanLog.deleteMany({
      where: { id: { in: scanIds } },
    });
  }

  /**
   * Delete old scans (cleanup)
   */
  async deleteOldScans(schoolId, beforeDate) {
    return prisma.scanLog.deleteMany({
      where: {
        schoolId,
        scannedAt: { lt: new Date(beforeDate) },
      },
    });
  }

  // ===========================================================================
  // EXPORT
  // ===========================================================================

  /**
   * Export scan logs
   */
  async exportScans(schoolId, filters = {}) {
    const where = { schoolId, ...filters };

    return prisma.scanLog.findMany({
      where,
      select: scanListSelect,
      orderBy: { scannedAt: 'desc' },
    });
  }

  // ===========================================================================
  // HELPER METHODS
  // ===========================================================================

  /**
   * Get date range for period
   */
  getPeriodDates(period) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    switch (period) {
      case 'TODAY':
        return { start: today, end: tomorrow };

      case 'YESTERDAY':
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        return { start: yesterday, end: today };

      case 'LAST_7_DAYS':
        return {
          start: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
          end: tomorrow,
        };

      case 'LAST_30_DAYS':
        return {
          start: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000),
          end: tomorrow,
        };

      case 'THIS_MONTH':
        return {
          start: new Date(now.getFullYear(), now.getMonth(), 1),
          end: tomorrow,
        };

      case 'LAST_MONTH':
        return {
          start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
          end: new Date(now.getFullYear(), now.getMonth(), 1),
        };

      default:
        return { start: today, end: tomorrow };
    }
  }
}

// ─── Export Singleton ─────────────────────────────────────────────────────────

export const scanRepository = new ScanRepository();
export default scanRepository;
