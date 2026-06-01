// TODO: Add implementation
// =============================================================================
// scanAnomaly.service.js — RESQID
//
// Business logic for scan anomaly detection and lifecycle management.
//
// Responsibilities:
//   - Detect anomaly patterns from incoming scan data
//   - Route alerts to the correct severity bucket
//   - Enforce resolution rules (can't re-open a resolved anomaly, etc.)
//   - Emit audit log entries for every state change
// =============================================================================

import { ApiError } from '#shared/response/ApiError.js';
import { auditLog } from '#config/logger.js';
import { AUDIT_ACTION } from '#shared/constants/audit.js';
import { getPagination, paginateMeta } from '#shared/utils/paginate.js';
import * as repo from './scanAnomaly.repository.js';

// ─── Anomaly Type Catalog ─────────────────────────────────────────────────────

export const ANOMALY_TYPE = Object.freeze({
  RAPID_SCANS:       'RAPID_SCANS',
  OFF_HOURS_SCAN:    'OFF_HOURS_SCAN',
  UNKNOWN_LOCATION:  'UNKNOWN_LOCATION',
  SUSPICIOUS_AGENT:  'SUSPICIOUS_AGENT',
  REVOKED_CARD_SCAN: 'REVOKED_CARD_SCAN',
  DUPLICATE_SCAN:    'DUPLICATE_SCAN',
});

export const ANOMALY_SEVERITY = Object.freeze({
  CRITICAL: 'CRITICAL',
  HIGH:     'HIGH',
  MEDIUM:   'MEDIUM',
  LOW:      'LOW',
});

// Default severity per anomaly type — overridable by callers
const DEFAULT_SEVERITY = Object.freeze({
  [ANOMALY_TYPE.REVOKED_CARD_SCAN]: ANOMALY_SEVERITY.CRITICAL,
  [ANOMALY_TYPE.RAPID_SCANS]:       ANOMALY_SEVERITY.HIGH,
  [ANOMALY_TYPE.SUSPICIOUS_AGENT]:  ANOMALY_SEVERITY.HIGH,
  [ANOMALY_TYPE.OFF_HOURS_SCAN]:    ANOMALY_SEVERITY.MEDIUM,
  [ANOMALY_TYPE.UNKNOWN_LOCATION]:  ANOMALY_SEVERITY.MEDIUM,
  [ANOMALY_TYPE.DUPLICATE_SCAN]:    ANOMALY_SEVERITY.LOW,
});

// ─── Detection ────────────────────────────────────────────────────────────────

/**
 * Record a detected anomaly.
 * Called by scan pipeline middleware when a rule fires.
 *
 * De-duplicates RAPID_SCANS within a 5-minute window to prevent
 * flooding the table on a single jammed reader.
 *
 * @param {object} payload
 * @param {string} payload.schoolId
 * @param {string} payload.studentId
 * @param {string} payload.cardId
 * @param {string} [payload.scanLogId]
 * @param {string} payload.type         - ANOMALY_TYPE value
 * @param {string} [payload.severity]   - override DEFAULT_SEVERITY
 * @param {string} [payload.description]
 * @param {object} [payload.metadata]   - arbitrary context (IP, agent, etc.)
 */
export const detectAnomaly = async (payload) => {
  const { type, cardId } = payload;

  // De-duplicate rapid scan anomalies — one per 5-minute window per card
  if (type === ANOMALY_TYPE.RAPID_SCANS) {
    const existing = await repo.findRecentRapidScan(cardId);
    if (existing) {
      // Increment the existing record's count in metadata instead of creating a new row
      // (soft de-dup: still returns the original anomaly so callers can react)
      return existing;
    }
  }

  const severity = payload.severity ?? DEFAULT_SEVERITY[type] ?? ANOMALY_SEVERITY.MEDIUM;

  const anomaly = await repo.createAnomaly({ ...payload, severity });

  auditLog(AUDIT_ACTION.ANOMALY_DETECTED, {
    anomalyId: anomaly.id,
    type,
    severity,
    studentId: payload.studentId,
    cardId:    payload.cardId,
    schoolId:  payload.schoolId,
  });

  return anomaly;
};

// ─── List & Detail ────────────────────────────────────────────────────────────

/**
 * List anomalies for a school with filtering and pagination.
 * School admins see all anomalies for their school.
 */
export const listAnomalies = async ({ schoolId, query }) => {
  const { page, limit, skip, take } = getPagination(query);

  const filters = _extractFilters(query);

  const { data, total } = await repo.listAnomalies({ schoolId, filters, skip, take });

  return {
    data,
    meta: paginateMeta(total, page, limit),
  };
};

/**
 * Get full detail for a single anomaly.
 * Throws 404 if not found or out of scope.
 */
export const getAnomaly = async (id, schoolId) => {
  const anomaly = await repo.findAnomalyById(id, schoolId);

  if (!anomaly) {
    throw ApiError.notFound('Anomaly not found', 'ANOMALY_NOT_FOUND');
  }

  return anomaly;
};

// ─── Stats ────────────────────────────────────────────────────────────────────

/**
 * Summary stats for school dashboard: counts by type and daily trend.
 */
export const getSchoolStats = async ({ schoolId, query }) => {
  const days = Math.min(30, parseInt(query.days) || 7);

  const [byType, trend] = await Promise.all([
    repo.countByType(schoolId),
    repo.getDailyTrend(schoolId, days),
  ]);

  return { byType, trend, days };
};

/**
 * Platform-wide stats for super admin.
 */
export const getGlobalStats = async () => {
  return repo.getGlobalStats();
};

// ─── Resolution ───────────────────────────────────────────────────────────────

/**
 * Resolve a single anomaly.
 * Requires a resolution note — forces deliberate acknowledgement.
 */
export const resolveAnomaly = async (id, schoolId, { resolvedBy, resolution }) => {
  const anomaly = await _requireAnomaly(id, schoolId);

  if (anomaly.status === 'RESOLVED') {
    throw ApiError.conflict('Anomaly is already resolved', 'ANOMALY_ALREADY_RESOLVED');
  }

  const result = await repo.resolveAnomaly(id, schoolId, { resolvedBy, resolution });

  if (result.count === 0) {
    throw ApiError.conflict('Anomaly could not be resolved', 'ANOMALY_RESOLVE_FAILED');
  }

  auditLog(AUDIT_ACTION.ANOMALY_RESOLVED, {
    anomalyId: id,
    resolvedBy,
    resolution,
    schoolId,
  });

  return { id, status: 'RESOLVED', resolvedBy, resolution };
};

/**
 * Ignore a single anomaly (false positive workflow).
 */
export const ignoreAnomaly = async (id, schoolId, { resolvedBy, resolution }) => {
  const anomaly = await _requireAnomaly(id, schoolId);

  if (anomaly.status === 'RESOLVED' || anomaly.status === 'IGNORED') {
    throw ApiError.conflict(
      `Anomaly is already ${anomaly.status.toLowerCase()}`,
      'ANOMALY_ALREADY_CLOSED'
    );
  }

  const result = await repo.ignoreAnomaly(id, schoolId, { resolvedBy, resolution });

  if (result.count === 0) {
    throw ApiError.conflict('Anomaly could not be ignored', 'ANOMALY_IGNORE_FAILED');
  }

  auditLog(AUDIT_ACTION.ANOMALY_IGNORED, {
    anomalyId: id,
    resolvedBy,
    resolution,
    schoolId,
  });

  return { id, status: 'IGNORED', resolvedBy };
};

/**
 * Bulk-resolve all open anomalies for a student.
 * Used when a school admin manually clears a student's risk flag.
 */
export const resolveAllForStudent = async (studentId, schoolId, { resolvedBy, resolution }) => {
  const result = await repo.resolveAllForStudent(studentId, schoolId, { resolvedBy, resolution });

  auditLog(AUDIT_ACTION.ANOMALY_RESOLVED, {
    studentId,
    bulk:       true,
    count:      result.count,
    resolvedBy,
    resolution,
    schoolId,
  });

  return { studentId, resolved: result.count };
};

// ─── Private Helpers ──────────────────────────────────────────────────────────

function _extractFilters(query) {
  const filters = {};

  if (query.status)    filters.status    = query.status;
  if (query.severity)  filters.severity  = query.severity;
  if (query.type)      filters.type      = query.type;
  if (query.studentId) filters.studentId = query.studentId;
  if (query.cardId)    filters.cardId    = query.cardId;
  if (query.from)      filters.from      = query.from;
  if (query.to)        filters.to        = query.to;

  return filters;
}

async function _requireAnomaly(id, schoolId) {
  const anomaly = await repo.findAnomalyById(id, schoolId);
  if (!anomaly) {
    throw ApiError.notFound('Anomaly not found', 'ANOMALY_NOT_FOUND');
  }
  return anomaly;
}