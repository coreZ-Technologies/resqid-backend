// TODO: Add implementation
// =============================================================================
// scanLog.repository.js — RESQID
//
// Raw Prisma data access for QR card scan logs.
// No business logic here — pure DB operations only.
//
// A ScanLog record is created every time a QR code is presented,
// whether the scan succeeds, fails, or is blocked.
//
// Scan outcomes tracked:
//   SUCCESS         → Card valid, emergency profile served
//   CARD_NOT_FOUND  → Token did not resolve to any card
//   CARD_INACTIVE   → Card exists but is deactivated
//   CARD_REVOKED    → Card has been revoked
//   CARD_EXPIRED    → Card past its expiry date
//   RATE_LIMITED    → Scan throttled (too many scans in window)
//   BLOCKED         → School or student explicitly blocked
// =============================================================================

import { prisma } from '#config/prisma.js';

// ─── Create ──────────────────────────────────────────────────────────────────

/**
 * Persist a new scan log entry.
 * Called by the emergency scan handler for every inbound scan attempt.
 */
export const createScanLog = async (data) => {
  return prisma.scanLog.create({
    data: {
      schoolId:       data.schoolId,
      studentId:      data.studentId   ?? null,
      cardId:         data.cardId      ?? null,
      outcome:        data.outcome,
      scannerIp:      data.scannerIp   ?? null,
      scannerAgent:   data.scannerAgent ?? null,
      location:       data.location    ?? null,  // free-text or geo string
      metadata:       data.metadata    ?? {},
      scannedAt:      data.scannedAt   ?? new Date(),
    },
    select: _scanLogSelect,
  });
};

// ─── Read ─────────────────────────────────────────────────────────────────────

/**
 * List scan logs for a school with optional filters and pagination.
 */
export const listScanLogs = async ({ schoolId, filters = {}, skip = 0, take = 20 }) => {
  const where = _buildWhere(schoolId, filters);

  const [data, total] = await Promise.all([
    prisma.scanLog.findMany({
      where,
      select:  _scanLogListSelect,
      orderBy: { scannedAt: 'desc' },
      skip,
      take,
    }),
    prisma.scanLog.count({ where }),
  ]);

  return { data, total };
};

/**
 * Find a single scan log by ID, scoped to a school.
 * Returns null if not found or belongs to another school.
 */
export const findScanLogById = async (id, schoolId) => {
  return prisma.scanLog.findFirst({
    where: { id, schoolId },
    select: _scanLogDetailSelect,
  });
};

/**
 * Recent scans for a specific card — used by anomaly detection
 * to check scan velocity within a rolling window.
 *
 * @param {string} cardId
 * @param {number} windowMs   Rolling window in ms (default: 60 seconds)
 * @param {number} limit      Max records to return (default: 10)
 */
export const findRecentScansForCard = async (cardId, windowMs = 60_000, limit = 10) => {
  const since = new Date(Date.now() - windowMs);

  return prisma.scanLog.findMany({
    where: {
      cardId,
      scannedAt: { gte: since },
    },
    select: { id: true, scannedAt: true, outcome: true, scannerIp: true },
    orderBy: { scannedAt: 'desc' },
    take: limit,
  });
};

/**
 * Recent scans for a specific student — used by the parent app
 * to show who scanned their child's card and when.
 */
export const findRecentScansForStudent = async (studentId, schoolId, limit = 20) => {
  return prisma.scanLog.findMany({
    where: { studentId, schoolId, outcome: 'SUCCESS' },
    select: _scanLogListSelect,
    orderBy: { scannedAt: 'desc' },
    take: limit,
  });
};

// ─── Aggregate / Stats ────────────────────────────────────────────────────────

/**
 * Count scan outcomes for a school within a date range.
 * Returns { SUCCESS: n, CARD_NOT_FOUND: n, ... } shape.
 */
export const countByOutcome = async (schoolId, { from, to } = {}) => {
  const where = { schoolId };
  if (from || to) {
    where.scannedAt = {};
    if (from) where.scannedAt.gte = new Date(from);
    if (to)   where.scannedAt.lte = new Date(to);
  }

  const rows = await prisma.scanLog.groupBy({
    by:     ['outcome'],
    where,
    _count: { id: true },
  });

  return Object.fromEntries(rows.map((r) => [r.outcome, r._count.id]));
};

/**
 * Daily scan volume trend for a school over the last N days.
 * Used for sparkline charts in the school admin dashboard.
 *
 * Uses $queryRaw — Prisma groupBy can't do DATE_TRUNC cleanly.
 */
export const getDailyTrend = async (schoolId, days = 7) => {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const rows = await prisma.$queryRaw`
    SELECT
      DATE_TRUNC('day', "scannedAt") AS day,
      COUNT(*)::int                  AS total,
      COUNT(*) FILTER (WHERE outcome = 'SUCCESS')::int AS successful
    FROM "ScanLog"
    WHERE "schoolId"  = ${schoolId}
      AND "scannedAt" >= ${since}
    GROUP BY 1
    ORDER BY 1 ASC
  `;

  return rows.map((r) => ({
    day:        r.day,
    total:      Number(r.total),       // BigInt → number
    successful: Number(r.successful),
  }));
};

/**
 * Hourly scan distribution for a school (last 30 days).
 * Shows which hours of the day see the most scan activity.
 * Useful for detecting off-hours anomalies.
 */
export const getHourlyDistribution = async (schoolId) => {
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const rows = await prisma.$queryRaw`
    SELECT
      EXTRACT(HOUR FROM "scannedAt")::int AS hour,
      COUNT(*)::int                       AS count
    FROM "ScanLog"
    WHERE "schoolId"  = ${schoolId}
      AND "scannedAt" >= ${since}
    GROUP BY 1
    ORDER BY 1 ASC
  `;

  // Normalise to full 0-23 array (fill missing hours with 0)
  const map = Object.fromEntries(rows.map((r) => [r.hour, Number(r.count)]));
  return Array.from({ length: 24 }, (_, h) => ({
    hour:  h,
    count: map[h] ?? 0,
  }));
};

/**
 * Top N most-scanned students in a school.
 * Used to surface potential targets of interest or anomalous attention.
 */
export const getTopScannedStudents = async (schoolId, limit = 10) => {
  const rows = await prisma.$queryRaw`
    SELECT
      sl."studentId",
      s."name",
      s."rollNumber",
      COUNT(sl.id)::int AS "scanCount"
    FROM "ScanLog" sl
    JOIN "Student" s ON s.id = sl."studentId"
    WHERE sl."schoolId" = ${schoolId}
      AND sl."studentId" IS NOT NULL
    GROUP BY sl."studentId", s."name", s."rollNumber"
    ORDER BY "scanCount" DESC
    LIMIT ${limit}
  `;

  return rows.map((r) => ({ ...r, scanCount: Number(r.scanCount) }));
};

/**
 * Platform-wide scan stats for super admin overview.
 */
export const getGlobalStats = async () => {
  const [total, byOutcome] = await Promise.all([
    prisma.scanLog.count(),
    prisma.scanLog.groupBy({
      by:     ['outcome'],
      _count: { id: true },
    }),
  ]);

  return {
    total,
    byOutcome: Object.fromEntries(byOutcome.map((r) => [r.outcome, r._count.id])),
  };
};

// ─── Private Helpers ──────────────────────────────────────────────────────────

function _buildWhere(schoolId, filters) {
  const where = { schoolId };

  if (filters.outcome)   where.outcome   = filters.outcome;
  if (filters.studentId) where.studentId = filters.studentId;
  if (filters.cardId)    where.cardId    = filters.cardId;

  if (filters.from || filters.to) {
    where.scannedAt = {};
    if (filters.from) where.scannedAt.gte = new Date(filters.from);
    if (filters.to)   where.scannedAt.lte = new Date(filters.to);
  }

  return where;
}

// Minimal select for list views
const _scanLogListSelect = {
  id:           true,
  outcome:      true,
  scannedAt:    true,
  scannerIp:    true,
  location:     true,
  student: {
    select: { id: true, name: true, rollNumber: true },
  },
  card: {
    select: { id: true, cardNumber: true },
  },
};

// Rich select for single-record detail view
const _scanLogDetailSelect = {
  id:           true,
  outcome:      true,
  scannedAt:    true,
  scannerIp:    true,
  scannerAgent: true,
  location:     true,
  metadata:     true,
  schoolId:     true,
  studentId:    true,
  cardId:       true,
  student: {
    select: { id: true, name: true, rollNumber: true, class: true, section: true },
  },
  card: {
    select: { id: true, cardNumber: true, status: true },
  },
};

// Minimal fields returned after create
const _scanLogSelect = {
  id:        true,
  outcome:   true,
  scannedAt: true,
  studentId: true,
  cardId:    true,
};