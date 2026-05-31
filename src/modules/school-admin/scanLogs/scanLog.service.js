// TODO: Add implementation
// =============================================================================
// scanLog.service.js — RESQID
//
// Business logic for QR card scan log management.
//
// Responsibilities:
//   - Record incoming scan attempts with full context
//   - Enforce read access rules (school scope, parent-own-child guard)
//   - Trigger anomaly detection on suspicious scan patterns
//   - Produce dashboard stats and trend data
//
// Anomaly triggers wired here:
//   - RAPID_SCANS      → card scanned > RAPID_SCAN_THRESHOLD times in 60s
//   - REVOKED_CARD_SCAN → outcome is CARD_REVOKED or CARD_INACTIVE
// =============================================================================

import { ApiError } from '#shared/response/ApiError.js';
import { auditLog } from '#config/logger.js';
import { AUDIT_ACTION } from '#shared/constants/audit.js';
import { getPagination, paginateMeta } from '#shared/utils/paginate.js';
import { ROLES } from '#shared/constants/roles.js';
import * as repo from './scanLog.repository.js';

// ─── Config ───────────────────────────────────────────────────────────────────

// Fire RAPID_SCANS anomaly when card is scanned >= N times in 60 seconds
const RAPID_SCAN_THRESHOLD = 3;

// Outcomes that should always trigger a REVOKED_CARD_SCAN anomaly
const REVOKED_OUTCOMES = new Set(['CARD_REVOKED', 'CARD_INACTIVE', 'CARD_EXPIRED']);

// ─── Record ───────────────────────────────────────────────────────────────────

/**
 * Record a scan attempt.
 * Called by the emergency scan handler — every scan goes through here.
 *
 * Side-effects:
 *   - Audit log entry
 *   - Anomaly detection (lazy import to avoid circular deps)
 *
 * @param {object} payload
 * @param {string} payload.schoolId
 * @param {string} [payload.studentId]
 * @param {string} [payload.cardId]
 * @param {string} payload.outcome       — SCAN_OUTCOME value
 * @param {string} [payload.scannerIp]
 * @param {string} [payload.scannerAgent]
 * @param {string} [payload.location]
 * @param {object} [payload.metadata]
 */
export const recordScan = async (payload) => {
  const scanLog = await repo.createScanLog(payload);

  auditLog(AUDIT_ACTION.CARD_SCANNED, {
    scanLogId: scanLog.id,
    outcome:   payload.outcome,
    studentId: payload.studentId,
    cardId:    payload.cardId,
    schoolId:  payload.schoolId,
  });

  // Fire anomaly checks asynchronously — don't let detection failures
  // break the scan response path
  _checkAnomalies(payload, scanLog.id).catch((err) => {
    // Log but swallow — anomaly detection is non-critical
    import('#config/logger.js').then(({ logger }) =>
      logger.error({ err: err.message, scanLogId: scanLog.id }, 'Anomaly check failed')
    );
  });

  return scanLog;
};

// ─── List & Detail ────────────────────────────────────────────────────────────

/**
 * List scan logs.
 *
 * Access rules:
 *   SCHOOL_ADMIN / TEACHER → school-scoped, all students
 *   SUPER_ADMIN            → must supply schoolId as a filter
 *   PARENT                 → only their own children's SUCCESS logs
 *
 * @param {object} ctx
 * @param {object} ctx.user       req.user
 * @param {string} ctx.schoolId   req.schoolId (null for super admin)
 * @param {object} ctx.query      req.query
 */
export const listScanLogs = async ({ user, schoolId, query }) => {
  const { page, limit, skip, take } = getPagination(query);
  const filters = _extractFilters(query);

  // Parent can only view SUCCESS scans for their own children
  if (user.role === ROLES.PARENT) {
    return _listForParent({ user, query, filters, page, limit, skip, take });
  }

  // Super admin must scope by schoolId supplied in query
  const effectiveSchoolId = schoolId ?? filters.schoolId;
  if (!effectiveSchoolId) {
    throw ApiError.badRequest(
      'schoolId filter required for platform-wide queries',
      [],
      'SCHOOL_ID_REQUIRED'
    );
  }

  const { data, total } = await repo.listScanLogs({
    schoolId: effectiveSchoolId,
    filters,
    skip,
    take,
  });

  return { data, meta: paginateMeta(total, page, limit) };
};

/**
 * Get full detail for a single scan log.
 * PARENT role can only access logs for their own children.
 */
export const getScanLog = async (id, { user, schoolId }) => {
  const effectiveSchoolId = schoolId ?? null;

  // Fetch without schoolId restriction first for cross-role support
  // then apply role checks below
  const log = effectiveSchoolId
    ? await repo.findScanLogById(id, effectiveSchoolId)
    : await _findByIdAnySchool(id);

  if (!log) {
    throw ApiError.notFound('Scan log not found', 'SCAN_LOG_NOT_FOUND');
  }

  // Parent access guard — must be linked to the student on the log
  if (user.role === ROLES.PARENT) {
    await _assertParentOwnsStudent(user.id, log.studentId);
  }

  return log;
};

// ─── Stats ────────────────────────────────────────────────────────────────────

/**
 * Dashboard stats for a school: outcome counts + daily trend + hourly distribution.
 */
export const getSchoolStats = async ({ schoolId, query }) => {
  const days  = Math.min(30, parseInt(query.days) || 7);
  const range = { from: query.from, to: query.to };

  const [byOutcome, trend, hourly, topStudents] = await Promise.all([
    repo.countByOutcome(schoolId, range),
    repo.getDailyTrend(schoolId, days),
    repo.getHourlyDistribution(schoolId),
    repo.getTopScannedStudents(schoolId, 5),
  ]);

  return { byOutcome, trend, hourly, topStudents, days };
};

/**
 * Platform-wide scan stats for super admin.
 */
export const getGlobalStats = async () => {
  return repo.getGlobalStats();
};

/**
 * Recent scans for a specific student.
 * Used by the parent app home screen — SUCCESS only.
 */
export const getStudentScanHistory = async (studentId, { user, schoolId }) => {
  // Parent access guard
  if (user.role === ROLES.PARENT) {
    await _assertParentOwnsStudent(user.id, studentId);
  }

  return repo.findRecentScansForStudent(studentId, schoolId, 20);
};

// ─── Anomaly Detection (internal) ────────────────────────────────────────────

/**
 * Check incoming scan for anomaly patterns and fire detectAnomaly if needed.
 * Lazy-imports scanAnomaly.service to avoid circular dependency
 * (scanAnomaly doesn't depend on scanLog, but scanLog detects anomalies).
 */
async function _checkAnomalies(payload, scanLogId) {
  if (!payload.cardId || !payload.studentId) return;

  const { detectAnomaly, ANOMALY_TYPE } = await import(
    '../scanAnomaly/scanAnomaly.service.js'
  );

  // ── REVOKED_CARD_SCAN ──────────────────────────────────────────────────────
  if (REVOKED_OUTCOMES.has(payload.outcome)) {
    await detectAnomaly({
      schoolId:    payload.schoolId,
      studentId:   payload.studentId,
      cardId:      payload.cardId,
      scanLogId,
      type:        ANOMALY_TYPE.REVOKED_CARD_SCAN,
      description: `Scan attempt on ${payload.outcome.toLowerCase().replace(/_/g, ' ')} card`,
      metadata: {
        outcome:      payload.outcome,
        scannerIp:    payload.scannerIp,
        scannerAgent: payload.scannerAgent,
      },
    });
    return; // Don't double-fire rapid scan on the same event
  }

  // ── RAPID_SCANS ───────────────────────────────────────────────────────────
  // Count scans for this card in the last 60 seconds including this one
  const recent = await repo.findRecentScansForCard(payload.cardId, 60_000);

  if (recent.length >= RAPID_SCAN_THRESHOLD) {
    await detectAnomaly({
      schoolId:    payload.schoolId,
      studentId:   payload.studentId,
      cardId:      payload.cardId,
      scanLogId,
      type:        ANOMALY_TYPE.RAPID_SCANS,
      description: `Card scanned ${recent.length} times in 60 seconds`,
      metadata: {
        scanCount:  recent.length,
        windowSecs: 60,
        scannerIp:  payload.scannerIp,
      },
    });
  }
}

// ─── Private Helpers ──────────────────────────────────────────────────────────

function _extractFilters(query) {
  const filters = {};
  if (query.outcome)   filters.outcome   = query.outcome;
  if (query.studentId) filters.studentId = query.studentId;
  if (query.cardId)    filters.cardId    = query.cardId;
  if (query.schoolId)  filters.schoolId  = query.schoolId; // super admin override
  if (query.from)      filters.from      = query.from;
  if (query.to)        filters.to        = query.to;
  return filters;
}

async function _listForParent({ user, filters, page, limit, skip, take }) {
  // Parents can only see SUCCESS outcomes for their own children
  const { prisma } = await import('#config/prisma.js');

  // Get linked children
  const links = await prisma.parentStudent.findMany({
    where:  { parentId: user.id },
    select: { studentId: true },
  });

  if (links.length === 0) {
    return { data: [], meta: paginateMeta(0, page, limit) };
  }

  const childIds = links.map((l) => l.studentId);

  // If parent filters by studentId, validate it's their child
  if (filters.studentId && !childIds.includes(filters.studentId)) {
    throw ApiError.forbidden('Access restricted to your children', 'SCHOOL_ACCESS_DENIED');
  }

  // Fetch across all schools the children belong to — parents aren't school-scoped
  const { prisma: db } = await import('#config/prisma.js');
  const where = {
    studentId: filters.studentId
      ? filters.studentId
      : { in: childIds },
    outcome: 'SUCCESS',
  };
  if (filters.cardId) where.cardId = filters.cardId;
  if (filters.from || filters.to) {
    where.scannedAt = {};
    if (filters.from) where.scannedAt.gte = new Date(filters.from);
    if (filters.to)   where.scannedAt.lte = new Date(filters.to);
  }

  const [data, total] = await Promise.all([
    db.scanLog.findMany({
      where,
      select:  {
        id: true, outcome: true, scannedAt: true, location: true,
        student: { select: { id: true, name: true, rollNumber: true } },
        card:    { select: { id: true, cardNumber: true } },
      },
      orderBy: { scannedAt: 'desc' },
      skip,
      take,
    }),
    db.scanLog.count({ where }),
  ]);

  return { data, meta: paginateMeta(total, page, limit) };
}

async function _findByIdAnySchool(id) {
  const { prisma } = await import('#config/prisma.js');
  return prisma.scanLog.findUnique({
    where:  { id },
    select: {
      id: true, outcome: true, scannedAt: true, scannerIp: true,
      scannerAgent: true, location: true, metadata: true,
      schoolId: true, studentId: true, cardId: true,
      student: { select: { id: true, name: true, rollNumber: true, class: true, section: true } },
      card:    { select: { id: true, cardNumber: true, status: true } },
    },
  });
}

async function _assertParentOwnsStudent(parentId, studentId) {
  if (!studentId) {
    throw ApiError.forbidden('No student associated with this scan log', 'SCHOOL_ACCESS_DENIED');
  }

  const { prisma } = await import('#config/prisma.js');
  const link = await prisma.parentStudent.findFirst({
    where:  { parentId, studentId },
    select: { id: true },
  });

  if (!link) {
    throw ApiError.forbidden('Access restricted to your children', 'SCHOOL_ACCESS_DENIED');
  }
}