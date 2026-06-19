<<<<<<< HEAD
<<<<<<< HEAD
// src/modules/m6-students/student.controller.js
import { ApiResponse } from '#shared/response/ApiResponse.js';
import { asyncHandler } from '#shared/response/asyncHandler.js';
import { StudentService } from './student.service.js';

const service = new StudentService();

// ─── Create Student (with photo upload) ─────────────────────────
export const createStudent = asyncHandler(async (req, res) => {
  const data = req.body;
  const photoFile = req.file;
  const schoolId = req.user.schoolId;
  const student = await service.createStudent(data, schoolId, photoFile);
  return ApiResponse.created(res, student, 'Student created successfully');
});

// ─── Update Student ──────────────────────────────────────────────
export const updateStudent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const data = req.body;
  const photoFile = req.file;
  const schoolId = req.user.schoolId;
  const updated = await service.updateStudent(id, data, schoolId, photoFile);
  return ApiResponse.ok(res, updated, 'Student updated');
});

// ─── Delete Student ──────────────────────────────────────────────
export const deleteStudent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const schoolId = req.user.schoolId;
  await service.deleteStudent(id, schoolId);
  return ApiResponse.ok(res, null, 'Student deleted');
});

// ─── Get Student Details ─────────────────────────────────────────
export const getStudent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const schoolId = req.user.schoolId;
  const student = await service.getStudent(id, schoolId);
  return ApiResponse.ok(res, student);
});

// ─── List Students ───────────────────────────────────────────────
export const listStudents = asyncHandler(async (req, res) => {
  const query = req.query;
  const schoolId = req.user.schoolId;
  const result = await service.listStudents(query, schoolId);
  return ApiResponse.paginated(res, result.items, result.meta);
});

// ─── Stats Dashboard ─────────────────────────────────────────────
export const getStats = asyncHandler(async (req, res) => {
  const schoolId = req.user.schoolId;
  const stats = await service.getStats(schoolId);
  return ApiResponse.ok(res, stats);
});

// ─── Link Parents ────────────────────────────────────────────────
export const linkParents = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { parentIds } = req.body;
  const schoolId = req.user.schoolId;
  await service.linkParents(id, parentIds, schoolId);
  return ApiResponse.ok(res, null, 'Parents linked');
});

// ─── Unlink Parent ───────────────────────────────────────────────
export const unlinkParent = asyncHandler(async (req, res) => {
  const { studentId, parentId } = req.params;
  const schoolId = req.user.schoolId;
  await service.unlinkParent(studentId, parentId, schoolId);
  return ApiResponse.ok(res, null, 'Parent unlinked');
});

// ─── Update Emergency Visibility ─────────────────────────────────
export const updateEmergencyVisibility = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { visibility } = req.body;
  const schoolId = req.user.schoolId;
  await service.updateEmergencyVisibility(id, visibility, schoolId);
  return ApiResponse.ok(res, null, 'Emergency visibility updated');
});

// ─── Send Message to Parents ─────────────────────────────────────
export const sendMessageToParents = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { subject, body, type } = req.body;
  const schoolId = req.user.schoolId;
  const senderId = req.user.id;
  const result = await service.sendMessageToParents(id, subject, body, type, schoolId, senderId);
  return ApiResponse.ok(res, result, 'Messages sent');
});

// ─── Export Students ─────────────────────────────────────────────
export const exportStudents = asyncHandler(async (req, res) => {
  const query = req.query;
  const schoolId = req.user.schoolId;
  const result = await service.exportStudents(query, schoolId);
  if (result.buffer) {
    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    return res.send(result.buffer);
  }
  return ApiResponse.ok(res, result, 'Export email sent');
});

// ─── Upload Document ─────────────────────────────────────────────
export const uploadDocument = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const file = req.file;
  const { name, type } = req.body;
  const schoolId = req.user.schoolId;
  const doc = await service.uploadDocument(id, file, name, type, schoolId);
  return ApiResponse.created(res, doc, 'Document uploaded');
});

// ─── Delete Document ─────────────────────────────────────────────
export const deleteDocument = asyncHandler(async (req, res) => {
  const { studentId, documentId } = req.params;
  const schoolId = req.user.schoolId;
  await service.deleteDocument(studentId, documentId, schoolId);
  return ApiResponse.ok(res, null, 'Document deleted');
});

// ─── Bulk Upload Students (CSV/Excel) ────────────────────────────
export const bulkUploadStudents = asyncHandler(async (req, res) => {
  const file = req.file;
  if (!file) throw ApiError.badRequest('No file uploaded');
  const schoolId = req.user.schoolId;
  const result = await service.bulkUploadStudents(file, schoolId);
  return ApiResponse.ok(res, result, 'Bulk upload processed');
});
=======
=======
>>>>>>> fc2f457f3fe5f95777ea9ced16e959883f9d995e
// =============================================================================
// modules/students/student.controller.js — RESQID
// =============================================================================

import { ApiResponse } from '#shared/response/ApiResponse.js';
import { ApiError } from '#shared/response/ApiError.js';
import { asyncHandler } from '#shared/response/asyncHandler.js';
import * as service from './student.service.js';
import {
  createStudentSchema,
  updateStudentSchema,
  bulkCreateStudentSchema,
  studentListQuerySchema,
  studentIdParamsSchema,
} from './student.validation.js';

export const list = asyncHandler(async (req, res) => {
  const query = studentListQuerySchema.parse(req.query);
  req.query = query;
  const { students, total } = await service.list(req);
  const page = query.page,
    limit = query.limit;
  ApiResponse.paginated(res, students, { page, limit, total });
});

export const getOne = asyncHandler(async (req, res) => {
  const { id } = studentIdParamsSchema.parse(req.params);
  const student = await service.getOne(id, req);
  ApiResponse.ok(res, student);
});

export const create = asyncHandler(async (req, res) => {
  const parsed = createStudentSchema.parse(req.body);
  const student = await service.create(parsed, req.schoolId);
  ApiResponse.created(res, student, 'Student created');
});

export const update = asyncHandler(async (req, res) => {
  const { id } = studentIdParamsSchema.parse(req.params);
  const parsed = updateStudentSchema.parse(req.body);
  const student = await service.update(id, parsed, req.schoolId);
  ApiResponse.ok(res, student, 'Student updated');
});

export const remove = asyncHandler(async (req, res) => {
  const { id } = studentIdParamsSchema.parse(req.params);
  await service.remove(id, req.schoolId);
  ApiResponse.ok(res, null, 'Student deleted');
});

export const bulkCreate = asyncHandler(async (req, res) => {
  const parsed = bulkCreateStudentSchema.parse(req.body);
  const result = await service.bulkCreate(parsed.students, req.schoolId);
  ApiResponse.created(res, result, `${result.count} students imported`);
});

export const stats = asyncHandler(async (req, res) => {
  const result = await service.getStats(req.schoolId);
  ApiResponse.ok(res, result);
});
<<<<<<< HEAD
>>>>>>> 2306bae69da370bc7bfb048c15cfd0f99e474bff
=======
>>>>>>> fc2f457f3fe5f95777ea9ced16e959883f9d995e
