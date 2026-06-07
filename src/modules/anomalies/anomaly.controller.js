// src/modules/anomalies/anomaly.controller.js
import { anomalyService } from './anomaly.service.js';
import {
  anomalyIdParamsSchema,
  updateStatusSchema,
  anomalyQuerySchema,
} from './anomaly.validation.js';
import { ApiResponse } from '#shared/response/ApiResponse.js';
import { asyncHandler } from '#shared/response/asyncHandler.js';

export const getStats = asyncHandler(async (req, res) => {
  const stats = await anomalyService.getStats(req.schoolId);
  ApiResponse.ok(res, stats);
});

export const list = asyncHandler(async (req, res) => {
  const query = anomalyQuerySchema.parse(req.query);
  const result = await anomalyService.list(req.schoolId, query);
  ApiResponse.ok(res, result);
});

export const getOne = asyncHandler(async (req, res) => {
  const { id } = anomalyIdParamsSchema.parse(req.params);
  const anomaly = await anomalyService.getOne(id, req.schoolId);
  ApiResponse.ok(res, anomaly);
});

export const updateStatus = asyncHandler(async (req, res) => {
  const { id } = anomalyIdParamsSchema.parse(req.params);
  const { status } = updateStatusSchema.parse(req.body);
  const result = await anomalyService.updateStatus(id, req.schoolId, status);
  ApiResponse.ok(res, result, 'Status updated');
});

export const getFilterOptions = asyncHandler(async (req, res) => {
  const options = await anomalyService.getFilterOptions(req.schoolId);
  ApiResponse.ok(res, options);
});

export const exportCsv = asyncHandler(async (req, res) => {
  const query = anomalyQuerySchema.parse(req.query);
  const { headers, rows } = await anomalyService.exportCsv(req.schoolId, query);

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="anomalies.csv"');
  res.send(csv);
});
