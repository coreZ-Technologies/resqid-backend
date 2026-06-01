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
        { ip_city: { contains: search, mode: 'insensitive' } },
        { token: { qrCode: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (startDate) {
      where.created_at = { gte: new Date(startDate) };
    }
    if (endDate) {
      where.created_at = { ...where.created_at, lte: new Date(endDate) };
    }

    const [scans, total] = await Promise.all([
      prisma.scan.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
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
      created_at: { gte: today, lt: tomorrow },
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
        _avg: { response_time_ms: true },
      }),
    ]);

    return {
      total,
      success,
      failed: total - success,
      avgResponse: `${Math.round(avgResponse._avg.response_time_ms || 0)}ms`,
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
      where.created_at = { gte: new Date(startDate) };
    }
    if (endDate) {
      where.created_at = { ...where.created_at, lte: new Date(endDate) };
    }

    return prisma.scan.findMany({
      where,
      orderBy: { created_at: 'desc' },
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