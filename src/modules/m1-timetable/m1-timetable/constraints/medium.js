/**
 * Medium constraints — strongly preferred but not mandatory.
 * Each function returns a penalty score (0 = no penalty, higher = worse).
 * Scheduler sums penalties and favours lower-scoring assignments.
 *
 * These guide the solver toward BETTER solutions without blocking valid ones.
 */

// =============================================================================
// PENALTY WEIGHTS (Configurable per school)
// =============================================================================

export const PENALTY = {
  // Subject timing
  HEAVY_SUBJECT_AFTERNOON: 15,
  HEAVY_SUBJECT_LAST_PERIOD: 25, // Heavy subject in last period = worse
  LIGHT_SUBJECT_MORNING: 5, // Light subject in prime morning slot

  // Teacher workload
  CONSECUTIVE_OVERLOAD: 20,
  CONSECUTIVE_MAX_REACHED: 10, // At limit but not over (warning zone)
  UNEVEN_TEACHER_LOAD: 12, // Teacher load varies too much day-to-day
  TEACHER_LATE_FINISH: 8, // Teacher has last period multiple days

  // Class balance
  UNBALANCED_DAY: 10,
  UNBALANCED_WEEK: 15, // Whole week unbalanced
  CONSECUTIVE_SAME_SUBJECT: 8, // Same subject in consecutive periods
  GAP_BETWEEN_SAME_SUBJECT: 6, // Too many days between same subject

  // Room assignment
  ROOM_TYPE_MISMATCH: 25,
  ROOM_FAR_FROM_TEACHER: 5, // Teacher has to travel far between rooms
  ROOM_CAPACITY_INEFFICIENT: 10, // 20 students in 60-seat room = waste
  ROOM_CHANGE_FREQUENCY: 8, // Class changes rooms too often

  // Subject distribution
  SUBJECT_DAILY_CAP_EXCEEDED: 18,
  SUBJECT_DAILY_CAP_APPROACHING: 7, // Close to cap (warning)
  SUBJECT_GAP_TOO_LARGE: 12, // Too many days between same subject
  DOUBLE_PERIOD_AFTERNOON: 8, // Double period in afternoon (less effective)

  // Teacher preferences (violated)
  TEACHER_NOT_PREFERRED_TIME: 6, // Teacher prefers different time
  TEACHER_NOT_PREFERRED_DAY: 8, // Teacher prefers different day
  TEACHER_NOT_PREFERRED_ROOM: 4, // Teacher prefers different room

  // Wellness (not hard violations, but strongly discouraged)
  SENIOR_TEACHER_AFTERNOON_OVERLOAD: 12, // Senior teacher with heavy afternoon
  COMMUTE_BUFFER_MISSED: 10, // Long commute + first/last period
  BURNOUT_RISK_HIGH_LOAD: 15, // Teacher flagged burnout + high load day

  // Room quality
  NO_PROJECTOR_FOR_PRESENTATION: 7, // Subject needs projector, room doesn't have
  NO_AC_IN_SUMMER_AFTERNOON: 10, // Afternoon class in non-AC room during summer
};

// =============================================================================
// SUBJECT TIMING
// =============================================================================

/**
 * Heavy subjects (Math, Science) should be in the first half.
 * Returns higher penalty the later they are scheduled.
 */
export function heavySubjectTiming(assignment, subjectConfig, schoolConfig) {
  const isHeavy = subjectConfig?.isHeavy ?? false;
  if (!isHeavy) return 0;

  const firstHalfEnd = schoolConfig?.morningPeriodsEnd ?? schoolConfig?.firstHalfLastPeriod ?? 4;
  const totalPeriods = schoolConfig?.periodsPerDay ?? 8;

  if (assignment.period > firstHalfEnd) {
    // Extra penalty if it's the last period
    if (assignment.period === totalPeriods) {
      return PENALTY.HEAVY_SUBJECT_LAST_PERIOD;
    }
    return PENALTY.HEAVY_SUBJECT_AFTERNOON;
  }

  return 0;
}

/**
 * Light subjects (Arts, Sports) shouldn't occupy prime morning slots.
 * Small penalty to encourage placing them later.
 */
export function lightSubjectMorning(assignment, subjectConfig, schoolConfig) {
  const isHeavy = subjectConfig?.isHeavy ?? false;
  const isPractical = subjectConfig?.isPractical ?? false;

  // Only penalize if it's clearly a light subject
  if (!isHeavy && !isPractical && subjectConfig?.category === 'ARTS') {
    const morningEnd = schoolConfig?.morningPeriodsEnd ?? 4;
    if (assignment.period <= 2) {
      // First 2 periods are prime time
      return PENALTY.LIGHT_SUBJECT_MORNING;
    }
  }

  return 0;
}

// =============================================================================
// TEACHER WORKLOAD BALANCE
// =============================================================================

/**
 * Teacher should not have more than N consecutive periods without a gap.
 */
export function noConsecutiveOverload(assignment, existing, maxConsecutive = 3) {
  const daySlots = existing
    .filter((e) => e.teacherId === assignment.teacherId && e.day === assignment.day)
    .map((e) => e.period)
    .sort((a, b) => a - b);

  daySlots.push(assignment.period);
  daySlots.sort((a, b) => a - b);

  let streak = 1;
  let maxStreak = 1;
  for (let i = 1; i < daySlots.length; i++) {
    if (daySlots[i] === daySlots[i - 1] + 1) {
      streak++;
      maxStreak = Math.max(maxStreak, streak);
    } else {
      streak = 1;
    }
  }

  if (maxStreak > maxConsecutive) {
    return PENALTY.CONSECUTIVE_OVERLOAD;
  }

  // Warning zone: exactly at limit
  if (maxStreak === maxConsecutive) {
    return PENALTY.CONSECUTIVE_MAX_REACHED;
  }

  return 0;
}

/**
 * Teacher's daily load should be balanced across the week.
 * Penalize if one day has much more than average.
 */
export function teacherDailyBalance(assignment, existing, teacherConfig) {
  const allAssignments = [...existing, assignment].filter(
    (e) => e.teacherId === assignment.teacherId
  );

  if (allAssignments.length < 5) return 0; // Not enough data

  const dayCount = {};
  for (const a of allAssignments) {
    dayCount[a.day] = (dayCount[a.day] || 0) + 1;
  }

  const counts = Object.values(dayCount);
  const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
  const max = Math.max(...counts);

  // If any day has 50% more than average
  if (max > avg * 1.5) {
    return PENALTY.UNEVEN_TEACHER_LOAD;
  }

  return 0;
}

/**
 * Teacher shouldn't always get the last period.
 */
export function teacherLateFinishFrequency(assignment, existing, schoolConfig) {
  const lastPeriod = schoolConfig?.periodsPerDay ?? 8;

  if (assignment.period !== lastPeriod) return 0;

  const lateDays = existing.filter(
    (e) => e.teacherId === assignment.teacherId && e.period === lastPeriod
  ).length;

  if (lateDays >= 3) {
    // Already has last period 3+ days
    return PENALTY.TEACHER_LATE_FINISH;
  }

  return 0;
}

// =============================================================================
// CLASS BALANCE
// =============================================================================

/**
 * Each day should have roughly balanced load for a class.
 * Penalise if one day has significantly more periods than average.
 */
export function balancedDailyLoad(assignment, existing, schoolConfig) {
  const totalDays = schoolConfig?.workingDays?.length || 5;

  const classDayCount = {};
  for (const e of existing) {
    if (e.classId !== assignment.classId) continue;
    classDayCount[e.day] = (classDayCount[e.day] || 0) + 1;
  }
  classDayCount[assignment.day] = (classDayCount[assignment.day] || 0) + 1;

  const counts = Object.values(classDayCount);
  if (counts.length < 2) return 0;

  const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
  const max = Math.max(...counts);

  if (max > avg * 1.5) {
    return PENALTY.UNBALANCED_DAY;
  }

  return 0;
}

/**
 * Same subject should not appear in consecutive periods for the same class.
 */
export function noConsecutiveSameSubject(assignment, existing) {
  const before = existing.find(
    (e) =>
      e.classId === assignment.classId &&
      e.subjectId === assignment.subjectId &&
      e.day === assignment.day &&
      e.period === assignment.period - 1
  );

  const after = existing.find(
    (e) =>
      e.classId === assignment.classId &&
      e.subjectId === assignment.subjectId &&
      e.day === assignment.day &&
      e.period === assignment.period + 1
  );

  if (before || after) {
    return PENALTY.CONSECUTIVE_SAME_SUBJECT;
  }

  return 0;
}

/**
 * Gap between same subject should not be too large (forgot what was taught).
 */
export function subjectGapNotTooLarge(assignment, existing) {
  const subjectDays = existing
    .filter((e) => e.classId === assignment.classId && e.subjectId === assignment.subjectId)
    .map((e) => e.day);

  subjectDays.push(assignment.day);
  const uniqueDays = [...new Set(subjectDays)].sort((a, b) => a - b);

  if (uniqueDays.length < 2) return 0;

  // Find max gap between consecutive days
  let maxGap = 0;
  for (let i = 1; i < uniqueDays.length; i++) {
    maxGap = Math.max(maxGap, uniqueDays[i] - uniqueDays[i - 1]);
  }

  if (maxGap > 3) {
    // More than 3 days gap
    return PENALTY.SUBJECT_GAP_TOO_LARGE;
  }

  return 0;
}

// =============================================================================
// ROOM ASSIGNMENT
// =============================================================================

/**
 * Room type should match subject requirement (e.g. lab for science).
 */
export function roomTypeMatch(assignment, subjectConfig, roomConfig) {
  if (!subjectConfig?.requiredRoomType) return 0;
  if (!roomConfig) return PENALTY.ROOM_TYPE_MISMATCH;
  if (roomConfig.type !== subjectConfig.requiredRoomType) {
    return PENALTY.ROOM_TYPE_MISMATCH;
  }
  return 0;
}

/**
 * Room capacity should be appropriate for class size.
 */
export function roomCapacityEfficiency(assignment, roomConfig, classConfig) {
  if (!assignment.roomId || !roomConfig || !classConfig) return 0;

  const studentCount = classConfig?.studentCount ?? 0;
  const capacity = roomConfig?.capacity ?? 40;

  if (studentCount === 0) return 0;

  const utilization = studentCount / capacity;

  // Too small: < 30% utilization (20 students in 60-seat room)
  if (utilization < 0.3) {
    return PENALTY.ROOM_CAPACITY_INEFFICIENT;
  }

  return 0;
}

/**
 * Class should not change rooms too frequently during the day.
 */
export function roomChangeFrequency(assignment, existing) {
  const dayAssignments = [
    ...existing.filter((e) => e.classId === assignment.classId && e.day === assignment.day),
    assignment,
  ].sort((a, b) => a.period - b.period);

  let roomChanges = 0;
  for (let i = 1; i < dayAssignments.length; i++) {
    if (dayAssignments[i].roomId !== dayAssignments[i - 1].roomId) {
      roomChanges++;
    }
  }

  if (roomChanges > 3) {
    // More than 3 room changes in a day
    return PENALTY.ROOM_CHANGE_FREQUENCY;
  }

  return 0;
}

/**
 * Room should have required equipment for the subject.
 */
export function roomEquipmentMatch(assignment, subjectConfig, roomConfig) {
  if (!assignment.roomId || !roomConfig || !subjectConfig) return 0;

  // Check if subject needs projector
  if (subjectConfig?.needsProjector && !roomConfig?.hasProjector) {
    return PENALTY.NO_PROJECTOR_FOR_PRESENTATION;
  }

  // Check AC for afternoon classes in summer (context-dependent)
  // This could be enhanced with seasonal context

  return 0;
}

// =============================================================================
// SUBJECT DISTRIBUTION
// =============================================================================

/**
 * Same subject should not appear more than N times per day for a class.
 */
export function subjectDailyCapOk(assignment, existing, schoolConfig) {
  const maxPerDay = schoolConfig?.maxSameSubjectPerDay ?? 2;

  const count = existing.filter(
    (e) =>
      e.classId === assignment.classId &&
      e.subjectId === assignment.subjectId &&
      e.day === assignment.day
  ).length;

  if (count >= maxPerDay) {
    return PENALTY.SUBJECT_DAILY_CAP_EXCEEDED;
  }

  // Warning zone: approaching cap
  if (count >= maxPerDay - 1) {
    return PENALTY.SUBJECT_DAILY_CAP_APPROACHING;
  }

  return 0;
}

/**
 * Double periods better in morning than afternoon.
 */
export function doublePeriodTiming(assignment, existing) {
  const hasBefore = existing.some(
    (e) =>
      e.classId === assignment.classId &&
      e.subjectId === assignment.subjectId &&
      e.day === assignment.day &&
      e.period === assignment.period - 1
  );

  const hasAfter = existing.some(
    (e) =>
      e.classId === assignment.classId &&
      e.subjectId === assignment.subjectId &&
      e.day === assignment.day &&
      e.period === assignment.period + 1
  );

  if ((hasBefore || hasAfter) && assignment.period > 4) {
    return PENALTY.DOUBLE_PERIOD_AFTERNOON;
  }

  return 0;
}

// =============================================================================
// TEACHER PREFERENCES
// =============================================================================

/**
 * Teacher's preferred time slots should be honored when possible.
 */
export function teacherPreferredTime(assignment, teacherConfig) {
  const preferredPeriods = teacherConfig?.preferredPeriods || [];

  if (preferredPeriods.length > 0 && !preferredPeriods.includes(assignment.period)) {
    return PENALTY.TEACHER_NOT_PREFERRED_TIME;
  }

  return 0;
}

/**
 * Teacher's preferred days should be honored when possible.
 */
export function teacherPreferredDay(assignment, teacherConfig) {
  const preferredDays = teacherConfig?.preferredDays || [];

  if (preferredDays.length > 0 && !preferredDays.includes(assignment.day)) {
    return PENALTY.TEACHER_NOT_PREFERRED_DAY;
  }

  return 0;
}

// =============================================================================
// WELLNESS-AWARE (Medium — Not hard blocks, but strong preferences)
// =============================================================================

/**
 * Senior teachers should have lighter afternoon loads.
 */
export function seniorTeacherLoad(assignment, existing, teacherWellness) {
  if (!teacherWellness?.isSenior) return 0;

  const afternoonStart = 5; // Periods 5+
  if (assignment.period >= afternoonStart) {
    const afternoonCount = existing.filter(
      (e) =>
        e.teacherId === assignment.teacherId &&
        e.day === assignment.day &&
        e.period >= afternoonStart
    ).length;

    if (afternoonCount >= 2) {
      // Senior with 3+ afternoon periods
      return PENALTY.SENIOR_TEACHER_AFTERNOON_OVERLOAD;
    }
  }

  return 0;
}

/**
 * Teachers with long commute should avoid first and last periods.
 */
export function commuteBufferPreference(assignment, teacherWellness, schoolConfig) {
  if (!teacherWellness?.needsCommuteBuffer) return 0;

  const firstPeriod = 1;
  const lastPeriod = schoolConfig?.periodsPerDay ?? 8;

  if (assignment.period === firstPeriod || assignment.period === lastPeriod) {
    return PENALTY.COMMUTE_BUFFER_MISSED;
  }

  return 0;
}

/**
 * Teachers flagged for burnout risk should have lighter days.
 */
export function burnoutRiskLoad(assignment, existing, teacherWellness) {
  if (!teacherWellness?.burnoutRisk) return 0;

  const dayCount = existing.filter(
    (e) => e.teacherId === assignment.teacherId && e.day === assignment.day
  ).length;

  const maxPreferred = teacherWellness?.preferredMaxPerDay ?? 4;

  if (dayCount >= maxPreferred) {
    return PENALTY.BURNOUT_RISK_HIGH_LOAD;
  }

  return 0;
}

// =============================================================================
// MASTER SCORING FUNCTION
// =============================================================================

/**
 * Run all medium constraints and return total penalty score.
 * Higher score = worse assignment. Lower score = better assignment.
 *
 * @param {Object} assignment - Proposed assignment
 * @param {Array} existing - Already placed assignments
 * @param {Object} subjectConfig - Subject configuration
 * @param {Object} schoolConfig - School timetable configuration
 * @param {Object} roomConfig - Room configuration
 * @param {Object} classConfig - Class configuration
 * @param {Object} teacherConfig - Teacher configuration
 * @param {Object} teacherWellness - Teacher wellness data
 * @returns {number} Total penalty score
 */
export function scoreAll(
  assignment,
  existing,
  subjectConfig = {},
  schoolConfig = {},
  roomConfig = null,
  classConfig = null,
  teacherConfig = {},
  teacherWellness = null
) {
  let score = 0;

  // ─── Subject Timing ───
  score += heavySubjectTiming(assignment, subjectConfig, schoolConfig);
  score += lightSubjectMorning(assignment, subjectConfig, schoolConfig);

  // ─── Teacher Workload ───
  score += noConsecutiveOverload(assignment, existing);
  score += teacherDailyBalance(assignment, existing, teacherConfig);
  score += teacherLateFinishFrequency(assignment, existing, schoolConfig);

  // ─── Class Balance ───
  score += balancedDailyLoad(assignment, existing, schoolConfig);
  score += noConsecutiveSameSubject(assignment, existing);
  score += subjectGapNotTooLarge(assignment, existing);

  // ─── Room Assignment ───
  score += roomTypeMatch(assignment, subjectConfig, roomConfig);
  score += roomCapacityEfficiency(assignment, roomConfig, classConfig);
  score += roomChangeFrequency(assignment, existing);
  score += roomEquipmentMatch(assignment, subjectConfig, roomConfig);

  // ─── Subject Distribution ───
  score += subjectDailyCapOk(assignment, existing, schoolConfig);
  score += doublePeriodTiming(assignment, existing);

  // ─── Teacher Preferences ───
  score += teacherPreferredTime(assignment, teacherConfig);
  score += teacherPreferredDay(assignment, teacherConfig);

  // ─── Wellness-Aware ───
  if (teacherWellness) {
    score += seniorTeacherLoad(assignment, existing, teacherWellness);
    score += commuteBufferPreference(assignment, teacherWellness, schoolConfig);
    score += burnoutRiskLoad(assignment, existing, teacherWellness);
  }

  return score;
}

/**
 * Get detailed breakdown of all medium constraint scores.
 * Useful for validation reports and debugging.
 */
export function scoreAllDetailed(
  assignment,
  existing,
  subjectConfig = {},
  schoolConfig = {},
  roomConfig = null,
  classConfig = null,
  teacherConfig = {},
  teacherWellness = null
) {
  const scores = {
    heavySubjectTiming: heavySubjectTiming(assignment, subjectConfig, schoolConfig),
    lightSubjectMorning: lightSubjectMorning(assignment, subjectConfig, schoolConfig),
    noConsecutiveOverload: noConsecutiveOverload(assignment, existing),
    teacherDailyBalance: teacherDailyBalance(assignment, existing, teacherConfig),
    teacherLateFinishFrequency: teacherLateFinishFrequency(assignment, existing, schoolConfig),
    balancedDailyLoad: balancedDailyLoad(assignment, existing, schoolConfig),
    noConsecutiveSameSubject: noConsecutiveSameSubject(assignment, existing),
    subjectGapNotTooLarge: subjectGapNotTooLarge(assignment, existing),
    roomTypeMatch: roomTypeMatch(assignment, subjectConfig, roomConfig),
    roomCapacityEfficiency: roomCapacityEfficiency(assignment, roomConfig, classConfig),
    roomChangeFrequency: roomChangeFrequency(assignment, existing),
    roomEquipmentMatch: roomEquipmentMatch(assignment, subjectConfig, roomConfig),
    subjectDailyCapOk: subjectDailyCapOk(assignment, existing, schoolConfig),
    doublePeriodTiming: doublePeriodTiming(assignment, existing),
    teacherPreferredTime: teacherPreferredTime(assignment, teacherConfig),
    teacherPreferredDay: teacherPreferredDay(assignment, teacherConfig),
  };

  // Wellness scores
  if (teacherWellness) {
    scores.seniorTeacherLoad = seniorTeacherLoad(assignment, existing, teacherWellness);
    scores.commuteBufferPreference = commuteBufferPreference(
      assignment,
      teacherWellness,
      schoolConfig
    );
    scores.burnoutRiskLoad = burnoutRiskLoad(assignment, existing, teacherWellness);
  }

  scores.total = Object.values(scores).reduce((a, b) => a + b, 0);

  return scores;
}
