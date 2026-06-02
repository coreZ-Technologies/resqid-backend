/**
 * Crisis controller — thin layer, delegates to service.
 */

import { crisisService } from './crisis.service.js';
import {
  triggerCrisisSchema,
  updateCrisisStatusSchema,
  crisisHistoryQuerySchema,
  jobIdParamsSchema,
  crisisIdParamsSchema,
} from './crisis.validation.js';
import { ApiError } from '#shared/response/ApiError.js';
import { asyncHandler } from '#shared/response/asyncHandler.js';

/**
 * POST /crisis — Trigger a crisis
 */
export const triggerCrisis = asyncHandler(async (req, res) => {
  const parsed = triggerCrisisSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, 'Validation failed', parsed.error.flatten().fieldErrors);
  }

  const result = await crisisService.triggerCrisis(req.schoolId, parsed.data, req.user);

  res.status(202).json({ success: true, ...result });
});

/**
 * GET /crisis/job/:jobId — Poll job status
 */
export const getCrisisJobStatus = asyncHandler(async (req, res) => {
  const { jobId } = jobIdParamsSchema.parse(req.params);
  const record = await crisisService.getJobStatus(jobId, req.schoolId);
  res.json({ success: true, data: record });
});

/**
 * GET /crisis/active — List active crises
 */
export const getActiveCrises = asyncHandler(async (req, res) => {
  const crises = await crisisService.getActiveCrises(req.schoolId);
  res.json({ success: true, data: crises, count: crises.length });
});

/**
 * GET /crisis/:crisisId — Get crisis details
 */
export const getCrisisDetails = asyncHandler(async (req, res) => {
  const { crisisId } = crisisIdParamsSchema.parse(req.params);
  const crisis = await crisisService.getCrisisDetails(crisisId, req.schoolId);
  res.json({ success: true, data: crisis });
});

/**
 * POST /crisis/:crisisId/resolve — Resolve a crisis
 */
export const resolveCrisis = asyncHandler(async (req, res) => {
  const { crisisId } = crisisIdParamsSchema.parse(req.params);

  const parsed = updateCrisisStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, 'Validation failed', parsed.error.flatten().fieldErrors);
  }

  const updated = await crisisService.resolveCrisis(crisisId, req.schoolId, parsed.data, req.user);

  res.json({ success: true, data: updated });
});

/**
 * GET /crisis/history — Crisis history
 */
export const getCrisisHistory = asyncHandler(async (req, res) => {
  const query = crisisHistoryQuerySchema.parse(req.query);
  const result = await crisisService.getCrisisHistory(req.schoolId, query);
  res.json({ success: true, ...result });
});
