// school-admin/scanLogs/scanLog.controller.js
import { ApiResponse } from '#shared/response/ApiResponse.js';
import { asyncHandler } from '#shared/response/asyncHandler.js';
import { ScanLogService } from './scanLog.service.js';

const service = new ScanLogService();

export const listScanLogs = asyncHandler(async (req, res) => {
  const query = req.query;
  const schoolId = req.user.schoolId;
  const result = await service.listScanLogs(query, schoolId);
  return ApiResponse.paginated(res, result.items, result.meta);
});

export const getTodayStats = asyncHandler(async (req, res) => {
  const schoolId = req.user.schoolId;
  const stats = await service.getTodayStats(schoolId);
  return ApiResponse.ok(res, stats);
});