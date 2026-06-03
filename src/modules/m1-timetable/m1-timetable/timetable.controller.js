/**
 * Timetable controller — thin layer.
 */

import * as timetableService from './timetable.service.js';
import {
  generateSchema,
  validateTimetableSchema,
  uploadTimetableSchema,
  timetableIdParamsSchema,
  jobIdParamsSchema,
  timetableListQuerySchema,
  updateTimetableStatusSchema,
} from './timetable.validation.js';
import { ApiError } from '#shared/response/ApiError.js';
import { asyncHandler } from '#shared/response/asyncHandler.js';

/**
 * POST /timetable/generate — Start generation
 */
export const generate = asyncHandler(async (req, res) => {
  const parsed = generateSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, 'Validation failed', parsed.error.flatten().fieldErrors);
  }

  const { templateId, opts } = parsed.data;
  const result = await timetableService.startGenerate(req.schoolId, templateId, opts);

  res.status(202).json({ success: true, ...result });
});

/**
 * POST /timetable/upload — Upload existing timetable
 */
export const upload = asyncHandler(async (req, res) => {
  const parsed = uploadTimetableSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, 'Validation failed', parsed.error.flatten().fieldErrors);
  }

  const { templateId, assignments } = parsed.data;
  const result = await timetableService.uploadExisting(req.schoolId, templateId, assignments);

  res.status(202).json({ success: true, ...result });
});

/**
 * POST /timetable/:id/validate — Start validation
 */
export const validate = asyncHandler(async (req, res) => {
  const { id } = timetableIdParamsSchema.parse(req.params);
  const result = await timetableService.startValidate(req.schoolId, id);

  res.status(202).json({ success: true, ...result });
});

/**
 * GET /timetable/job/:jobId — Poll job status
 */
export const jobStatus = asyncHandler(async (req, res) => {
  const { jobId } = jobIdParamsSchema.parse(req.params);
  const record = await timetableService.getJobStatus(jobId, null, req.schoolId);

  res.json({ success: true, data: record });
});

/**
 * GET /timetable/job/:jobId/stream — SSE stream
 */
export const streamJob = (req, res) => {
  const { jobId } = req.params;
  timetableService.streamJobProgress(jobId, req.schoolId, res);
};

/**
 * GET /timetable — List timetables
 */
export const list = asyncHandler(async (req, res) => {
  const query = timetableListQuerySchema.parse(req.query);
  const data = await timetableService.listTimetables(req.schoolId, query);

  res.json({ success: true, data, count: data.length });
});

/**
 * GET /timetable/:id — Get timetable
 */
export const getOne = asyncHandler(async (req, res) => {
  const { id } = timetableIdParamsSchema.parse(req.params);
  const data = await timetableService.getTimetable(id, req.schoolId);

  res.json({ success: true, data });
});

/**
 * PATCH /timetable/:id/status — Update status
 */
export const updateStatus = asyncHandler(async (req, res) => {
  const { id } = timetableIdParamsSchema.parse(req.params);
  const { status } = updateTimetableStatusSchema.parse(req.body);

  const data = await timetableService.updateTimetableStatus(id, req.schoolId, status);

  res.json({ success: true, data });
});

/**
 * DELETE /timetable/:id — Delete timetable
 */
export const remove = asyncHandler(async (req, res) => {
  const { id } = timetableIdParamsSchema.parse(req.params);
  await timetableService.deleteTimetable(id, req.schoolId);

  res.json({ success: true, message: 'Timetable deleted' });
});
