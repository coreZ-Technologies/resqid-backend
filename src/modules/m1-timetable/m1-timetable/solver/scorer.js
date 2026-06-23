/**
 * scorer.js
 * Combines medium + soft constraint penalties into a single score.
 * Lower = better. Used by heuristics to pick best valid assignment.
 *
 * Supports weighted scoring, detailed breakdowns, and multi-factor ranking.
 */

import * as medium from '../constraints/medium.js';
import * as soft from '../constraints/soft.js';

// =============================================================================
// SCORING
// =============================================================================

/**
 * Score a candidate assignment.
 * Combines medium + soft penalties.
 *
 * @param {Object} assignment - proposed assignment
 * @param {Array} existing - already placed assignments
 * @param {Object} ctx - Complete context
 * @returns {number} total penalty score
 */
export function score(assignment, existing, ctx) {
  const {
    subjectConfig = {},
    schoolConfig = {},
    roomConfig = null,
    teacherWellness = null,
    teacherConfig = {},
    classConfig = null,
  } = ctx;

  const mediumScore = medium.scoreAll(
    assignment,
    existing,
    subjectConfig,
    schoolConfig,
    roomConfig,
    classConfig,
    teacherConfig,
    teacherWellness
  );

  const softScore = soft.scoreAll(
    assignment,
    existing,
    teacherWellness,
    teacherConfig,
    roomConfig,
    schoolConfig,
    classConfig,
    subjectConfig
  );

  return mediumScore + softScore;
}

/**
 * Score with detailed breakdown.
 * Returns total + individual component scores.
 */
export function scoreDetailed(assignment, existing, ctx) {
  const {
    subjectConfig = {},
    schoolConfig = {},
    roomConfig = null,
    teacherWellness = null,
    teacherConfig = {},
    classConfig = null,
  } = ctx;

  const mediumDetailed = medium.scoreAllDetailed(
    assignment,
    existing,
    subjectConfig,
    schoolConfig,
    roomConfig,
    classConfig,
    teacherConfig,
    teacherWellness
  );

  const softDetailed = soft.scoreAllDetailed(
    assignment,
    existing,
    teacherWellness,
    teacherConfig,
    roomConfig,
    schoolConfig,
    classConfig,
    subjectConfig
  );

  return {
    total: mediumDetailed.total + softDetailed.total,
    medium: mediumDetailed,
    soft: softDetailed,
    breakdown: {
      ...mediumDetailed,
      ...softDetailed,
    },
  };
}

// =============================================================================
// RANKING
// =============================================================================

/**
 * Score all candidates for a slot and return sorted (best first).
 *
 * @param {Array} candidates - list of { teacherId, roomId, day, period }
 * @param {Object} slot - the slot being filled
 * @param {Array} existing - already placed assignments
 * @param {Function} getCtx - (teacherId) => context object
 * @returns {Array} sorted candidates (best first)
 */
export function rankCandidates(candidates, slot, existing, getCtx) {
  const scored = candidates.map((candidate) => {
    const assignment = { ...slot, ...candidate };
    const ctx = getCtx(candidate.teacherId);

    // Add room-specific context if room is assigned
    if (candidate.roomId && !ctx.roomConfig) {
      ctx.roomConfig = getCtx.roomConfig?.(candidate.roomId) || null;
    }

    return {
      candidate,
      penalty: score(assignment, existing, ctx),
      details: null, // Can compute if needed
    };
  });

  // Sort by penalty (ascending = best first)
  scored.sort((a, b) => {
    const penaltyDiff = a.penalty - b.penalty;

    // If penalties are close (within 5), apply tiebreakers
    if (Math.abs(penaltyDiff) <= 5) {
      return applyTiebreakers(a, b, slot, existing);
    }

    return penaltyDiff;
  });

  return scored.map((s) => s.candidate);
}

/**
 * Rank candidates with detailed scoring for debugging/validation.
 */
export function rankCandidatesDetailed(candidates, slot, existing, getCtx) {
  const scored = candidates.map((candidate) => {
    const assignment = { ...slot, ...candidate };
    const ctx = getCtx(candidate.teacherId);

    if (candidate.roomId && !ctx.roomConfig) {
      ctx.roomConfig = getCtx.roomConfig?.(candidate.roomId) || null;
    }

    const details = scoreDetailed(assignment, existing, ctx);

    return {
      candidate,
      ...details,
    };
  });

  scored.sort((a, b) => {
    const diff = a.total - b.total;
    if (Math.abs(diff) <= 5) {
      return applyTiebreakers(a, b, slot, existing);
    }
    return diff;
  });

  return scored;
}

/**
 * Get the top N candidates (best ones).
 */
export function topCandidates(candidates, slot, existing, getCtx, n = 3) {
  const ranked = rankCandidates(candidates, slot, existing, getCtx);
  return ranked.slice(0, n);
}

// =============================================================================
// TIEBREAKERS
// =============================================================================

/**
 * Apply tiebreaker rules when candidates have similar scores.
 *
 * Priority order:
 * 1. Prefer teacher with lighter current load
 * 2. Prefer morning slots for heavy subjects
 * 3. Prefer balanced day distribution
 * 4. Prefer teacher's preferred slots
 */
function applyTiebreakers(a, b, slot, existing) {
  // 1. Teacher with lighter current daily load wins
  const aLoad = countTeacherDayLoad(a.candidate.teacherId, a.candidate.day || slot.day, existing);
  const bLoad = countTeacherDayLoad(b.candidate.teacherId, b.candidate.day || slot.day, existing);
  if (aLoad !== bLoad) return aLoad - bLoad;

  // 2. Morning period preference for heavy subjects
  const isHeavy = slot.subjectConfig?.isHeavy;
  if (isHeavy) {
    const aPeriod = a.candidate.period || slot.period;
    const bPeriod = b.candidate.period || slot.period;
    if (aPeriod !== bPeriod) return aPeriod - bPeriod; // Earlier = better
  }

  // 3. Balanced day distribution for class
  const aDay = a.candidate.day || slot.day;
  const bDay = b.candidate.day || slot.day;
  const aDayCount = countClassDayAssignments(slot.classId, aDay, existing);
  const bDayCount = countClassDayAssignments(slot.classId, bDay, existing);
  if (aDayCount !== bDayCount) return aDayCount - bDayCount;

  // 4. Teacher's preferred slot
  const aPref = isTeacherPreferredSlot(
    a.candidate.teacherId,
    aDay,
    a.candidate.period || slot.period
  );
  const bPref = isTeacherPreferredSlot(
    b.candidate.teacherId,
    bDay,
    b.candidate.period || slot.period
  );
  if (aPref !== bPref) return aPref ? -1 : 1;

  return 0;
}

// =============================================================================
// BATCH SCORING
// =============================================================================

/**
 * Score an entire timetable.
 * Returns overall quality metrics.
 */
export function scoreTimetable(timetable, template, schoolConfig, resolvers) {
  let totalPenalty = 0;
  const slotScores = [];

  // Score each slot against the rest
  for (const assignment of timetable) {
    const existing = timetable.filter((a) => a.id !== assignment.id);

    const ctx = {
      subjectConfig: resolvers.getSubjectConfig(assignment.subjectId) || {},
      schoolConfig,
      roomConfig: assignment.roomId ? resolvers.getRoomConfig(assignment.roomId) : null,
      teacherWellness: resolvers.getTeacherWellness(assignment.teacherId) || null,
      teacherConfig: resolvers.getTeacherConfig(assignment.teacherId) || {},
      classConfig: resolvers.getClassConfig(assignment.classId) || {},
    };

    const penalty = score(assignment, existing, ctx);
    totalPenalty += penalty;

    slotScores.push({
      slotId: assignment.id,
      classId: assignment.classId,
      subjectId: assignment.subjectId,
      teacherId: assignment.teacherId,
      day: assignment.dayOfWeek || assignment.day,
      period: assignment.periodNumber || assignment.period,
      penalty,
    });
  }

  const avgPenalty = timetable.length > 0 ? totalPenalty / timetable.length : 0;

  return {
    totalPenalty,
    avgPenalty,
    bestSlots: slotScores.filter((s) => s.penalty === 0),
    worstSlots: slotScores.sort((a, b) => b.penalty - a.penalty).slice(0, 10),
    slotScores,
  };
}

/**
 * Compare two timetables and return the better one.
 */
export function compareTimetables(timetableA, timetableB, template, schoolConfig, resolvers) {
  const scoreA = scoreTimetable(timetableA, template, schoolConfig, resolvers);
  const scoreB = scoreTimetable(timetableB, template, schoolConfig, resolvers);

  return {
    better: scoreA.totalPenalty < scoreB.totalPenalty ? 'A' : 'B',
    scoreA: scoreA.totalPenalty,
    scoreB: scoreB.totalPenalty,
    difference: Math.abs(scoreA.totalPenalty - scoreB.totalPenalty),
    winner: scoreA.totalPenalty < scoreB.totalPenalty ? timetableA : timetableB,
  };
}

// =============================================================================
// WEIGHTED SCORING
// =============================================================================

/**
 * Score with custom weights for different constraint categories.
 * Allows schools to prioritize what matters most to them.
 */
export function scoreWeighted(assignment, existing, ctx, weights = {}) {
  const {
    subjectTiming = 1.0,
    teacherWorkload = 1.0,
    classBalance = 1.0,
    roomAssignment = 1.0,
    subjectDistribution = 1.0,
    teacherPreferences = 0.5,
    wellness = 2.0, // Wellness weighted higher by default
    gradeLevel = 1.0,
  } = weights;

  const detailed = scoreDetailed(assignment, existing, ctx);

  // Apply weights to different categories
  const weightedScore =
    (detailed.breakdown.heavySubjectTiming || 0) * subjectTiming +
    (detailed.breakdown.noConsecutiveOverload || 0) * teacherWorkload +
    (detailed.breakdown.balancedDailyLoad || 0) * classBalance +
    (detailed.breakdown.roomTypeMatch || 0) * roomAssignment +
    (detailed.breakdown.subjectDailyCapOk || 0) * subjectDistribution +
    (detailed.breakdown.preferredSlotHonoured || 0) * teacherPreferences +
    (detailed.breakdown.pregnancyFloorPreference || 0) * wellness +
    (detailed.breakdown.disabilityAccessibility || 0) * wellness +
    (detailed.breakdown.gradePeriodLimitOk || 0) * gradeLevel;

  return weightedScore;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Count how many periods a teacher has on a specific day.
 */
function countTeacherDayLoad(teacherId, day, existing) {
  return existing.filter((e) => e.teacherId === teacherId && (e.day === day || e.dayOfWeek === day))
    .length;
}

/**
 * Count how many periods a class has on a specific day.
 */
function countClassDayAssignments(classId, day, existing) {
  return existing.filter((e) => e.classId === classId && (e.day === day || e.dayOfWeek === day))
    .length;
}

/**
 * Check if a slot matches teacher's preferred times.
 */
function isTeacherPreferredSlot(teacherId, day, period) {
  // This would need teacher wellness data
  return false; // Simplified
}

// =============================================================================
// EXPORT DEFAULTS
// =============================================================================

export default {
  score,
  scoreDetailed,
  scoreWeighted,
  rankCandidates,
  rankCandidatesDetailed,
  topCandidates,
  scoreTimetable,
  compareTimetables,
};
