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

  // NEW: Stream CSV export using cursor pagination
  async streamExport(schoolId, filters, writeStream) {
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

    // Write CSV header
    const headers = [
      'id', 'type', 'severity', 'status', 'studentName', 'studentId', 'class',
      'description', 'location', 'time', 'detectedBy'
    ];
    writeStream.write(headers.join(',') + '\n');

    const BATCH_SIZE = 500;
    let lastId = undefined;
    let hasMore = true;

    while (hasMore) {
      const batch = await prisma.scanAnomaly.findMany({
        where,
        orderBy: { id: 'asc' },
        take: BATCH_SIZE,
        ...(lastId ? { cursor: { id: lastId }, skip: 1 } : {}),
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

      if (batch.length === 0) {
        hasMore = false;
        break;
      }

      for (const anomaly of batch) {
        // Format anomaly for export (similar to service)
        const student = anomaly.student;
        const studentName = student
          ? `${student.firstName || ''} ${student.lastName || ''}`.trim()
          : null;
        const className = student?.grade
          ? `Class ${student.grade}${student.section ? `-${student.section}` : ''}`
          : '—';
        const type = ANOMALY_TYPE_MAP[anomaly.type] || anomaly.type || 'suspicious_timing';
        const severityVal = SEVERITY_MAP[anomaly.severity] || 'low';
        const statusVal = anomaly.resolvedAt ? 'resolved' : (anomaly.resolution ? 'investigating' : 'open');
        let location = '';
        const desc = anomaly.description || '';
        if (desc.includes('km away')) location = 'Location Jump Detected';
        else if (desc.includes('Gate')) {
          const gates = desc.match(/Gate [A-Z]/g);
          location = gates ? gates.join(' → ') : '';
        }

        const row = [
          anomaly.id,
          type,
          severityVal,
          statusVal,
          `"${(studentName || 'Unknown').replace(/"/g, '""')}"`,
          student?.studentId || '',
          className,
          `"${desc.replace(/"/g, '""')}"`,
          location,
          anomaly.detectedAt?.toISOString() || '',
          anomaly.metadata?.detectedBy || 'Auto-detection',
        ];
        writeStream.write(row.join(',') + '\n');
      }

      lastId = batch[batch.length - 1].id;
      if (batch.length < BATCH_SIZE) hasMore = false;
    }

    writeStream.end();
  },
};