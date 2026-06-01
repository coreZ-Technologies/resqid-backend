// =============================================================================
// modules/m1-timetable/crisis/crisis.controller.js — RESQID
// =============================================================================

import { ApiResponse } from '#shared/response/ApiResponse.js';
import { asyncHandler } from '#shared/response/asyncHandler.js';
import * as crisisService from './crisis.service.js';

/**
 * GET /api/timetable/crisis/level
 * Get current crisis level for the school.
 */
export const getCrisisLevel = asyncHandler(async (req, res) => {
  const crisis = await crisisService.detectCrisisLevel(req.schoolId);
  return ApiResponse.ok(res, crisis);
});

/**
 * POST /api/timetable/crisis/execute
 * Manually trigger crisis strategy execution.
 */
export const executeCrisisStrategy = asyncHandler(async (req, res) => {
  const result = await crisisService.executeCrisisStrategy(req.schoolId);
  return ApiResponse.ok(res, result, result.executed ? 'Strategy executed' : 'No crisis detected');
});

/**
 * POST /api/timetable/crisis/override
 * Manually set crisis level (super admin only).
 */
export const overrideCrisisLevel = asyncHandler(async (req, res) => {
  const { level, reason } = req.body;
  // This would set a manual override in the database
  return ApiResponse.ok(res, { level, reason }, 'Crisis level overridden');
});
