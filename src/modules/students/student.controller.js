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
