// TODO: Add implementation
// =============================================================================
// students.controller.js — RESQID
// Thin controller — parse req, call service, send ApiResponse.
// No business logic here.
// =============================================================================

import { ApiResponse } from '#shared/response/ApiResponse.js';
import {
  listStudents,
  getStudent,
  getStudentStats,
  addStudent,
  importStudents,
  editStudent,
  attachParent,
  detachParent,
  transferStudentClass,
  activateStudent,
  deactivateStudent,
  removeStudent,
} from './students.service.js';

// =============================================================================
// GET /students
// =============================================================================

export const list = async (req, res) => {
  const result = await listStudents(req.schoolId, req.query);

  return ApiResponse.paginated(res, result.data, result.meta, 'Students retrieved');
};

// =============================================================================
// GET /students/stats
// =============================================================================

export const stats = async (req, res) => {
  const data = await getStudentStats(req.schoolId);

  return ApiResponse.ok(res, data, 'Student statistics retrieved');
};

// =============================================================================
// GET /students/:studentId
// =============================================================================

export const getOne = async (req, res) => {
  const student = await getStudent(req.params.studentId, req.schoolId);

  return ApiResponse.ok(res, student, 'Student retrieved');
};

// =============================================================================
// POST /students
// =============================================================================

export const create = async (req, res) => {
  const student = await addStudent(req.schoolId, req.body, req.user.id);

  return ApiResponse.created(res, student, 'Student created successfully');
};

// =============================================================================
// POST /students/bulk-import
// =============================================================================

export const bulkImport = async (req, res) => {
  const { students, skipDuplicates } = req.body;

  const result = await importStudents(req.schoolId, students, skipDuplicates, req.user.id);

  return ApiResponse.created(
    res,
    result,
    `Imported ${result.created} student(s)${result.skipped > 0 ? `, skipped ${result.skipped} duplicate(s)` : ''}`
  );
};

// =============================================================================
// PATCH /students/:studentId
// =============================================================================

export const update = async (req, res) => {
  const student = await editStudent(
    req.params.studentId,
    req.schoolId,
    req.body,
    req.user.id
  );

  return ApiResponse.ok(res, student, 'Student updated successfully');
};

// =============================================================================
// POST /students/:studentId/parent
// =============================================================================

export const linkParent = async (req, res) => {
  const result = await attachParent(
    req.params.studentId,
    req.schoolId,
    req.body.parentId,
    req.user.id
  );

  return ApiResponse.ok(res, result, 'Parent linked to student');
};

// =============================================================================
// DELETE /students/:studentId/parent
// =============================================================================

export const unlinkParent = async (req, res) => {
  const result = await detachParent(req.params.studentId, req.schoolId, req.user.id);

  return ApiResponse.ok(res, result, 'Parent unlinked from student');
};

// =============================================================================
// POST /students/:studentId/transfer
// =============================================================================

export const transfer = async (req, res) => {
  const result = await transferStudentClass(
    req.params.studentId,
    req.schoolId,
    req.body,
    req.user.id
  );

  return ApiResponse.ok(res, result, 'Student transferred successfully');
};

// =============================================================================
// PATCH /students/:studentId/activate
// =============================================================================

export const activate = async (req, res) => {
  const result = await activateStudent(req.params.studentId, req.schoolId, req.user.id);

  return ApiResponse.ok(res, result, 'Student activated');
};

// =============================================================================
// PATCH /students/:studentId/deactivate
// =============================================================================

export const deactivate = async (req, res) => {
  const result = await deactivateStudent(req.params.studentId, req.schoolId, req.user.id);

  return ApiResponse.ok(res, result, 'Student deactivated');
};

// =============================================================================
// DELETE /students/:studentId
// =============================================================================

export const remove = async (req, res) => {
  const result = await removeStudent(req.params.studentId, req.schoolId, req.user.id);

  return ApiResponse.ok(res, result, 'Student deleted successfully');
};