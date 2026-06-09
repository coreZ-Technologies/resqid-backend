// =============================================================================
// modules/scan-log/scanLog.controller.js — RESQID
// =============================================================================

import { ApiResponse } from '#shared/response/ApiResponse.js';
import { ApiError } from '#shared/response/ApiError.js';
import { asyncHandler } from '#shared/response/asyncHandler.js';
import * as service from './scanLog.service.js';
import { scanLogQuerySchema, scanLogIdParamsSchema, cleanupSchema } from './scanLog.validation.js';

export const list = asyncHandler(async (req, res) => {
  const query = scanLogQuerySchema.parse(req.query);
  req.query = query;
  const { scans, total } = await service.list(req);
  const page = query.page,
    limit = query.limit;
  ApiResponse.paginated(res, scans, { page, limit, total });
});

export const getOne = asyncHandler(async (req, res) => {
  const { id } = scanLogIdParamsSchema.parse(req.params);
  const scan = await service.getOne(id, req);
  ApiResponse.ok(res, scan);
});

export const remove = asyncHandler(async (req, res) => {
  const { id } = scanLogIdParamsSchema.parse(req.params);
  await service.remove(id);
  ApiResponse.ok(res, null, 'Scan log deleted');
});

export const bulkDelete = asyncHandler(async (req, res) => {
  const { ids } = req.body;
  if (!ids?.length) throw ApiError.badRequest('ids required');
  const result = await service.bulkDelete(ids);
  ApiResponse.ok(res, result, `${result.count} scan logs deleted`);
});

export const cleanup = asyncHandler(async (req, res) => {
  const { beforeDate } = cleanupSchema.parse(req.body);
  const result = await service.cleanupOld(beforeDate);
  ApiResponse.ok(res, result, `${result.count} old scan logs cleaned up`);
});

export const stats = asyncHandler(async (req, res) => {
  const result = await service.getStats(req.schoolId);
  ApiResponse.ok(res, result);
});
