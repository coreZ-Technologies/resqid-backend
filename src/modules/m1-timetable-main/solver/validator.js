/**
 * validator.js
 * Validates an existing timetable (school-uploaded or generated).
 * Returns structured issues categorised by severity.
 */

import * as hard from '../constraints/hard.js';
import * as medium from '../constraints/medium.js';
import * as soft from '../constraints/soft.js';
import { logger } from '#config/logger.js';

/**
 * Validate an existing timetable.
 *
 * @param {Array} assignments - existing timetable slots
 * @param {Object} template - school template (classes, teachers, subjects)
 * @param {Object} schoolConfig - school operational config
 * @param {Function} getTeacherConfig - (teacherId) => teacherConfig
 * @param {Function} getTeacherWellness - (teacherId) => wellness object
 * @param {Function} getSubjectConfig - (subjectId) => subjectConfig
 * @param {Function} getRoomConfig - (roomId) => roomConfig
 * @returns {{ violations: Array, warnings: Array, suggestions: Array, score: number, summary: Object }}
 */
export function validate(
  assignments,
  template,
  schoolConfig,
  getTeacherConfig,
  getTeacherWellness,
  getSubjectConfig,
  getRoomConfig
) {
  const startTime = Date.now();
  
  // Input validation
  if (!assignments || !Array.isArray(assignments)) {
    logger.error('Invalid assignments provided to validator');
    return {
      violations: [{ type: 'hard', reason: 'No assignments to validate' }],
      warnings: [],
      suggestions: [],
      score: Infinity,
      summary: { valid: false, error: 'No assignments provided' },
    };
  }
  
  if (!template || !template.classes) {
    logger.error('Invalid template provided to validator');
    return {
      violations: [{ type: 'hard', reason: 'Invalid template configuration' }],
      warnings: [],
      suggestions: [],
      score: Infinity,
      summary: { valid: false, error: 'Invalid template' },
    };
  }
  
  const violations = []; // hard constraint breaks
  const warnings = []; // medium constraint misses
  const suggestions = []; // soft constraint improvements
  
  const teacherAssignments = new Map(); // Track teacher workload
  const classAssignments = new Map(); // Track class workload

  for (let i = 0; i < assignments.length; i++) {
    const a = assignments[i];
    const rest = assignments.filter((_, idx) => idx !== i);
    
    // Get configurations with safe defaults
    const teacherConfig = getTeacherConfig ? getTeacherConfig(a.teacherId) || {} : {};
    const teacherWellness = getTeacherWellness ? getTeacherWellness(a.teacherId) || null : null;
    const subjectConfig = getSubjectConfig ? getSubjectConfig(a.subjectId) || {} : {};
    const roomConfig = getRoomConfig ? getRoomConfig(a.roomId) || null : null;
    
    // Track teacher and class assignments
    if (!teacherAssignments.has(a.teacherId)) {
      teacherAssignments.set(a.teacherId, []);
    }
    teacherAssignments.get(a.teacherId).push(a);
    
    if (!classAssignments.has(a.classId)) {
      classAssignments.set(a.classId, []);
    }
    classAssignments.get(a.classId).push(a);

    // Hard checks
    const hardResult = hard.checkAll(a, rest, schoolConfig, teacherConfig);
    if (!hardResult.ok) {
      violations.push({
        type: 'hard',
        severity: 'error',
        assignmentId: a.id,
        day: a.day,
        period: a.period,
        teacherId: a.teacherId,
        classId: a.classId,
        subjectId: a.subjectId,
        reason: hardResult.reason,
      });
    }

    // Medium checks
    const medPenalty = medium.scoreAll(a, rest, subjectConfig, schoolConfig, roomConfig);
    if (medPenalty > 0) {
      warnings.push({
        type: 'medium',
        severity: 'warning',
        assignmentId: a.id,
        day: a.day,
        period: a.period,
        teacherId: a.teacherId,
        classId: a.classId,
        subjectId: a.subjectId,
        penalty: medPenalty,
        hint: buildMediumHint(a, rest, subjectConfig, schoolConfig, roomConfig),
      });
    }

    // Soft checks
    const softPenalty = soft.scoreAll(
      a,
      rest,
      teacherWellness,
      teacherConfig,
      roomConfig,
      schoolConfig
    );
    if (softPenalty > 0) {
      suggestions.push({
        type: 'soft',
        severity: 'info',
        assignmentId: a.id,
        day: a.day,
        period: a.period,
        teacherId: a.teacherId,
        classId: a.classId,
        subjectId: a.subjectId,
        penalty: softPenalty,
        hint: buildSoftHint(a, teacherWellness, roomConfig, schoolConfig),
      });
    }
  }

  // Weekly subject target check
  const targetIssues = checkWeeklyTargets(assignments, template);
  violations.push(...targetIssues);
  
  // Additional validations
  const teacherOverloadIssues = checkTeacherOverload(teacherAssignments, schoolConfig);
  violations.push(...teacherOverloadIssues);
  
  const classScheduleIssues = checkClassSchedule(classAssignments, schoolConfig);
  warnings.push(...classScheduleIssues);
  
  const totalScore = calculateTotalScore(violations, warnings, suggestions);
  
  const durationMs = Date.now() - startTime;
  
  // Create summary
  const summary = {
    valid: violations.length === 0,
    totalAssignments: assignments.length,
    violationsCount: violations.length,
    warningsCount: warnings.length,
    suggestionsCount: suggestions.length,
    score: totalScore,
    durationMs,
  };
  
  // Log validation results
  if (violations.length > 0) {
    logger.warn({
      violationsCount: violations.length,
      warningsCount: warnings.length,
      suggestionsCount: suggestions.length,
      totalScore,
      durationMs,
    }, 'Timetable validation found violations');
  } else {
    logger.info({
      warningsCount: warnings.length,
      suggestionsCount: suggestions.length,
      totalScore,
      durationMs,
    }, 'Timetable validation passed');
  }
  
  // Add readable summary to return object
  summary.readable = violations.length === 0 
    ? 'Timetable is valid'
    : `Timetable has ${violations.length} critical issue(s) that need attention`;
  
  return { 
    violations, 
    warnings, 
    suggestions, 
    score: totalScore,
    summary,
  };
}

/**
 * Check weekly subject targets - ensure each subject meets required weekly periods
 */
function checkWeeklyTargets(assignments, template) {
  const issues = [];
  
  for (const cls of template.classes) {
    if (!cls.subjects) continue;
    
    for (const subject of cls.subjects) {
      const actual = assignments.filter(
        (a) => a.classId === cls.id && a.subjectId === subject.id
      ).length;
      
      const required = subject.weeklyPeriods || 0;
      
      if (actual < required) {
        issues.push({
          type: 'hard',
          severity: 'error',
          reason: `Class ${cls.id || cls.name} subject ${subject.id || subject.name}: needs ${required} periods/week but has ${actual}`,
          classId: cls.id,
          className: cls.name,
          subjectId: subject.id,
          subjectName: subject.name,
          required,
          actual,
          shortfall: required - actual,
        });
      } else if (actual > required) {
        issues.push({
          type: 'hard',
          severity: 'error',
          reason: `Class ${cls.id || cls.name} subject ${subject.id || subject.name}: has ${actual} periods/week but only needs ${required}`,
          classId: cls.id,
          className: cls.name,
          subjectId: subject.id,
          subjectName: subject.name,
          required,
          actual,
          excess: actual - required,
        });
      }
    }
  }
  
  return issues;
}

/**
 * Check teacher overload - ensure no teacher exceeds reasonable weekly load
 */
function checkTeacherOverload(teacherAssignments, schoolConfig) {
  const issues = [];
  const maxPeriodsPerWeek = schoolConfig.maxPeriodsPerTeacher || 35;
  
  for (const [teacherId, assignments] of teacherAssignments) {
    const periodCount = assignments.length;
    
    if (periodCount > maxPeriodsPerWeek) {
      issues.push({
        type: 'hard',
        severity: 'error',
        reason: `Teacher ${teacherId} has ${periodCount} periods/week, exceeding limit of ${maxPeriodsPerWeek}`,
        teacherId,
        actual: periodCount,
        limit: maxPeriodsPerWeek,
        excess: periodCount - maxPeriodsPerWeek,
      });
    }
  }
  
  return issues;
}

/**
 * Check class schedule issues (e.g., too many periods in one day)
 */
function checkClassSchedule(classAssignments, schoolConfig) {
  const issues = [];
  const maxPeriodsPerDayForClass = schoolConfig.maxPeriodsPerDayForClass || 8;
  
  for (const [classId, assignments] of classAssignments) {
    // Group by day
    const periodsByDay = new Map();
    for (const a of assignments) {
      if (!periodsByDay.has(a.day)) {
        periodsByDay.set(a.day, []);
      }
      periodsByDay.get(a.day).push(a);
    }
    
    // Check each day
    for (const [day, dayAssignments] of periodsByDay) {
      if (dayAssignments.length > maxPeriodsPerDayForClass) {
        issues.push({
          type: 'medium',
          severity: 'warning',
          reason: `Class ${classId} has ${dayAssignments.length} periods on day ${day}, exceeding recommended ${maxPeriodsPerDayForClass}`,
          classId,
          day,
          actual: dayAssignments.length,
          limit: maxPeriodsPerDayForClass,
        });
      }
    }
  }
  
  return issues;
}

/**
 * Calculate total score based on violations, warnings, and suggestions
 */
function calculateTotalScore(violations, warnings, suggestions) {
  return (
    violations.length * 100 +
    warnings.reduce((sum, w) => sum + (w.penalty || 10), 0) +
    suggestions.reduce((sum, s) => sum + (s.penalty || 1), 0)
  );
}

/**
 * Build hint for medium constraint violations
 */
function buildMediumHint(a, rest, subjectConfig, schoolConfig, roomConfig) {
  const hints = [];
  
  if (medium.heavySubjectTiming && medium.heavySubjectTiming(a, subjectConfig, schoolConfig) > 0) {
    hints.push('Heavy subject scheduled in second half — move to morning');
  }
  if (medium.noConsecutiveOverload && medium.noConsecutiveOverload(a, rest) > 0) {
    hints.push('Teacher has too many consecutive periods — add a gap');
  }
  if (medium.roomTypeMatch && medium.roomTypeMatch(a, subjectConfig, roomConfig) > 0) {
    hints.push(`Subject requires ${subjectConfig.requiredRoomType || 'special'} room`);
  }
  if (medium.subjectDailyCapOk && medium.subjectDailyCapOk(a, rest) > 0) {
    hints.push('Subject appears too many times in one day');
  }
  
  return hints.join('; ') || 'Review medium constraint violations';
}

/**
 * Build hint for soft constraint violations
 */
function buildSoftHint(a, wellness, roomConfig, schoolConfig) {
  if (!wellness) return 'Review teacher wellness constraints';
  
  const hints = [];
  
  if (wellness.isPregnant && roomConfig?.floor && roomConfig.floor > 0) {
    hints.push('Pregnant teacher assigned to upper floor — prefer ground floor');
  }
  if (wellness.needsAccessibleRoom && !roomConfig?.isAccessible) {
    hints.push('Teacher needs accessible room');
  }
  if (wellness.isSenior) {
    hints.push('Senior teacher may benefit from lighter load on this day');
  }
  if (wellness.avoidEarlyMorning && a.period === 1) {
    hints.push('Teacher prefers to avoid first period');
  }
  if (wellness.burnoutRisk) {
    hints.push('Teacher flagged for burnout risk — consider reducing load');
  }
  if (wellness.preferredMaxPerDay && wellness.preferredMaxPerDay > 0) {
    // Could check actual periods per day here
    hints.push(`Teacher prefers max ${wellness.preferredMaxPerDay} periods per day`);
  }
  
  return hints.join('; ') || 'Review teacher wellness constraints';
}

/**
 * Quick validation that returns only pass/fail
 */
export function isTimetableValid(assignments, template, schoolConfig, getTeacherConfig, getTeacherWellness, getSubjectConfig, getRoomConfig) {
  const result = validate(
    assignments,
    template,
    schoolConfig,
    getTeacherConfig,
    getTeacherWellness,
    getSubjectConfig,
    getRoomConfig
  );
  return result.violations.length === 0;
}

/**
 * Get validation summary string for logging/display
 */
export function getValidationSummary(validationResult) {
  const { violations, warnings, suggestions, score, summary } = validationResult;
  
  if (summary) {
    return summary.readable;
  }
  
  const parts = [];
  if (violations.length > 0) {
    parts.push(`${violations.length} critical violation(s)`);
  }
  if (warnings.length > 0) {
    parts.push(`${warnings.length} warning(s)`);
  }
  if (suggestions.length > 0) {
    parts.push(`${suggestions.length} suggestion(s)`);
  }
  parts.push(`score: ${score}`);
  
  return parts.join(', ');
}