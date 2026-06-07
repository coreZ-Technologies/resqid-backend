// src/modules/classes/class.controller.js
import { classService } from './class.service.js';
import {
  classIdParamsSchema,
  classQuerySchema,
  createClassSchema,
  updateClassSchema,
  exportQuerySchema,
} from './class.validation.js';
import { ApiResponse } from '#shared/response/ApiResponse.js';
import { asyncHandler } from '#shared/response/asyncHandler.js';
import multer from 'multer';

// ─── Single Class CRUD ────────────────────────────────────────────────────

export const getStats = asyncHandler(async (req, res) => {
  const stats = await classService.getStats(req.schoolId);
  ApiResponse.ok(res, stats);
});

export const list = asyncHandler(async (req, res) => {
  const query = classQuerySchema.parse(req.query);
  const result = await classService.list(req.schoolId, query);
  ApiResponse.ok(res, result);
});

export const getOne = asyncHandler(async (req, res) => {
  const { id } = classIdParamsSchema.parse(req.params);
  const classGroup = await classService.getOne(id, req.schoolId);
  ApiResponse.ok(res, classGroup);
});

export const create = asyncHandler(async (req, res) => {
  const data = createClassSchema.parse(req.body);
  const result = await classService.create(req.schoolId, data);
  ApiResponse.created(res, result, 'Class created');
});

export const update = asyncHandler(async (req, res) => {
  const { id } = classIdParamsSchema.parse(req.params);
  const data = updateClassSchema.parse(req.body);
  const result = await classService.update(id, req.schoolId, data);
  ApiResponse.ok(res, result, 'Class updated');
});

export const remove = asyncHandler(async (req, res) => {
  const { id } = classIdParamsSchema.parse(req.params);
  await classService.remove(id, req.schoolId);
  ApiResponse.ok(res, null, 'Class deleted successfully');
});

export const getFilterOptions = asyncHandler(async (req, res) => {
  const options = await classService.getFilterOptions();
  ApiResponse.ok(res, options);
});

export const exportClasses = asyncHandler(async (req, res) => {
  const query = exportQuerySchema.parse(req.query);
  const data = await classService.exportClasses(req.schoolId, query);

  const headers = [
    'id',
    'grade',
    'section',
    'classTeacher',
    'students',
    'subjects',
    'room',
    'status',
  ];
  const csv = [
    headers.join(','),
    ...data.map((row) =>
      headers
        .map((h) => {
          const val =
            h === 'classTeacher'
              ? row.classTeacher
              : h === 'subjects'
                ? (row.subjects || []).join('; ')
                : (row[h] ?? '');
          return `"${val}"`;
        })
        .join(',')
    ),
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="classes.csv"');
  res.send(csv);
});

// ─── Bulk Upload ──────────────────────────────────────────────────────────

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

export const bulkUpload = asyncHandler(async (req, res) => {
  // In production, file is already uploaded to S3 by multer-s3 or pre-signed URL
  // For now, assume file path is passed or we store temporarily
  const filePath = req.file?.path || req.body?.filePath;

  if (!filePath) {
    return ApiResponse.badRequest(res, 'No file provided');
  }

  const result = await classService.startBulkUpload(
    req.schoolId,
    filePath,
    req.file?.originalname || req.body?.fileName || 'classes-upload.xlsx',
    req.user?.id
  );

  ApiResponse.accepted(res, result, 'Bulk upload queued');
});

export const getBulkUploadStatus = asyncHandler(async (req, res) => {
  const { jobId } = req.params;
  const status = await classService.getBulkUploadStatus(jobId);
  ApiResponse.ok(res, status);
});
