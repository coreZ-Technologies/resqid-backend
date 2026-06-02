// =============================================================================
// modules/m2-emergency/emergency.controller.js — RESQID
// =============================================================================

import { ApiResponse } from '#shared/response/ApiResponse.js';
import * as service from './emergency.service.js';

export const getProfile = async (req, res) => {
  const profile = await service.getProfile(req.params.studentId, req.user.id);
  return ApiResponse.ok(res, profile);
};

export const updateProfile = async (req, res) => {
  const result = await service.updateProfile(req.params.studentId, req.user.id, req.body);
  return ApiResponse.ok(res, result, 'Emergency profile updated');
};
