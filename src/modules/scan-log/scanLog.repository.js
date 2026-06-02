// src/modules/scan-log/scanLog.repository.js
import { prisma } from '#config/prisma.js';

export class ScanLogRepository {
  async listScanLogs({ page, limit, result, search, startDate, endDate, schoolId }) {
    const skip = (page - 1) * limit;
    const where = { schoolId };

    if (result && result !== 'ALL') {
      where.result = result;
    }

    if (search) {
      where.OR = [
        { student: { firstName: { contains: search, mode: 'insensitive' } } },
        { student: { lastName: { contains: search, mode: 'insensitive' } } },
        { city: { contains: search, mode: 'insensitive' } },        // ✅ fixed: ip_city → city
        { token: { qrCode: { contains: search, mode: 'insensitive' } } },
        { token: { rfidUid: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (startDate) {
      where.createdAt = { gte: new Date(startDate) };               // ✅ fixed: created_at → createdAt
    }
    if (endDate) {
      // Set to end of day
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.createdAt = { ...where.createdAt, lte: end };
    }

    const [scans, total] = await Promise.all([
      prisma.scan.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },                            // ✅ fixed
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
      createdAt: { gte: today, lt: tomorrow },                    // ✅ fixed
    };

    const [total, success, avgResponse] = await Promise.all([
      prisma.scan.count({ where }),
      prisma.scan.count({ where: { ...where, result: 'SUCCESS' } }),
      prisma.scan.aggregate({
        where,
        _avg: { responseTimeMs: true },                           // ✅ fixed: response_time_ms → responseTimeMs
      }),
    ]);

    const failed = total - success;

    return {
      total,
      success,
      failed,
      avgResponse: `${Math.round(avgResponse._avg.responseTimeMs || 0)}ms`,
    };
  }

  async getScanLogById(id, schoolId) {
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
    const where = { schoolId };

    if (result && result !== 'ALL') {
      where.result = result;
    }

    if (startDate) {
      where.createdAt = { gte: new Date(startDate) };             // ✅ fixed
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.createdAt = { ...where.createdAt, lte: end };
    }

    return prisma.scan.findMany({
      where,
      orderBy: { createdAt: 'desc' },                            // ✅ fixed
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
}