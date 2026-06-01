/**
 * scheduler.js
 * Orchestrates the full solver pipeline:
 * feasibility → backtracker → scorer → output
 */

import { checkAll as feasibilityCheck } from './feasibility';
import { solve } from './backtracker';
import { validate } from './validator';

/**
 * Generate a timetable from a school template + config.
 *
 * @param {Object} template - { classes, teachers, subjects }
 * @param {Object} schoolConfig - { periodsPerDay, workingDays, breaks, firstHalfLastPeriod }
 * @param {Object} resolvers - { getTeacherConfig, getTeacherWellness, getSubjectConfig, getRoomConfig }
 * @param {Object} opts - { timeoutMs }
 * @returns {{ success: boolean, timetable?: Array, error?: string, meta: Object }}
 */
export async function generate(template, schoolConfig, resolvers, opts = {}) {
  const startMs = Date.now();

  // Step 1: feasibility pre-check
  const feasibility = feasibilityCheck(template, schoolConfig);
  if (!feasibility.feasible) {
    return {
      success: false,
      error: `INFEASIBLE: ${feasibility.reason}`,
      meta: { durationMs: Date.now() - startMs },
    };
  }

  // Step 2: solve
  let timetable;
  try {
    timetable = solve(template, schoolConfig, resolvers, {
      timeoutMs: opts.timeoutMs ?? 30000,
    });
  } catch (err) {
    if (err.message === 'SOLVER_TIMEOUT') {
      return {
        success: false,
        error: 'SOLVER_TIMEOUT: schedule too complex, try relaxing constraints',
        meta: { durationMs: Date.now() - startMs },
      };
    }
    throw err;
  }

  if (!timetable) {
    return {
      success: false,
      error: 'NO_SOLUTION: constraints are too tight to find a valid schedule',
      meta: { durationMs: Date.now() - startMs },
    };
  }

  // Step 3: validate generated result (sanity check)
  const validation = validate(
    timetable,
    template,
    schoolConfig,
    resolvers.getTeacherConfig,
    resolvers.getTeacherWellness,
    resolvers.getSubjectConfig,
    resolvers.getRoomConfig
  );

  return {
    success: true,
    timetable,
    validation,
    meta: {
      durationMs: Date.now() - startMs,
      totalSlots: timetable.length,
      hardViolations: validation.violations.length,
      qualityScore: validation.score,
    },
  };
}

/**
 * Validate an existing (school-uploaded) timetable and suggest improvements.
 */
export async function validateAndSuggest(assignments, template, schoolConfig, resolvers) {
  const result = validate(
    assignments,
    template,
    schoolConfig,
    resolvers.getTeacherConfig,
    resolvers.getTeacherWellness,
    resolvers.getSubjectConfig,
    resolvers.getRoomConfig
  );
  return result;
}
