/**
 * scheduler.js
 * Orchestrates the full solver pipeline:
 * feasibility → backtracker → scorer → output
 */

import { checkAll as feasibilityCheck } from './feasibility.js';
import { solve } from './backtracker.js';
import { validate } from './validator.js';
import { logger } from '#config/logger.js';
import { ApiError } from '#shared/response/ApiError.js';

/**
 * Generate a timetable from a school template + config.
 *
 * @param {Object} template - { classes, teachers, subjects }
 * @param {Object} schoolConfig - { periodsPerDay, workingDays, breaks, firstHalfLastPeriod }
 * @param {Object} resolvers - { getTeacherConfig, getTeacherWellness, getSubjectConfig, getRoomConfig }
 * @param {Object} opts - { timeoutMs, maxDepth }
 * @returns {{ success: boolean, timetable?: Array, error?: string, meta: Object }}
 */
export async function generate(template, schoolConfig, resolvers, opts = {}) {
  const startMs = Date.now();
  const timeoutMs = opts.timeoutMs ?? 30000;
  const maxDepth = opts.maxDepth ?? 10000;
  
  logger.info({ 
    templateId: template.id,
    classCount: template.classes?.length,
    teacherCount: template.teachers?.length,
    timeoutMs,
    maxDepth
  }, 'Starting timetable generation');

  // Step 1: feasibility pre-check
  try {
    const feasibility = feasibilityCheck(template, schoolConfig);
    
    if (!feasibility.feasible) {
      logger.warn({ 
        reason: feasibility.reason,
        details: feasibility.details,
        durationMs: Date.now() - startMs 
      }, 'Feasibility check failed');
      
      return {
        success: false,
        error: `INFEASIBLE: ${feasibility.reason}`,
        details: feasibility.details,
        meta: { durationMs: Date.now() - startMs },
      };
    }
    
    if (feasibility.warnings && feasibility.warnings.length > 0) {
      logger.warn({ 
        warnings: feasibility.warnings,
        durationMs: Date.now() - startMs 
      }, 'Feasibility check passed with warnings');
    } else {
      logger.info({ durationMs: Date.now() - startMs }, 'Feasibility check passed');
    }
  } catch (error) {
    logger.error({ error: error.message, stack: error.stack }, 'Feasibility check error');
    
    return {
      success: false,
      error: 'FEASIBILITY_CHECK_ERROR',
      message: error.message,
      meta: { durationMs: Date.now() - startMs },
    };
  }

  // Step 2: solve
  let timetable;
  try {
    logger.debug('Starting backtracking solver');
    
    timetable = solve(template, schoolConfig, resolvers, {
      timeoutMs,
      maxDepth,
    });
    
    const solveDurationMs = Date.now() - startMs;
    logger.info({ 
      durationMs: solveDurationMs,
      hasSolution: !!timetable 
    }, 'Backtracking solver completed');
  } catch (err) {
    if (err.message === 'SOLVER_TIMEOUT') {
      logger.warn({ 
        timeoutMs,
        durationMs: Date.now() - startMs 
      }, 'Solver timeout exceeded');
      
      return {
        success: false,
        error: 'SOLVER_TIMEOUT',
        message: 'Schedule too complex, try relaxing constraints',
        meta: { durationMs: Date.now() - startMs },
      };
    }
    
    if (err.message === 'MAX_DEPTH_EXCEEDED') {
      logger.error({ 
        maxDepth,
        durationMs: Date.now() - startMs 
      }, 'Max recursion depth exceeded');
      
      return {
        success: false,
        error: 'MAX_DEPTH_EXCEEDED',
        message: 'Schedule complexity too high, try simplifying',
        meta: { durationMs: Date.now() - startMs },
      };
    }
    
    logger.error({ 
      error: err.message, 
      stack: err.stack,
      durationMs: Date.now() - startMs 
    }, 'Solver error');
    
    return {
      success: false,
      error: 'SOLVER_ERROR',
      message: err.message,
      meta: { durationMs: Date.now() - startMs },
    };
  }

  if (!timetable) {
    logger.warn({ durationMs: Date.now() - startMs }, 'No solution found');
    
    return {
      success: false,
      error: 'NO_SOLUTION',
      message: 'Constraints are too tight to find a valid schedule',
      meta: { durationMs: Date.now() - startMs },
    };
  }

  // Step 3: validate generated result (sanity check)
  let validation;
  try {
    validation = validate(
      timetable,
      template,
      schoolConfig,
      resolvers.getTeacherConfig,
      resolvers.getTeacherWellness,
      resolvers.getSubjectConfig,
      resolvers.getRoomConfig
    );
    
    logger.info({ 
      totalSlots: timetable.length,
      hardViolations: validation.violations?.length || 0,
      qualityScore: validation.score,
      durationMs: Date.now() - startMs 
    }, 'Timetable generated and validated');
    
    // Warn if there are any hard violations (shouldn't happen)
    if (validation.violations && validation.violations.length > 0) {
      logger.warn({ 
        violations: validation.violations,
        violationCount: validation.violations.length 
      }, 'Generated timetable has hard constraint violations');
    }
  } catch (error) {
    logger.error({ error: error.message, stack: error.stack }, 'Validation error');
    
    return {
      success: false,
      error: 'VALIDATION_ERROR',
      message: error.message,
      meta: { durationMs: Date.now() - startMs },
    };
  }

  return {
    success: true,
    timetable,
    validation,
    meta: {
      durationMs: Date.now() - startMs,
      totalSlots: timetable.length,
      hardViolations: validation.violations?.length || 0,
      qualityScore: validation.score || 0,
    },
  };
}

/**
 * Validate an existing (school-uploaded) timetable and suggest improvements.
 *
 * @param {Array} assignments - Existing timetable assignments
 * @param {Object} template - Template configuration
 * @param {Object} schoolConfig - School configuration
 * @param {Object} resolvers - Resolver functions
 * @returns {Object} Validation result with violations and suggestions
 */
export async function validateAndSuggest(assignments, template, schoolConfig, resolvers) {
  const startMs = Date.now();
  
  logger.info({ 
    assignmentCount: assignments?.length,
    templateId: template?.id 
  }, 'Starting timetable validation');
  
  try {
    const result = validate(
      assignments,
      template,
      schoolConfig,
      resolvers.getTeacherConfig,
      resolvers.getTeacherWellness,
      resolvers.getSubjectConfig,
      resolvers.getRoomConfig
    );
    
    const durationMs = Date.now() - startMs;
    
    logger.info({ 
      hardViolations: result.violations?.length || 0,
      qualityScore: result.score,
      durationMs 
    }, 'Timetable validation completed');
    
    // Generate suggestions for improvement
    const suggestions = generateSuggestions(result, template);
    
    return {
      ...result,
      suggestions,
      meta: {
        durationMs,
        isFeasible: result.violations?.length === 0,
      },
    };
  } catch (error) {
    logger.error({ 
      error: error.message, 
      stack: error.stack,
      durationMs: Date.now() - startMs 
    }, 'Validation failed');
    
    throw ApiError.internal('Failed to validate timetable');
  }
}

/**
 * Generate improvement suggestions based on validation results.
 * 
 * @param {Object} validationResult - Result from validate()
 * @param {Object} template - Template configuration
 * @returns {Array} List of suggestions
 */
function generateSuggestions(validationResult, template) {
  const suggestions = [];
  
  if (!validationResult.violations || validationResult.violations.length === 0) {
    suggestions.push({
      type: 'info',
      message: 'Timetable satisfies all hard constraints',
    });
    return suggestions;
  }
  
  // Analyze violation types and suggest fixes
  const teacherConflicts = validationResult.violations.filter(
    v => v.type === 'teacher_conflict'
  );
  
  if (teacherConflicts.length > 0) {
    suggestions.push({
      type: 'warning',
      message: `${teacherConflicts.length} teacher conflict(s) detected. Consider adding more teachers or reducing periods.`,
      affectedTeachers: [...new Set(teacherConflicts.map(v => v.teacherId))],
    });
  }
  
  const classOverloads = validationResult.violations.filter(
    v => v.type === 'class_overload'
  );
  
  if (classOverloads.length > 0) {
    suggestions.push({
      type: 'warning',
      message: `${classOverloads.length} class(es) have too many periods per day. Spread periods more evenly.`,
    });
  }
  
  const teacherWellnessIssues = validationResult.violations.filter(
    v => v.type === 'wellness_violation'
  );
  
  if (teacherWellnessIssues.length > 0) {
    suggestions.push({
      type: 'info',
      message: `${teacherWellnessIssues.length} wellness constraint(s) violated. Review teacher accommodations.`,
    });
  }
  
  // Score-based suggestion
  if (validationResult.score < 0.7) {
    suggestions.push({
      type: 'suggestion',
      message: 'Quality score is low. Try adjusting medium/soft constraint weights.',
      currentScore: validationResult.score,
    });
  }
  
  return suggestions;
}

/**
 * Quick check if a template is likely solvable.
 * Returns result without running full solver.
 */
export function quickCheck(template, schoolConfig) {
  const startMs = Date.now();
  
  try {
    const feasibility = feasibilityCheck(template, schoolConfig);
    
    return {
      feasible: feasibility.feasible,
      reason: feasibility.reason,
      warnings: feasibility.warnings,
      meta: { durationMs: Date.now() - startMs },
    };
  } catch (error) {
    logger.error({ error: error.message }, 'Quick check failed');
    
    return {
      feasible: false,
      reason: 'CHECK_ERROR',
      message: error.message,
      meta: { durationMs: Date.now() - startMs },
    };
  }
}

/**
 * Run solver with multiple configurations to find best schedule.
 */
export async function optimize(template, schoolConfig, resolvers, configs = []) {
  const results = [];
  
  for (const config of configs) {
    logger.debug({ config }, 'Trying solver configuration');
    
    const result = await generate(template, schoolConfig, resolvers, config);
    results.push({
      config,
      result,
    });
    
    if (result.success && (!results.best || result.validation?.score > results.best.score)) {
      results.best = {
        config,
        score: result.validation?.score || 0,
        result,
      };
    }
  }
  
  const bestResult = results.best?.result || results.find(r => r.result.success)?.result;
  
  return {
    success: !!bestResult,
    best: bestResult,
    attempts: results.map(r => ({
      config: r.config,
      success: r.result.success,
      score: r.result.validation?.score,
      durationMs: r.result.meta?.durationMs,
    })),
  };
}