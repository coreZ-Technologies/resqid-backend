// report/report.controller.js
import * as reportService from './report.service.js';
import { ApiResponse } from '#shared/response/ApiResponse.js';
import { asyncHandler } from '#shared/response/asyncHandler.js';
import { logger } from '#config/logger.js';

export const teachers = asyncHandler(async (req, res) => {
  const data = await reportService.teacherReport(req.params.timetableId, req.schoolId);
  
  logger.info({ 
    timetableId: req.params.timetableId, 
    schoolId: req.schoolId,
    teacherCount: data?.teachers?.length || 0 
  }, 'Teacher report generated');
  
  return ApiResponse.ok(res, data, 'Teacher report retrieved');
});

export const classes = asyncHandler(async (req, res) => {
  const data = await reportService.classReport(req.params.timetableId, req.schoolId);
  
  logger.info({ 
    timetableId: req.params.timetableId, 
    schoolId: req.schoolId,
    classCount: data?.classes?.length || 0 
  }, 'Class report generated');
  
  return ApiResponse.ok(res, data, 'Class report retrieved');
});

export const rooms = asyncHandler(async (req, res) => {
  // schoolConfig passed via query or loaded from template — simplified here
  const data = await reportService.roomUtilisationReport(
    req.params.timetableId,
    req.schoolId,
    req.schoolConfig
  );
  
  logger.info({ 
    timetableId: req.params.timetableId, 
    schoolId: req.schoolId,
    roomCount: data?.rooms?.length || 0 
  }, 'Room utilisation report generated');
  
  return ApiResponse.ok(res, data, 'Room utilisation report retrieved');
});

export const validation = asyncHandler(async (req, res) => {
  const data = await reportService.validationReport(req.params.timetableId, req.schoolId);
  
  logger.info({ 
    timetableId: req.params.timetableId, 
    schoolId: req.schoolId,
    violationsCount: data?.violations?.length || 0,
    warningsCount: data?.warnings?.length || 0
  }, 'Validation report generated');
  
  return ApiResponse.ok(res, data, 'Validation report retrieved');
});

export const improvements = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  const data = await reportService.improvementSuggestions(
    req.params.timetableId,
    req.schoolId,
    limit
  );
  
  logger.info({ 
    timetableId: req.params.timetableId, 
    schoolId: req.schoolId,
    limit,
    suggestionsCount: data?.suggestions?.length || 0 
  }, 'Improvement suggestions generated');
  
  return ApiResponse.ok(res, data, 'Improvement suggestions retrieved');
});