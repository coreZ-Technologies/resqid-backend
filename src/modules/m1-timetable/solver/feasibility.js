// =============================================================================
// modules/m1-timetable/solver/feasibility.js — RESQID
// Runs before solver — checks if generation is even possible.
// =============================================================================

/**
 * Check if a timetable can be generated with current config.
 * Returns { feasible, reasons[], suggestions[] }
 */
export const runFeasibilityCheck = ({ config, teachers, subjects, classes, existingPeriods }) => {
  const reasons = [];
  const suggestions = [];

  // 1. Total required periods ≤ total available teacher-periods
  const workingDays = config.workingDays ? config.workingDays.toString(2).split('1').length - 1 : 5;

  const periodsPerDay = config.periodsPerDay || 8;
  const totalSlotsNeeded = classes.reduce((sum, cls) => {
    const classSubjects = subjects.filter((s) =>
      s.classSubjects?.some((cs) => cs.classId === cls.id)
    );
    return sum + classSubjects.reduce((s, sub) => s + (sub.periodsPerWeek || 5), 0);
  }, 0);

  const totalTeacherSlots = teachers.reduce((sum, t) => {
    const maxPerDay = t.maxPeriodsPerDay || 6;
    return sum + maxPerDay * workingDays;
  }, 0);

  if (totalSlotsNeeded > totalTeacherSlots) {
    reasons.push(
      `Need ${totalSlotsNeeded} slots but teachers can only cover ${totalTeacherSlots}. ` +
        `Add ${Math.ceil((totalSlotsNeeded - totalTeacherSlots) / workingDays)} more teachers or reduce periods.`
    );
  }

  // 2. Each subject must have at least one qualified teacher per grade
  for (const cls of classes) {
    const grade = parseInt(cls.grade);
    const classSubjects = subjects.filter((s) =>
      s.classSubjects?.some((cs) => cs.classId === cls.id)
    );

    for (const sub of classSubjects) {
      const qualified = teachers.filter(
        (t) =>
          t.subjects.includes(sub.id) &&
          (!t.gradeMin || grade >= t.gradeMin) &&
          (!t.gradeMax || grade <= t.gradeMax)
      );

      if (qualified.length === 0) {
        reasons.push(
          `No qualified teacher for ${sub.name} in Class ${cls.grade}-${cls.section}. ` +
            `Assign a teacher who can teach ${sub.name} for grade ${grade}.`
        );
      }
    }
  }

  // 3. Lab subjects need consecutive periods possible in day structure
  const labSubjects = subjects.filter((s) => s.requiresLab);
  if (labSubjects.length > 0 && periodsPerDay < 3) {
    reasons.push(
      `Lab subjects require consecutive periods but day has only ${periodsPerDay} periods.`
    );
  }

  // 4. No teacher exceeds absolute maximum
  const absoluteMaxPerWeek = workingDays * periodsPerDay;
  for (const teacher of teachers) {
    const maxWeek = teacher.maxPeriodsPerWeek || 30;
    if (maxWeek > absoluteMaxPerWeek) {
      suggestions.push(
        `${teacher.name}: max periods/week (${maxWeek}) exceeds possible (${absoluteMaxPerWeek}). Consider adjusting.`
      );
    }
  }

  return {
    feasible: reasons.length === 0,
    reasons,
    suggestions,
    stats: {
      totalSlotsNeeded,
      totalTeacherSlots,
      workingDays,
      periodsPerDay,
      teacherCount: teachers.length,
      classCount: classes.length,
      subjectCount: subjects.length,
    },
  };
};
