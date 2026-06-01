// TODO: Add implementation
// =============================================================================
// scanAnomaly.repository.js — RESQID
//
// Raw Prisma data access for scan anomalies.
// No business logic here — pure DB operations only.
//
// Anomaly types tracked:
//   RAPID_SCANS       → Multiple scans in a short window
//   OFF_HOURS_SCAN    → Scan outside school operating hours
//   UNKNOWN_LOCATION  → Scan from unexpected geo
//   SUSPICIOUS_AGENT  → Unusual user-agent / headless browser
//   REVOKED_CARD_SCAN → Scan of a deactivated or revoked card
//   DUPLICATE_SCAN    → Same card scanned twice in short window
// =============================================================================

import { prisma } from '#config/prisma.js';

// ─── Create ──────────────────────────────────────────────────────────────────

/**
 * Persist a new scan anomaly record.
 */
export const createAnomaly = async (data) => {
  return prisma.scanAnomaly.create({
    data: {
      schoolId:    data.schoolId,
      studentId:   data.studentId,
      cardId:      data.cardId,
      scanLogId:   data.scanLogId ?? null,
      type:        data.type,
      severity:    data.severity,
      description: data.description ?? null,
      metadata:    data.metadata ?? {},
      detectedAt:  data.detectedAt ?? new Date(),
      status:      'OPEN',
      resolvedAt:  null,
      resolvedBy:  null,
      resolution:  null,
    },
    select: _anomalySelect,
  });
};

// ─── Read ─────────────────────────────────────────────────────────────────────

/**
 * List anomalies for a school with optional filters and pagination.
 */
export const listAnomalies = async ({ schoolId, filters = {}, skip = 0, take = 20 }) => {
  const where = _buildWhere(schoolId, filters);

  const [data, total] = await Promise.all([
    prisma.scanAnomaly.findMany({
      where,
      select:  _anomalyListSelect,
      orderBy: { detectedAt: 'desc' },
      skip,
      take,
    }),
    prisma.scanAnomaly.count({ where }),
  ]);

  return { data, total };
};

/**
 * Find a single anomaly by ID, scoped to a school.
 * Returns null if not found or belongs to another school.
 */
export const findAnomalyById = async (id, schoolId) => {
  return prisma.scanAnomaly.findFirst({
    where: { id, schoolId },
    select: _anomalyDetailSelect,
  });
};

/**
 * Count open anomalies per type for a school — used in dashboard widgets.
 */
export const countByType = async (schoolId) => {
  const rows = await prisma.scanAnomaly.groupBy({
    by:     ['type'],
    where:  { schoolId, status: 'OPEN' },
    _count: { id: true },
  });

  // Normalize to { [type]: count }
  return Object.fromEntries(rows.map((r) => [r.type, r._count.id]));
};

/**
 * Count anomalies for a specific student (all time, all statuses).
 * Used when rendering a student's risk profile.
 */
export const countByStudent = async (studentId, schoolId) => {
  return prisma.scanAnomaly.count({
    where: { studentId, schoolId },
  });
};

/**
 * Check whether a RAPID_SCANS anomaly was already created for this
 * card within the de-dup window (default 5 minutes).
 * Prevents flooding the anomaly table on high-frequency taps.
 */
export const findRecentRapidScan = async (cardId, windowMs = 5 * 60 * 1000) => {
  const since = new Date(Date.now() - windowMs);
  return prisma.scanAnomaly.findFirst({
    where: {
      cardId,
      type:        'RAPID_SCANS',
      detectedAt:  { gte: since },
    },
    select: { id: true },
  });
};

// ─── Update ───────────────────────────────────────────────────────────────────

/**
 * Resolve an anomaly — sets status to RESOLVED and records who/why.
 */
export const resolveAnomaly = async (id, schoolId, { resolvedBy, resolution }) => {
  return prisma.scanAnomaly.updateMany({
    where:  { id, schoolId, status: { not: 'RESOLVED' } },
    data: {
      status:     'RESOLVED',
      resolvedAt: new Date(),
      resolvedBy,
      resolution,
    },
  });
};

/**
 * Mark an anomaly as ignored — suppresses alerts without a full review.
 */
export const ignoreAnomaly = async (id, schoolId, { resolvedBy, resolution }) => {
  return prisma.scanAnomaly.updateMany({
    where: { id, schoolId, status: { not: 'RESOLVED' } },
    data: {
      status:     'IGNORED',
      resolvedAt: new Date(),
      resolvedBy,
      resolution: resolution ?? 'Marked as ignored',
    },
  });
};

/**
 * Bulk-resolve all OPEN anomalies for a specific student.
 * Called when a parent / admin clears a student's risk flag.
 */
export const resolveAllForStudent = async (studentId, schoolId, { resolvedBy, resolution }) => {
  return prisma.scanAnomaly.updateMany({
    where:  { studentId, schoolId, status: 'OPEN' },
    data: {
      status:     'RESOLVED',
      resolvedAt: new Date(),
      resolvedBy,
      resolution,
    },
  });
};

// ─── Stats ────────────────────────────────────────────────────────────────────

/**
 * Aggregate anomaly stats for super-admin reporting.
 * Returns counts grouped by severity across all schools.
 */
export const getGlobalStats = async () => {
  const rows = await prisma.scanAnomaly.groupBy({
    by:     ['severity', 'status'],
    _count: { id: true },
  });

  const stats = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, total: 0 };

  for (const row of rows) {
    stats[row.severity] = (stats[row.severity] ?? 0) + row._count.id;
    stats.total += row._count.id;
  }

  return stats;
};

/**
 * Trend data — daily anomaly counts for the last N days (school-scoped).
 * Used for sparkline charts in the school admin dashboard.
 */
export const getDailyTrend = async (schoolId, days = 7) => {
  const since = new Date();
  since.setDate(since.getDate() - days);

  // $queryRaw for DATE_TRUNC grouping — Prisma groupBy can't do this cleanly
  const rows = await prisma.$queryRaw`
    SELECT
      DATE_TRUNC('day', "detectedAt") AS day,
      COUNT(*)::int                   AS count
    FROM "ScanAnomaly"
    WHERE "schoolId"   = ${schoolId}
      AND "detectedAt" >= ${since}
    GROUP BY 1
    ORDER BY 1 ASC
  `;

  return rows.map((r) => ({
    day:   r.day,
    count: Number(r.count), // BigInt → number
  }));
};

// ─── Private Helpers ──────────────────────────────────────────────────────────

function _buildWhere(schoolId, filters) {
  const where = { schoolId };

  if (filters.status)    where.status   = filters.status;
  if (filters.severity)  where.severity = filters.severity;
  if (filters.type)      where.type     = filters.type;
  if (filters.studentId) where.studentId = filters.studentId;
  if (filters.cardId)    where.cardId   = filters.cardId;

  if (filters.from || filters.to) {
    where.detectedAt = {};
    if (filters.from) where.detectedAt.gte = new Date(filters.from);
    if (filters.to)   where.detectedAt.lte = new Date(filters.to);
  }

  return where;
}

// Minimal select for list views — no heavy joins
const _anomalyListSelect = {
  id:          true,
  type:        true,
  severity:    true,
  status:      true,
  description: true,
  detectedAt:  true,
  student: {
    select: { id: true, name: true, rollNumber: true },
  },
};

// Rich select for single-record detail view
const _anomalyDetailSelect = {
  id:          true,
  type:        true,
  severity:    true,
  status:      true,
  description: true,
  metadata:    true,
  detectedAt:  true,
  resolvedAt:  true,
  resolvedBy:  true,
  resolution:  true,
  schoolId:    true,
  studentId:   true,
  cardId:      true,
  scanLogId:   true,
  student: {
    select: { id: true, name: true, rollNumber: true, class: true, section: true },
  },
  card: {
    select: { id: true, cardNumber: true, status: true },
  },
};

// Minimal fields returned after create
const _anomalySelect = {
  id:         true,
  type:       true,
  severity:   true,
  status:     true,
  detectedAt: true,
  studentId:  true,
  cardId:     true,
};