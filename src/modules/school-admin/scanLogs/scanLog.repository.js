// school-admin/scanLogs/scanLog.repository.js
import { prisma } from '#config/prisma.js';
import { todayRangeUTC } from '#shared/helpers/dateTime.js';

export class ScanLogRepository {
  async list(schoolId, filters, skip, take) {
    const where = { schoolId };
    if (filters.result) {
      where.result = filters.result;
    }
    if (filters.search) {
      where.OR = [
        { studentName: { contains: filters.search, mode: 'insensitive' } },
        { city: { contains: filters.search, mode: 'insensitive' } },
        { token: { qrCode: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }
    const items = await prisma.scanLog.findMany({
      where,
      skip,
      take,
      orderBy: { scannedAt: 'desc' },
      include: {
        token: { select: { qrCode: true } }, // for token_hash fallback
      },
    });
    const total = await prisma.scanLog.count({ where });
    return { items, total };
  }

  async getTodayStats(schoolId) {
    const { start, end } = todayRangeUTC();
    const scans = await prisma.scanLog.findMany({
      where: {
        schoolId,
        scannedAt: { gte: start, lte: end },
      },
      select: { result: true, responseTimeMs: true },
    });
    const total = scans.length;
    const success = scans.filter(s => s.result === 'SUCCESS').length;
    const failed = total - success;
    const avgResponseMs = total
      ? Math.round(scans.reduce((sum, s) => sum + (s.responseTimeMs || 0), 0) / total)
      : 0;
    const avgResponse = `${avgResponseMs}ms`;
    return { total, success, failed, avgResponse };
  }
}