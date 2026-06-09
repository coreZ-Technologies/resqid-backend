// src/modules/reports/report.service.js
import { reportRepository } from './report.repository.js';

export const reportService = {
  async getStats(schoolId, date) {
    return reportRepository.getStats(schoolId, date);
  },

  async getAttendanceReport(schoolId, query) {
    const { records, total, limit, offset } = await reportRepository.getAttendanceReport(
      schoolId,
      query
    );
    return {
      records,
      pagination: { total, limit, offset },
    };
  },

  async getScanLogsReport(schoolId, query) {
    const { records, total, limit, offset } = await reportRepository.getScanLogsReport(
      schoolId,
      query
    );
    return {
      records,
      pagination: { total, limit, offset },
    };
  },

  async getStudentsReport() {
    return { message: 'Not implemented' };
  },

  async getSessionsReport() {
    return { message: 'Not implemented' };
  },

  async getFilterOptions(schoolId) {
    return reportRepository.getFilterOptions(schoolId);
  },

  async exportReport(schoolId, query) {
    const data = await reportRepository.getExportData(schoolId, query);
    return data;
  },
};
