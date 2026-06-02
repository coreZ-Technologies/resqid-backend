// src/modules/scan/scan.repository.js
import { prisma } from '#config/prisma.js';

export class ScanRepository {
  // ===========================================================================
  // EXISTING SCAN METHODS
  // ===========================================================================

  /**
   * Create a new scan record
   */
  async createScan(data) {
    return prisma.scan.create({ data });
  }

  /**
   * Find token by various codes (scanCode, qrCode, rfidUid)
   * Includes full emergency profile and parent links (heavy – for emergency page)
   */
  async findTokenByCode(scanCode) {
    if (!scanCode) return null;
    
    return prisma.token.findFirst({
      where: {
        OR: [
          { scanCode: scanCode },
          { qrCode: scanCode },
          { rfidUid: scanCode },
        ],
      },
      include: {
        student: {
          include: {
            emergencyProfile: true,
            parentLinks: {
              include: { 
                parent: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    phone: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
        school: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Lightweight token lookup (no emergency profile) – for validation only
   */
  async findTokenByCodeLight(scanCode) {
    if (!scanCode) return null;
    
    return prisma.token.findFirst({
      where: {
        OR: [
          { scanCode: scanCode },
          { qrCode: scanCode },
          { rfidUid: scanCode },
        ],
      },
      select: {
        id: true,
        status: true,
        expiresAt: true,
        schoolId: true,
        studentId: true,
      },
    });
  }

  async updateTokenStatus(tokenId, status, metadata = {}) {
    if (!tokenId) return null;
    
    return prisma.token.update({
      where: { id: tokenId },
      data: { status, metadata },
    });
  }

  async findTokenById(tokenId) {
    if (!tokenId) return null;
    
    return prisma.token.findUnique({
      where: { id: tokenId },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            grade: true,
            section: true,
          },
        },
      },
    });
  }

  // ===========================================================================
  // SCAN LOGS METHODS
  // ===========================================================================

  async listScanLogs({ page, limit, result, search, startDate, endDate, schoolId }) {
    const skip = (page - 1) * limit;
    const where = this._buildScanLogsWhereClause({ result, search, startDate, endDate, schoolId });

    const [scans, total] = await Promise.all([
      prisma.scan.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
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
          token: {
            select: {
              id: true,
              qrCode: true,
              rfidUid: true,
              type: true,
            },
          },
        },
      }),
      prisma.scan.count({ where }),
    ]);

    return { scans, total };
  }

  async getTodayStats(schoolId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const where = {
      schoolId,
      createdAt: { gte: today, lt: tomorrow },
    };

    const [total, success, avgResponse] = await Promise.all([
      prisma.scan.count({ where }),
      prisma.scan.count({ where: { ...where, result: 'SUCCESS' } }),
      prisma.scan.aggregate({
        where,
        _avg: { responseTimeMs: true },
      }),
    ]);

    return {
      total,
      success,
      failed: total - success,
      avgResponse: `${Math.round(avgResponse._avg.responseTimeMs || 0)}ms`,
    };
  }

  async getScanLogById(id, schoolId) {
    if (!id) return null;
    
    return prisma.scan.findFirst({
      where: { id, schoolId },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            grade: true,
            section: true,
            photoUrl: true,
            bloodGroup: true,
          },
        },
        token: {
          select: {
            id: true,
            qrCode: true,
            rfidUid: true,
            type: true,
            status: true,
          },
        },
      },
    });
  }

  async exportScanLogs({ result, startDate, endDate, schoolId }) {
    const where = this._buildScanLogsWhereClause({ result, search: null, startDate, endDate, schoolId });

    return prisma.scan.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        student: {
          select: {
            firstName: true,
            lastName: true,
            grade: true,
            section: true,
          },
        },
        token: {
          select: {
            qrCode: true,
            rfidUid: true,
            type: true,
          },
        },
      },
    });
  }

  // ===========================================================================
  // ADDITIONAL STATISTICS METHODS
  // ===========================================================================

  async getScanSummary(startDate, schoolId) {
    const where = {
      schoolId,
      createdAt: { gte: startDate },
    };

    const [total, success, uniqueStudents, avgResponseTime] = await Promise.all([
      prisma.scan.count({ where }),
      prisma.scan.count({ where: { ...where, result: 'SUCCESS' } }),
      prisma.scan.groupBy({
        by: ['studentId'],
        where,
        _count: true,
      }),
      prisma.scan.aggregate({
        where,
        _avg: { responseTimeMs: true },
      }),
    ]);

    return {
      total,
      success,
      failed: total - success,
      successRate: total ? Math.round((success / total) * 100) : 0,
      uniqueStudents: uniqueStudents.length,
      avgResponseTime: Math.round(avgResponseTime._avg.responseTimeMs || 0),
    };
  }

  async getDailyScanStats(days, schoolId) {
    const dates = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      dates.push(date);
    }

    const results = [];
    for (const date of dates) {
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      
      const where = {
        schoolId,
        createdAt: { gte: date, lt: nextDay },
      };
      
      const [total, success] = await Promise.all([
        prisma.scan.count({ where }),
        prisma.scan.count({ where: { ...where, result: 'SUCCESS' } }),
      ]);
      
      results.push({
        date: date.toISOString().split('T')[0],
        total,
        success,
        failed: total - success,
      });
    }
    
    return results;
  }

  /**
   * Get result distribution as array of { result, count }
   */
  async getResultDistribution(schoolId) {
    const results = await prisma.scan.groupBy({
      by: ['result'],
      where: { schoolId },
      _count: { result: true },
    });
    
    return results.map(r => ({
      result: r.result,
      count: r._count.result,
    }));
  }

  async getPeakScanHours(schoolId, days = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);
    
    const scans = await prisma.scan.findMany({
      where: {
        schoolId,
        createdAt: { gte: startDate },
      },
      select: {
        createdAt: true,
        result: true,
      },
    });
    
    const hourStats = Array(24).fill().map(() => ({ total: 0, success: 0 }));
    
    scans.forEach(scan => {
      const hour = scan.createdAt.getHours();
      hourStats[hour].total++;
      if (scan.result === 'SUCCESS') {
        hourStats[hour].success++;
      }
    });
    
    return hourStats.map((stats, hour) => ({
      hour,
      total: stats.total,
      success: stats.success,
      failed: stats.total - stats.success,
      successRate: stats.total ? Math.round((stats.success / stats.total) * 100) : 0,
    }));
  }

  async getRecentScans(limit = 10, schoolId) {
    return prisma.scan.findMany({
      where: { schoolId },
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        token: {
          select: {
            qrCode: true,
          },
        },
      },
    });
  }

  // ===========================================================================
  // PRIVATE HELPERS
  // ===========================================================================

  /**
   * Build Prisma `where` clause for scan logs query
   */
  _buildScanLogsWhereClause({ result, search, startDate, endDate, schoolId }) {
    const where = { schoolId };

    if (result && result !== 'ALL') {
      where.result = result;
    }

    if (search) {
      where.OR = [
        { student: { firstName: { contains: search, mode: 'insensitive' } } },
        { student: { lastName: { contains: search, mode: 'insensitive' } } },
        { city: { contains: search, mode: 'insensitive' } },
        { token: { qrCode: { contains: search, mode: 'insensitive' } } },
        { token: { rfidUid: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (startDate) {
      where.createdAt = { gte: new Date(startDate) };
    }
    if (endDate) {
      // Set to end of day
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.createdAt = { ...where.createdAt, lte: end };
    }

    return where;
  }

  // ===========================================================================
  // BULK OPERATIONS
  // ===========================================================================

  async bulkCreateScans(scansData) {
    if (!scansData || scansData.length === 0) return [];
    
    return prisma.scan.createMany({
      data: scansData,
      skipDuplicates: true,
    });
  }

  async deleteOldScans(daysOld = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    return prisma.scan.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    });
  }

  async getScanCountByDateRange(startDate, endDate, schoolId) {
    return prisma.scan.count({
      where: {
        schoolId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });
  }
}