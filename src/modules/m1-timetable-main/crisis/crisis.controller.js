// crisis/crisis.controller.js
import { nanoid } from 'nanoid';
import { enqueueCrisis } from '../queue.js';
import * as timetableRepository from '../timetable.repository.js';
import { ApiResponse } from '#shared/response/ApiResponse.js';
import { ApiError } from '#shared/response/ApiError.js';
import { asyncHandler } from '#shared/response/asyncHandler.js';
import { logger } from '#config/logger.js';

/**
 * POST /crisis
 * Enqueue a crisis job. Returns jobId immediately — no hanging requests.
 */
export const triggerCrisis = asyncHandler(async (req, res) => {
  const { type, payload } = req.body;
  
  if (!type || !payload) {
    throw ApiError.badRequest('type and payload required');
  }

  const jobId = nanoid();
  
  await timetableRepository.createJobRecord(jobId, 'crisis', req.schoolId);
  await enqueueCrisis({ jobId, schoolId: req.schoolId, type, payload });

  logger.info({ 
    jobId, 
    schoolId: req.schoolId, 
    crisisType: type,
    payloadKeys: Object.keys(payload || {})
  }, 'Crisis job queued');

  return ApiResponse.accepted(res, { jobId }, 'Crisis job queued successfully');
});

/**
 * GET /crisis/job/:jobId — poll job status
 */
export const getCrisisJobStatus = asyncHandler(async (req, res) => {
  const record = await timetableRepository.getJobRecord(req.params.jobId);
  
  if (!record || record.schoolId !== req.schoolId) {
    throw ApiError.notFound('Job not found');
  }
  
  logger.debug({ 
    jobId: req.params.jobId, 
    schoolId: req.schoolId,
    status: record.status 
  }, 'Crisis job status retrieved');
  
  return ApiResponse.ok(res, record, 'Job status retrieved');
});