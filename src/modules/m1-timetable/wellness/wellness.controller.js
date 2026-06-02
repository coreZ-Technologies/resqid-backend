/**
 * Wellness controller — thin layer.
 */

import * as wellnessService from './wellness.service.js';
import { wellnessUpsertSchema, teacherIdParamsSchema } from './wellness.validation.js';
import { ApiError } from '#shared/response/ApiError.js';
import { asyncHandler } from '#shared/response/asyncHandler.js';

/**
 * PUT /wellness/:teacherId
 * Create or update wellness record.
 */
export const upsert = asyncHandler(async (req, res) => {
  const { teacherId } = teacherIdParamsSchema.parse(req.params);
  const parsed = wellnessUpsertSchema.parse(req.body);

  // Verify teacher exists
  await wellnessService.verifyTeacher(teacherId, req.schoolId);

  const record = await wellnessService.upsertWellness(teacherId, req.schoolId, parsed);

  res.json({ success: true, data: record });
});

/**
 * GET /wellness/:teacherId
 * Get wellness record for a teacher.
 */
export const getOne = asyncHandler(async (req, res) => {
  const { teacherId } = teacherIdParamsSchema.parse(req.params);

  await wellnessService.verifyTeacher(teacherId, req.schoolId);

  const record = await wellnessService.getWellness(teacherId, req.schoolId);

  res.json({ success: true, data: record || null });
});

/**
 * DELETE /wellness/:teacherId
 * Delete wellness record.
 */
export const remove = asyncHandler(async (req, res) => {
  const { teacherId } = teacherIdParamsSchema.parse(req.params);

  await wellnessService.verifyTeacher(teacherId, req.schoolId);
  await wellnessService.deleteWellness(teacherId, req.schoolId);

  res.json({ success: true, message: 'Wellness record deleted' });
});

/**
 * GET /wellness/burnout-risks
 * Get all teachers flagged for burnout risk.
 */
export const getBurnoutRisks = asyncHandler(async (req, res) => {
  const records = await wellnessService.getBurnoutRisks(req.schoolId);
  res.json({ success: true, data: records, count: records.length });
});

/**
 * GET /wellness/accessibility-needs
 * Get teachers needing accessibility accommodations.
 */
export const getAccessibilityNeeds = asyncHandler(async (req, res) => {
  const records = await wellnessService.getAccessibilityNeeds(req.schoolId);
  res.json({ success: true, data: records, count: records.length });
});
