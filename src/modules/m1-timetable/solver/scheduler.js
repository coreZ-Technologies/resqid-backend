/**
 * scheduler.js
 * Orchestrates the full solver pipeline:
 * feasibility → backtracker → scorer → output
 *
 * Supports: class-by-class, full generation, incremental updates,
 * progress streaming, and partial results.
 */

import { checkAll as feasibilityCheck } from './feasibility.js';
import { solve, solveByClass } from './backtracker.js';
import { validate } from './validator.js';
import { scoreAll as scoreMedium } from '../constraints/medium.js';
import { scoreAll as scoreSoft } from '../constraints/soft.js';

// =============================================================================
// MAIN GENERATION
// =============================================================================

/**
 * Generate a timetable from a school template + config.
 *
 * @param {Object} template - { classes, teachers, subjects, rooms }
 * @param {Object} schoolConfig - { periodsPerDay, workingDays, breaks, gradeLevels }
 * @param {Object} resolvers - { getTeacherConfig, getTeacherWellness, getSubjectConfig, getRoomConfig, getClassConfig }
 * @param {Object} opts - { timeoutMs, mode, onProgress, existingAssignments }
 * @returns {{ success: boolean, timetable?: Array, error?: string, meta: Object }}
 */
export async function generate(template, schoolConfig, resolvers, opts = {}) {
  const startMs = Date.now();
  const {
    timeoutMs = 30000,
    mode = 'full', // 'full' | 'class-by-class' | 'incremental'
    onProgress = null, // Progress callback
    existingAssignments = [], // For incremental mode
    savePartial = true, // Save partial result on failure
  } = opts;

  try {
    // ─── Step 1: Feasibility pre-check ───
    if (onProgress) onProgress({ phase: 'feasibility', progress: 0 });

    const feasibility = feasibilityCheck(template, schoolConfig);

    if (!feasibility.feasible) {
      return {
        success: false,
        error: 'INFEASIBLE',
        message: feasibility.reason,
        details: feasibility.details,
        suggestions: feasibility.suggestion,
        meta: {
          durationMs: Date.now() - startMs,
          feasibilityResult: feasibility,
        },
      };
    }

    // Log warnings but continue
    if (feasibility.warnings?.length > 0) {
      console.warn('Feasibility warnings:', feasibility.warnings);
    }

    if (onProgress) onProgress({ phase: 'solving', progress: 0.1 });

    // ─── Step 2: Solve ───
    let timetable;
    let solveMeta = {};

    switch (mode) {
      case 'class-by-class':
        // Generate class by class (recommended for large schools)
        const classResult = solveByClass(template, schoolConfig, resolvers, {
          timeoutMs,
          onProgress: (p) => {
            if (onProgress) {
              onProgress({
                phase: 'solving',
                progress: 0.1 + p.progress * 0.7,
                ...p,
              });
            }
          },
        });

        if (classResult.success) {
          timetable = classResult.timetable;
          solveMeta = {
            mode: 'class-by-class',
            classBreakdown: classResult.classBreakdown,
            processingTimeMs: classResult.processingTimeMs,
          };
        } else if (savePartial && classResult.partialTimetable?.length > 0) {
          return {
            success: false,
            error: 'PARTIAL_SUCCESS',
            message: classResult.message,
            partialTimetable: classResult.partialTimetable,
            completedClasses: classResult.completedClasses,
            failedClass: classResult.failedClass,
            meta: {
              durationMs: Date.now() - startMs,
              mode: 'class-by-class',
            },
          };
        } else {
          return {
            success: false,
            error: 'NO_SOLUTION',
            message: classResult.message,
            failedClass: classResult.failedClass,
            meta: { durationMs: Date.now() - startMs },
          };
        }
        break;

      case 'incremental':
        // Keep existing assignments, solve remaining
        timetable = solve(template, schoolConfig, resolvers, {
          timeoutMs,
          existingAssignments,
          onProgress: (p) => {
            if (onProgress) {
              onProgress({ phase: 'solving', progress: 0.1 + p.progress * 0.7, ...p });
            }
          },
        });

        if (!timetable && savePartial && existingAssignments.length > 0) {
          return {
            success: false,
            error: 'PARTIAL_SUCCESS',
            message: 'Could not complete all assignments. Existing assignments preserved.',
            partialTimetable: existingAssignments,
            meta: { durationMs: Date.now() - startMs, mode: 'incremental' },
          };
        }
        solveMeta = { mode: 'incremental', preservedAssignments: existingAssignments.length };
        break;

      case 'full':
      default:
        // Solve entire school at once
        timetable = solve(template, schoolConfig, resolvers, {
          timeoutMs,
          onProgress: (p) => {
            if (onProgress) {
              onProgress({ phase: 'solving', progress: 0.1 + p.progress * 0.7, ...p });
            }
          },
        });
        solveMeta = { mode: 'full' };
        break;
    }

    if (!timetable) {
      return {
        success: false,
        error: 'NO_SOLUTION',
        message:
          'Constraints are too tight to find a valid schedule. Try relaxing some constraints.',
        suggestions: [
          'Increase max periods per day for some teachers',
          'Add more teachers or reduce subject periods',
          'Allow more room sharing',
          'Reduce consecutive period restrictions',
        ],
        meta: { durationMs: Date.now() - startMs, ...solveMeta },
      };
    }

    if (onProgress) onProgress({ phase: 'validating', progress: 0.9 });

    // ─── Step 3: Validate generated result ───
    const validation = validate(
      timetable,
      template,
      schoolConfig,
      resolvers.getTeacherConfig,
      resolvers.getTeacherWellness,
      resolvers.getSubjectConfig,
      resolvers.getRoomConfig,
      resolvers.getClassConfig
    );

    // ─── Step 4: Calculate overall scores ───
    const scores = calculateOverallScores(timetable, template, schoolConfig, resolvers);

    if (onProgress) onProgress({ phase: 'complete', progress: 1.0 });

    const durationMs = Date.now() - startMs;

    return {
      success: true,
      timetable,
      validation,
      scores,
      meta: {
        durationMs,
        totalSlots: timetable.length,
        hardViolations: validation.violations?.length || 0,
        warnings: validation.warnings?.length || 0,
        suggestions: validation.suggestions?.length || 0,
        qualityScore: validation.score || scores.overall,
        wellnessScore: scores.wellness,
        utilizationScore: scores.utilization,
        ...solveMeta,
      },
    };
  } catch (err) {
    const durationMs = Date.now() - startMs;

    if (err.code === 'SOLVER_TIMEOUT') {
      return {
        success: false,
        error: 'SOLVER_TIMEOUT',
        message: `Solver timed out after ${timeoutMs}ms. Try reducing constraints or using class-by-class mode.`,
        meta: { durationMs, timeoutMs },
      };
    }

    if (err.code === 'MAX_BACKTRACKS') {
      return {
        success: false,
        error: 'MAX_BACKTRACKS',
        message: `Solver exceeded maximum backtrack limit. Constraints may be too tight.`,
        partial: err.partial,
        meta: { durationMs, backtracks: err.backtracks },
      };
    }

    throw err;
  }
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validate an existing (school-uploaded) timetable and suggest improvements.
 */
export async function validateAndSuggest(assignments, template, schoolConfig, resolvers) {
  if (!assignments || assignments.length === 0) {
    return {
      success: false,
      error: 'No assignments to validate',
    };
  }

  const result = validate(
    assignments,
    template,
    schoolConfig,
    resolvers.getTeacherConfig,
    resolvers.getTeacherWellness,
    resolvers.getSubjectConfig,
    resolvers.getRoomConfig,
    resolvers.getClassConfig
  );

  // Add improvement suggestions
  const improvements = generateImprovements(result, template);

  return {
    ...result,
    improvements,
    actionable: improvements.filter((i) => i.actionable).length,
  };
}

// =============================================================================
// SCORING
// =============================================================================

/**
 * Calculate overall scores for a timetable.
 */
function calculateOverallScores(timetable, template, schoolConfig, resolvers) {
  let totalMedium = 0;
  let totalSoft = 0;
  let wellnessViolations = 0;

  for (const assignment of timetable) {
    const subjectConfig = resolvers.getSubjectConfig(assignment.subjectId) || {};
    const teacherConfig = resolvers.getTeacherConfig(assignment.teacherId) || {};
    const teacherWellness = resolvers.getTeacherWellness(assignment.teacherId) || null;
    const roomConfig = assignment.roomId ? resolvers.getRoomConfig(assignment.roomId) : null;
    const classConfig = resolvers.getClassConfig(assignment.classId) || {};

    const existing = timetable.filter((a) => a.id !== assignment.id);

    totalMedium += scoreMedium(
      assignment,
      existing,
      subjectConfig,
      schoolConfig,
      roomConfig,
      classConfig,
      teacherConfig,
      teacherWellness
    );

    totalSoft += scoreSoft(
      assignment,
      existing,
      teacherWellness,
      teacherConfig,
      roomConfig,
      schoolConfig,
      classConfig,
      subjectConfig
    );

    // Count wellness violations
    if (teacherWellness) {
      if (teacherWellness.isPregnant && roomConfig?.floor > 0) wellnessViolations++;
      if (teacherWellness.needsAccessibleRoom && !roomConfig?.isAccessible) wellnessViolations++;
      if (teacherWellness.avoidEarlyMorning && assignment.period === 1) wellnessViolations++;
    }
  }

  const totalSlots = timetable.length;
  const avgMedium = totalSlots > 0 ? totalMedium / totalSlots : 0;
  const avgSoft = totalSlots > 0 ? totalSoft / totalSlots : 0;

  // Calculate scores (0-100, higher = better)
  const wellness = Math.max(0, 100 - wellnessViolations * 5);
  const quality = Math.max(0, 100 - avgMedium - avgSoft);
  const utilization = calculateUtilization(timetable, template);

  return {
    overall: Math.round((quality + wellness + utilization) / 3),
    quality: Math.round(quality),
    wellness: Math.round(wellness),
    utilization: Math.round(utilization),
    totalPenalty: totalMedium + totalSoft,
    avgPenaltyPerSlot: Math.round(((totalMedium + totalSoft) / totalSlots) * 100) / 100,
    wellnessViolations,
  };
}

/**
 * Calculate room/teacher utilization.
 */
function calculateUtilization(timetable, template) {
  // Simplified utilization score
  const totalSlots = timetable.length;
  const totalRooms = template.rooms?.length || 1;
  const totalTeachers = template.teachers?.length || 1;

  const roomsUsed = new Set(timetable.map((a) => a.roomId).filter(Boolean)).size;
  const teachersUsed = new Set(timetable.map((a) => a.teacherId)).size;

  const roomUtil = roomsUsed / totalRooms;
  const teacherUtil = teachersUsed / totalTeachers;

  return Math.round(((roomUtil + teacherUtil) / 2) * 100);
}

// =============================================================================
// IMPROVEMENT SUGGESTIONS
// =============================================================================

/**
 * Generate actionable improvement suggestions.
 */
function generateImprovements(validationResult, template) {
  const improvements = [];

  if (validationResult.violations?.length > 0) {
    improvements.push({
      type: 'CRITICAL',
      message: `Fix ${validationResult.violations.length} hard constraint violations first`,
      actionable: true,
      count: validationResult.violations.length,
    });
  }

  if (validationResult.warnings?.length > 0) {
    // Group warnings by type
    const warningGroups = groupBy(validationResult.warnings, 'type');

    for (const [type, warnings] of Object.entries(warningGroups)) {
      improvements.push({
        type: 'WARNING',
        message: getWarningMessage(type, warnings.length),
        actionable: true,
        count: warnings.length,
        category: type,
      });
    }
  }

  // Resource utilization suggestions
  const teacherCount = template.teachers?.length || 0;
  const roomCount = template.rooms?.length || 0;

  if (teacherCount < 3) {
    improvements.push({
      type: 'SUGGESTION',
      message: 'Consider adding more teachers to distribute workload',
      actionable: false,
    });
  }

  return improvements;
}

// =============================================================================
// HELPER: Get teacher name safely
// =============================================================================

function getTeacherName(teacherId, template) {
  const teacher = template.teachers?.find((t) => t.id === teacherId);
  return teacher?.name || teacherId;
}

// =============================================================================
// UTILITIES
// =============================================================================

function groupBy(array, key) {
  return array.reduce((groups, item) => {
    const value = item[key] || 'unknown';
    groups[value] = groups[value] || [];
    groups[value].push(item);
    return groups;
  }, {});
}

function getWarningMessage(type, count) {
  const messages = {
    CONSECUTIVE_OVERLOAD: `${count} teacher(s) have too many consecutive periods`,
    HEAVY_SUBJECT_AFTERNOON: `${count} heavy subject(s) scheduled in afternoon`,
    UNBALANCED_DAY: `${count} class(es) have unbalanced daily loads`,
    ROOM_TYPE_MISMATCH: `${count} subject(s) not in appropriate room type`,
    SUBJECT_DAILY_CAP_EXCEEDED: `${count} subject(s) exceed daily cap`,
  };
  return messages[type] || `${count} warning(s) of type "${type}"`;
}

export { calculateOverallScores };
