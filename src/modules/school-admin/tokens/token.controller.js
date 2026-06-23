// src/modules/school-admin/tokens/token.controller.js
import { TokenService } from './token.service.js';
import { asyncHandler } from '#shared/response/asyncHandler.js';
import { ApiResponse } from '#shared/response/ApiResponse.js';

export const TokenController = {
  createToken: asyncHandler(async (req, res) => {
    const schoolId = req.schoolId; // set by tenantScope middleware
    const token = await TokenService.createToken(schoolId, req.body);
    return ApiResponse.created(res, token, 'Token created successfully');
  }),

  getToken: asyncHandler(async (req, res) => {
    const schoolId = req.schoolId;
    const { tokenId } = req.params;
    const token = await TokenService.getTokenById(schoolId, tokenId);
    return ApiResponse.success(res, token);
  }),

  listTokens: asyncHandler(async (req, res) => {
    const schoolId = req.schoolId;
    const query = req.query;
    const result = await TokenService.listTokens(schoolId, query);
    return ApiResponse.paginated(res, result.tokens, result.total, query.page, query.limit);
  }),

  assignToken: asyncHandler(async (req, res) => {
    const schoolId = req.schoolId;
    const { tokenId } = req.params;
    const token = await TokenService.assignToken(schoolId, tokenId, req.body);
    return ApiResponse.success(res, token, 'Token assigned to student');
  }),

  unassignToken: asyncHandler(async (req, res) => {
    const schoolId = req.schoolId;
    const { tokenId } = req.params;
    const token = await TokenService.unassignToken(schoolId, tokenId, req.body);
    return ApiResponse.success(res, token, 'Token unassigned');
  }),

  updateToken: asyncHandler(async (req, res) => {
    const schoolId = req.schoolId;
    const { tokenId } = req.params;
    const updated = await TokenService.updateToken(schoolId, tokenId, req.body);
    return ApiResponse.success(res, updated, 'Token updated');
  }),

  renewToken: asyncHandler(async (req, res) => {
    const schoolId = req.schoolId;
    const { tokenId } = req.params;
    const updated = await TokenService.renewToken(schoolId, tokenId, req.body);
    return ApiResponse.success(res, updated, 'Token renewed');
  }),

  revokeToken: asyncHandler(async (req, res) => {
    const schoolId = req.schoolId;
    const { tokenId } = req.params;
    const updated = await TokenService.revokeToken(schoolId, tokenId, req.body);
    return ApiResponse.success(res, updated, 'Token revoked');
  }),

  deleteToken: asyncHandler(async (req, res) => {
    const schoolId = req.schoolId;
    const { tokenId } = req.params;
    await TokenService.deleteToken(schoolId, tokenId);
    return ApiResponse.success(res, null, 'Token deleted');
  }),

  regenerateQr: asyncHandler(async (req, res) => {
    const schoolId = req.schoolId;
    const { tokenId } = req.params;
    const updated = await TokenService.regenerateQr(schoolId, tokenId, req.body);
    return ApiResponse.success(res, updated, 'QR code regenerated');
  }),
};