/**
 * report/report.service.js
 * Generates structured reports from a timetable:
 * - Teacher-wise view
 * - Class-wise view
 * - Room utilisation
 * - Validation summary
 * - Improvement suggestions
 */

import timetableRepository from '../timetable.repository';

/**
 * Teacher-wise timetable: for each teacher, their schedule per day/period.
 */
export async function teacherReport(timetableId, schoolId) {
  const { assignments } = await timetableRepository.loadTimetableContext(timetableId, schoolId);

  const map = {};
  for (const a of assignments) {
    if (!map[a.teacherId]) map[a.teacherId] = { teacherId: a.teacherId, slots: [] };
    map[a.teacherId].slots.push({
      day: a.day,
      period: a.period,
      classId: a.classId,
      subjectId: a.subjectId,
      roomId: a.roomId,
      isTemporary: a.isTemporary ?? false,
    });
  }

  // Sort slots by day then period
  for (const t of Object.values(map)) {
    t.slots.sort((a, b) => a.day - b.day || a.period - b.period);
    t.totalPeriods = t.slots.length;
  }

  return Object.values(map);
}

/**
 * Class-wise timetable: for each class, their schedule.
 */
export async function classReport(timetableId, schoolId) {
  const { assignments } = await timetableRepository.loadTimetableContext(timetableId, schoolId);

  const map = {};
  for (const a of assignments) {
    if (!map[a.classId]) map[a.classId] = { classId: a.classId, slots: [] };
    map[a.classId].slots.push({
      day: a.day,
      period: a.period,
      subjectId: a.subjectId,
      teacherId: a.teacherId,
      roomId: a.roomId,
    });
  }

  for (const c of Object.values(map)) {
    c.slots.sort((a, b) => a.day - b.day || a.period - b.period);
  }

  return Object.values(map);
}

/**
 * Room utilisation: how many slots each room is used vs total available.
 */
export async function roomUtilisationReport(timetableId, schoolId, schoolConfig) {
  const { assignments } = await timetableRepository.loadTimetableContext(timetableId, schoolId);

  const totalSlots =
    schoolConfig.workingDays * (schoolConfig.periodsPerDay - (schoolConfig.breaks || []).length);

  const roomCounts = {};
  for (const a of assignments) {
    if (!a.roomId) continue;
    roomCounts[a.roomId] = (roomCounts[a.roomId] || 0) + 1;
  }

  return Object.entries(roomCounts).map(([roomId, used]) => ({
    roomId,
    usedSlots: used,
    totalSlots,
    utilisationPct: Math.round((used / totalSlots) * 100),
  }));
}

/**
 * Validation summary report — violations, warnings, suggestions.
 */
export async function validationReport(timetableId, schoolId) {
  const report = await timetableRepository.getValidationReport(timetableId);
  if (!report) {
    throw Object.assign(new Error('No validation report found. Run validate first.'), {
      status: 404,
    });
  }
  return report;
}

/**
 * Improvement suggestions — extract top-N soft/medium issues.
 */
export async function improvementSuggestions(timetableId, schoolId, limit = 20) {
  const report = await validationReport(timetableId, schoolId);

  const all = [
    ...report.warnings.map((w) => ({ ...w, severity: 'medium' })),
    ...report.suggestions.map((s) => ({ ...s, severity: 'soft' })),
  ].sort((a, b) => b.penalty - a.penalty);

  return all.slice(0, limit);
}
