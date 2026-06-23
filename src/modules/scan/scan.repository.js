// =============================================================================
// modules/scan/scan.repository.js — RESQID
// All DB reads/writes for the public QR scan flow.
// =============================================================================

import { prisma } from '#config/prisma.js';
import { logger } from '#config/logger.js';

/**
 * Find a token by UUID with all joined data for scan resolution.
 * Single query — no N+1.
 */
export const findTokenForScan = async (tokenId) => {
  return prisma.token.findUnique({
    where: { id: tokenId },
    select: {
      id: true,
      status: true,
      expiresAt: true,
      schoolId: true,
      studentId: true,

=======

      school: {
        select: {
          id: true,
          name: true,
          code: true,
          logoUrl: true,
          phone: true,
          street: true,
          city: true,
          state: true,
        },
      },

      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          photoUrl: true,
          grade: true,
          section: true,
          gender: true,
          isActive: true,

          parentLinks: {
            where: { isActive: true, isEmergency: true },
            select: {
              parent: {
                select: {
                  id: true,
                  name: true,
                  phone: true,
                  email: true,
                  devices: {
                    where: { isActive: true, expoPushToken: { not: null } },
                    take: 3,
                    orderBy: { lastSeenAt: 'desc' },
                    select: { expoPushToken: true, platform: true },
=======
  async createScan(data) {
    return prisma.scan.create({ data });
  }

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
>>>>>>> 8077b3074a48cb1da7a7cf9128d6f67564a49aa0
=======

                  },
                },
              },
            },
          },
=======


          cardVisibility: {
            select: { visibility: true },
          },
        },
      },
    },
  });
};

/**
 * Find student with parent contact info for emergency notifications.
 */
export const findStudentWithParents = async (studentId) => {
  if (!studentId) return null;

  return prisma.student.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      grade: true,
      section: true,
      photoUrl: true,
      parentLinks: {
        where: { isActive: true, isEmergency: true },
        select: {
          parent: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              devices: {
                where: { isActive: true, expoPushToken: { not: null } },
                take: 5,
                orderBy: { lastSeenAt: 'desc' },
                select: { expoPushToken: true, platform: true },
              },
            },
          },
        },
      },
    },
  });
};

/**
 * Bulk insert scan records (called by scan worker).
 * 🔧 Uses 'Scan' model (check your Prisma schema for the exact model name).
 */
export const bulkWriteScans = async (entries) => {
  if (!Array.isArray(entries) || entries.length === 0) return;

  const valid = entries.filter((e) => e && e.tokenId && e.schoolId && e.result);

  if (valid.length === 0) return;

  try {
    // 🔧 If your model is 'Scan' use prisma.scan, if 'ScanLog' use prisma.scanLog
    await prisma.scan.createMany({
      data: valid.map((e) => ({
        tokenId: e.tokenId,
        schoolId: e.schoolId,
        result: e.result,
        scannedAt: e.scannedAt || new Date(),
        ipAddress: e.ipAddress || null,
        device: e.device || null,
        latitude: e.latitude || null,
        longitude: e.longitude || null,
      })),
      skipDuplicates: true,
    });
  } catch (err) {
    logger.error({ err: err.message, count: valid.length }, '[scan.repo] Bulk write failed');
    throw err;
  }
};

/**
 * Create a single scan record (fire-and-forget).
 */
export const createScanRecord = async (data) => {
  try {
    return await prisma.scan.create({ data }); // 🔧 or prisma.scanLog
  } catch (err) {
    logger.error({ err: err.message }, '[scan.repo] Failed to create scan record');
    return null;
  }
};

/**
 * Check if token exists (lightweight check).
 */
export const tokenExists = async (tokenId) => {
  const count = await prisma.token.count({ where: { id: tokenId } });
  return count > 0;
};

/**
 * Find token status only (lightweight).
 */
export const findTokenStatus = async (tokenId) => {
  return prisma.token.findUnique({
    where: { id: tokenId },
    select: { id: true, status: true, expiresAt: true },
  });
};
=======
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

    const [total, success, failed, avgResponse] = await Promise.all([
      prisma.scan.count({ where }),
      prisma.scan.count({ where: { ...where, result: 'SUCCESS' } }),
      prisma.scan.count({
        where: {
          ...where,
          result: { notIn: ['SUCCESS'] },
        },
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

    const [total, success, failed, uniqueStudents, avgResponseTime] = await Promise.all([
      prisma.scan.count({ where }),
      prisma.scan.count({ where: { ...where, result: 'SUCCESS' } }),
      prisma.scan.count({ where: { ...where, result: { notIn: ['SUCCESS'] } } }),
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

  async getResultDistribution(schoolId) {
    const results = await prisma.scan.groupBy({
      by: ['result'],
      where: { schoolId },
      _count: { result: true },
    });
    
    const distribution = {};
    results.forEach(r => {
      distribution[r.result] = r._count.result;
    });
    
    return distribution;
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
      where.createdAt = { ...where.createdAt, lte: new Date(endDate) };
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
>>>>>>> 8077b3074a48cb1da7a7cf9128d6f67564a49aa0
=======
};

