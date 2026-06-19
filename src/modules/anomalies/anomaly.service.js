// src/modules/anomalies/anomaly.service.js
import { anomalyRepository } from './anomaly.repository.js';
import { ApiError } from '#shared/response/ApiError.js';
import { logger } from '#config/logger.js';

// Maps DB severity/enum to frontend format
const SEVERITY_TO_FRONTEND = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'high',
};

const TYPE_TO_FRONTEND = {
  RAPID_SCANS: 'duplicate_scan',
  UNUSUAL_HOURS: 'outside_hours',
  IMPOSSIBLE_TRAVEL: 'multiple_exits',
  FREQUENCY_ANOMALY: 'suspicious_timing',
  VOLUME_ANOMALY: 'suspicious_timing',
};

function resolveStatus(resolvedAt, resolution) {
  if (resolvedAt) return 'resolved';
  if (resolution) return 'investigating';
  return 'open';
}

function formatAnomaly(dbAnomaly) {
  if (!dbAnomaly) return null;

  const student = dbAnomaly.student;
  const studentName = student
    ? `${student.firstName || ''} ${student.lastName || ''}`.trim()
    : null;

  const className = student?.grade
    ? `Class ${student.grade}${student.section ? `-${student.section}` : ''}`
    : '—';

  const avatarInitials = studentName
    ? studentName
        .split(' ')
        .map((w) => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '??';

  return {
    id: dbAnomaly.id,
    type: TYPE_TO_FRONTEND[dbAnomaly.type] || dbAnomaly.type || 'suspicious_timing',
    severity: SEVERITY_TO_FRONTEND[dbAnomaly.severity] || 'low',
    status: resolveStatus(dbAnomaly.resolvedAt, dbAnomaly.resolution),
    student: {
      name: studentName || 'Unknown',
      studentId: student?.studentId || null,
      class: className,
      avatarInitials,
    },
    description: dbAnomaly.description || '',
    location: dbAnomaly.metadata?.location || detectLocation(dbAnomaly.description),
    time: dbAnomaly.detectedAt?.toISOString() || null,
    detectedBy: dbAnomaly.metadata?.detectedBy || 'Auto-detection',
  };
}

function detectLocation(description) {
  if (!description) return '';
  if (description.includes('km away')) return extractLocationFromTravel(description);
  if (description.includes('Gate')) return extractGateLocation(description);
  return '';
}

function extractLocationFromTravel(desc) {
  return desc.includes('km') ? 'Location Jump Detected' : '';
}

function extractGateLocation(desc) {
  const gates = desc.match(/Gate [A-Z]/g);
  return gates ? gates.join(' → ') : '';
}

export const anomalyService = {
  async getStats(schoolId) {
    return anomalyRepository.getStats(schoolId);
  },

  async list(schoolId, query) {
    const { data, total, page, limit } = await anomalyRepository.findAll(schoolId, query);

    return {
      anomalies: data.map(formatAnomaly),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit,
      },
    };
  },

  async getOne(id, schoolId) {
    const anomaly = await anomalyRepository.findById(id, schoolId);
    if (!anomaly) throw ApiError.notFound('Anomaly not found');
    return formatAnomaly(anomaly);
  },

  async updateStatus(id, schoolId, status) {
    const anomaly = await anomalyRepository.findById(id, schoolId);
    if (!anomaly) throw ApiError.notFound('Anomaly not found');

    const currentStatus = resolveStatus(anomaly.resolvedAt, anomaly.resolution);
    if (currentStatus === status) {
      throw ApiError.badRequest(`Status is already '${status}'`);
    }

    const updated = await anomalyRepository.updateStatus(id, status);

    logger.info(
      { anomalyId: id, oldStatus: currentStatus, newStatus: status },
      '[anomaly] Status updated'
    );

    return {
      id: updated.id,
      status: resolveStatus(updated.resolvedAt, updated.resolution),
      updatedAt: updated.updatedAt.toISOString(),
    };
  },

  async getFilterOptions(schoolId) {
    return anomalyRepository.getFilterOptions(schoolId);
  },

  // Legacy export (kept for backward compatibility)
  async exportCsv(schoolId, query) {
    const anomalies = await anomalyRepository.findAllForExport(schoolId, query);

    const headers = [
      'id',
      'type',
      'severity',
      'status',
      'studentName',
      'studentId',
      'class',
      'description',
      'location',
      'time',
      'detectedBy',
    ];

    const rows = anomalies.map((a) => {
      const formatted = formatAnomaly(a);
      return [
        formatted.id,
        formatted.type,
        formatted.severity,
        formatted.status,
        `"${formatted.student.name}"`,
        formatted.student.studentId || '',
        formatted.student.class,
        `"${formatted.description}"`,
        formatted.location,
        formatted.time,
        formatted.detectedBy,
      ];
    });

    return { headers, rows };
  },

  // NEW: Streaming CSV export – memory efficient
  async exportCsvStream(schoolId, query, res) {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="anomalies.csv"');
    await anomalyRepository.streamExport(schoolId, query, res);
  },
};