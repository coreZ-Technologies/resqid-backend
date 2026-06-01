/**
 * scorer.js
 * Combines medium + soft constraint penalties into a single score.
 * Lower = better. Used by heuristics to pick best valid assignment.
 */

import * as medium from '../constraints/medium';
import * as soft from '../constraints/soft';

/**
 * Score a candidate assignment.
 *
 * @param {Object} assignment - proposed assignment
 * @param {Array} existing - already placed assignments
 * @param {Object} ctx - { subjectConfig, schoolConfig, roomConfig, teacherWellness, teacherConfig }
 * @returns {number} total penalty score
 */
export function score(assignment, existing, ctx) {
  const {
    subjectConfig = {},
    schoolConfig = {},
    roomConfig = null,
    teacherWellness = null,
    teacherConfig = {},
  } = ctx;

  const mediumScore = medium.scoreAll(
    assignment,
    existing,
    subjectConfig,
    schoolConfig,
    roomConfig
  );

  const softScore = soft.scoreAll(
    assignment,
    existing,
    teacherWellness,
    teacherConfig,
    roomConfig,
    schoolConfig
  );

  return mediumScore + softScore;
}

/**
 * Score all candidates for a slot and return sorted (best first).
 *
 * @param {Array} candidates - list of { teacherId, roomId, ... }
 * @param {Object} slot - the slot being filled
 * @param {Array} existing - already placed assignments
 * @param {Function} getCtx - (teacherId) => context object
 * @returns {Array} sorted candidates
 */
export function rankCandidates(candidates, slot, existing, getCtx) {
  const scored = candidates.map((candidate) => {
    const assignment = { ...slot, ...candidate };
    const ctx = getCtx(candidate.teacherId);
    return { candidate, penalty: score(assignment, existing, ctx) };
  });

  scored.sort((a, b) => a.penalty - b.penalty);
  return scored.map((s) => s.candidate);
}
