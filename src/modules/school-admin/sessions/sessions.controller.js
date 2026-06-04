// school-admin/sessions/sessions.controller.js
import { ApiResponse } from '#shared/response/ApiResponse.js';
import { asyncHandler } from '#shared/response/asyncHandler.js';
import { SessionService } from './sessions.service.js';

const service = new SessionService();

export const createSession = asyncHandler(async (req, res) => {
  const data = req.body;
  const schoolId = req.user.schoolId;
  const session = await service.createSession(data, schoolId);
  return ApiResponse.created(res, session, 'Academic session created successfully');
});

export const updateSession = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const data = req.body;
  const schoolId = req.user.schoolId;
  const updated = await service.updateSession(id, data, schoolId);
  return ApiResponse.ok(res, updated, 'Academic session updated');
});

export const deleteSession = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const schoolId = req.user.schoolId;
  await service.deleteSession(id, schoolId);
  return ApiResponse.ok(res, null, 'Academic session deleted');
});

export const getSession = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const schoolId = req.user.schoolId;
  const session = await service.getSession(id, schoolId);
  return ApiResponse.ok(res, session);
});

export const listSessions = asyncHandler(async (req, res) => {
  const query = req.query;
  const schoolId = req.user.schoolId;
  const result = await service.listSessions(query, schoolId);
  return ApiResponse.paginated(res, result.items, result.meta);
});

export const getStats = asyncHandler(async (req, res) => {
  const schoolId = req.user.schoolId;
  const stats = await service.getStats(schoolId);
  return ApiResponse.ok(res, stats);
});

export const setCurrentSession = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const schoolId = req.user.schoolId;
  const session = await service.setCurrentSession(id, schoolId);
  return ApiResponse.ok(res, session, 'Current session updated');
});