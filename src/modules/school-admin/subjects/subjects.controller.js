// school-admin/subjects/subjects.controller.js
import { ApiResponse } from '#shared/response/ApiResponse.js';
import { asyncHandler } from '#shared/response/asyncHandler.js';
import { SubjectService } from './subjects.service.js';

const service = new SubjectService();

export const createSubject = asyncHandler(async (req, res) => {
  const data = req.body;
  const schoolId = req.user.schoolId;
  const subject = await service.createSubject(data, schoolId);
  return ApiResponse.created(res, subject, 'Subject created successfully');
});

export const updateSubject = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const data = req.body;
  const schoolId = req.user.schoolId;
  const updated = await service.updateSubject(id, data, schoolId);
  return ApiResponse.ok(res, updated, 'Subject updated');
});

export const deleteSubject = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const schoolId = req.user.schoolId;
  await service.deleteSubject(id, schoolId);
  return ApiResponse.ok(res, null, 'Subject deleted');
});

export const getSubject = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const schoolId = req.user.schoolId;
  const subject = await service.getSubject(id, schoolId);
  return ApiResponse.ok(res, subject);
});

export const listSubjects = asyncHandler(async (req, res) => {
  const query = req.query;
  const schoolId = req.user.schoolId;
  const result = await service.listSubjects(query, schoolId);
  return ApiResponse.paginated(res, result.items, result.meta);
});

export const getStats = asyncHandler(async (req, res) => {
  const schoolId = req.user.schoolId;
  const stats = await service.getStats(schoolId);
  return ApiResponse.ok(res, stats);
});

export const bulkUpdateSubjects = asyncHandler(async (req, res) => {
  const { updates } = req.body; // array of { id, data }
  const schoolId = req.user.schoolId;
  const result = await service.bulkUpdateSubjects(updates, schoolId);
  return ApiResponse.ok(res, result, 'Bulk update completed');
});