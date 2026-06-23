// school-admin/scanAnomaly/scanAnomaly.controller.js
import { ApiResponse } from '#shared/response/ApiResponse.js';
import { asyncHandler } from '#shared/response/asyncHandler.js';
import { ScanAnomalyService } from './scanAnomaly.service.js';

const service = new ScanAnomalyService();

export const listAnomalies = asyncHandler(async (req, res) => {
  const query = req.query;
  const schoolId = req.user.schoolId;
  const result = await service.listAnomalies(query, schoolId);
  return ApiResponse.paginated(res, result.items, result.meta);
});

export const getAnomalyDetails = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const schoolId = req.user.schoolId;
  const anomaly = await service.getAnomalyDetails(id, schoolId);
  return ApiResponse.ok(res, anomaly);
});

export const updateAnomalyStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, resolution } = req.body;
  const schoolId = req.user.schoolId;
  const resolvedBy = req.user.id;
  await service.updateAnomalyStatus(id, status, resolution, schoolId, resolvedBy);
  return ApiResponse.ok(res, null, 'Status updated');
});

export const getStats = asyncHandler(async (req, res) => {
  const schoolId = req.user.schoolId;
  const stats = await service.getStats(schoolId);
  return ApiResponse.ok(res, stats);
});

export const exportAnomalies = asyncHandler(async (req, res) => {
  const query = req.query;
  const schoolId = req.user.schoolId;
  const result = await service.exportAnomalies(query, schoolId);
  if (result.buffer) {
    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    return res.send(result.buffer);
  }
  return ApiResponse.ok(res, result, 'Export email sent');
});