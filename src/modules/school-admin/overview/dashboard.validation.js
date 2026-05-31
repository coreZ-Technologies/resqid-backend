// TODO: Add implementation
// =============================================================================
// dashboard.validation.js — RESQID School Admin / Overview
//
// Validates the single query param that drives the entire dashboard:
//   ?range=7d | 30d | 90d
//
// All dashboard endpoints share this same schema — import once, use everywhere.
// =============================================================================

import { z } from 'zod';

// ─── Allowed range values ─────────────────────────────────────────────────────

export const DASHBOARD_RANGES = ['7d', '30d', '90d'];

export const RANGE_DAYS = Object.freeze({
  '7d':  7,
  '30d': 30,
  '90d': 90,
});

// ─── Schema ───────────────────────────────────────────────────────────────────

/**
 * Envelope schema — validates req.query.
 * Used by validate() middleware (envelope mode).
 *
 * Default: 30d — sensible mid-range for a school admin.
 */
export const dashboardQuerySchema = z.object({
  query: z.object({
    range: z
      .enum(DASHBOARD_RANGES, {
        errorMap: () => ({ message: `range must be one of: ${DASHBOARD_RANGES.join(', ')}` }),
      })
      .default('30d'),
  }),
});

// ─── Helper: derive UTC window boundaries from a range string ─────────────────

/**
 * Returns { rangeStart, rangeEnd, todayStart } for a given range string.
 * All times are UTC Date objects.
 *
 * todayStart — midnight UTC today (used for "today" sub-counts inside stats)
 * rangeStart — midnight UTC N days ago (start of the selected window)
 * rangeEnd   — now (end of window, i.e. current moment)
 */
export function getRangeWindow(range = '30d') {
  const days = RANGE_DAYS[range] ?? 30;
  const now = new Date();

  const todayStart = new Date(now);
  todayStart.setUTCHours(0, 0, 0, 0);

  const rangeStart = new Date(todayStart);
  rangeStart.setUTCDate(rangeStart.getUTCDate() - (days - 1));

  return {
    rangeStart,
    rangeEnd: now,
    todayStart,
  };
}

// ─── Helper: build week-start boundary (Mon 00:00 UTC) ───────────────────────

/**
 * Returns the start of the current ISO week (Monday 00:00 UTC).
 * Used for "this week" sub-counts on emergency/scan stats.
 */
export function getWeekStart() {
  const now = new Date();
  const day = now.getUTCDay(); // 0 = Sun, 1 = Mon …
  const diff = day === 0 ? 6 : day - 1; // days since Monday
  const weekStart = new Date(now);
  weekStart.setUTCDate(now.getUTCDate() - diff);
  weekStart.setUTCHours(0, 0, 0, 0);
  return weekStart;
}