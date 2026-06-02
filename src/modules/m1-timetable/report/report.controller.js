/**
 * Report controller — thin layer.
 */

import * as reportService from './report.service.js';
import {
  timetableIdParamsSchema,
  reportQuerySchema,
  improvementQuerySchema,
} from './report.validation.js';
import { asyncHandler } from '#shared/response/asyncHandler.js';

/**
 * GET /reports/:timetableId/teachers
 */
export const teachers = asyncHandler(async (req, res) => {
  const { timetableId } = timetableIdParamsSchema.parse(req.params);
  const data = await reportService.teacherReport(timetableId, req.schoolId);
  res.json({ success: true, data, count: data.length });
});

/**
 * GET /reports/:timetableId/classes
 */
export const classes = asyncHandler(async (req, res) => {
  const { timetableId } = timetableIdParamsSchema.parse(req.params);
  const data = await reportService.classReport(timetableId, req.schoolId);
  res.json({ success: true, data, count: data.length });
});

/**
 * GET /reports/:timetableId/rooms
 */
export const rooms = asyncHandler(async (req, res) => {
  const { timetableId } = timetableIdParamsSchema.parse(req.params);
  const data = await reportService.roomUtilisationReport(
    timetableId,
    req.schoolId,
    req.schoolConfig
  );
  res.json({ success: true, data, count: data.length });
});

/**
 * GET /reports/:timetableId/validation
 */
export const validation = asyncHandler(async (req, res) => {
  const { timetableId } = timetableIdParamsSchema.parse(req.params);
  const data = await reportService.validationReport(timetableId, req.schoolId);
  res.json({ success: true, data });
});

/**
 * GET /reports/:timetableId/improvements
 */
export const improvements = asyncHandler(async (req, res) => {
  const { timetableId } = timetableIdParamsSchema.parse(req.params);
  const query = improvementQuerySchema.parse(req.query);
  const data = await reportService.improvementSuggestions(timetableId, req.schoolId, query.limit);
  res.json({ success: true, ...data });
});

/**
 * GET /reports/:timetableId/daily/:day
 */
export const dailySummary = asyncHandler(async (req, res) => {
  const { timetableId } = timetableIdParamsSchema.parse(req.params);
  const day = parseInt(req.params.day);
  const data = await reportService.dailySummary(timetableId, req.schoolId, day);
  res.json({ success: true, data });
});
