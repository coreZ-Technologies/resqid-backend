// TODO: Add implementation
// =============================================================================
// dashboard.service.js — RESQID School Admin / Overview
//
// Orchestrates all repository calls into a single cohesive dashboard response.
// Two public functions:
//   getDashboardStats    → all 7 stat cards in one parallel batch
//   getDashboardActivity → recent activity feed (5 streams merged + sorted)
//
// Both accept { schoolId, range } — range drives the window boundaries.
// =============================================================================

import { logger } from '#config/logger.js';
import { getRangeWindow, getWeekStart } from './dashboard.validation.js';
import * as repo from './dashboard.repository.js';

// =============================================================================
// STATS — all 7 stat cards
// =============================================================================

/**
 * Fetch all stat card data in a single parallel batch.
 * Any individual stat failure is caught and replaced with a null sentinel
 * so one broken model doesn't crater the entire dashboard.
 *
 * @param {{ schoolId: string, range: string }} opts
 * @returns {Promise<DashboardStats>}
 */
export async function getDashboardStats({ schoolId, range }) {
  const { rangeStart, rangeEnd, todayStart } = getRangeWindow(range);
  const weekStart = getWeekStart();

  const ctx = { schoolId, rangeStart, rangeEnd, todayStart, weekStart };

  // Fire all 7 queries in parallel — independent data sources
  const [students, tokens, emergency, scans, anomalies, attendance, parents] =
    await Promise.allSettled([
      repo.getStudentStats(ctx),
      repo.getTokenStats(ctx),
      repo.getEmergencyStats(ctx),
      repo.getScanStats(ctx),
      repo.getAnomalyStats(ctx),
      repo.getAttendanceStats(ctx),
      repo.getParentStats(ctx),
    ]);

  // Log any individual failures without crashing
  const labels = ['students', 'tokens', 'emergency', 'scans', 'anomalies', 'attendance', 'parents'];
  const results = [students, tokens, emergency, scans, anomalies, attendance, parents];

  results.forEach((result, i) => {
    if (result.status === 'rejected') {
      logger.error(
        { schoolId, stat: labels[i], err: result.reason?.message },
        `Dashboard stat failed: ${labels[i]}`
      );
    }
  });

  // Unwrap — null if the query failed (frontend renders a dash/error state)
  const unwrap = (result) => (result.status === 'fulfilled' ? result.value : null);

  return {
    range,
    rangeStart: rangeStart.toISOString(),
    rangeEnd:   rangeEnd.toISOString(),
    stats: {
      students:   unwrap(students),
      tokens:     unwrap(tokens),
      emergency:  unwrap(emergency),
      scans:      unwrap(scans),
      anomalies:  unwrap(anomalies),
      attendance: unwrap(attendance),
      parents:    unwrap(parents),
    },
  };
}

// =============================================================================
// ACTIVITY FEED — 5 streams merged and sorted
// =============================================================================

/**
 * Fetch all 5 recent-activity streams in parallel, normalise each item
 * into a unified ActivityEvent shape, then sort the merged list by timestamp
 * descending and return the top N.
 *
 * ActivityEvent shape:
 * {
 *   id:        string
 *   type:      'SCAN' | 'EMERGENCY' | 'ANOMALY' | 'STUDENT_ADDED' | 'CARD_ASSIGNED'
 *   timestamp: ISO string
 *   student:   { id, name, className } | null
 *   meta:      object   ← type-specific extra fields
 * }
 *
 * @param {{ schoolId: string, limit?: number }} opts
 */
export async function getDashboardActivity({ schoolId, limit = 20 }) {
  const PER_STREAM = 10; // fetch more per stream so merge has enough to pick from

  const [scans, emergencies, anomalies, students, cards] = await Promise.allSettled([
    repo.getRecentScans({ schoolId, limit: PER_STREAM }),
    repo.getRecentEmergencies({ schoolId, limit: PER_STREAM }),
    repo.getRecentAnomalies({ schoolId, limit: PER_STREAM }),
    repo.getRecentStudents({ schoolId, limit: PER_STREAM }),
    repo.getRecentCardAssignments({ schoolId, limit: PER_STREAM }),
  ]);

  const events = [];

  // ── Normalise scans ───────────────────────────────────────────────────────
  if (scans.status === 'fulfilled') {
    for (const s of scans.value) {
      events.push({
        id:        `scan:${s.id}`,
        type:      'SCAN',
        timestamp: s.scannedAt.toISOString(),
        student:   s.student ?? null,
        meta:      { location: s.location ?? null },
      });
    }
  } else {
    logger.warn({ schoolId, err: scans.reason?.message }, 'Activity feed: scans failed');
  }

  // ── Normalise emergencies ─────────────────────────────────────────────────
  if (emergencies.status === 'fulfilled') {
    for (const e of emergencies.value) {
      events.push({
        id:        `emergency:${e.id}`,
        type:      'EMERGENCY',
        timestamp: e.createdAt.toISOString(),
        student:   e.student ?? null,
        meta:      { status: e.status },
      });
    }
  } else {
    logger.warn({ schoolId, err: emergencies.reason?.message }, 'Activity feed: emergencies failed');
  }

  // ── Normalise anomalies ───────────────────────────────────────────────────
  if (anomalies.status === 'fulfilled') {
    for (const a of anomalies.value) {
      events.push({
        id:        `anomaly:${a.id}`,
        type:      'ANOMALY',
        timestamp: a.createdAt.toISOString(),
        student:   a.student ?? null,
        meta:      {
          anomalyType: a.anomalyType,
          resolved:    a.resolvedAt !== null,
        },
      });
    }
  } else {
    logger.warn({ schoolId, err: anomalies.reason?.message }, 'Activity feed: anomalies failed');
  }

  // ── Normalise student additions ───────────────────────────────────────────
  if (students.status === 'fulfilled') {
    for (const s of students.value) {
      events.push({
        id:        `student:${s.id}`,
        type:      'STUDENT_ADDED',
        timestamp: s.createdAt.toISOString(),
        student:   { id: s.id, name: s.name, className: s.className },
        meta:      { isActive: s.isActive },
      });
    }
  } else {
    logger.warn({ schoolId, err: students.reason?.message }, 'Activity feed: students failed');
  }

  // ── Normalise card assignments ────────────────────────────────────────────
  if (cards.status === 'fulfilled') {
    for (const c of cards.value) {
      if (!c.assignedAt) continue; // skip tokens never assigned
      events.push({
        id:        `card:${c.id}`,
        type:      'CARD_ASSIGNED',
        timestamp: c.assignedAt.toISOString(),
        student:   c.student ?? null,
        meta:      { cardStatus: c.status },
      });
    }
  } else {
    logger.warn({ schoolId, err: cards.reason?.message }, 'Activity feed: cards failed');
  }

  // ── Sort merged list descending by timestamp, return top N ────────────────
  events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return {
    activity: events.slice(0, limit),
    total:    events.length,
  };
}