/**
 * Soft constraints — human, emotional, and wellness factors.
 * Each returns a penalty score. Lower = better.
 * These are best-effort: violated only when no better option exists.
 */

const PENALTY = {
  PREGNANCY_UPPER_FLOOR: 30,
  DISABILITY_INACCESSIBLE: 35,
  SENIOR_OVERLOAD: 20,
  PREFERRED_SLOT_MISSED: 10,
  COMMUTE_BUFFER_MISSED: 15,
  BURNOUT_RISK: 25,
  MENTAL_HEALTH_FLAG: 20,
  PERSONAL_BLOCK_VIOLATED: 40,
};

/**
 * Pregnant teacher should be assigned ground floor rooms only.
 */
export function pregnancyFloorPreference(assignment, teacherWellness, roomConfig) {
  if (!teacherWellness?.isPregnant) return 0;
  if (!roomConfig) return PENALTY.PREGNANCY_UPPER_FLOOR;
  const floor = roomConfig.floor ?? 0;
  return floor > 0 ? PENALTY.PREGNANCY_UPPER_FLOOR : 0;
}

/**
 * Teacher with mobility disability needs accessible room.
 */
export function disabilityAccessibility(assignment, teacherWellness, roomConfig) {
  if (!teacherWellness?.needsAccessibleRoom) return 0;
  if (!roomConfig?.isAccessible) return PENALTY.DISABILITY_INACCESSIBLE;
  return 0;
}

/**
 * Senior teachers should have lighter daily loads.
 * Penalise if assigned beyond their preferred max.
 */
export function seniorLoadPreference(assignment, existing, teacherWellness) {
  if (!teacherWellness?.isSenior) return 0;
  const preferred = teacherWellness.preferredMaxPerDay ?? 4;
  const count = existing.filter(
    (e) => e.teacherId === assignment.teacherId && e.day === assignment.day
  ).length;
  return count >= preferred ? PENALTY.SENIOR_OVERLOAD : 0;
}

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
 * Teacher who commutes long distance should not be assigned
 * the very first or last period (buffer time).
 */
export function commuteBuffer(assignment, teacherWellness, schoolConfig) {
  if (!teacherWellness?.needsCommuteBuffer) return 0;
  const firstPeriod = 1;
  const lastPeriod = schoolConfig.periodsPerDay ?? 8;
  if (assignment.period === firstPeriod || assignment.period === lastPeriod) {
    return PENALTY.COMMUTE_BUFFER_MISSED;
  }
  return 0;
}

/**
 * Teacher flagged for burnout risk should not be assigned consecutive days
 * with full load. Penalise if weekly count is near max.
 */
export function burnoutRiskGuard(assignment, existing, teacherWellness, teacherConfig) {
  if (!teacherWellness?.burnoutRisk) return 0;
  const weeklyMax = teacherConfig.maxPeriodsPerWeek ?? 40;
  const current = existing.filter((e) => e.teacherId === assignment.teacherId).length;
  const ratio = current / weeklyMax;
  return ratio >= 0.8 ? PENALTY.BURNOUT_RISK : 0;
}

/**
 * Teacher with mental health flag should avoid early morning first period.
 */
export function mentalHealthEarlyMorning(assignment, teacherWellness) {
  if (!teacherWellness?.avoidEarlyMorning) return 0;
  return assignment.period === 1 ? PENALTY.MENTAL_HEALTH_FLAG : 0;
}

/**
 * Personal blocked slots — teacher has marked specific slots unavailable
 * for personal reasons (not leave, just preference blocks).
 */
export function personalBlockRespected(assignment, teacherWellness) {
  const blocks = teacherWellness?.personalBlocks || [];
  const blocked = blocks.some((b) => b.day === assignment.day && b.period === assignment.period);
  return blocked ? PENALTY.PERSONAL_BLOCK_VIOLATED : 0;
}

/**
 * Score all soft constraints. Returns total penalty.
 */
export function scoreAll(
  assignment,
  existing,
  teacherWellness,
  teacherConfig,
  roomConfig,
  schoolConfig
) {
  return (
    pregnancyFloorPreference(assignment, teacherWellness, roomConfig) +
    disabilityAccessibility(assignment, teacherWellness, roomConfig) +
    seniorLoadPreference(assignment, existing, teacherWellness) +
    preferredSlotHonoured(assignment, teacherWellness) +
    commuteBuffer(assignment, teacherWellness, schoolConfig) +
    burnoutRiskGuard(assignment, existing, teacherWellness, teacherConfig) +
    mentalHealthEarlyMorning(assignment, teacherWellness) +
    personalBlockRespected(assignment, teacherWellness)
  );
}

export { PENALTY };
