import * as timetableService from './timetable.service';
import { ApiResponse } from '#shared/response/ApiResponse.js';
import { ApiError } from '#shared/response/ApiError.js';
import { asyncHandler } from '#shared/response/asyncHandler.js';
import { logger } from '#config/logger.js';

/**
 * POST /timetable/generate
 * Enqueue a generate job. Returns 202 + jobId immediately.
 */
export const generate = asyncHandler(async (req, res) => {
  const { templateId, opts } = req.body;
  
  if (!templateId) {
    throw ApiError.badRequest('templateId required');
  }
  
  logger.info({ templateId, schoolId: req.schoolId }, 'Generating timetable');
  
  const result = await timetableService.startGenerate(req.schoolId, templateId, opts);
  
  return ApiResponse.accepted(res, result, 'Timetable generation queued');
});

/**
 * POST /timetable/:id/validate
 * Enqueue a validate job on an existing timetable.
 */
export const validate = asyncHandler(async (req, res) => {
  logger.info({ timetableId: req.params.id, schoolId: req.schoolId }, 'Validating timetable');
  
  const result = await timetableService.startValidate(req.schoolId, req.params.id);
  
  return ApiResponse.accepted(res, result, 'Timetable validation queued');
});

/**
 * GET /timetable/job/:jobId
 * Poll job status.
 */
export const jobStatus = asyncHandler(async (req, res) => {
  const record = await timetableService.getJobStatus(req.params.jobId, null, req.schoolId);
  
  return ApiResponse.ok(res, record, 'Job status retrieved');
});

/**
 * GET /timetable/job/:jobId/stream
 * SSE stream — no polling needed on client, events pushed on status change.
 */
export const streamJob = asyncHandler(async (req, res) => {
  await timetableService.streamJobProgress(req.params.jobId, req.schoolId, res);
});

/**
 * GET /timetable
 */
export const list = asyncHandler(async (req, res) => {
  const data = await timetableService.listTimetables(req.schoolId);
  
  return ApiResponse.ok(res, data, 'Timetables retrieved');
});

/**
 * GET /timetable/:id
 */
export const getOne = asyncHandler(async (req, res) => {
  const data = await timetableService.getTimetable(req.params.id, req.schoolId);
  
  return ApiResponse.ok(res, data, 'Timetable retrieved');
});

/**
 * DELETE /timetable/:id
 */
export const remove = asyncHandler(async (req, res) => {
  await timetableService.deleteTimetable(req.params.id, req.schoolId);
  
  logger.info({ timetableId: req.params.id, schoolId: req.schoolId }, 'Timetable deleted');
  
  return ApiResponse.ok(res, null, 'Timetable deleted successfully');
});