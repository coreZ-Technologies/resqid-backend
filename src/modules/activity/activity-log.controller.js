// src/modules/activity-logs/activity-log.controller.js
import { activityLogService } from './activity-log.service.js';
import { logQuerySchema } from './activity-log.validation.js';
import { ApiResponse } from '#shared/response/ApiResponse.js';
import { asyncHandler } from '#shared/response/asyncHandler.js';

export const list = asyncHandler(async (req, res) => {
  const query = logQuerySchema.parse(req.query);
  const result = await activityLogService.list(req.schoolId, query);
  ApiResponse.ok(res, result);
});

export const getStats = asyncHandler(async (req, res) => {
  const stats = await activityLogService.getStats(req.schoolId);
  ApiResponse.ok(res, stats);
});

export const getFilterOptions = asyncHandler(async (req, res) => {
  const options = await activityLogService.getFilterOptions();
  ApiResponse.ok(res, options);
});

export const exportCsv = asyncHandler(async (req, res) => {
  const query = logQuerySchema.parse(req.query);
  const { headers, rows } = await activityLogService.exportCsv(req.schoolId, query);

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="activity-logs.csv"');
  res.send(csv);
});
