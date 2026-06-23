// src/modules/m5-parents/parent.controller.js
import { ApiResponse } from '#shared/response/ApiResponse.js';
import { asyncHandler } from '#shared/response/asyncHandler.js';
import { ParentService } from './parent.service.js';

const service = new ParentService();

// ─── Create Parent ──────────────────────────────────────────────
export const createParent = asyncHandler(async (req, res) => {
  const data = req.body;
  const schoolId = req.user.schoolId;
  const parent = await service.createParent(data, schoolId);
  return ApiResponse.created(res, parent, 'Parent created successfully');
});

// ─── Update Parent ──────────────────────────────────────────────
export const updateParent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const data = req.body;
  const schoolId = req.user.schoolId;
  const updated = await service.updateParent(id, data, schoolId);
  return ApiResponse.ok(res, updated, 'Parent updated');
});

// ─── Delete Parent ──────────────────────────────────────────────
export const deleteParent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const schoolId = req.user.schoolId;
  await service.deleteParent(id, schoolId);
  return ApiResponse.ok(res, null, 'Parent deleted');
});

// ─── Get Parent Details ─────────────────────────────────────────
export const getParent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const schoolId = req.user.schoolId;
  const parent = await service.getParent(id, schoolId);
  return ApiResponse.ok(res, parent);
});

// ─── List Parents (with filters) ────────────────────────────────
export const listParents = asyncHandler(async (req, res) => {
  const query = req.query;
  const schoolId = req.user.schoolId;
  const result = await service.listParents(query, schoolId);
  return ApiResponse.paginated(res, result.items, result.meta);
});

// ─── Link Children ──────────────────────────────────────────────
export const linkChildren = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { studentIds, relation } = req.body;
  const schoolId = req.user.schoolId;
  await service.linkChildren(id, studentIds, relation, schoolId);
  return ApiResponse.ok(res, null, 'Children linked');
});

// ─── Unlink Child ───────────────────────────────────────────────
export const unlinkChild = asyncHandler(async (req, res) => {
  const { parentId, studentId } = req.params;
  const schoolId = req.user.schoolId;
  await service.unlinkChild(parentId, studentId, schoolId);
  return ApiResponse.ok(res, null, 'Child unlinked');
});

// ─── Get Available Students ─────────────────────────────────────
export const getAvailableStudents = asyncHandler(async (req, res) => {
  const schoolId = req.user.schoolId;
  const { parentId } = req.query;
  const students = await service.getAvailableStudents(schoolId, parentId);
  return ApiResponse.ok(res, students);
});

// ─── Stats Dashboard ────────────────────────────────────────────
export const getStats = asyncHandler(async (req, res) => {
  const schoolId = req.user.schoolId;
  const stats = await service.getStats(schoolId);
  return ApiResponse.ok(res, stats);
});

// ─── Export Parents ─────────────────────────────────────────────
export const exportParents = asyncHandler(async (req, res) => {
  const query = req.query;
  const schoolId = req.user.schoolId;
  const result = await service.exportParents(query, schoolId);
  if (result.buffer) {
    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    return res.send(result.buffer);
  }
  return ApiResponse.ok(res, result, 'Export email sent');
});

// ─── Send Message to Parent (Quick Action) ──────────────────────
export const sendMessageToParent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { subject, body, type = 'GENERAL' } = req.body;
  const schoolId = req.user.schoolId;
  const senderId = req.user.id;
  const message = await service.sendMessageToParent(id, subject, body, type, schoolId, senderId);
  return ApiResponse.created(res, message, 'Message sent successfully');
});
