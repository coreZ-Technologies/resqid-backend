// src/modules/subjects/subject.controller.js
import { subjectService } from './subject.service.js';
import {
  subjectIdParamsSchema,
  subjectQuerySchema,
  createSubjectSchema,
  updateSubjectSchema,
  exportQuerySchema,
} from './subject.validation.js';
import { ApiResponse } from '#shared/response/ApiResponse.js';
import { asyncHandler } from '#shared/response/asyncHandler.js';

export const getStats = asyncHandler(async (req, res) => {
  const stats = await subjectService.getStats(req.schoolId);
  ApiResponse.ok(res, stats);
});

export const list = asyncHandler(async (req, res) => {
  const query = subjectQuerySchema.parse(req.query);
  const result = await subjectService.list(req.schoolId, query);
  ApiResponse.ok(res, result);
});

export const getOne = asyncHandler(async (req, res) => {
  const { id } = subjectIdParamsSchema.parse(req.params);
  const subject = await subjectService.getOne(id, req.schoolId);
  ApiResponse.ok(res, subject);
});

export const create = asyncHandler(async (req, res) => {
  const data = createSubjectSchema.parse(req.body);
  const result = await subjectService.create(req.schoolId, data);
  ApiResponse.created(res, result, 'Subject created');
});

export const update = asyncHandler(async (req, res) => {
  const { id } = subjectIdParamsSchema.parse(req.params);
  const data = updateSubjectSchema.parse(req.body);
  const result = await subjectService.update(id, req.schoolId, data);
  ApiResponse.ok(res, result, 'Subject updated');
});

export const remove = asyncHandler(async (req, res) => {
  const { id } = subjectIdParamsSchema.parse(req.params);
  await subjectService.remove(id, req.schoolId);
  ApiResponse.ok(res, null, 'Subject deleted successfully');
});

export const getFilterOptions = asyncHandler(async (req, res) => {
  const options = await subjectService.getFilterOptions();
  ApiResponse.ok(res, options);
});

export const exportSubjects = asyncHandler(async (req, res) => {
  const query = exportQuerySchema.parse(req.query);
  const data = await subjectService.exportSubjects(req.schoolId, query);

  const headers = [
    'id',
    'name',
    'code',
    'description',
    'teachers',
    'classes',
    'periodsPerWeek',
    'status',
  ];
  const csv = [
    headers.join(','),
    ...data.map((row) => headers.map((h) => `"${row[h] ?? ''}"`).join(',')),
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="subjects.csv"');
  res.send(csv);
});

export const bulkUpload = asyncHandler(async (req, res) => {
  const filePath = req.file?.path || req.body?.filePath;
  if (!filePath) {
    return ApiResponse.badRequest(res, 'No file provided');
  }

  const result = await subjectService.startBulkUpload(
    req.schoolId,
    filePath,
    req.file?.originalname || req.body?.fileName || 'subjects-upload.xlsx',
    req.user?.id
  );

  ApiResponse.accepted(res, result, 'Bulk upload queued');
});

export const getBulkUploadStatus = asyncHandler(async (req, res) => {
  const { jobId } = req.params;
  const status = await subjectService.getBulkUploadStatus(jobId);
  ApiResponse.ok(res, status);
});
