/**
 * heuristic.js
 * Ordering strategies for the backtracking solver.
 * Good heuristics dramatically cut search time (10-100x improvement).
 *
 * Order of application matters:
 * 1. Hardest slots first (fail fast)
 * 2. Most constrained teachers first (part-time, unique subjects)
 * 3. Best values first (LCV, morning preference)
 */

// =============================================================================
// VARIABLE ORDERING (Which slot to fill next?)
// =============================================================================

/**
 * MRV — Minimum Remaining Values.
 * Pick the assignment slot with fewest valid options first.
 * Fails fast, prunes tree early.
 */
export function mrvOrder(unassigned, getDomainSize) {
  return [...unassigned].sort((a, b) => getDomainSize(a) - getDomainSize(b));
}

/**
 * Degree heuristic tie-breaker.
 * Among slots with equal MRV, prefer the one involved in most constraints
 * (i.e. most other unassigned variables share its teacher or class).
 */
export function degreeOrder(unassigned, getConstraintDegree) {
  return [...unassigned].sort((a, b) => getConstraintDegree(b) - getConstraintDegree(a));
}

/**
 * Most Constrained Variable — combination of MRV + Degree.
 * First by smallest domain, then by most constraints.
 */
export function mcvOrder(unassigned, getDomainSize, getConstraintDegree) {
  return [...unassigned].sort((a, b) => {
    const domainDiff = getDomainSize(a) - getDomainSize(b);
    if (domainDiff !== 0) return domainDiff;
    return getConstraintDegree(b) - getConstraintDegree(a);
  });
}

/**
 * Part-time teacher priority — schedule part-time teachers first
 * since their window is narrowest.
 */
export function partTimeFirst(slots, teacherMap) {
  return [...slots].sort((a, b) => {
    const aPartTime = teacherMap[a.teacherId]?.isPartTime ? 0 : 1;
    const bPartTime = teacherMap[b.teacherId]?.isPartTime ? 0 : 1;
    return aPartTime - bPartTime;
  });
}

/**
 * Unique subject teachers first.
 * If only 1 teacher can teach Physics, schedule Physics slots before others.
 */
export function uniqueTeacherFirst(slots, teacherMap) {
  return [...slots].sort((a, b) => {
    const aEligible = getEligibleTeacherCount(a, teacherMap);
    const bEligible = getEligibleTeacherCount(b, teacherMap);
    return aEligible - bEligible;
  });
}

/**
 * High workload teachers first.
 * Teachers with many assigned periods should be scheduled early
 * to ensure they fit within their available windows.
 */
export function highWorkloadFirst(slots, teacherMap, subjectMap) {
  return [...slots].sort((a, b) => {
    const aLoad = getTeacherTotalLoad(a, teacherMap, subjectMap);
    const bLoad = getTeacherTotalLoad(b, teacherMap, subjectMap);
    return bLoad - aLoad; // Higher load first
  });
}

/**
 * Senior class priority.
 * Higher grades often have stricter requirements (board exams, labs).
 */
export function seniorClassFirst(slots) {
  return [...slots].sort((a, b) => {
    const aGrade = parseInt(a.grade) || 0;
    const bGrade = parseInt(b.grade) || 0;
    return bGrade - aGrade;
  });
}

/**
 * Lab/practical subjects first.
 * Lab subjects need specific rooms — schedule them before regular subjects.
 */
export function labSubjectsFirst(slots, subjectMap = {}) {
  return [...slots].sort((a, b) => {
    const aIsLab = subjectMap[a.subjectId]?.requiresLab ? 0 : 1;
    const bIsLab = subjectMap[b.subjectId]?.requiresLab ? 0 : 1;
    return aIsLab - bIsLab;
  });
}

// =============================================================================
// VALUE ORDERING (Which candidate to try first?)
// =============================================================================

/**
 * LCV — Least Constraining Value.
 * Among possible teacher assignments, prefer the one that eliminates
 * fewest options for remaining slots.
 */
export function lcvOrder(candidates, slot, existing, computeRemainingOptions) {
  return [...candidates].sort(
    (a, b) =>
      computeRemainingOptions(b, slot, existing) - computeRemainingOptions(a, slot, existing)
  );
}

/**
 * Morning-first heuristic for heavy subjects.
 * Sort candidate periods ascending so morning slots are tried first.
 */
export function morningFirstPeriods(periods) {
  return [...periods].sort((a, b) => a - b);
}

/**
 * Balanced distribution across days.
 * Prefer days that have fewer assignments for this class.
 */
export function balancedDayOrder(candidates, existing, classId) {
  const dayCount = {};
  for (const e of existing) {
    if (e.classId === classId) {
      dayCount[e.day] = (dayCount[e.day] || 0) + 1;
    }
  }

  return [...candidates].sort((a, b) => {
    return (dayCount[a.day] || 0) - (dayCount[b.day] || 0);
  });
}

/**
 * Preferred teacher slots first.
 * If teacher has preferred periods, try those first.
 */
export function teacherPreferenceFirst(candidates, teacherWellness) {
  if (!teacherWellness?.preferredSlots?.length) return candidates;

  const preferred = new Set(teacherWellness.preferredSlots.map((s) => `${s.day}-${s.period}`));

  return [...candidates].sort((a, b) => {
    const aPref = preferred.has(`${a.day}-${a.period}`) ? 0 : 1;
    const bPref = preferred.has(`${b.day}-${b.period}`) ? 0 : 1;
    return aPref - bPref;
  });
}

/**
 * Wellness-aware ordering.
 * Prefer candidates that respect teacher wellness needs.
 */
export function wellnessFirstOrder(candidates, teacherWellness, roomMap = {}) {
  if (!teacherWellness) return candidates;

  return [...candidates].sort((a, b) => {
    let aScore = 0;
    let bScore = 0;

    // Prefer ground floor for pregnant teachers
    if (teacherWellness.isPregnant) {
      const aFloor = roomMap[a.roomId]?.floor || 0;
      const bFloor = roomMap[b.roomId]?.floor || 0;
      aScore += aFloor === 0 ? -10 : 10;
      bScore += bFloor === 0 ? -10 : 10;
    }

    // Prefer accessible rooms
    if (teacherWellness.needsAccessibleRoom) {
      const aAccessible = roomMap[a.roomId]?.isAccessible ? -10 : 10;
      const bAccessible = roomMap[b.roomId]?.isAccessible ? -10 : 10;
      aScore += aAccessible;
      bScore += bAccessible;
    }

    // Prefer earlier periods for seniors
    if (teacherWellness.isSenior) {
      aScore += a.period > 4 ? 5 : 0;
      bScore += b.period > 4 ? 5 : 0;
    }

    return aScore - bScore;
  });
}

/**
 * Lowest penalty first.
 * Pre-scores candidates and sorts by estimated penalty.
 */
export function lowestPenaltyFirst(candidates, scoreFunction, context) {
  return [...candidates]
    .map((c) => ({
      candidate: c,
      score: scoreFunction(c, context),
    }))
    .sort((a, b) => a.score - b.score)
    .map((s) => s.candidate);
}

// =============================================================================
// COMBINED ORDERING STRATEGIES
// =============================================================================

/**
 * Combined slot ordering (default strategy).
 *
 * Priority order:
 * 1. Part-time teachers first (narrowest window)
 * 2. Unique subject teachers (only 1 can teach)
 * 3. Lab/practical subjects (need specific rooms)
 * 4. Senior classes (higher priority)
 * 5. High workload teachers (fit them in early)
 * 6. MRV (fewest options first)
 */
export function orderSlots(slots, teacherMap, subjectMap = {}) {
  let ordered = [...slots];

  // Phase 1: Part-time teachers first
  ordered = partTimeFirst(ordered, teacherMap);

  // Phase 2: Unique teachers first (stable sort preserves part-time order)
  ordered = uniqueTeacherFirst(ordered, teacherMap);

  // Phase 3: Lab subjects first (stable sort preserves previous ordering)
  ordered = labSubjectsFirst(ordered, subjectMap);

  // Phase 4: Senior classes first
  ordered = seniorClassFirst(ordered);

  // Phase 5: High workload teachers first
  ordered = highWorkloadFirst(ordered, teacherMap, subjectMap);

  // Phase 6: Within same priority, use MRV
  ordered = mrvOrder(ordered, (s) => getEligibleTeacherCount(s, teacherMap));

  return ordered;
}

/**
 * Class-by-class slot ordering.
 * Orders within a single class's slots.
 */
export function orderClassSlots(slots, teacherMap, subjectMap = {}) {
  let ordered = [...slots];

  // Lab subjects first (need specific rooms)
  ordered = labSubjectsFirst(ordered, subjectMap);

  // Heavy subjects first (prefer morning slots)
  ordered = heavySubjectsFirst(ordered, subjectMap);

  // Unique teachers first
  ordered = uniqueTeacherFirst(ordered, teacherMap);

  return ordered;
}

/**
 * Order candidate values for a slot.
 * Tries best options first to find good solutions quickly.
 */
export function orderCandidates(candidates, slot, existing, context = {}) {
  const { teacherWellness = null, roomMap = {}, subjectMap = {}, classId = null } = context;

  let ordered = [...candidates];

  // Phase 1: Wellness-aware (ground floor, accessible)
  ordered = wellnessFirstOrder(ordered, teacherWellness, roomMap);

  // Phase 2: Teacher preferences
  ordered = teacherPreferenceFirst(ordered, teacherWellness);

  // Phase 3: Morning first for heavy subjects
  if (subjectMap[slot.subjectId]?.isHeavy) {
    ordered.sort((a, b) => a.period - b.period);
  }

  // Phase 4: Balanced days for class
  ordered = balancedDayOrder(ordered, existing, classId || slot.classId);

  return ordered;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get number of eligible teachers for a slot.
 */
function getEligibleTeacherCount(slot, teacherMap) {
  const subjectId = slot.subjectId;
  let count = 0;

  for (const teacher of Object.values(teacherMap)) {
    const subjects = teacher.subjects || teacher.eligibleSubjects || [];
    if (subjects.includes(subjectId)) {
      count++;
    }
  }

  return count || 1; // Minimum 1 to avoid division by zero
}

/**
 * Get total assigned periods for a teacher.
 */
function getTeacherTotalLoad(slot, teacherMap, subjectMap) {
  // This is an estimate based on the slot's subject
  const teacher = teacherMap[slot.teacherId];
  if (!teacher) return 0;

  // Return negative of available slots (fewer available = higher priority)
  if (teacher.isPartTime && teacher.availableSlots) {
    return teacher.availableSlots.length;
  }

  return teacher.maxPeriodsPerWeek || 30;
}

/**
 * Heavy subjects first — they need morning slots.
 */
function heavySubjectsFirst(slots, subjectMap = {}) {
  return [...slots].sort((a, b) => {
    const aHeavy = subjectMap[a.subjectId]?.isHeavy ? 0 : 1;
    const bHeavy = subjectMap[b.subjectId]?.isHeavy ? 0 : 1;
    return aHeavy - bHeavy;
  });
}

/**
 * Calculate domain size for a slot (used by MRV).
 */
export function calculateDomainSize(slot, existing, teacherMap, schoolConfig) {
  let count = 0;

  for (const day of slot.validDays || []) {
    for (const period of slot.validPeriods || []) {
      for (const teacherId of slot.eligibleTeachers || []) {
        // Quick check: is teacher available?
        const teacher = teacherMap[teacherId];
        if (!teacher) continue;

        // Check if teacher already assigned at this time
        const conflict = existing.some(
          (e) => e.teacherId === teacherId && e.day === day && e.period === period
        );

        if (!conflict) count++;
      }
    }
  }

  return count || 1;
}

/**
 * Calculate constraint degree (how many other slots share constraints).
 */
export function calculateConstraintDegree(slot, allSlots) {
  let degree = 0;

  for (const other of allSlots) {
    if (other.id === slot.id) continue;

    // Share teacher?
    if (slot.eligibleTeachers?.some((t) => other.eligibleTeachers?.includes(t))) {
      degree++;
    }

    // Share class?
    if (other.classId === slot.classId) {
      degree++;
    }

    // Share subject?
    if (other.subjectId === slot.subjectId) {
      degree++;
    }
  }

  return degree;
}
