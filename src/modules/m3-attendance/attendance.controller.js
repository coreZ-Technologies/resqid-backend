// =============================================================================
// modules/attendance/attendance.controller.js — RESQID
// =============================================================================
import attendanceService from './attendance.service.js';
import attendanceValidation from './attendance.validation.js';
import { ApiError } from '#shared/response/ApiError.js';
import { asyncHandler, asyncController } from '#shared/response/asyncHandler.js';
import { ApiResponse } from '#shared/response/ApiResponse.js';

const attendanceController = {
  /**
   * GET /api/attendance
   * Get attendance data for a date, optionally filtered by class/section.
   */
  list: asyncHandler(async (req, res) => {
    const schoolId = req.user.schoolId;
    if (!schoolId) throw ApiError.tenantRequired();

    const query = attendanceValidation.getAttendance.parse(req.query);
    const data = await attendanceService.getAttendance(schoolId, query);
    return ApiResponse.success(res, { classes: data });
  }),

  /**
   * GET /api/attendance/stats
   */
  stats: asyncHandler(async (req, res) => {
    const schoolId = req.user.schoolId;
    if (!schoolId) throw ApiError.tenantRequired();

    const query = attendanceValidation.stats.parse(req.query);
    const stats = await attendanceService.getStats(schoolId, query);
    return ApiResponse.success(res, stats);
  }),

  /**
   * GET /api/attendance/monthly?year=2025
   */
  monthly: asyncHandler(async (req, res) => {
    const schoolId = req.user.schoolId;
    if (!schoolId) throw ApiError.tenantRequired();

    const { year } = attendanceValidation.monthly.parse(req.query);
    const data = await attendanceService.getMonthlyStats(schoolId, year);
    return ApiResponse.success(res, data);
  }),

  /**
   * POST /api/attendance/mark
   * Mark attendance for a single student.
   */
  mark: asyncHandler(async (req, res) => {
    const schoolId = req.user.schoolId;
    if (!schoolId) throw ApiError.tenantRequired();

    const body = attendanceValidation.markAttendance.parse(req.body);
    const result = await attendanceService.markAttendance(schoolId, body, req.user.id);
    return ApiResponse.success(res, result, 'Attendance marked');
  }),

  /**
   * POST /api/attendance/bulk
   * Bulk mark attendance (from modal).
   */
  bulkMark: asyncHandler(async (req, res) => {
    const schoolId = req.user.schoolId;
    if (!schoolId) throw ApiError.tenantRequired();

    const body = attendanceValidation.bulkMark.parse(req.body);
    const result = await attendanceService.bulkMarkAttendance(schoolId, body, req.user.id);
    return ApiResponse.success(res, result, 'Attendance updated');
  }),
};

export default asyncController(attendanceController);