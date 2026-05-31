// TODO: Add implementation
// =============================================================================
// dashboard.controller.js — RESQID School Admin / Overview
//
// Thin HTTP layer — extracts schoolId + range from request, calls service,
// sends response. No business logic here.
//
// Endpoints:
//   GET /api/school/dashboard         → stats (all 7 stat cards)
//   GET /api/school/dashboard/activity → recent activity feed
// =============================================================================

import { ApiResponse } from '#shared/response/ApiResponse.js';
import * as service    from './dashboard.service.js';

// =============================================================================
// GET /api/school/dashboard
// =============================================================================

/**
 * Returns all 7 stat cards for the school admin dashboard.
 *
 * Query params (validated + defaulted by middleware):
 *   ?range=7d | 30d | 90d   (default: 30d)
 *
 * Response shape:
 * {
 *   range, rangeStart, rangeEnd,
 *   stats: {
 *     students:   { total, active, inactive, addedInRange }
 *     tokens:     { total, assigned, unassigned, expiringSoon }
 *     emergency:  { today, thisWeek, inRange }
 *     scans:      { today, thisWeek, inRange }
 *     anomalies:  { unresolved, inRange }
 *     attendance: { present, total, percentage }
 *     parents:    { activeParents }
 *   }
 * }
 */
export async function getStats(req, res) {
  const { range } = req.query;

  const data = await service.getDashboardStats({
    schoolId: req.schoolId,
    range,
  });

  return ApiResponse.ok(res, data, 'Dashboard stats fetched');
}

// =============================================================================
// GET /api/school/dashboard/activity
// =============================================================================

/**
 * Returns merged, chronologically sorted recent activity feed.
 *
 * Each event in the feed has a normalised shape:
 * {
 *   id:        string          (prefixed: 'scan:xxx', 'emergency:xxx', etc.)
 *   type:      SCAN | EMERGENCY | ANOMALY | STUDENT_ADDED | CARD_ASSIGNED
 *   timestamp: ISO string
 *   student:   { id, name, className } | null
 *   meta:      object          (type-specific extra fields)
 * }
 *
 * Query params (validated + defaulted by middleware):
 *   ?range=7d | 30d | 90d  — passed through for UI consistency, not used
 *                             to filter activity (feed always shows latest N)
 */
export async function getActivity(req, res) {
  const data = await service.getDashboardActivity({
    schoolId: req.schoolId,
  });

  return ApiResponse.ok(res, data, 'Dashboard activity fetched');
}