/**
 * Template controller — thin layer.
 */

import * as templateService from './template.service.js';
import {
  createTemplateSchema,
  updateTemplateSchema,
  templateIdParamsSchema,
  templateListQuerySchema,
} from './template.validation.js';
import { asyncHandler } from '#shared/response/asyncHandler.js';

/**
 * POST /templates
 */
export const create = asyncHandler(async (req, res) => {
  const parsed = createTemplateSchema.parse(req.body);
  const template = await templateService.createTemplate(req.schoolId, parsed);
  res.status(201).json({ success: true, data: template });
});

/**
 * GET /templates
 */
export const list = asyncHandler(async (req, res) => {
  const query = templateListQuerySchema.parse(req.query);
  const templates = await templateService.listTemplates(req.schoolId, query);
  res.json({ success: true, data: templates, count: templates.length });
});

/**
 * GET /templates/:id
 */
export const getOne = asyncHandler(async (req, res) => {
  const { id } = templateIdParamsSchema.parse(req.params);
  const template = await templateService.getTemplate(id, req.schoolId);
  res.json({ success: true, data: template });
});

/**
 * PUT /templates/:id
 */
export const update = asyncHandler(async (req, res) => {
  const { id } = templateIdParamsSchema.parse(req.params);
  const parsed = updateTemplateSchema.parse(req.body);
  const template = await templateService.updateTemplate(id, req.schoolId, parsed);
  res.json({ success: true, data: template });
});

/**
 * DELETE /templates/:id
 */
export const remove = asyncHandler(async (req, res) => {
  const { id } = templateIdParamsSchema.parse(req.params);
  await templateService.deleteTemplate(id, req.schoolId);
  res.json({ success: true, message: 'Template deleted' });
});

/**
 * POST /templates/:id/activate
 */
export const activate = asyncHandler(async (req, res) => {
  const { id } = templateIdParamsSchema.parse(req.params);
  const template = await templateService.activateTemplate(id, req.schoolId);
  res.json({ success: true, data: template, message: 'Template activated' });
});

/**
 * POST /templates/:id/duplicate
 */
export const duplicate = asyncHandler(async (req, res) => {
  const { id } = templateIdParamsSchema.parse(req.params);
  const template = await templateService.duplicateTemplate(id, req.schoolId, req.body.name);
  res.status(201).json({ success: true, data: template });
});

/**
 * POST /templates/:id/archive
 */
export const archive = asyncHandler(async (req, res) => {
  const { id } = templateIdParamsSchema.parse(req.params);
  await templateService.archiveTemplate(id, req.schoolId);
  res.json({ success: true, message: 'Template archived' });
});