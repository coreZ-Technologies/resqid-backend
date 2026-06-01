// =============================================================================
// modules/m1-timetable/report/report.controller.js — RESQID
// =============================================================================

import { ApiResponse } from '#shared/response/ApiResponse.js';
import { asyncHandler } from '#shared/response/asyncHandler.js';
import * as reportService from './report.service.js';

/**
 * GET /api/timetable/report/substitution
 */
export const getSubstitutionRegister = asyncHandler(async (req, res) => {
  const { from, to, teacherId, grade } = req.query;
  const data = await reportService.getSubstitutionRegister(req.schoolId, {
    from,
    to,
    teacherId,
    grade,
  });
  return ApiResponse.ok(res, data);
});

/**
 * GET /api/timetable/report/substitution/weekly
 */
export const getWeeklyAnalysis = asyncHandler(async (req, res) => {
  const { weekStart } = req.query;
  const data = await reportService.getWeeklyAnalysis(req.schoolId, weekStart);
  return ApiResponse.ok(res, data);
});

/**
 * GET /api/timetable/report/compliance
 */
export const getComplianceReport = asyncHandler(async (req, res) => {
  const { weekStart } = req.query;
  const data = await reportService.getComplianceReport(req.schoolId, weekStart);
  return ApiResponse.ok(res, data);
});

/**
 * GET /api/timetable/report/workload
 */
export const getWorkloadReport = asyncHandler(async (req, res) => {
  const data = await reportService.getWorkloadReport(req.schoolId);
  return ApiResponse.ok(res, data);
});
