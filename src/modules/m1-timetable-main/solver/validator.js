/**
 * validator.js
 * Validates an existing timetable (school-uploaded or generated).
 * Returns structured issues categorised by severity.
 */

import * as hard from '../constraints/hard';
import * as medium from '../constraints/medium';
import * as soft from '../constraints/soft';

/**
 * Validate an existing timetable.
 *
 * @param {Array} assignments - existing timetable slots
 * @param {Object} template - school template (classes, teachers, subjects)
 * @param {Object} schoolConfig - school operational config
 * @param {Function} getTeacherConfig - (teacherId) => teacherConfig
 * @param {Function} getTeacherWellness - (teacherId) => wellness object
 * @param {Function} getSubjectConfig - (subjectId) => subjectConfig
 * @param {Function} getRoomConfig - (roomId) => roomConfig
 * @returns {{ violations: Array, warnings: Array, suggestions: Array, score: number }}
 */
export function validate(
  assignments,
  template,
  schoolConfig,
  getTeacherConfig,
  getTeacherWellness,
  getSubjectConfig,
  getRoomConfig
) {
  const violations = []; // hard constraint breaks
  const warnings = []; // medium constraint misses
  const suggestions = []; // soft constraint improvements

  for (let i = 0; i < assignments.length; i++) {
    const a = assignments[i];
    const rest = assignments.filter((_, idx) => idx !== i);
    const teacherConfig = getTeacherConfig(a.teacherId) || {};
    const teacherWellness = getTeacherWellness(a.teacherId) || null;
    const subjectConfig = getSubjectConfig(a.subjectId) || {};
    const roomConfig = getRoomConfig(a.roomId) || null;

    // Hard checks
    const hardResult = hard.checkAll(a, rest, schoolConfig, teacherConfig);
    if (!hardResult.ok) {
      violations.push({
        type: 'hard',
        assignmentId: a.id,
        day: a.day,
        period: a.period,
        teacherId: a.teacherId,
        classId: a.classId,
        reason: hardResult.reason,
      });
    }

    // Medium checks
    const medPenalty = medium.scoreAll(a, rest, subjectConfig, schoolConfig, roomConfig);
    if (medPenalty > 0) {
      warnings.push({
        type: 'medium',
        assignmentId: a.id,
        day: a.day,
        period: a.period,
        teacherId: a.teacherId,
        penalty: medPenalty,
        hint: buildMediumHint(a, rest, subjectConfig, schoolConfig, roomConfig),
      });
    }

    // Soft checks
    const softPenalty = soft.scoreAll(
      a,
      rest,
      teacherWellness,
      teacherConfig,
      roomConfig,
      schoolConfig
    );
    if (softPenalty > 0) {
      suggestions.push({
        type: 'soft',
        assignmentId: a.id,
        day: a.day,
        period: a.period,
        teacherId: a.teacherId,
        penalty: softPenalty,
        hint: buildSoftHint(a, teacherWellness, roomConfig, schoolConfig),
      });
    }
  }

  // Weekly subject target check
  const targetIssues = checkWeeklyTargets(assignments, template);
  violations.push(...targetIssues);

  const totalScore =
    violations.length * 100 +
    warnings.reduce((sum, w) => sum + w.penalty, 0) +
    suggestions.reduce((sum, s) => sum + s.penalty, 0);

  return { violations, warnings, suggestions, score: totalScore };
}

function checkWeeklyTargets(assignments, template) {
  const issues = [];
  for (const cls of template.classes) {
    for (const subject of cls.subjects) {
      const actual = assignments.filter(
        (a) => a.classId === cls.id && a.subjectId === subject.id
      ).length;
      if (actual < subject.weeklyPeriods) {
        issues.push({
          type: 'hard',
          reason: `Class ${cls.id} subject ${subject.id}: needs ${subject.weeklyPeriods} periods/week but has ${actual}`,
          classId: cls.id,
          subjectId: subject.id,
        });
      }
    }
  }
  return issues;
}

function buildMediumHint(a, rest, subjectConfig, schoolConfig, roomConfig) {
  const hints = [];
  if (medium.heavySubjectTiming(a, subjectConfig, schoolConfig) > 0)
    hints.push('Heavy subject scheduled in second half — move to morning');
  if (medium.noConsecutiveOverload(a, rest) > 0)
    hints.push('Teacher has too many consecutive periods — add a gap');
  if (medium.roomTypeMatch(a, subjectConfig, roomConfig) > 0)
    hints.push(`Subject requires ${subjectConfig.requiredRoomType} room`);
  if (medium.subjectDailyCapOk(a, rest) > 0)
    hints.push('Subject appears too many times in one day');
  return hints.join('; ');
}

function buildSoftHint(a, wellness, roomConfig, schoolConfig) {
  if (!wellness) return '';
  const hints = [];
  if (wellness.isPregnant && roomConfig?.floor > 0)
    hints.push('Pregnant teacher assigned to upper floor — prefer ground floor');
  if (wellness.needsAccessibleRoom && !roomConfig?.isAccessible)
    hints.push('Teacher needs accessible room');
  if (wellness.isSenior) hints.push('Senior teacher may benefit from lighter load on this day');
  if (wellness.avoidEarlyMorning && a.period === 1)
    hints.push('Teacher prefers to avoid first period');
  if (wellness.burnoutRisk) hints.push('Teacher flagged for burnout risk — consider reducing load');
  return hints.join('; ');
}
