// =============================================================================
// modules/m1-timetable/solver/propagator.js — RESQID
// MAC-3 Arc Consistency — removes impossible options after each assignment.
// =============================================================================

/**
 * Propagate constraints after assigning a teacher to a slot.
 * Removes that teacher from all conflicting slots.
 */
export const propagateAfterAssignment = (
  assignedSlot,
  assignedTeacher,
  allSlots,
  domains,
  teachers,
  config
) => {
  const teacher = teachers.find((t) => t.id === assignedTeacher);

  if (!teacher) return domains;

  const updatedDomains = domains.map((domain) => {
    // Skip the assigned slot itself
    if (domain._index === assignedSlot._index) return domain;

    let teachersList = [...domain.teachers];

    // ── HARD: Remove assigned teacher from same day+period ───────────────
    if (
      domain.dayOfWeek === assignedSlot.dayOfWeek &&
      domain.periodNumber === assignedSlot.periodNumber
    ) {
      teachersList = teachersList.filter((id) => id !== assignedTeacher);
    }

    // ── HARD: Remove if teacher would exceed daily max ──────────────────
    if (domain.dayOfWeek === assignedSlot.dayOfWeek) {
      const periodsOnDay =
        allSlots.filter(
          (s) => s._assignment?.teacherId === assignedTeacher && s.dayOfWeek === domain.dayOfWeek
        ).length + 1; // +1 for the one we just assigned

      if (periodsOnDay >= (teacher.maxPeriodsPerDay || 6)) {
        teachersList = teachersList.filter((id) => id !== assignedTeacher);
      }
    }

    // ── HARD: Remove if teacher would exceed weekly max ────────────────
    const periodsInWeek =
      allSlots.filter((s) => s._assignment?.teacherId === assignedTeacher).length + 1;

    if (periodsInWeek >= (teacher.maxPeriodsPerWeek || 30)) {
      teachersList = teachersList.filter((id) => id !== assignedTeacher);
    }

    // ── HARD: Remove if consecutive limit would be exceeded ────────────
    if (domain.dayOfWeek === assignedSlot.dayOfWeek) {
      const consecutiveCheck = checkConsecutiveLimit(
        assignedSlot,
        domain,
        assignedTeacher,
        allSlots,
        teacher
      );
      if (consecutiveCheck) {
        teachersList = teachersList.filter((id) => id !== assignedTeacher);
      }
    }

    // ── MEDIUM: Floor restriction ──────────────────────────────────────
    if (teacher.floorRestriction === 'GROUND_FLOOR_ONLY' && domain.periodNumber > 4) {
      // Assuming upper floors are later periods
      // This is school-configurable
    }

    return { ...domain, teachers: teachersList };
  });

  return updatedDomains;
};

/**
 * Propagate all constraints across all domains (full AC-3 pass).
 * Call after heuristic ordering, before backtracking.
 */
export const propagateConstraints = (slots, domains, teachers, config) => {
  let changed = true;
  let iterations = 0;
  const MAX_ITERATIONS = 100;

  let currentDomains = domains.map((d) => ({ ...d }));

  while (changed && iterations < MAX_ITERATIONS) {
    changed = false;
    iterations++;

    for (const domain of currentDomains) {
      const beforeCount = domain.teachers.length;

      // For each teacher in domain, check if any hard constraint is violated
      domain.teachers = domain.teachers.filter((teacherId) => {
        const teacher = teachers.find((t) => t.id === teacherId);
        if (!teacher) return false;

        // Check if teacher can even take this slot
        const grade = parseInt(domain.className.split('-')[0]);
        if (teacher.gradeMin && grade < teacher.gradeMin) return false;
        if (teacher.gradeMax && grade > teacher.gradeMax) return false;
        if (!teacher.subjects.includes(domain.subjectId)) return false;
        if (domain.type === 'LAB' && teacher.noLabDuty) return false;
        if (domain.requiresConsecutive && teacher.maxConsecutive < 2) return false;

        return true;
      });

      if (domain.teachers.length < beforeCount) {
        changed = true;
      }
    }
  }

  return currentDomains;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function checkConsecutiveLimit(assignedSlot, targetSlot, teacherId, allSlots, teacher) {
  const maxConsecutive = teacher.maxConsecutive || 4;

  // Only check if target is adjacent to assigned
  const periodDiff = Math.abs(targetSlot.periodNumber - assignedSlot.periodNumber);
  if (periodDiff > 1) return false;

  // Count consecutive periods for this teacher on this day
  const daySlots = allSlots
    .filter((s) => s.dayOfWeek === assignedSlot.dayOfWeek)
    .sort((a, b) => a.periodNumber - b.periodNumber);

  let consecutive = 0;
  for (const slot of daySlots) {
    if (slot._assignment?.teacherId === teacherId) {
      consecutive++;
    } else {
      consecutive = 0;
    }

    if (consecutive >= maxConsecutive) return true;
  }

  return false;
}
