// TODO: Add implementation
// =============================================================================
// dashboard.repository.js — RESQID School Admin / Overview
//
// All Prisma queries for the school-admin dashboard.
// Every query is school-scoped (schoolId filter mandatory).
// Queries are grouped by stat section — mirrors the service layer structure.
//
// Design notes:
//   - Promise.all() batches used wherever queries are independent.
//   - Only the fields needed for display are selected (no fat SELECT *).
//   - "today" and "week" sub-counts are derived in a single pass where possible.
// =============================================================================

import { prisma } from '#config/prisma.js';

// =============================================================================
// STUDENTS
// =============================================================================

/**
 * Total students, split by isActive.
 * Also returns count created within the range window (trend).
 */
export async function getStudentStats({ schoolId, rangeStart }) {
  const [total, active, addedInRange] = await Promise.all([
    prisma.student.count({ where: { schoolId } }),

    prisma.student.count({ where: { schoolId, isActive: true } }),

    prisma.student.count({
      where: { schoolId, createdAt: { gte: rangeStart } },
    }),
  ]);

  return {
    total,
    active,
    inactive: total - active,
    addedInRange,
  };
}

// =============================================================================
// TOKENS / CARDS
// =============================================================================

/**
 * Token stats — assigned vs unassigned, expiring soon (within 30 days).
 *
 * Assumes Token model has:
 *   schoolId, status (UNASSIGNED | ASSIGNED | ACTIVE | DEACTIVATED),
 *   expiresAt (nullable)
 */
export async function getTokenStats({ schoolId }) {
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setUTCDate(thirtyDaysFromNow.getUTCDate() + 30);

  const [total, assigned, unassigned, expiringSoon] = await Promise.all([
    prisma.token.count({
      where: { schoolId, status: { not: 'DEACTIVATED' } },
    }),

    prisma.token.count({
      where: { schoolId, status: { in: ['ASSIGNED', 'ACTIVE'] } },
    }),

    prisma.token.count({
      where: { schoolId, status: 'UNASSIGNED' },
    }),

    prisma.token.count({
      where: {
        schoolId,
        status: { in: ['ASSIGNED', 'ACTIVE'] },
        expiresAt: { lte: thirtyDaysFromNow, gte: new Date() },
      },
    }),
  ]);

  return { total, assigned, unassigned, expiringSoon };
}

// =============================================================================
// EMERGENCY ALERTS
// =============================================================================

/**
 * Emergency alert counts — today and this week, plus range total.
 *
 * Assumes EmergencyAlert model with: schoolId, createdAt, status
 */
export async function getEmergencyStats({ schoolId, rangeStart, todayStart, weekStart }) {
  const [today, thisWeek, inRange] = await Promise.all([
    prisma.emergencyAlert.count({
      where: { schoolId, createdAt: { gte: todayStart } },
    }),

    prisma.emergencyAlert.count({
      where: { schoolId, createdAt: { gte: weekStart } },
    }),

    prisma.emergencyAlert.count({
      where: { schoolId, createdAt: { gte: rangeStart } },
    }),
  ]);

  return { today, thisWeek, inRange };
}

// =============================================================================
// SCAN LOGS
// =============================================================================

/**
 * QR scan counts — today, this week, and within selected range.
 *
 * Assumes ScanLog model with: schoolId, scannedAt
 */
export async function getScanStats({ schoolId, rangeStart, todayStart, weekStart }) {
  const [today, thisWeek, inRange] = await Promise.all([
    prisma.scanLog.count({
      where: { schoolId, scannedAt: { gte: todayStart } },
    }),

    prisma.scanLog.count({
      where: { schoolId, scannedAt: { gte: weekStart } },
    }),

    prisma.scanLog.count({
      where: { schoolId, scannedAt: { gte: rangeStart } },
    }),
  ]);

  return { today, thisWeek, inRange };
}

// =============================================================================
// SCAN ANOMALIES
// =============================================================================

/**
 * Unresolved anomaly count, plus how many appeared in the selected range.
 *
 * Assumes ScanAnomaly model with: schoolId, resolvedAt (nullable), createdAt
 */
export async function getAnomalyStats({ schoolId, rangeStart }) {
  const [unresolved, inRange] = await Promise.all([
    prisma.scanAnomaly.count({
      where: { schoolId, resolvedAt: null },
    }),

    prisma.scanAnomaly.count({
      where: { schoolId, createdAt: { gte: rangeStart } },
    }),
  ]);

  return { unresolved, inRange };
}

// =============================================================================
// ATTENDANCE
// =============================================================================

/**
 * Today's attendance summary as a percentage.
 *
 * Queries today's attendance session records for this school.
 * Returns present/total and a derived percentage.
 *
 * Assumes Attendance model with: schoolId, date (Date), status ('PRESENT'|'ABSENT'|…)
 */
export async function getAttendanceStats({ schoolId, todayStart }) {
  const [total, present] = await Promise.all([
    prisma.attendance.count({
      where: { schoolId, date: { gte: todayStart } },
    }),

    prisma.attendance.count({
      where: { schoolId, date: { gte: todayStart }, status: 'PRESENT' },
    }),
  ]);

  const percentage = total > 0 ? Math.round((present / total) * 100) : null;

  return { present, total, percentage };
}

// =============================================================================
// PARENTS
// =============================================================================

/**
 * Count of parents with at least one active child link in this school.
 *
 * Assumes ParentStudent join model with: schoolId (or via student.schoolId),
 * and Parent.isActive flag.
 *
 * Uses a nested filter: parents where any linked student belongs to this school.
 */
export async function getParentStats({ schoolId }) {
  const activeParents = await prisma.parent.count({
    where: {
      isActive: true,
      children: {
        some: {
          student: { schoolId },
        },
      },
    },
  });

  return { activeParents };
}

// =============================================================================
// RECENT ACTIVITY FEED
// =============================================================================

// ─── Recent QR scans ──────────────────────────────────────────────────────────

export async function getRecentScans({ schoolId, limit = 10 }) {
  return prisma.scanLog.findMany({
    where: { schoolId },
    orderBy: { scannedAt: 'desc' },
    take: limit,
    select: {
      id:        true,
      scannedAt: true,
      location:  true,
      student: {
        select: { id: true, name: true, className: true },
      },
    },
  });
}

// ─── Recent emergency triggers ────────────────────────────────────────────────

export async function getRecentEmergencies({ schoolId, limit = 5 }) {
  return prisma.emergencyAlert.findMany({
    where: { schoolId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id:        true,
      createdAt: true,
      status:    true,
      student: {
        select: { id: true, name: true, className: true },
      },
    },
  });
}

// ─── Recent anomalies ─────────────────────────────────────────────────────────

export async function getRecentAnomalies({ schoolId, limit = 5 }) {
  return prisma.scanAnomaly.findMany({
    where: { schoolId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id:          true,
      createdAt:   true,
      anomalyType: true,
      resolvedAt:  true,
      student: {
        select: { id: true, name: true, className: true },
      },
    },
  });
}

// ─── Recent student additions ─────────────────────────────────────────────────

export async function getRecentStudents({ schoolId, limit = 5 }) {
  return prisma.student.findMany({
    where: { schoolId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id:        true,
      name:      true,
      className: true,
      isActive:  true,
      createdAt: true,
    },
  });
}

// ─── Recent card assignments ──────────────────────────────────────────────────

export async function getRecentCardAssignments({ schoolId, limit = 5 }) {
  return prisma.token.findMany({
    where: {
      schoolId,
      status: { in: ['ASSIGNED', 'ACTIVE'] },
    },
    orderBy: { assignedAt: 'desc' },
    take: limit,
    select: {
      id:         true,
      status:     true,
      assignedAt: true,
      student: {
        select: { id: true, name: true, className: true },
      },
    },
  });
}