// school-admin/dashboard/dashboard.controller.js
import { ApiResponse } from '#shared/response/ApiResponse.js';
import { asyncHandler } from '#shared/response/asyncHandler.js';
import { DashboardService } from './dashboard.service.js';

const service = new DashboardService();

export const getStats = asyncHandler(async (req, res) => {
  const schoolId = req.user.schoolId;
  const stats = await service.getStats(schoolId);
  return ApiResponse.ok(res, stats);
});

export const getClassAttendance = asyncHandler(async (req, res) => {
  const schoolId = req.user.schoolId;
  const data = await service.getClassAttendance(schoolId);
  return ApiResponse.ok(res, data);
});

export const getWeeklyTrend = asyncHandler(async (req, res) => {
  const schoolId = req.user.schoolId;
  const trend = await service.getWeeklyTrend(schoolId);
  return ApiResponse.ok(res, trend);
});

export const getRecentActivity = asyncHandler(async (req, res) => {
  const schoolId = req.user.schoolId;
  const { type, limit } = req.query;
  const activities = await service.getRecentActivity(schoolId, type, parseInt(limit) || 10);
  return ApiResponse.ok(res, activities);
});

export const getLowAttendance = asyncHandler(async (req, res) => {
  const schoolId = req.user.schoolId;
  const students = await service.getLowAttendance(schoolId);
  return ApiResponse.ok(res, students);
});

export const getNotifications = asyncHandler(async (req, res) => {
  const schoolId = req.user.schoolId;
  const limit = parseInt(req.query.limit) || 5;
  const notifications = await service.getNotifications(schoolId, limit);
  return ApiResponse.ok(res, notifications);
});

export const getTimetable = asyncHandler(async (req, res) => {
  const schoolId = req.user.schoolId;
  const { class: className, section } = req.query;
  const timetable = await service.getTimetable(schoolId, className, section);
  return ApiResponse.ok(res, timetable);
});

export const getSubscription = asyncHandler(async (req, res) => {
  const schoolId = req.user.schoolId;
  const subscription = await service.getSubscription(schoolId);
  return ApiResponse.ok(res, subscription);
});