/**
 * Report service — business logic for generating reports.
 */

import { reportRepository } from './report.repository.js';
import { ApiError } from '#shared/response/ApiError.js';

export const reportService = {
  /**
   * Teacher-wise timetable report.
   */
  async teacherReport(timetableId, schoolId) {
    const timetable = await reportRepository.getTimetableWithAssignments(timetableId, schoolId);
    if (!timetable) throw new ApiError(404, 'Timetable not found');

    const map = {};

    for (const a of timetable.assignments) {
      if (!map[a.teacherId]) {
        map[a.teacherId] = {
          teacherId: a.teacherId,
          teacherName: a.teacher?.name || 'Unknown',
          slots: [],
        };
      }

      map[a.teacherId].slots.push({
        day: a.dayOfWeek,
        period: a.periodNumber,
        classId: a.classGroupId,
        className: a.classGroup ? `${a.classGroup.grade}-${a.classGroup.section}` : null,
        subjectId: a.subjectId,
        subjectName: a.subject?.name || null,
        roomId: a.roomId,
        roomNumber: a.room?.roomNumber || null,
        isSubstituted: a.isSubstituted,
        isTemporary: a.isTemporary,
      });
    }

    // Sort slots and calculate totals
    for (const t of Object.values(map)) {
      t.slots.sort((a, b) => a.day - b.day || a.period - b.period);
      t.totalPeriods = t.slots.length;
      t.daysActive = new Set(t.slots.map((s) => s.day)).size;
    }

    return Object.values(map);
  },

  /**
   * Class-wise timetable report.
   */
  async classReport(timetableId, schoolId) {
    const timetable = await reportRepository.getTimetableWithAssignments(timetableId, schoolId);
    if (!timetable) throw new ApiError(404, 'Timetable not found');

    const map = {};

    for (const a of timetable.assignments) {
      if (!map[a.classGroupId]) {
        map[a.classGroupId] = {
          classId: a.classGroupId,
          className: a.classGroup ? `${a.classGroup.grade}-${a.classGroup.section}` : null,
          grade: a.classGroup?.grade || null,
          section: a.classGroup?.section || null,
          slots: [],
        };
      }

      map[a.classGroupId].slots.push({
        day: a.dayOfWeek,
        period: a.periodNumber,
        subjectId: a.subjectId,
        subjectName: a.subject?.name || null,
        teacherId: a.teacherId,
        teacherName: a.teacher?.name || null,
        roomId: a.roomId,
        roomNumber: a.room?.roomNumber || null,
        periodType: a.periodType,
      });
    }

    for (const c of Object.values(map)) {
      c.slots.sort((a, b) => a.day - b.day || a.period - b.period);
      c.totalPeriods = c.slots.length;
      c.subjectsStudied = new Set(c.slots.map((s) => s.subjectId)).size;
    }

    return Object.values(map);
  },

  /**
   * Room utilisation report.
   */
  async roomUtilisationReport(timetableId, schoolId, schoolConfig) {
    const timetable = await reportRepository.getTimetableWithAssignments(timetableId, schoolId);
    if (!timetable) throw new ApiError(404, 'Timetable not found');

    const config = schoolConfig || (await reportRepository.getSchoolConfig(schoolId));
    const workingDays = config?.workingDays?.length || 6;
    const periodsPerDay = config?.periodsPerDay || 8;
    const totalSlots = workingDays * periodsPerDay;

    const roomCounts = {};
    const roomDetails = {};

    for (const a of timetable.assignments) {
      if (!a.roomId) continue;
      roomCounts[a.roomId] = (roomCounts[a.roomId] || 0) + 1;
      if (!roomDetails[a.roomId] && a.room) {
        roomDetails[a.roomId] = {
          roomNumber: a.room.roomNumber,
          roomName: a.room.roomName,
          type: a.room.type,
        };
      }
    }

    return Object.entries(roomCounts)
      .map(([roomId, used]) => ({
        roomId,
        roomNumber: roomDetails[roomId]?.roomNumber || roomId,
        roomName: roomDetails[roomId]?.roomName || null,
        type: roomDetails[roomId]?.type || null,
        usedSlots: used,
        totalSlots,
        utilisationPct: Math.round((used / totalSlots) * 100),
        freeSlots: totalSlots - used,
      }))
      .sort((a, b) => b.utilisationPct - a.utilisationPct);
  },

  /**
   * Validation report for a timetable.
   */
  async validationReport(timetableId, schoolId) {
    const timetable = await reportRepository.getTimetableWithAssignments(timetableId, schoolId);
    if (!timetable) throw new ApiError(404, 'Timetable not found');

    const report = await reportRepository.getValidationReport(timetableId);
    if (!report) {
      throw new ApiError(404, 'No validation report found. Run validation first.');
    }

    return report;
  },

  /**
   * Improvement suggestions.
   */
  async improvementSuggestions(timetableId, schoolId, limit = 20) {
    const report = await this.validationReport(timetableId, schoolId);

    const all = [
      ...(report.criticalList || []).map((item) => ({ ...item, severity: 'ERROR' })),
      ...(report.warningList || []).map((item) => ({ ...item, severity: 'WARNING' })),
      ...(report.suggestionList || []).map((item) => ({ ...item, severity: 'SUGGESTION' })),
    ].sort((a, b) => (b.penalty || 0) - (a.penalty || 0));

    return {
      total: all.length,
      items: all.slice(0, limit),
      bySeverity: {
        errors: all.filter((i) => i.severity === 'ERROR').length,
        warnings: all.filter((i) => i.severity === 'WARNING').length,
        suggestions: all.filter((i) => i.severity === 'SUGGESTION').length,
      },
    };
  },

  /**
   * Daily summary report.
   */
  async dailySummary(timetableId, schoolId, day) {
    const timetable = await reportRepository.getTimetableWithAssignments(timetableId, schoolId);
    if (!timetable) throw new ApiError(404, 'Timetable not found');

    const dayAssignments = timetable.assignments.filter((a) => a.dayOfWeek === day);

    return {
      timetableId,
      day,
      totalPeriods: dayAssignments.length,
      classesActive: new Set(dayAssignments.map((a) => a.classGroupId)).size,
      teachersActive: new Set(dayAssignments.map((a) => a.teacherId)).size,
      roomsUsed: new Set(dayAssignments.filter((a) => a.roomId).map((a) => a.roomId)).size,
      substitutions: dayAssignments.filter((a) => a.isSubstituted).length,
    };
  },
};
