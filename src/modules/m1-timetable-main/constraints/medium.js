/**
 * Medium constraints — strongly preferred.
 * Each function returns a penalty score (0 = no penalty, higher = worse).
 * Scheduler sums penalties and favours lower-scoring assignments.
 */

const PENALTY = {
  HEAVY_SUBJECT_AFTERNOON: 15,
  CONSECUTIVE_OVERLOAD: 20,
  UNBALANCED_DAY: 10,
  ROOM_TYPE_MISMATCH: 25,
  NO_GAP_BETWEEN_CLASSES: 12,
  SUBJECT_DAILY_CAP_EXCEEDED: 18,
};

/**
 * Heavy subjects (Math, Science) should be in the first half.
 * Returns penalty if scheduled in second half.
 */
export function heavySubjectTiming(assignment, subjectConfig, schoolConfig) {
  const isHeavy = subjectConfig.isHeavy ?? false;
  if (!isHeavy) return 0;
  const firstHalfEnd = schoolConfig.firstHalfLastPeriod ?? 4;
  if (assignment.period > firstHalfEnd) return PENALTY.HEAVY_SUBJECT_AFTERNOON;
  return 0;
}

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

  return maxStreak > maxConsecutive ? PENALTY.CONSECUTIVE_OVERLOAD : 0;
}

/**
 * Each day should have roughly balanced load for a class.
 * Penalise if one day has significantly more periods than average.
 */
export function balancedDailyLoad(assignment, existing, totalDays = 5) {
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

  return max > avg * 1.5 ? PENALTY.UNBALANCED_DAY : 0;
}

/**
 * Room type should match subject requirement (e.g. lab for science).
 */
export function roomTypeMatch(assignment, subjectConfig, roomConfig) {
  if (!subjectConfig.requiredRoomType) return 0;
  if (!roomConfig) return PENALTY.ROOM_TYPE_MISMATCH;
  if (roomConfig.type !== subjectConfig.requiredRoomType) return PENALTY.ROOM_TYPE_MISMATCH;
  return 0;
}

/**
 * Same subject should not appear more than N times per day for a class.
 */
export function subjectDailyCapOk(assignment, existing, maxPerDay = 2) {
  const count = existing.filter(
    (e) =>
      e.classId === assignment.classId &&
      e.subjectId === assignment.subjectId &&
      e.day === assignment.day
  ).length;
  return count >= maxPerDay ? PENALTY.SUBJECT_DAILY_CAP_EXCEEDED : 0;
}

/**
 * Run all medium constraints and return total penalty score.
 */
export function scoreAll(assignment, existing, subjectConfig, schoolConfig, roomConfig) {
  return (
    heavySubjectTiming(assignment, subjectConfig, schoolConfig) +
    noConsecutiveOverload(assignment, existing) +
    balancedDailyLoad(assignment, existing) +
    roomTypeMatch(assignment, subjectConfig, roomConfig) +
    subjectDailyCapOk(assignment, existing)
  );
}

export { PENALTY };
