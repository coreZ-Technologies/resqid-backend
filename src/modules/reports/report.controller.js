// src/modules/reports/report.controller.js
import { reportService } from './report.service.js';
import {
  statsQuerySchema,
  attendanceQuerySchema,
  scanLogQuerySchema,
  exportQuerySchema,
} from './report.validation.js';
import { ApiResponse } from '#shared/response/ApiResponse.js';
import { asyncHandler } from '#shared/response/asyncHandler.js';

export const getStats = asyncHandler(async (req, res) => {
  const query = statsQuerySchema.parse(req.query);
  const stats = await reportService.getStats(req.schoolId, query.date);
  ApiResponse.ok(res, stats);
});

export const getAttendanceReport = asyncHandler(async (req, res) => {
  const query = attendanceQuerySchema.parse(req.query);
  const result = await reportService.getAttendanceReport(req.schoolId, query);
  ApiResponse.ok(res, result);
});

export const getScanLogsReport = asyncHandler(async (req, res) => {
  const query = scanLogQuerySchema.parse(req.query);
  const result = await reportService.getScanLogsReport(req.schoolId, query);
  ApiResponse.ok(res, result);
});

export const getStudentsReport = asyncHandler(async (req, res) => {
  const result = await reportService.getStudentsReport();
  ApiResponse.ok(res, result);
});

export const getSessionsReport = asyncHandler(async (req, res) => {
  const result = await reportService.getSessionsReport();
  ApiResponse.ok(res, result);
});

export const getFilterOptions = asyncHandler(async (req, res) => {
  const options = await reportService.getFilterOptions(req.schoolId);
  ApiResponse.ok(res, options);
});

export const exportReport = asyncHandler(async (req, res) => {
  const query = exportQuerySchema.parse(req.query);
  const data = await reportService.exportReport(req.schoolId, query);

  if (query.format === 'csv') {
    const headers = getCsvHeaders(query.type);
    const csv = [
      headers.join(','),
      ...data.map((row) => headers.map((h) => `"${row[h] ?? ''}"`).join(',')),
    ].join('\n');

    const filename = `${query.type}-report.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(csv);
  }

  // PDF/Print — return JSON for now, frontend handles rendering
  ApiResponse.ok(res, { type: query.format, data });
});

function getCsvHeaders(type) {
  switch (type) {
    case 'attendance':
      return [
        'date',
        'class',
        'section',
        'totalStudents',
        'present',
        'absent',
        'late',
        'attendanceRate',
      ];
    case 'scan_logs':
      return ['date', 'time', 'studentName', 'class', 'result', 'device', 'responseTimeMs'];
    default:
      return ['id'];
  }
}
