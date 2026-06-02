/**
 * Soft constraints — human, emotional, and wellness factors.
 * Each returns a penalty score. Lower = better.
 * These are best-effort: violated only when no better option exists.
 *
 * FLEXIBILITY: Different grades can have different period counts.
 * Grade 5 might have 6 periods/day while Grade 10 has 8 periods/day.
 */

// =============================================================================
// PENALTY WEIGHTS
// =============================================================================

export const PENALTY = {
  // Physical wellness
  PREGNANCY_UPPER_FLOOR: 30,
  PREGNANCY_LONG_WALK: 20, // Pregnant teacher has to walk far between rooms
  DISABILITY_INACCESSIBLE: 35,
  DISABILITY_UPPER_FLOOR_NO_ELEVATOR: 30, // Disability + upper floor + no elevator
  MEDICAL_CONDITION_IGNORED: 25, // Medical condition not accommodated

  // Senior teachers
  SENIOR_OVERLOAD: 20,
  SENIOR_CONSECUTIVE_OVERLOAD: 22, // Senior with too many consecutive
  SENIOR_AFTERNOON_HEAVY: 18, // Senior with heavy afternoon

  // Time preferences
  PREFERRED_SLOT_MISSED: 10,
  PREFERRED_DAY_MISSED: 12,
  PREFERRED_ROOM_MISSED: 8,

  // Commute
  COMMUTE_BUFFER_MISSED: 15,
  COMMUTE_BUFFER_BOTH_ENDS: 25, // Both first AND last period

  // Mental wellness
  BURNOUT_RISK: 25,
  BURNOUT_HIGH_WEEKLY: 30, // >90% of max weekly load
  MENTAL_HEALTH_FLAG: 20,
  MENTAL_HEALTH_EARLY_MORNING: 22, // Avoid early morning + mental health flag
  STRESS_INDICATOR_PRESENT: 15, // Other stress indicators

  // Personal constraints
  PERSONAL_BLOCK_VIOLATED: 40, // Religious/medical personal blocks
  PERSONAL_BLOCK_BOUNDARY: 35, // Close to personal block time

  // Grade-level flexibility
  GRADE_PERIOD_MISMATCH: 15, // Wrong period count for grade
  GRADE_BREAK_MISMATCH: 10, // Break timing wrong for grade level
  JUNIOR_CLASS_LATE: 20, // Junior class scheduled too late
  SENIOR_CLASS_EARLY: 8, // Senior class too early (less penalty)

  // Class comfort
  CLASS_CONSECUTIVE_HEAVY: 10, // Multiple heavy subjects in a row
  CLASS_LAST_PERIOD_HEAVY: 12, // Heavy subject in last period
  CLASS_FIRST_PERIOD_LIGHT: 8, // Light subject in prime first period

  // Teacher-Student relationship
  CLASS_TEACHER_NOT_ASSIGNED: 12, // Class teacher not teaching their own class enough
  SUBJECT_EXPERT_UNDERUTILIZED: 10, // Expert teacher given too few periods
};

// =============================================================================
// PHYSICAL WELLNESS
// =============================================================================

/**
 * Pregnant teacher should be assigned ground floor rooms only.
 */
export function pregnancyFloorPreference(assignment, teacherWellness, roomConfig) {
  if (!teacherWellness?.isPregnant) return 0;
  if (!roomConfig) return PENALTY.PREGNANCY_UPPER_FLOOR;

  const floor = roomConfig.floor ?? 0;

  if (floor > 0) {
    // Higher penalty for higher floors
    if (floor >= 3) return PENALTY.PREGNANCY_UPPER_FLOOR + 10;
    return PENALTY.PREGNANCY_UPPER_FLOOR;
  }

  return 0;
}

/**
 * Pregnant teacher shouldn't have to walk long distances between rooms.
 */
export function pregnancyRoomProximity(assignment, existing, teacherWellness, roomConfig) {
  if (!teacherWellness?.isPregnant) return 0;
  if (!assignment.roomId || !roomConfig) return 0;

  // Get previous period's room
  const prevAssignment = existing.find(
    (e) =>
      e.teacherId === assignment.teacherId &&
      e.day === assignment.day &&
      e.period === assignment.period - 1
  );

  if (prevAssignment && prevAssignment.roomId !== assignment.roomId) {
    // Teacher has to change rooms — check if far apart
    // Simplified: penalize room changes during pregnancy
    return PENALTY.PREGNANCY_LONG_WALK;
  }

  return 0;
}

/**
 * Teacher with mobility disability needs accessible room.
 */
export function disabilityAccessibility(assignment, teacherWellness, roomConfig) {
  if (!teacherWellness?.needsAccessibleRoom) return 0;

  if (!roomConfig) return PENALTY.DISABILITY_INACCESSIBLE;

  if (!roomConfig?.isAccessible) {
    // Higher penalty if room is on upper floor with no elevator
    if (roomConfig.floor > 0 && !roomConfig.hasElevatorAccess) {
      return PENALTY.DISABILITY_UPPER_FLOOR_NO_ELEVATOR;
    }
    return PENALTY.DISABILITY_INACCESSIBLE;
  }

  return 0;
}

/**
 * Teacher's medical conditions should be accommodated.
 */
export function medicalConditionAccommodation(assignment, teacherWellness, roomConfig) {
  if (!teacherWellness?.medicalConditions?.length) return 0;

  const conditions = teacherWellness.medicalConditions;

  // Asthma: avoid dusty areas, prefer AC rooms
  if (conditions.includes('asthma') || conditions.includes('Asthma')) {
    if (roomConfig && !roomConfig.hasAC && assignment.period > 4) {
      return PENALTY.MEDICAL_CONDITION_IGNORED;
    }
  }

  // Back pain: avoid too many consecutive periods
  if (conditions.includes('back_pain') || conditions.includes('chronic_pain')) {
    // Handled by consecutive overload in medium constraints
  }

  return 0;
}

// =============================================================================
// SENIOR TEACHERS
// =============================================================================

/**
 * Senior teachers should have lighter daily loads.
 */
export function seniorLoadPreference(assignment, existing, teacherWellness) {
  if (!teacherWellness?.isSenior) return 0;

  const preferred = teacherWellness.preferredMaxPerDay ?? 4;
  const count = existing.filter(
    (e) => e.teacherId === assignment.teacherId && e.day === assignment.day
  ).length;

  if (count >= preferred) {
    // Higher penalty the more they exceed
    if (count >= preferred + 2) return PENALTY.SENIOR_OVERLOAD + 10;
    return PENALTY.SENIOR_OVERLOAD;
  }

  return 0;
}

/**
 * Senior teachers shouldn't have too many consecutive periods.
 */
export function seniorConsecutivePreference(assignment, existing, teacherWellness) {
  if (!teacherWellness?.isSenior) return 0;

  const daySlots = existing
    .filter((e) => e.teacherId === assignment.teacherId && e.day === assignment.day)
    .map((e) => e.period)
    .sort((a, b) => a - b);

  daySlots.push(assignment.period);
  daySlots.sort((a, b) => a - b);

  let maxStreak = 1;
  let streak = 1;
  for (let i = 1; i < daySlots.length; i++) {
    if (daySlots[i] === daySlots[i - 1] + 1) {
      streak++;
      maxStreak = Math.max(maxStreak, streak);
    } else {
      streak = 1;
    }
  }

  // Seniors prefer max 2 consecutive
  if (maxStreak > 2) {
    return PENALTY.SENIOR_CONSECUTIVE_OVERLOAD;
  }

  return 0;
}

/**
 * Senior teachers prefer morning slots, avoid heavy afternoons.
 */
export function seniorAfternoonPreference(assignment, existing, teacherWellness) {
  if (!teacherWellness?.isSenior) return 0;

  if (assignment.period >= 6) {
    // Late afternoon
    const afternoonCount = existing.filter(
      (e) => e.teacherId === assignment.teacherId && e.day === assignment.day && e.period >= 6
    ).length;

    if (afternoonCount >= 2) {
      return PENALTY.SENIOR_AFTERNOON_HEAVY;
    }
  }

  return 0;
}

// =============================================================================
// TIME & SLOT PREFERENCES
// =============================================================================

/**
 * Honour teacher's preferred time slots if specified.
 */
export function preferredSlotHonoured(assignment, teacherWellness) {
  const preferred = teacherWellness?.preferredSlots;
  if (!preferred || preferred.length === 0) return 0;

  const match = preferred.some((s) => s.day === assignment.day && s.period === assignment.period);

  return match ? 0 : PENALTY.PREFERRED_SLOT_MISSED;
}

/**
 * Honour teacher's preferred days.
 */
export function preferredDayHonoured(assignment, teacherWellness) {
  const preferredDays = teacherWellness?.preferredDays;
  if (!preferredDays || preferredDays.length === 0) return 0;

  return preferredDays.includes(assignment.day) ? 0 : PENALTY.PREFERRED_DAY_MISSED;
}

/**
 * Honour teacher's preferred rooms.
 */
export function preferredRoomHonoured(assignment, teacherWellness, teacherConfig) {
  if (!assignment.roomId) return 0;

  const preferredRooms = teacherConfig?.preferredRooms || [];
  if (preferredRooms.length === 0) return 0;

  return preferredRooms.includes(assignment.roomId) ? 0 : PENALTY.PREFERRED_ROOM_MISSED;
}

// =============================================================================
// COMMUTE & TRAVEL
// =============================================================================

/**
 * Teacher who commutes long distance should not be assigned
 * the very first or last period (buffer time).
 */
export function commuteBuffer(assignment, teacherWellness, schoolConfig) {
  if (!teacherWellness?.needsCommuteBuffer) return 0;

  const firstPeriod = 1;
  const lastPeriod = schoolConfig?.periodsPerDay ?? 8;

  const isFirst = assignment.period === firstPeriod;
  const isLast = assignment.period === lastPeriod;

  if (isFirst && isLast) return 0; // Only one period that day

  // Check if they already have the other end
  if (isFirst || isLast) {
    // See if they're already at the other buffer end
    const hasOtherEnd = existing.some(
      (e) =>
        e.teacherId === assignment.teacherId &&
        e.day === assignment.day &&
        ((isFirst && e.period === lastPeriod) || (isLast && e.period === firstPeriod))
    );

    if (hasOtherEnd) {
      return PENALTY.COMMUTE_BUFFER_BOTH_ENDS;
    }

    return PENALTY.COMMUTE_BUFFER_MISSED;
  }

  return 0;
}

// =============================================================================
// MENTAL WELLNESS & BURNOUT
// =============================================================================

/**
 * Teacher flagged for burnout risk should not have heavy loads.
 */
export function burnoutRiskGuard(assignment, existing, teacherWellness, teacherConfig) {
  if (!teacherWellness?.burnoutRisk) return 0;

  const weeklyMax = teacherConfig?.maxPeriodsPerWeek ?? 40;
  const current = existing.filter((e) => e.teacherId === assignment.teacherId).length;
  const ratio = current / weeklyMax;

  if (ratio >= 0.9) return PENALTY.BURNOUT_HIGH_WEEKLY;
  if (ratio >= 0.8) return PENALTY.BURNOUT_RISK;

  return 0;
}

/**
 * Teacher with mental health flag should avoid early morning first period.
 */
export function mentalHealthEarlyMorning(assignment, teacherWellness) {
  if (!teacherWellness?.avoidEarlyMorning) return 0;

  if (assignment.period === 1) {
    // Higher penalty if mental health flag is also present
    if (teacherWellness?.burnoutRisk) {
      return PENALTY.MENTAL_HEALTH_EARLY_MORNING;
    }
    return PENALTY.MENTAL_HEALTH_FLAG;
  }

  return 0;
}

/**
 * Teacher showing stress indicators should have lighter loads.
 */
export function stressIndicatorLoad(assignment, existing, teacherWellness) {
  const indicators = teacherWellness?.stressIndicators || [];

  if (indicators.length > 0) {
    const dayCount = existing.filter(
      (e) => e.teacherId === assignment.teacherId && e.day === assignment.day
    ).length;

    const preferredMax = teacherWellness?.preferredMaxPerDay ?? 5;

    if (dayCount >= preferredMax) {
      return PENALTY.STRESS_INDICATOR_PRESENT;
    }
  }

  return 0;
}

// =============================================================================
// PERSONAL CONSTRAINTS
// =============================================================================

/**
 * Personal blocked slots — teacher has marked specific slots unavailable
 * for personal reasons (religious, medical appointments, childcare).
 */
export function personalBlockRespected(assignment, teacherWellness) {
  const blocks = teacherWellness?.personalBlocks || [];

  const blocked = blocks.some((b) => b.day === assignment.day && b.period === assignment.period);

  if (blocked) return PENALTY.PERSONAL_BLOCK_VIOLATED;

  // Check if assignment is adjacent to a blocked slot (boundary)
  const adjacent = blocks.some(
    (b) =>
      b.day === assignment.day &&
      (b.period === assignment.period - 1 || b.period === assignment.period + 1)
  );

  if (adjacent) return PENALTY.PERSONAL_BLOCK_BOUNDARY;

  return 0;
}

// =============================================================================
// GRADE-LEVEL FLEXIBILITY (NEW — What you asked for!)
// =============================================================================

/**
 * Different grades can have different period counts.
 * Grade 5 might end at period 6, while Grade 10 goes to period 8.
 *
 * @param {Object} assignment - The proposed assignment
 * @param {Object} classConfig - Class configuration with grade-level settings
 * @param {Object} schoolConfig - School timetable configuration
 */
export function gradePeriodLimitOk(assignment, classConfig, schoolConfig) {
  if (!classConfig) return 0;

  const grade = classConfig.grade;
  const gradeLevel = parseInt(grade) || 0;

  // Define grade-specific period limits
  // These can come from schoolConfig or be defaults
  const gradePeriodLimits = schoolConfig?.gradePeriodLimits || {
    primary: { maxGrade: 5, periods: 6 }, // Grades 1-5: 6 periods
    middle: { maxGrade: 8, periods: 7 }, // Grades 6-8: 7 periods
    secondary: { maxGrade: 10, periods: 8 }, // Grades 9-10: 8 periods
    seniorSecondary: { maxGrade: 12, periods: 8 }, // Grades 11-12: 8 periods
  };

  // Determine which bracket this grade falls into
  let maxPeriods = 8; // Default
  if (gradeLevel <= 5) maxPeriods = gradePeriodLimits.primary.periods;
  else if (gradeLevel <= 8) maxPeriods = gradePeriodLimits.middle.periods;
  else if (gradeLevel <= 10) maxPeriods = gradePeriodLimits.secondary.periods;
  else maxPeriods = gradePeriodLimits.seniorSecondary.periods;

  // Check if assignment period is beyond what this grade should have
  if (assignment.period > maxPeriods) {
    return PENALTY.GRADE_PERIOD_MISMATCH;
  }

  return 0;
}

/**
 * Junior classes shouldn't be scheduled too late in the day.
 * Younger students have shorter attention spans and should finish earlier.
 */
export function juniorClassTiming(assignment, classConfig) {
  if (!classConfig) return 0;

  const grade = parseInt(classConfig.grade) || 10;

  // Junior classes (Grade 1-5): Shouldn't have periods after period 6
  if (grade <= 5 && assignment.period > 6) {
    return PENALTY.JUNIOR_CLASS_LATE;
  }

  // Middle school (Grade 6-8): Lighter penalty for late periods
  if (grade <= 8 && assignment.period > 7) {
    return PENALTY.JUNIOR_CLASS_LATE - 10;
  }

  return 0;
}

/**
 * Senior classes (9-12) can handle early morning better.
 * Very small penalty if they get period 1 too often.
 */
export function seniorClassEarlyMorning(assignment, existing, classConfig) {
  if (!classConfig) return 0;

  const grade = parseInt(classConfig.grade) || 0;

  // Only applies to senior classes (9-12)
  if (grade < 9) return 0;

  // Count how many days they have period 1
  const earlyDays = existing.filter(
    (e) => e.classId === assignment.classId && e.period === 1
  ).length;

  if (assignment.period === 1 && earlyDays >= 4) {
    return PENALTY.SENIOR_CLASS_EARLY;
  }

  return 0;
}

/**
 * Respect break timings that might differ by grade level.
 * Some schools have different break schedules for junior/senior.
 */
export function gradeBreakTiming(assignment, classConfig, schoolConfig) {
  if (!classConfig) return 0;

  const grade = parseInt(classConfig.grade) || 0;

  // Custom break schedules per grade level
  const gradeBreaks = schoolConfig?.gradeBreakSchedules || {};
  const breaks = gradeBreaks[`grade_${grade}`] || schoolConfig?.breakAfterPeriods || [];

  const isBreak = breaks.some((b) => {
    if (typeof b === 'object') return b.period === assignment.period;
    return b === assignment.period;
  });

  if (isBreak) {
    return PENALTY.GRADE_BREAK_MISMATCH;
  }

  return 0;
}

// =============================================================================
// CLASS COMFORT & LEARNING EFFECTIVENESS
// =============================================================================

/**
 * Avoid too many heavy subjects in a row for the same class.
 */
export function classConsecutiveHeavySubjects(assignment, existing, subjectConfig) {
  if (!subjectConfig?.isHeavy) return 0;

  const prevHeavy = existing.some(
    (e) =>
      e.classId === assignment.classId &&
      e.day === assignment.day &&
      e.period === assignment.period - 1
    // Would need subjectConfig for that assignment too
  );

  const nextHeavy = existing.some(
    (e) =>
      e.classId === assignment.classId &&
      e.day === assignment.day &&
      e.period === assignment.period + 1
  );

  if (prevHeavy && nextHeavy) {
    return PENALTY.CLASS_CONSECUTIVE_HEAVY;
  }

  return 0;
}

/**
 * Heavy subjects in last period = students already tired.
 */
export function heavySubjectLastPeriod(assignment, subjectConfig, schoolConfig) {
  if (!subjectConfig?.isHeavy) return 0;

  const lastPeriod = schoolConfig?.periodsPerDay ?? 8;

  if (assignment.period === lastPeriod) {
    return PENALTY.CLASS_LAST_PERIOD_HEAVY;
  }

  return 0;
}

// =============================================================================
// TEACHER-CLASS RELATIONSHIP
// =============================================================================

/**
 * Class teacher should teach their own class enough periods.
 * Penalize if class teacher is rarely assigned to their own class.
 */
export function classTeacherAssignment(assignment, existing, classConfig) {
  if (!classConfig?.teacherId) return 0;

  // If this is the class teacher's class, they should teach it more
  if (assignment.teacherId === classConfig.teacherId) {
    return 0; // Good! Class teacher teaching their class
  }

  // Check if class teacher has enough periods with this class
  const classTeacherPeriods = existing.filter(
    (e) => e.classId === assignment.classId && e.teacherId === classConfig.teacherId
  ).length;

  const totalPeriods = existing.filter((e) => e.classId === assignment.classId).length;

  const ratio = classTeacherPeriods / Math.max(totalPeriods, 1);

  if (ratio < 0.2) {
    // Less than 20% of periods
    return PENALTY.CLASS_TEACHER_NOT_ASSIGNED;
  }

  return 0;
}

/**
 * Expert teachers shouldn't be underutilized.
 */
export function expertTeacherUtilization(assignment, existing, teacherConfig, teacherWellness) {
  if (!teacherWellness?.isSenior) return 0;

  const totalPeriods = existing.filter((e) => e.teacherId === assignment.teacherId).length;

  const maxPeriods = teacherConfig?.maxPeriodsPerWeek ?? 30;
  const utilization = totalPeriods / maxPeriods;

  // Senior expert teaching less than 50% of capacity
  if (utilization < 0.5) {
    return PENALTY.SUBJECT_EXPERT_UNDERUTILIZED;
  }

  return 0;
}

// =============================================================================
// MASTER SCORING FUNCTION
// =============================================================================

/**
 * Score all soft constraints. Returns total penalty.
 *
 * @param {Object} assignment - Proposed assignment
 * @param {Array} existing - Already placed assignments
 * @param {Object} teacherWellness - Teacher wellness data
 * @param {Object} teacherConfig - Teacher configuration
 * @param {Object} roomConfig - Room configuration
 * @param {Object} schoolConfig - School configuration
 * @param {Object} classConfig - Class configuration (for grade-level flexibility)
 * @param {Object} subjectConfig - Subject configuration
 * @returns {number} Total penalty score
 */
export function scoreAll(
  assignment,
  existing = [],
  teacherWellness = null,
  teacherConfig = {},
  roomConfig = null,
  schoolConfig = {},
  classConfig = null,
  subjectConfig = {}
) {
  let score = 0;

  // ─── Physical Wellness ───
  score += pregnancyFloorPreference(assignment, teacherWellness, roomConfig);
  score += pregnancyRoomProximity(assignment, existing, teacherWellness, roomConfig);
  score += disabilityAccessibility(assignment, teacherWellness, roomConfig);
  score += medicalConditionAccommodation(assignment, teacherWellness, roomConfig);

  // ─── Senior Teachers ───
  score += seniorLoadPreference(assignment, existing, teacherWellness);
  score += seniorConsecutivePreference(assignment, existing, teacherWellness);
  score += seniorAfternoonPreference(assignment, existing, teacherWellness);

  // ─── Time Preferences ───
  score += preferredSlotHonoured(assignment, teacherWellness);
  score += preferredDayHonoured(assignment, teacherWellness);
  score += preferredRoomHonoured(assignment, teacherWellness, teacherConfig);

  // ─── Commute ───
  score += commuteBuffer(assignment, teacherWellness, schoolConfig);

  // ─── Mental Wellness ───
  score += burnoutRiskGuard(assignment, existing, teacherWellness, teacherConfig);
  score += mentalHealthEarlyMorning(assignment, teacherWellness);
  score += stressIndicatorLoad(assignment, existing, teacherWellness);

  // ─── Personal Constraints ───
  score += personalBlockRespected(assignment, teacherWellness);

  // ─── Grade-Level Flexibility (NEW) ───
  score += gradePeriodLimitOk(assignment, classConfig, schoolConfig);
  score += juniorClassTiming(assignment, classConfig);
  score += seniorClassEarlyMorning(assignment, existing, classConfig);
  score += gradeBreakTiming(assignment, classConfig, schoolConfig);

  // ─── Class Comfort ───
  score += classConsecutiveHeavySubjects(assignment, existing, subjectConfig);
  score += heavySubjectLastPeriod(assignment, subjectConfig, schoolConfig);

  // ─── Teacher-Class Relationship ───
  score += classTeacherAssignment(assignment, existing, classConfig);
  score += expertTeacherUtilization(assignment, existing, teacherConfig, teacherWellness);

  return score;
}

/**
 * Get detailed breakdown of all soft constraint scores.
 */
export function scoreAllDetailed(
  assignment,
  existing = [],
  teacherWellness = null,
  teacherConfig = {},
  roomConfig = null,
  schoolConfig = {},
  classConfig = null,
  subjectConfig = {}
) {
  const scores = {
    // Physical Wellness
    pregnancyFloorPreference: pregnancyFloorPreference(assignment, teacherWellness, roomConfig),
    pregnancyRoomProximity: pregnancyRoomProximity(
      assignment,
      existing,
      teacherWellness,
      roomConfig
    ),
    disabilityAccessibility: disabilityAccessibility(assignment, teacherWellness, roomConfig),
    medicalConditionAccommodation: medicalConditionAccommodation(
      assignment,
      teacherWellness,
      roomConfig
    ),

    // Senior Teachers
    seniorLoadPreference: seniorLoadPreference(assignment, existing, teacherWellness),
    seniorConsecutivePreference: seniorConsecutivePreference(assignment, existing, teacherWellness),
    seniorAfternoonPreference: seniorAfternoonPreference(assignment, existing, teacherWellness),

    // Time Preferences
    preferredSlotHonoured: preferredSlotHonoured(assignment, teacherWellness),
    preferredDayHonoured: preferredDayHonoured(assignment, teacherWellness),
    preferredRoomHonoured: preferredRoomHonoured(assignment, teacherWellness, teacherConfig),

    // Commute
    commuteBuffer: commuteBuffer(assignment, teacherWellness, schoolConfig),

    // Mental Wellness
    burnoutRiskGuard: burnoutRiskGuard(assignment, existing, teacherWellness, teacherConfig),
    mentalHealthEarlyMorning: mentalHealthEarlyMorning(assignment, teacherWellness),
    stressIndicatorLoad: stressIndicatorLoad(assignment, existing, teacherWellness),

    // Personal
    personalBlockRespected: personalBlockRespected(assignment, teacherWellness),

    // Grade Flexibility
    gradePeriodLimitOk: gradePeriodLimitOk(assignment, classConfig, schoolConfig),
    juniorClassTiming: juniorClassTiming(assignment, classConfig),
    seniorClassEarlyMorning: seniorClassEarlyMorning(assignment, existing, classConfig),
    gradeBreakTiming: gradeBreakTiming(assignment, classConfig, schoolConfig),

    // Class Comfort
    classConsecutiveHeavySubjects: classConsecutiveHeavySubjects(
      assignment,
      existing,
      subjectConfig
    ),
    heavySubjectLastPeriod: heavySubjectLastPeriod(assignment, subjectConfig, schoolConfig),

    // Teacher-Class
    classTeacherAssignment: classTeacherAssignment(assignment, existing, classConfig),
    expertTeacherUtilization: expertTeacherUtilization(
      assignment,
      existing,
      teacherConfig,
      teacherWellness
    ),
  };

  scores.total = Object.values(scores).reduce((a, b) => a + b, 0);

  return scores;
}
