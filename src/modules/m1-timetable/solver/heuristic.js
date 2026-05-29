// =============================================================================
// modules/m1-timetable/solver/heuristic.js — RESQID
// Orders slots by difficulty — hardest first (MCV heuristic).
// =============================================================================

/**
 * Order slots by Most Constrained Variable (MCV) heuristic.
 * Slots with fewer qualified teachers get placed first.
 */
export const orderSlotsByHeuristic = (slots, teachers, config) => {
  // Score each slot by difficulty
  const scored = slots.map((slot, index) => {
    const grade = parseInt(slot.className.split('-')[0]);

    // Count qualified teachers
    const qualifiedCount = teachers.filter((t) => {
      if (!t.subjects.includes(slot.subjectId)) return false;
      if (t.gradeMin && grade < t.gradeMin) return false;
      if (t.gradeMax && grade > t.gradeMax) return false;
      if (slot.type === 'LAB' && t.noLabDuty) return false;
      return true;
    }).length;

    // Difficulty factors (higher = harder, placed first)
    let difficulty = 100 - qualifiedCount; // Base: fewer teachers = harder

    // Lab/consecutive slots are hardest
    if (slot.type === 'LAB') difficulty += 50;
    if (slot.requiresConsecutive) difficulty += 40;

    // Core subjects slightly harder (must be placed carefully)
    if (slot.subjectCategory === 'CORE') difficulty += 10;

    // Specialist subjects harder
    if (slot.requiredQualifications?.length > 1) difficulty += 20;

    return { ...slot, _index: index, _difficulty: difficulty, _qualifiedCount: qualifiedCount };
  });

  // Sort by difficulty (descending) then by qualified count (ascending)
  scored.sort((a, b) => {
    if (b._difficulty !== a._difficulty) return b._difficulty - a._difficulty;
    return a._qualifiedCount - b._qualifiedCount;
  });

  return scored;
};

/**
 * Order teachers by Least Constraining Value (LCV) for a given slot.
 * Teachers who rule out fewer options for other slots are preferred.
 */
export const orderTeachersByLCV = (teachers, slot, allSlots, currentAssignments) => {
  const scored = teachers.map((teacher) => {
    let constraintScore = 0;

    // Teacher with fewer remaining slots available = more constrained
    const assignedCount = currentAssignments.filter((a) => a.teacherId === teacher.id).length;
    const maxPerWeek = teacher.maxPeriodsPerWeek || 30;
    constraintScore += (assignedCount / maxPerWeek) * 50;

    // Teacher teaching fewer subjects = more flexible (prefer to assign them)
    constraintScore -= teacher.subjects.length * 5;

    // Teacher with more restrictions = assign them first (harder to place later)
    if (teacher.noLabDuty) constraintScore += 10;
    if (teacher.floorRestriction) constraintScore += 15;

    return { teacher, score: constraintScore };
  });

  // Sort by constraint score descending (most constrained first)
  scored.sort((a, b) => b.score - a.score);

  return scored.map((s) => s.teacher);
};
