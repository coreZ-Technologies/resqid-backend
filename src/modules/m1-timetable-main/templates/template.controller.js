// template.controller.js
import * as templateService from './template.service.js';
import { ApiResponse } from '#shared/response/ApiResponse.js';
import { asyncHandler } from '#shared/response/asyncHandler.js';
import { logger } from '#config/logger.js';

export const create = asyncHandler(async (req, res) => {
  const template = await templateService.createTemplate(req.schoolId, req.body);
  
  logger.info({ 
    templateId: template.id, 
    schoolId: req.schoolId,
    name: template.name 
  }, 'Template created');
  
  return ApiResponse.created(res, template, 'Template created successfully');
});

export const getOne = asyncHandler(async (req, res) => {
  const template = await templateService.getTemplate(req.params.id, req.schoolId);
  
  return ApiResponse.ok(res, template, 'Template retrieved');
});

export const list = asyncHandler(async (req, res) => {
  const templates = await templateService.listTemplates(req.schoolId);
  
  return ApiResponse.ok(res, templates, 'Templates retrieved');
});

export const update = asyncHandler(async (req, res) => {
  const template = await templateService.updateTemplate(req.params.id, req.schoolId, req.body);
  
  logger.info({ 
    templateId: template.id, 
    schoolId: req.schoolId,
    name: template.name 
  }, 'Template updated');
  
  return ApiResponse.ok(res, template, 'Template updated successfully');
});

export const remove = asyncHandler(async (req, res) => {
  await templateService.deleteTemplate(req.params.id, req.schoolId);
  
  logger.info({ 
    templateId: req.params.id, 
    schoolId: req.schoolId 
  }, 'Template deleted');
  
  return ApiResponse.ok(res, null, 'Template deleted successfully');
});