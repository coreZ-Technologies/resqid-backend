// src/modules/anomalies/anomaly.repository.js
import { prisma } from '#config/prisma.js';

const ANOMALY_TYPE_MAP = {
  RAPID_SCANS: 'duplicate_scan',
  UNUSUAL_HOURS: 'outside_hours',
  IMPOSSIBLE_TRAVEL: 'multiple_exits',
  FREQUENCY_ANOMALY: 'suspicious_timing',
  VOLUME_ANOMALY: 'suspicious_timing',
  UNKNOWN_CARD: 'unknown_card',
};

const SEVERITY_MAP = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'high',
};

export const anomalyRepository = {
  async getStats(schoolId) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [totalAnomalies, openCount, resolvedToday, highSeverityCount] = await Promise.all([
      prisma.scanAnomaly.count({ where: { schoolId } }),
      prisma.scanAnomaly.count({
        where: { schoolId, resolvedAt: null },
      }),
      prisma.scanAnomaly.count({
        where: {
          schoolId,
          resolvedAt: { gte: todayStart },
        },
      }),
      prisma.scanAnomaly.count({
        where: {
          schoolId,
          severity: { in: ['HIGH', 'CRITICAL'] },
        },
      }),
    ]);

    return {
      totalAnomalies,
      openCount,
      resolvedToday,
      highSeverityCount,
    };
  },

  async findAll(schoolId, filters = {}) {
    const { page = 1, limit = 20, status, severity, search, sortBy = 'time' } = filters;

    const where = { schoolId };

    // Status filter
    if (status === 'open') where.resolvedAt = null;
    else if (status === 'resolved') where.resolvedAt = { not: null };
    // 'investigating' — we treat unresolved but with resolution notes as investigating
    else if (status === 'investigating') {
      where.resolvedAt = null;
      where.resolution = { not: null };
    }

    // Severity filter
    if (severity) {
      where.severity = severity === 'high' ? { in: ['HIGH', 'CRITICAL'] } : severity.toUpperCase();
    }

    // Search across student name, studentId, description, anomalyId
    if (search) {
      where.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        { student: { firstName: { contains: search, mode: 'insensitive' } } },
        { student: { lastName: { contains: search, mode: 'insensitive' } } },
        { student: { studentId: { contains: search, mode: 'insensitive' } } },
        { id: { contains: search, mode: 'insensitive' } },
      ];
    }

    const orderBy =
      sortBy === 'severity'
        ? [{ severity: 'desc' }, { detectedAt: 'desc' }]
        : { detectedAt: 'desc' };

    const [data, total] = await Promise.all([
      prisma.scanAnomaly.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy,
        select: {
          id: true,
          type: true,
          severity: true,
          resolvedAt: true,
          resolution: true,
          description: true,
          metadata: true,
          detectedAt: true,
          student: {
            select: {
              firstName: true,
              lastName: true,
              studentId: true,
              grade: true,
              section: true,
            },
          },
        },
      }),
      prisma.scanAnomaly.count({ where }),
    ]);

    return { data, total, page, limit };
  },

  async findById(id, schoolId) {
    return prisma.scanAnomaly.findFirst({
      where: { id, schoolId },
      select: {
        id: true,
        type: true,
        severity: true,
        resolvedAt: true,
        resolution: true,
        description: true,
        metadata: true,
        detectedAt: true,
        student: {
          select: {
            firstName: true,
            lastName: true,
            studentId: true,
            grade: true,
            section: true,
          },
        },
      },
    });
  },

  async updateStatus(id, status) {
    const data = {
      updatedAt: new Date(),
    };

    if (status === 'resolved') {
      data.resolvedAt = new Date();
    } else if (status === 'investigating' || status === 'open') {
      data.resolvedAt = null;
    }

    return prisma.scanAnomaly.update({
      where: { id },
      data,
      select: {
        id: true,
        severity: true,
        type: true,
        resolvedAt: true,
        updatedAt: true,
      },
    });
  },

  async getFilterOptions(schoolId) {
    const anomalies = await prisma.scanAnomaly.findMany({
      where: { schoolId },
      select: { type: true, severity: true },
      distinct: ['type'],
    });

    const types = [...new Set(anomalies.map((a) => ANOMALY_TYPE_MAP[a.type] || a.type))];

    return {
      statuses: ['open', 'investigating', 'resolved'],
      severities: ['high', 'medium', 'low'],
      types,
    };
  },

  async findAllForExport(schoolId, filters = {}) {
    const { status, severity, search } = filters;

    const where = { schoolId };

    if (status === 'open') where.resolvedAt = null;
    else if (status === 'resolved') where.resolvedAt = { not: null };
    else if (status === 'investigating') {
      where.resolvedAt = null;
      where.resolution = { not: null };
    }

    if (severity) {
      where.severity = severity === 'high' ? { in: ['HIGH', 'CRITICAL'] } : severity.toUpperCase();
    }

    if (search) {
      where.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        { student: { firstName: { contains: search, mode: 'insensitive' } } },
        { student: { lastName: { contains: search, mode: 'insensitive' } } },
        { id: { contains: search, mode: 'insensitive' } },
      ];
    }

    return prisma.scanAnomaly.findMany({
      where,
      orderBy: { detectedAt: 'desc' },
      select: {
        id: true,
        type: true,
        severity: true,
        resolvedAt: true,
        description: true,
        metadata: true,
        detectedAt: true,
        student: {
          select: {
            firstName: true,
            lastName: true,
            studentId: true,
            grade: true,
            section: true,
          },
        },
      },
    });
  },
};
