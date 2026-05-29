// =============================================================================
// modules/m1-timetable/timetable.controller.js — RESQID
// =============================================================================

import { ApiResponse } from '#shared/response/ApiResponse.js';
import { asyncHandler } from '#shared/response/asyncHandler.js';
import * as service from './timetable.service.js';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

export const getConfig = asyncHandler(async (req, res) => {
  const config = await service.getConfig(req.schoolId);
  return ApiResponse.ok(res, config || {});
});

export const updateConfig = asyncHandler(async (req, res) => {
  const config = await service.updateConfig(req.schoolId, req.body);
  return ApiResponse.ok(res, config, 'Timetable config updated');
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEACHER
// ═══════════════════════════════════════════════════════════════════════════════

export const createTeacher = asyncHandler(async (req, res) => {
  const teacher = await service.createTeacher(req.schoolId, req.body);
  return ApiResponse.created(res, teacher, 'Teacher added');
});

export const listTeachers = asyncHandler(async (req, res) => {
  const teachers = await service.listTeachers(req.schoolId);
  return ApiResponse.ok(res, teachers);
});

export const getTeacher = asyncHandler(async (req, res) => {
  const teacher = await service.getTeacher(req.params.teacherId, req.schoolId);
  return ApiResponse.ok(res, teacher);
});

export const updateTeacher = asyncHandler(async (req, res) => {
  const teacher = await service.updateTeacher(req.params.teacherId, req.body);
  return ApiResponse.ok(res, teacher, 'Teacher updated');
});

export const removeTeacher = asyncHandler(async (req, res) => {
  await service.removeTeacher(req.params.teacherId);
  return ApiResponse.ok(res, null, 'Teacher removed');
});

// ═══════════════════════════════════════════════════════════════════════════════
// SUBJECT
// ═══════════════════════════════════════════════════════════════════════════════

export const createSubject = asyncHandler(async (req, res) => {
  const subject = await service.createSubject(req.schoolId, req.body);
  return ApiResponse.created(res, subject, 'Subject added');
});

export const listSubjects = asyncHandler(async (req, res) => {
  const subjects = await service.listSubjects(req.schoolId);
  return ApiResponse.ok(res, subjects);
});

// ═══════════════════════════════════════════════════════════════════════════════
// CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export const createClass = asyncHandler(async (req, res) => {
  const cls = await service.createClass(req.schoolId, req.body);
  return ApiResponse.created(res, cls, 'Class added');
});

export const listClasses = asyncHandler(async (req, res) => {
  const classes = await service.listClasses(req.schoolId);
  return ApiResponse.ok(res, classes);
});

// ═══════════════════════════════════════════════════════════════════════════════
// PERIOD
// ═══════════════════════════════════════════════════════════════════════════════

export const addPeriod = asyncHandler(async (req, res) => {
  const period = await service.addPeriod(req.schoolId, req.body);
  return ApiResponse.created(res, period, 'Period added');
});

export const addBulkPeriods = asyncHandler(async (req, res) => {
  const result = await service.addBulkPeriods(req.schoolId, req.body.classId, req.body.periods);
  return ApiResponse.created(res, result, `${result.count} periods added`);
});

export const getClassTimetable = asyncHandler(async (req, res) => {
  const periods = await service.getClassTimetable(req.params.classId, req.schoolId);
  return ApiResponse.ok(res, periods);
});

export const getTeacherTimetable = asyncHandler(async (req, res) => {
  const periods = await service.getTeacherTimetable(req.params.teacherId, req.schoolId);
  return ApiResponse.ok(res, periods);
});

export const removePeriod = asyncHandler(async (req, res) => {
  await service.removePeriod(req.params.periodId);
  return ApiResponse.ok(res, null, 'Period removed');
});

export const clearTimetable = asyncHandler(async (req, res) => {
  await service.clearTimetable(req.params.classId);
  return ApiResponse.ok(res, null, 'Timetable cleared');
});

// ═══════════════════════════════════════════════════════════════════════════════
// AUTO-GENERATE
// ═══════════════════════════════════════════════════════════════════════════════

export const generateTimetable = asyncHandler(async (req, res) => {
  const result = await service.generateTimetable(req.schoolId, req.body);
  return ApiResponse.ok(res, result, result.success ? 'Timetable generated' : 'Generation failed');
});

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATE IMPORT
// ═══════════════════════════════════════════════════════════════════════════════

export const validateImported = asyncHandler(async (req, res) => {
  const result = await service.validateImportedTimetable(req.schoolId, req.body.periods);
  return ApiResponse.ok(res, result);
});

// ═══════════════════════════════════════════════════════════════════════════════
// SUBSTITUTION
// ═══════════════════════════════════════════════════════════════════════════════

export const createSubstitution = asyncHandler(async (req, res) => {
  const sub = await service.createSubstitution(req.schoolId, req.body);
  return ApiResponse.created(res, sub, 'Substitution requested');
});

export const listSubstitutions = asyncHandler(async (req, res) => {
  const subs = await service.listSubstitutions(req.schoolId, req.query.date);
  return ApiResponse.ok(res, subs);
});

export const approveSubstitution = asyncHandler(async (req, res) => {
  const sub = await service.approveSubstitution(
    req.params.substitutionId,
    req.schoolId,
    req.body.status,
    req.user.id
  );
  return ApiResponse.ok(res, sub, `Substitution ${req.body.status}`);
});

export const findSubstitute = asyncHandler(async (req, res) => {
  const candidates = await service.findSubstituteForPeriod(req.schoolId, req.params.periodId);
  return ApiResponse.ok(res, candidates);
});
