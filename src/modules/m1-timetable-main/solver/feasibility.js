/**
 * feasibility.js
 * Quick pre-check before backtracking starts.
 * Catches obviously impossible schedules early.
 */

/**
 * Check if total required periods fits within available slots.
 */
export function periodsVsSlots(template, schoolConfig) {
  const { periodsPerDay, workingDays, breaks = [] } = schoolConfig;
  const totalSlots = workingDays * (periodsPerDay - breaks.length);

  let totalRequired = 0;
  for (const cls of template.classes) {
    for (const subject of cls.subjects) {
      totalRequired += subject.weeklyPeriods;
    }
  }

  if (totalRequired > totalSlots * template.classes.length) {
    return {
      feasible: false,
      reason: `Total required periods (${totalRequired}) exceeds available slots (${totalSlots} per class)`,
    };
  }
  return { feasible: true };
}

/**
 * Check every subject has at least one eligible teacher.
 */
export function subjectTeacherCoverage(template) {
  const uncovered = [];
  for (const cls of template.classes) {
    for (const subject of cls.subjects) {
      const eligible = template.teachers.filter((t) => t.eligibleSubjects.includes(subject.id));
      if (eligible.length === 0) {
        uncovered.push({ classId: cls.id, subjectId: subject.id });
      }
    }
  }
  if (uncovered.length > 0) {
    return {
      feasible: false,
      reason: `No teacher available for subjects: ${JSON.stringify(uncovered)}`,
    };
  }
  return { feasible: true };
}

/**
 * Check part-time teachers have enough available slots to cover their assigned load.
 */
export function partTimeCapacity(template) {
  for (const teacher of template.teachers) {
    if (!teacher.isPartTime) continue;
    const available = (teacher.availableSlots || []).length;
    const assigned = template.classes
      .flatMap((c) => c.subjects)
      .filter((s) => s.assignedTeacherId === teacher.id)
      .reduce((sum, s) => sum + s.weeklyPeriods, 0);

    if (assigned > available) {
      return {
        feasible: false,
        reason: `Part-time teacher ${teacher.id} has ${assigned} assigned periods but only ${available} available slots`,
      };
    }
  }
  return { feasible: true };
}

/**
 * Run all feasibility checks.
 */
export function checkAll(template, schoolConfig) {
  const checks = [
    periodsVsSlots(template, schoolConfig),
    subjectTeacherCoverage(template),
    partTimeCapacity(template),
  ];
  for (const result of checks) {
    if (!result.feasible) return result;
  }
  return { feasible: true };
}
