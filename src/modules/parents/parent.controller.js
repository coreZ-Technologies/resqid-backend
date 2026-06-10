// =============================================================================
// modules/parents/parent.controller.js — RESQID (streaming export)
// =============================================================================

import { ApiResponse } from '#shared/response/ApiResponse.js';
import { asyncHandler } from '#shared/response/asyncHandler.js';
import * as service from './parent.service.js';
import {
  createParentSchema,
  updateParentSchema,
  updateOwnProfileSchema,
  parentListQuerySchema,
  parentIdParamsSchema,
  parentExportQuerySchema,
} from './parent.validation.js';

export const list = asyncHandler(async (req, res) => {
  const query = parentListQuerySchema.parse(req.query);
  req.query = query;
  const { parents, total } = await service.list(req);
  ApiResponse.paginated(res, parents, { page: query.page, limit: query.limit, total });
});

export const getOne = asyncHandler(async (req, res) => {
  const { id } = parentIdParamsSchema.parse(req.params);
  const parent = await service.getOne(id, req);
  ApiResponse.ok(res, parent);
});

export const create = asyncHandler(async (req, res) => {
  const parsed = createParentSchema.parse(req.body);
  const parent = await service.create(parsed, req.schoolId);
  ApiResponse.created(res, parent, 'Parent created');
});

export const update = asyncHandler(async (req, res) => {
  const { id } = parentIdParamsSchema.parse(req.params);

  // Use different schema based on role
  const schema = req.user.role === 'PARENT' ? updateOwnProfileSchema : updateParentSchema;
  const parsed = schema.parse(req.body);

  const parent = await service.update(id, parsed, req);
  ApiResponse.ok(res, parent, 'Parent updated');
});

export const remove = asyncHandler(async (req, res) => {
  const { id } = parentIdParamsSchema.parse(req.params);
  await service.remove(id, req.schoolId);
  ApiResponse.ok(res, null, 'Parent removed');
});

export const stats = asyncHandler(async (req, res) => {
  const result = await service.getStats(req.schoolId);
  ApiResponse.ok(res, result);
});

// ─── Streaming CSV Export (memory efficient) ────────────────────────────────
export const exportList = asyncHandler(async (req, res) => {
  const query = parentExportQuerySchema.parse(req.query);
  await service.exportCsvStream(req.schoolId, query, res);
});