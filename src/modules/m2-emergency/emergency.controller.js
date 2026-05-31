// =============================================================================
// modules/emergency/emergency.controller.js — RESQID
// =============================================================================
import emergencyService from './emergency.service.js';
import emergencyValidation from './emergency.validation.js';
import { ApiError } from '#shared/response/ApiError.js';
import { asyncHandler, asyncController } from '#shared/response/asyncHandler.js';
import { ApiResponse } from '#shared/response/ApiResponse.js';

const emergencyController = {

  /**
   * GET /api/emergency/students
   */
  listStudents: asyncHandler(async (req, res) => {
    const schoolId = req.user.schoolId;
    if (!schoolId) throw ApiError.tenantRequired();

    const query = emergencyValidation.studentQuery.parse(req.query);
    const data = await emergencyService.getStudents(schoolId, query);
    return ApiResponse.success(res, data);
  }),

  /**
   * GET /api/emergency/students/:studentId
   */
  getStudentProfile: asyncHandler(async (req, res) => {
    const schoolId = req.user.schoolId;
    if (!schoolId) throw ApiError.tenantRequired();

    const { studentId } = emergencyValidation.studentIdParam.parse(req.params);
    const data = await emergencyService.getStudentProfile(schoolId, studentId);
    return ApiResponse.success(res, data);
  }),

  /**
   * GET /api/emergency/incidents
   */
  listIncidents: asyncHandler(async (req, res) => {
    const schoolId = req.user.schoolId;
    if (!schoolId) throw ApiError.tenantRequired();

    const query = emergencyValidation.incidentQuery.parse(req.query);
    const data = await emergencyService.getIncidents(schoolId, query);
    return ApiResponse.success(res, data);
  }),

  /**
   * POST /api/emergency/incidents
   */
  createIncident: asyncHandler(async (req, res) => {
    const schoolId = req.user.schoolId;
    if (!schoolId) throw ApiError.tenantRequired();

    const body = emergencyValidation.createIncident.parse(req.body);
    const data = await emergencyService.createIncident(schoolId, body, req.user.id);
    return ApiResponse.created(res, data, 'Incident logged successfully');
  }),

  /**
   * GET /api/emergency/stats
   */
  getStats: asyncHandler(async (req, res) => {
    const schoolId = req.user.schoolId;
    if (!schoolId) throw ApiError.tenantRequired();

    const stats = await emergencyService.getStats(schoolId);
    return ApiResponse.success(res, stats);
  }),
};

export default asyncController(emergencyController);