// wellness.controller.js
import * as wellnessService from './wellness.service.js';
import { ApiResponse } from '#shared/response/ApiResponse.js';
import { asyncHandler } from '#shared/response/asyncHandler.js';
import { logger } from '#config/logger.js';

export const upsert = asyncHandler(async (req, res) => {
  const record = await wellnessService.upsertWellness(
    req.params.teacherId,
    req.schoolId,
    req.body
  );
  
  logger.info({ 
    teacherId: req.params.teacherId, 
    schoolId: req.schoolId,
    action: req.body.id ? 'update' : 'create'
  }, 'Wellness record upserted');
  
  return ApiResponse.ok(res, record, 'Wellness record saved successfully');
});

export const getOne = asyncHandler(async (req, res) => {
  const record = await wellnessService.getWellness(req.params.teacherId, req.schoolId);
  
  // Return null with success for not found (consistent with original behavior)
  return ApiResponse.ok(res, record || null, record ? 'Wellness record retrieved' : 'Wellness record not found');
});

export const remove = asyncHandler(async (req, res) => {
  await wellnessService.deleteWellness(req.params.teacherId, req.schoolId);
  
  logger.info({ 
    teacherId: req.params.teacherId, 
    schoolId: req.schoolId 
  }, 'Wellness record deleted');
  
  return ApiResponse.ok(res, null, 'Wellness record deleted successfully');
});