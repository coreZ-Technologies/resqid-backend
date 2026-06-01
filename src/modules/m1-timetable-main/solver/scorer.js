/**
 * scorer.js
 * Combines medium + soft constraint penalties into a single score.
 * Lower = better. Used by heuristics to pick best valid assignment.
 */

import * as medium from '../constraints/medium.js';
import * as soft from '../constraints/soft.js';
import { logger } from '#config/logger.js';

/**
 * Score a candidate assignment.
 *
 * @param {Object} assignment - proposed assignment with teacherId, day, period, classId, subjectId
 * @param {Array} existing - already placed assignments
 * @param {Object} ctx - { subjectConfig, schoolConfig, roomConfig, teacherWellness, teacherConfig }
 * @returns {number} total penalty score (lower is better)
 */
export function score(assignment, existing, ctx) {
  const {
    subjectConfig = {},
    schoolConfig = {},
    roomConfig = null,
    teacherWellness = null,
    teacherConfig = {},
  } = ctx;

  // Calculate medium constraint penalties
  const mediumScore = medium.scoreAll(
    assignment,
    existing,
    subjectConfig,
    schoolConfig,
    roomConfig
  );

  // Calculate soft constraint penalties
  const softScore = soft.scoreAll(
    assignment,
    existing,
    teacherWellness,
    teacherConfig,
    roomConfig,
    schoolConfig
  );

  const totalScore = mediumScore + softScore;

  // Log extremely high scores for debugging (but don't spam)
  if (totalScore > 1000) {
    logger.debug({
      assignment: {
        teacherId: assignment.teacherId,
        classId: assignment.classId,
        subjectId: assignment.subjectId,
        day: assignment.day,
        period: assignment.period,
      },
      mediumScore,
      softScore,
      totalScore,
    }, 'High penalty score detected');
  }

  return totalScore;
}

/**
 * Score all candidates for a slot and return sorted (best first).
 *
 * @param {Array} candidates - list of { teacherId, roomId, day, period }
 * @param {Object} slot - the slot being filled (classId, subjectId)
 * @param {Array} existing - already placed assignments
 * @param {Function} getCtx - (teacherId) => context object
 * @returns {Array} sorted candidates (best first)
 */
export function rankCandidates(candidates, slot, existing, getCtx) {
  if (!candidates || candidates.length === 0) {
    logger.debug({ slotId: slot.id }, 'No candidates to rank');
    return [];
  }

  const startTime = Date.now();
  
  const scored = candidates.map((candidate) => {
    const assignment = { 
      ...slot, 
      ...candidate,
      // Ensure required fields are present
      id: slot.id || `${slot.classId}:${slot.subjectId}:${candidate.day}:${candidate.period}`,
    };
    const ctx = getCtx(candidate.teacherId);
    const penalty = score(assignment, existing, ctx);
    
    return { candidate, penalty };
  });

  // Sort by penalty ascending (lowest first = best)
  scored.sort((a, b) => a.penalty - b.penalty);
  
  const durationMs = Date.now() - startTime;
  const bestPenalty = scored[0]?.penalty;
  const worstPenalty = scored[scored.length - 1]?.penalty;
  
  if (durationMs > 10) {
    logger.debug({
      candidateCount: candidates.length,
      durationMs,
      bestPenalty,
      worstPenalty,
      slotId: slot.id,
    }, 'Candidates ranked');
  }
  
  return scored.map((s) => s.candidate);
}

/**
 * Get the best candidate from a list (lowest penalty).
 *
 * @param {Array} candidates - list of candidates
 * @param {Object} slot - the slot being filled
 * @param {Array} existing - already placed assignments
 * @param {Function} getCtx - (teacherId) => context object
 * @returns {Object|null} Best candidate or null if none
 */
export function getBestCandidate(candidates, slot, existing, getCtx) {
  const ranked = rankCandidates(candidates, slot, existing, getCtx);
  return ranked.length > 0 ? ranked[0] : null;
}

/**
 * Calculate quality score for a complete timetable (0-100, higher is better).
 *
 * @param {Array} assignments - Complete timetable assignments
 * @param {Object} template - Template configuration
 * @param {Object} schoolConfig - School configuration
 * @param {Function} getCtx - Function to get context for a teacher
 * @returns {Object} Quality metrics and overall score
 */
export function calculateQualityScore(assignments, template, schoolConfig, getCtx) {
  if (!assignments || assignments.length === 0) {
    return { score: 0, totalPenalty: 0, metrics: {} };
  }
  
  const startTime = Date.now();
  let totalPenalty = 0;
  let mediumPenalties = 0;
  let softPenalties = 0;
  let maxPenaltyPerAssignment = 0;
  
  for (const assignment of assignments) {
    const ctx = getCtx(assignment.teacherId);
    const {
      subjectConfig = {},
      teacherWellness = null,
      teacherConfig = {},
    } = ctx;
    
    const mediumScore = medium.scoreAll(
      assignment,
      assignments,
      subjectConfig,
      schoolConfig,
      null
    );
    
    const softScore = soft.scoreAll(
      assignment,
      assignments,
      teacherWellness,
      teacherConfig,
      null,
      schoolConfig
    );
    
    mediumPenalties += mediumScore;
    softPenalties += softScore;
    const assignmentPenalty = mediumScore + softScore;
    totalPenalty += assignmentPenalty;
    maxPenaltyPerAssignment = Math.max(maxPenaltyPerAssignment, assignmentPenalty);
  }
  
  // Normalize score to 0-100 (lower penalty = higher score)
  // Max possible penalty is roughly 1000 per assignment * 1000 assignments = 1,000,000
  const maxPossiblePenalty = assignments.length * 1000;
  const rawScore = Math.max(0, 1 - (totalPenalty / maxPossiblePenalty)) * 100;
  const normalizedScore = Math.min(100, Math.round(rawScore * 10) / 10);
  
  const durationMs = Date.now() - startTime;
  
  if (durationMs > 50) {
    logger.debug({
      assignmentCount: assignments.length,
      totalPenalty,
      mediumPenalties,
      softPenalties,
      normalizedScore,
      durationMs,
    }, 'Quality score calculated');
  }
  
  return {
    score: normalizedScore,
    totalPenalty,
    mediumPenalties,
    softPenalties,
    averagePenalty: totalPenalty / assignments.length,
    maxPenaltyPerAssignment,
    metrics: {
      assignmentCount: assignments.length,
      hasViolations: totalPenalty > 0,
      severity: totalPenalty > 1000 ? 'high' : totalPenalty > 100 ? 'medium' : 'low',
    },
  };
}

/**
 * Compare two candidates and return the better one based on penalty.
 *
 * @param {Object} candidate1 - First candidate with penalty
 * @param {Object} candidate2 - Second candidate with penalty
 * @returns {Object} The candidate with lower penalty
 */
export function compareCandidates(candidate1, candidate2) {
  if (!candidate1) return candidate2;
  if (!candidate2) return candidate1;
  return candidate1.penalty <= candidate2.penalty ? candidate1 : candidate2;
}

/**
 * Check if a candidate's penalty is acceptable (below threshold).
 *
 * @param {number} penalty - The penalty score
 * @param {number} threshold - Maximum acceptable penalty (default: 100)
 * @returns {boolean} True if penalty is acceptable
 */
export function isAcceptable(penalty, threshold = 100) {
  return penalty <= threshold;
}

/**
 * Get human-readable interpretation of a score.
 *
 * @param {number} score - Quality score (0-100)
 * @returns {string} Quality description
 */
export function getScoreDescription(score) {
  if (score >= 95) return 'Excellent';
  if (score >= 80) return 'Good';
  if (score >= 60) return 'Fair';
  if (score >= 40) return 'Poor';
  return 'Unsatisfactory';
}