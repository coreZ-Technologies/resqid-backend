// =============================================================================
// modules/m1-timetable/solver/validator.js — RESQID
// Validates an existing timetable (from manual entry or Excel import).
// Returns list of violations with exact reasons.
// =============================================================================

/**
 * Validate an existing timetable assignment.
 * @param {Array} periods - Array of { classId, teacherId, subjectId, dayOfWeek, periodNumber }
 * @param {Array} teachers - Teacher objects with constraints
 * @param {Object} config - School timetable config
 * @returns {Object} { valid, violations[], summary }
 */
export const validateTimetable = (periods, teachers, config) => {
  const violations = [];
  const teacherMap = new Map(teachers.map((t) => [t.id, t]));

  for (const period of periods) {
    const teacher = teacherMap.get(period.teacherId);
    if (!teacher) {
      violations.push({
        type: 'HARD',
        rule: 'UNKNOWN_TEACHER',
        period,
        message: `Teacher ${period.teacherId} not found`,
      });
      continue;
    }

    // ── HARD: Teacher double-booking ──────────────────────────────────────
    const doubleBooked = periods.some(
      (p) =>
        p !== period &&
        p.teacherId === period.teacherId &&
        p.dayOfWeek === period.dayOfWeek &&
        p.periodNumber === period.periodNumber
    );

    if (doubleBooked) {
      violations.push({
        type: 'HARD',
        rule: 'DOUBLE_BOOKED',
        period,
        teacher: teacher.name,
        message: `${teacher.name} is assigned to two classes at same time (Day ${period.dayOfWeek}, Period ${period.periodNumber})`,
      });
    }

    // ── HARD: Grade range violation ──────────────────────────────────────
    // Would need class data to check grade

    // ── HARD: Subject qualification ──────────────────────────────────────
    if (!teacher.subjects.includes(period.subjectId)) {
      violations.push({
        type: 'HARD',
        rule: 'NOT_QUALIFIED',
        period,
        teacher: teacher.name,
        message: `${teacher.name} is not qualified to teach subject ${period.subjectId}`,
      });
    }

    // ── HARD: Daily max exceeded ─────────────────────────────────────────
    const dailyCount = periods.filter(
      (p) => p.teacherId === period.teacherId && p.dayOfWeek === period.dayOfWeek
    ).length;

    if (dailyCount > (teacher.maxPeriodsPerDay || 6)) {
      violations.push({
        type: 'HARD',
        rule: 'DAILY_MAX_EXCEEDED',
        period,
        teacher: teacher.name,
        message: `${teacher.name} has ${dailyCount} periods on day ${period.dayOfWeek} (max: ${teacher.maxPeriodsPerDay || 6})`,
      });
    }

    // ── HARD: Weekly max exceeded ────────────────────────────────────────
    const weeklyCount = periods.filter((p) => p.teacherId === period.teacherId).length;

    if (weeklyCount > (teacher.maxPeriodsPerWeek || 30)) {
      violations.push({
        type: 'HARD',
        rule: 'WEEKLY_MAX_EXCEEDED',
        period,
        teacher: teacher.name,
        message: `${teacher.name} has ${weeklyCount} periods this week (max: ${teacher.maxPeriodsPerWeek || 30})`,
      });
    }

    // ── MEDIUM: Consecutive periods ──────────────────────────────────────
    const consecutiveCount = getConsecutiveCount(
      periods,
      period.teacherId,
      period.dayOfWeek,
      period.periodNumber
    );
    const maxConsecutive = teacher.maxConsecutive || 4;

    if (consecutiveCount > maxConsecutive) {
      violations.push({
        type: 'MEDIUM',
        rule: 'MAX_CONSECUTIVE_EXCEEDED',
        period,
        teacher: teacher.name,
        message: `${teacher.name} has ${consecutiveCount} consecutive periods (max: ${maxConsecutive})`,
      });
    }
  }

  // ── HARD: Class double-booking ─────────────────────────────────────────
  for (const period of periods) {
    const classDoubleBooked = periods.some(
      (p) =>
        p !== period &&
        p.classId === period.classId &&
        p.dayOfWeek === period.dayOfWeek &&
        p.periodNumber === period.periodNumber
    );

    if (classDoubleBooked) {
      violations.push({
        type: 'HARD',
        rule: 'CLASS_DOUBLE_BOOKED',
        period,
        message: `Class has two teachers at Day ${period.dayOfWeek}, Period ${period.periodNumber}`,
      });
    }
  }

  const hardViolations = violations.filter((v) => v.type === 'HARD');
  const mediumViolations = violations.filter((v) => v.type === 'MEDIUM');

  return {
    valid: hardViolations.length === 0,
    violations,
    summary: {
      hard: hardViolations.length,
      medium: mediumViolations.length,
      total: violations.length,
    },
    canImport: hardViolations.length === 0,
  };
};
