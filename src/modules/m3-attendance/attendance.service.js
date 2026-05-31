// =============================================================================
// modules/attendance/attendance.service.js — RESQID
// =============================================================================
import attendanceRepository from './attendance.repository.js';
import { ApiError } from '#shared/response/ApiError.js';

export class AttendanceService {
  async getAttendance(schoolId, query = {}) {
    const date = query.date || new Date().toISOString().split('T')[0];
    return attendanceRepository.getAttendanceByDate(schoolId, date, query);
  }

  async getStats(schoolId, query = {}) {
    const date = query.date || new Date().toISOString().split('T')[0];
    return attendanceRepository.getStats(schoolId, date);
  }

  async getMonthlyStats(schoolId, year) {
    return attendanceRepository.getMonthlyStats(schoolId, year);
  }

  /**
   * Mark a single student's attendance.
   */
  async markAttendance(schoolId, data, teacherId) {
    if (!data.date && !data.sessionId) {
      throw ApiError.badRequest('Either date or sessionId is required');
    }
    let sessionId = data.sessionId;
    if (!sessionId) {
      if (!data.class || !data.section) {
        throw ApiError.badRequest('class and section required when date is given');
      }
      const session = await attendanceRepository.findOrCreateSession(schoolId, {
        date: data.date,
        grade: data.class,
        section: data.section,
        teacherId,
      });
      sessionId = session.id;
    }

    return attendanceRepository.markAttendance(sessionId, data.studentId, data.status, data.remark, teacherId);
  }

  /**
   * Bulk mark attendance (from the modal save).
   */
  async bulkMarkAttendance(schoolId, data, teacherId) {
    if (!data.date && !data.sessionId) {
      throw ApiError.badRequest('Either date or sessionId is required');
    }
    let sessionId = data.sessionId;
    if (!sessionId) {
      if (!data.class || !data.section) {
        throw ApiError.badRequest('class and section required when date is given');
      }
      const session = await attendanceRepository.findOrCreateSession(schoolId, {
        date: data.date,
        grade: data.class,
        section: data.section,
        teacherId,
      });
      sessionId = session.id;
    }

    const results = [];
    for (const record of data.records) {
      const saved = await attendanceRepository.markAttendance(
        sessionId,
        record.studentId,
        record.status,
        record.remark,
        teacherId
      );
      results.push(saved);
    }
    return results;
  }
}

export default new AttendanceService();