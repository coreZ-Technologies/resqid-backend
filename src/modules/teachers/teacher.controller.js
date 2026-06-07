// src/modules/teachers/teacher.controller.js
import { teacherService } from './teacher.service.js';
import {
  teacherIdParamsSchema,
  checkEmailQuerySchema,
  checkPhoneQuerySchema,
  createTeacherSchema,
  teacherQuerySchema,
  updateTeacherSchema,
  exportQuerySchema,
} from './teacher.validation.js';
import { ApiResponse } from '#shared/response/ApiResponse.js';
import { asyncHandler } from '#shared/response/asyncHandler.js';

export const getDropdownOptions = asyncHandler(async (req, res) => {
  const options = await teacherService.getDropdownOptions(req.schoolId);
  ApiResponse.ok(res, options);
});

export const checkEmailAvailability = asyncHandler(async (req, res) => {
  const { email } = checkEmailQuerySchema.parse(req.query);
  const result = await teacherService.checkEmailAvailability(req.schoolId, email);
  ApiResponse.ok(res, result);
});

export const checkPhoneAvailability = asyncHandler(async (req, res) => {
  const { phone } = checkPhoneQuerySchema.parse(req.query);
  const result = await teacherService.checkPhoneAvailability(req.schoolId, phone);
  ApiResponse.ok(res, result);
});

export const create = asyncHandler(async (req, res) => {
  const data = createTeacherSchema.parse(req.body);
  const result = await teacherService.create(req.schoolId, data);
  ApiResponse.created(res, result, 'Teacher created successfully');
});

export const list = asyncHandler(async (req, res) => {
  const query = teacherQuerySchema.parse(req.query);
  const result = await teacherService.list(req.schoolId, query);
  ApiResponse.ok(res, result);
});

export const getOne = asyncHandler(async (req, res) => {
  const { id } = teacherIdParamsSchema.parse(req.params);
  const teacher = await teacherService.getOne(id, req.schoolId);
  ApiResponse.ok(res, teacher);
});

export const update = asyncHandler(async (req, res) => {
  const { id } = teacherIdParamsSchema.parse(req.params);
  const data = updateTeacherSchema.parse(req.body);
  const result = await teacherService.update(id, req.schoolId, data);
  ApiResponse.ok(res, result, 'Teacher updated');
});

export const remove = asyncHandler(async (req, res) => {
  const { id } = teacherIdParamsSchema.parse(req.params);
  await teacherService.remove(id, req.schoolId);
  ApiResponse.ok(res, null, 'Teacher deactivated successfully');
});

export const exportTeachers = asyncHandler(async (req, res) => {
  const query = exportQuerySchema.parse(req.query);
  const data = await teacherService.exportTeachers(req.schoolId, query);

  const headers = [
    'id',
    'name',
    'email',
    'phone',
    'subjects',
    'qualifications',
    'experience',
    'joiningDate',
    'employeeId',
    'assignedClasses',
    'status',
  ];
  const csv = [
    headers.join(','),
    ...data.map((row) =>
      headers
        .map((h) => {
          const val =
            h === 'subjects'
              ? (row.subjects || []).join('; ')
              : h === 'qualifications'
                ? (row.qualifications || []).join('; ')
                : h === 'assignedClasses'
                  ? (row.assignedClasses || []).join('; ')
                  : (row[h] ?? '');
          return `"${val}"`;
        })
        .join(',')
    ),
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="teachers.csv"');
  res.send(csv);
});

export const bulkUpload = asyncHandler(async (req, res) => {
  const filePath = req.file?.path || req.body?.filePath;
  if (!filePath) {
    return ApiResponse.badRequest(res, 'No file provided');
  }

  const result = await teacherService.startBulkUpload(
    req.schoolId,
    filePath,
    req.file?.originalname || req.body?.fileName || 'teachers-upload.xlsx',
    req.user?.id
  );

  ApiResponse.accepted(res, result, 'Bulk upload queued');
});

export const getBulkUploadStatus = asyncHandler(async (req, res) => {
  const { jobId } = req.params;
  const status = await teacherService.getBulkUploadStatus(jobId);
  ApiResponse.ok(res, status);
});
