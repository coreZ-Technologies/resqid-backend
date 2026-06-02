// TODO: Add implementation
// school-admin/qr/qr.controller.js
import { ApiResponse } from '#shared/response/ApiResponse.js';
import { asyncHandler } from '#shared/response/asyncHandler.js';
import { QrService } from './qr.service.js';

const service = new QrService();

export const listTokens = asyncHandler(async (req, res) => {
  const query = req.query;
  const schoolId = req.user.schoolId;
  const result = await service.listTokens(query, schoolId);
  const meta = {
    page: result.page,
    limit: result.limit,
    total: result.total,
    totalPages: Math.ceil(result.total / result.limit),
  };
  return ApiResponse.paginated(res, result.items, meta);
});

export const getTokenDetails = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const schoolId = req.user.schoolId;
  const token = await service.getTokenDetails(id, schoolId);
  return ApiResponse.ok(res, token);
});

export const generateQr = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { format, width, height } = req.body;
  const schoolId = req.user.schoolId;
  const qrAsset = await service.generateQr(id, format, width, height, schoolId);
  return ApiResponse.created(res, qrAsset, 'QR code generated');
});

export const regenerateQr = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { format, width, height } = req.body;
  const schoolId = req.user.schoolId;
  const qrAsset = await service.regenerateQr(id, format, width, height, schoolId);
  return ApiResponse.ok(res, qrAsset, 'QR code regenerated');
});

export const assignToken = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { studentId } = req.body;
  const schoolId = req.user.schoolId;
  const result = await service.assignToken(id, studentId, schoolId);
  return ApiResponse.ok(res, result, 'Token assigned to student');
});

export const getStats = asyncHandler(async (req, res) => {
  const schoolId = req.user.schoolId;
  const stats = await service.getStats(schoolId);
  return ApiResponse.ok(res, stats);
});