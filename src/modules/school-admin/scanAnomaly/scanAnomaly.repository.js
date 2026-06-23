// school-admin/scanAnomaly/scanAnomaly.repository.js
import { prisma } from '#config/prisma.js';

export class ScanAnomalyRepository {
  // ─── Original paginated list (used elsewhere if needed) ──────────
  async list(schoolId, filters, skip, take) {
    const where = { schoolId };
    if (filters.severity) {
      where.severity = filters.severity.toUpperCase();
    }
    if (filters.search) {
      where.OR = [
        { student: { firstName: { contains: filters.search, mode: 'insensitive' } } },
        { student: { lastName: { contains: filters.search, mode: 'insensitive' } } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { id: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    const items = await prisma.scanAnomaly.findMany({
      where,
      skip,
      take,
      include: { student: true, scan: true },
      orderBy: { detectedAt: 'desc' },
    });
    const total = await prisma.scanAnomaly.count({ where });
    return { items, total };
  }

  // ─── NEW: Fetch ALL matching anomalies (no pagination) for status filtering ──
  async getAllMatching(schoolId, filters) {
    const where = { schoolId };
    if (filters.severity) {
      where.severity = filters.severity.toUpperCase();
    }
    if (filters.search) {
      where.OR = [
        { student: { firstName: { contains: filters.search, mode: 'insensitive' } } },
        { student: { lastName: { contains: filters.search, mode: 'insensitive' } } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { id: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    return prisma.scanAnomaly.findMany({
      where,
      include: { student: true, scan: true },
      orderBy: { detectedAt: 'desc' },
    });
  }

  async findById(id, schoolId) {
    return prisma.scanAnomaly.findFirst({
      where: { id, schoolId },
      include: { student: true, scan: true },
    });
  }

  async updateStatus(id, status, resolution, resolvedBy) {
    const anomaly = await prisma.scanAnomaly.findUnique({ where: { id } });
    const metadata = anomaly.metadata || {};
    metadata.status = status;
    const data = { metadata };
    if (status === 'resolved') {
      data.resolvedAt = new Date();
      data.resolvedBy = resolvedBy;
      if (resolution) data.resolution = resolution;
    } else {
      // For open/investigating, clear resolved fields
      data.resolvedAt = null;
      data.resolvedBy = null;
      data.resolution = null;
    }
    return prisma.scanAnomaly.update({ where: { id }, data });
  }

  async getStats(schoolId) {
    const anomalies = await prisma.scanAnomaly.findMany({
      where: { schoolId },
      select: { severity: true, resolvedAt: true, metadata: true },
    });
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let total = anomalies.length;
    let open = 0;
    let resolvedToday = 0;
    let highSeverity = 0;
    for (const a of anomalies) {
      const status = a.metadata?.status || (a.resolvedAt ? 'resolved' : 'open');
      if (status !== 'resolved') open++;
      if (a.resolvedAt && a.resolvedAt >= todayStart) resolvedToday++;
      if (a.severity === 'HIGH') highSeverity++;
    }
    return { total, open, resolvedToday, highSeverity };
  }

  async getExportData(schoolId, filters) {
    const where = { schoolId };
    if (filters.severity) where.severity = filters.severity.toUpperCase();
    if (filters.search) {
      where.OR = [
        { student: { firstName: { contains: filters.search, mode: 'insensitive' } } },
        { student: { lastName: { contains: filters.search, mode: 'insensitive' } } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { id: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    return prisma.scanAnomaly.findMany({
      where,
      include: { student: true },
      orderBy: { detectedAt: 'desc' },
    });
  }
}