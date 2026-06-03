/**
 * validator.js
 * Validates an existing timetable (school-uploaded or generated).
 * Returns structured issues categorised by severity with actionable suggestions.
 */

import * as hard from '../constraints/hard.js';
import * as medium from '../constraints/medium.js';
import * as soft from '../constraints/soft.js';

// =============================================================================
// MAIN VALIDATION
// =============================================================================

/**
 * Validate an existing timetable.
 *
 * @param {Array} assignments - existing timetable slots
 * @param {Object} template - school template (classes, teachers, subjects, rooms)
 * @param {Object} schoolConfig - school operational config
 * @param {Function} getTeacherConfig - (teacherId) => teacherConfig
 * @param {Function} getTeacherWellness - (teacherId) => wellness object
 * @param {Function} getSubjectConfig - (subjectId) => subjectConfig
 * @param {Function} getRoomConfig - (roomId) => roomConfig
 * @param {Function} getClassConfig - (classId) => classConfig
 * @returns {{ violations: Array, warnings: Array, suggestions: Array, score: number, summary: Object }}
 */
export function validate(
  assignments,
  template,
  schoolConfig,
  getTeacherConfig,
  getTeacherWellness,
  getSubjectConfig,
  getRoomConfig,
  getClassConfig
) {
  const violations = [];
  const warnings = [];
  const suggestions = [];

  // Build lookup maps for performance
  const assignmentMap = buildAssignmentMap(assignments);

  for (let i = 0; i < assignments.length; i++) {
    const a = normalizeAssignment(assignments[i]);
    const rest = assignments.filter((_, idx) => idx !== i);

    const teacherConfig = getTeacherConfig(a.teacherId) || {};
    const teacherWellness = getTeacherWellness(a.teacherId) || null;
    const subjectConfig = getSubjectConfig(a.subjectId) || {};
    const roomConfig = a.roomId ? getRoomConfig(a.roomId) : null;
    const classConfig = getClassConfig ? getClassConfig(a.classId) : null;

    const context = {
      roomConfig,
      classConfig,
      subjectConfig,
      teacherWellness,
    };

    // ─── Hard constraint checks ───
    const hardResult = hard.checkAllWithDetails(a, rest, schoolConfig, teacherConfig, context);

    for (const violation of hardResult.violations) {
      violations.push({
        severity: 'ERROR',
        constraint: violation.constraint,
        assignmentId: a.id,
        day: a.day || a.dayOfWeek,
        period: a.period || a.periodNumber,
        teacherId: a.teacherId,
        teacherName: getTeacherName(a.teacherId, template),
        classId: a.classId,
        className: getClassName(a.classId, template),
        subjectId: a.subjectId,
        roomId: a.roomId,
        reason: violation.reason,
      });
    }

    // ─── Medium constraint checks ───
    const mediumDetailed = medium.scoreAllDetailed(
      a,
      rest,
      subjectConfig,
      schoolConfig,
      roomConfig,
      classConfig,
      teacherConfig,
      teacherWellness
    );

    for (const [constraint, penalty] of Object.entries(mediumDetailed)) {
      if (constraint === 'total') continue;
      if (penalty > 0) {
        warnings.push({
          severity: 'WARNING',
          constraint,
          assignmentId: a.id,
          day: a.day || a.dayOfWeek,
          period: a.period || a.periodNumber,
          teacherId: a.teacherId,
          teacherName: getTeacherName(a.teacherId, template),
          classId: a.classId,
          subjectId: a.subjectId,
          penalty,
          hint: getMediumHint(constraint, a, subjectConfig, roomConfig),
        });
      }
    }

    // ─── Soft constraint checks ───
    const softDetailed = soft.scoreAllDetailed(
      a,
      rest,
      teacherWellness,
      teacherConfig,
      roomConfig,
      schoolConfig,
      classConfig,
      subjectConfig
    );

    for (const [constraint, penalty] of Object.entries(softDetailed)) {
      if (constraint === 'total') continue;
      if (penalty > 0) {
        suggestions.push({
          severity: 'SUGGESTION',
          constraint,
          assignmentId: a.id,
          day: a.day || a.dayOfWeek,
          period: a.period || a.periodNumber,
          teacherId: a.teacherId,
          teacherName: getTeacherName(a.teacherId, template),
          classId: a.classId,
          subjectId: a.subjectId,
          penalty,
          hint: getSoftHint(constraint, a, teacherWellness, roomConfig),
        });
      }
    }
  }

  // ─── Cross-slot checks ───
  const crossSlotIssues = checkCrossSlotIssues(assignments, template, assignmentMap);
  violations.push(...crossSlotIssues.violations);
  warnings.push(...crossSlotIssues.warnings);

  // ─── Weekly target checks ───
  const targetIssues = checkWeeklyTargets(assignments, template);
  violations.push(...targetIssues.violations);
  warnings.push(...targetIssues.warnings);

  // ─── Teacher workload summary ───
  const workloadIssues = checkTeacherWorkloads(assignments, template, getTeacherConfig);
  warnings.push(...workloadIssues);

  // ─── Room utilization checks ───
  const roomIssues = checkRoomUtilization(assignments, template, getRoomConfig);
  suggestions.push(...roomIssues);

  // ─── Wellness compliance ───
  const wellnessIssues = checkWellnessCompliance(
    assignments,
    template,
    getTeacherWellness,
    getRoomConfig
  );
  violations.push(...wellnessIssues.violations);
  suggestions.push(...wellnessIssues.suggestions);

  // ─── Calculate scores ───
  const scores = calculateScores(violations, warnings, suggestions, assignments.length);

  return {
    violations,
    warnings,
    suggestions,
    score: scores.overall,
    summary: {
      totalSlots: assignments.length,
      errorCount: violations.length,
      warningCount: warnings.length,
      suggestionCount: suggestions.length,
      scores,
      criticalIssues: violations.filter((v) => v.severity === 'CRITICAL').length,
      actionableCount: violations.length + warnings.length,
    },
  };
}

// =============================================================================
// CROSS-SLOT CHECKS
// =============================================================================

function checkCrossSlotIssues(assignments, template, assignmentMap) {
  const violations = [];
  const warnings = [];

  // Check for duplicate assignments (same class, day, period)
  const seen = new Set();
  for (const a of assignments) {
    const key = `${a.classId}:${a.day || a.dayOfWeek}:${a.period || a.periodNumber}`;
    if (seen.has(key)) {
      violations.push({
        severity: 'CRITICAL',
        constraint: 'classDoubleBook',
        reason: `Class ${getClassName(a.classId, template)} has duplicate assignment at Day ${a.day || a.dayOfWeek} Period ${a.period || a.periodNumber}`,
      });
    }
    seen.add(key);
  }

  // Check for teacher double-booking
  const teacherSeen = new Set();
  for (const a of assignments) {
    const key = `${a.teacherId}:${a.day || a.dayOfWeek}:${a.period || a.periodNumber}`;
    if (teacherSeen.has(key)) {
      violations.push({
        severity: 'CRITICAL',
        constraint: 'teacherDoubleBook',
        reason: `Teacher ${getTeacherName(a.teacherId, template)} double-booked at Day ${a.day || a.dayOfWeek} Period ${a.period || a.periodNumber}`,
      });
    }
    teacherSeen.add(key);
  }

  // Check for room double-booking
  const roomSeen = new Set();
  for (const a of assignments) {
    if (!a.roomId) continue;
    const key = `${a.roomId}:${a.day || a.dayOfWeek}:${a.period || a.periodNumber}`;
    if (roomSeen.has(key)) {
      violations.push({
        severity: 'CRITICAL',
        constraint: 'roomDoubleBook',
        reason: `Room ${a.roomId} double-booked at Day ${a.day || a.dayOfWeek} Period ${a.period || a.periodNumber}`,
      });
    }
    roomSeen.add(key);
  }

  return { violations, warnings };
}

// =============================================================================
// WEEKLY TARGET CHECKS
// =============================================================================

function checkWeeklyTargets(assignments, template) {
  const violations = [];
  const warnings = [];

  for (const cls of template.classes) {
    for (const subject of cls.subjects) {
      const actual = assignments.filter(
        (a) => a.classId === cls.id && a.subjectId === subject.id
      ).length;

      const expected = subject.weeklyPeriods || 0;

      if (expected > 0 && actual < expected) {
        violations.push({
          severity: 'ERROR',
          constraint: 'subjectWeeklyTarget',
          classId: cls.id,
          className: `${cls.grade || ''}-${cls.section || ''}`,
          subjectId: subject.id,
          subjectName: subject.name || subject.id,
          expected,
          actual,
          deficit: expected - actual,
          reason: `Class ${cls.grade}-${cls.section}: ${subject.name || subject.id} needs ${expected} periods/week but has ${actual}`,
        });
      } else if (expected > 0 && actual > expected) {
        warnings.push({
          severity: 'WARNING',
          constraint: 'subjectWeeklyExcess',
          classId: cls.id,
          subjectId: subject.id,
          expected,
          actual,
          excess: actual - expected,
          reason: `Class ${cls.grade}-${cls.section}: ${subject.name || subject.id} has ${actual} periods but only ${expected} required`,
        });
      }
    }
  }

  return { violations, warnings };
}

// =============================================================================
// TEACHER WORKLOAD
// =============================================================================

function checkTeacherWorkloads(assignments, template, getTeacherConfig) {
  const warnings = [];
  const teacherPeriods = {};

  // Count periods per teacher
  for (const a of assignments) {
    teacherPeriods[a.teacherId] = (teacherPeriods[a.teacherId] || 0) + 1;
  }

  for (const [teacherId, count] of Object.entries(teacherPeriods)) {
    const config = getTeacherConfig(teacherId) || {};
    const maxWeekly = config.maxPeriodsPerWeek || 40;
    const utilization = count / maxWeekly;

    if (utilization > 0.9) {
      warnings.push({
        severity: 'WARNING',
        constraint: 'teacherHighUtilization',
        teacherId,
        teacherName: getTeacherName(teacherId, template),
        assigned: count,
        max: maxWeekly,
        utilization: Math.round(utilization * 100) + '%',
        reason: `Teacher ${getTeacherName(teacherId, template)} at ${Math.round(utilization * 100)}% capacity (${count}/${maxWeekly})`,
      });
    }
  }

  return warnings;
}

// =============================================================================
// ROOM UTILIZATION
// =============================================================================

function checkRoomUtilization(assignments, template, getRoomConfig) {
  const suggestions = [];
  const roomUsage = {};

  for (const a of assignments) {
    if (a.roomId) {
      roomUsage[a.roomId] = (roomUsage[a.roomId] || 0) + 1;
    }
  }

  // Find underutilized rooms
  const totalSlots = (schoolConfig?.workingDays?.length || 6) * (schoolConfig?.periodsPerDay || 8);

  for (const [roomId, count] of Object.entries(roomUsage)) {
    const utilization = count / totalSlots;

    if (utilization < 0.3) {
      suggestions.push({
        severity: 'SUGGESTION',
        constraint: 'roomUnderutilized',
        roomId,
        used: count,
        totalSlots,
        utilization: Math.round(utilization * 100) + '%',
        reason: `Room ${roomId} only used ${count}/${totalSlots} slots (${Math.round(utilization * 100)}%)`,
      });
    }
  }

  // Find unassigned rooms
  if (template.rooms) {
    for (const room of template.rooms) {
      if (room.isActive && !roomUsage[room.id]) {
        suggestions.push({
          severity: 'SUGGESTION',
          constraint: 'roomUnused',
          roomId: room.id,
          roomNumber: room.roomNumber,
          reason: `Room ${room.roomNumber || room.id} is not used at all`,
        });
      }
    }
  }

  return suggestions;
}

// =============================================================================
// WELLNESS COMPLIANCE
// =============================================================================

function checkWellnessCompliance(assignments, template, getTeacherWellness, getRoomConfig) {
  const violations = [];
  const suggestions = [];

  for (const a of assignments) {
    const wellness = getTeacherWellness(a.teacherId);
    if (!wellness) continue;

    const roomConfig = a.roomId ? getRoomConfig(a.roomId) : null;

    // Critical: Pregnant teacher on upper floor
    if (wellness.isPregnant && roomConfig?.floor > 0) {
      violations.push({
        severity: 'CRITICAL',
        constraint: 'pregnancyFloorViolation',
        teacherId: a.teacherId,
        teacherName: getTeacherName(a.teacherId, template),
        roomId: a.roomId,
        floor: roomConfig.floor,
        reason: `Pregnant teacher ${getTeacherName(a.teacherId, template)} assigned to floor ${roomConfig.floor}`,
        fix: `Move to ground floor room`,
      });
    }

    // Critical: Disabled teacher in inaccessible room
    if (wellness.needsAccessibleRoom && roomConfig && !roomConfig.isAccessible) {
      violations.push({
        severity: 'CRITICAL',
        constraint: 'accessibilityViolation',
        teacherId: a.teacherId,
        teacherName: getTeacherName(a.teacherId, template),
        roomId: a.roomId,
        reason: `Teacher ${getTeacherName(a.teacherId, template)} needs accessible room`,
        fix: `Assign to accessible room`,
      });
    }

    // Suggestion: Senior teacher overload
    if (wellness.isSenior) {
      const dayCount = assignments.filter(
        (e) => e.teacherId === a.teacherId && (e.day || e.dayOfWeek) === (a.day || a.dayOfWeek)
      ).length;

      if (dayCount > (wellness.preferredMaxPerDay || 4)) {
        suggestions.push({
          severity: 'SUGGESTION',
          constraint: 'seniorLoad',
          teacherId: a.teacherId,
          teacherName: getTeacherName(a.teacherId, template),
          day: a.day || a.dayOfWeek,
          periodsAssigned: dayCount,
          reason: `Senior teacher has ${dayCount} periods on Day ${a.day || a.dayOfWeek}`,
        });
      }
    }

    // Suggestion: Mental health - early morning
    if (wellness.avoidEarlyMorning && (a.period || a.periodNumber) === 1) {
      suggestions.push({
        severity: 'SUGGESTION',
        constraint: 'mentalHealthEarlyMorning',
        teacherId: a.teacherId,
        teacherName: getTeacherName(a.teacherId, template),
        reason: `Teacher prefers to avoid Period 1`,
      });
    }

    // Suggestion: Burnout risk
    if (wellness.burnoutRisk) {
      const weekCount = assignments.filter((e) => e.teacherId === a.teacherId).length;
      const maxWeekly = getTeacherConfig?.(a.teacherId)?.maxPeriodsPerWeek || 40;

      if (weekCount > maxWeekly * 0.8) {
        suggestions.push({
          severity: 'SUGGESTION',
          constraint: 'burnoutRisk',
          teacherId: a.teacherId,
          teacherName: getTeacherName(a.teacherId, template),
          assigned: weekCount,
          max: maxWeekly,
          reason: `Teacher flagged for burnout risk at ${weekCount}/${maxWeekly} periods`,
        });
      }
    }
  }

  return { violations, suggestions };
}

// =============================================================================
// SCORING
// =============================================================================

function calculateScores(violations, warnings, suggestions, totalSlots) {
  const hardScore = Math.max(0, 100 - violations.length * 10);

  const warningPenalty = warnings.reduce((sum, w) => sum + (w.penalty || 0), 0);
  const mediumScore = Math.max(0, 100 - warningPenalty / totalSlots);

  const suggestionPenalty = suggestions.reduce((sum, s) => sum + (s.penalty || 0), 0);
  const softScore = Math.max(0, 100 - suggestionPenalty / totalSlots);

  const criticalCount = violations.filter((v) => v.severity === 'CRITICAL').length;
  const overall =
    criticalCount > 0
      ? 0 // Critical violations = zero score
      : Math.round(hardScore * 0.5 + mediumScore * 0.3 + softScore * 0.2);

  return {
    overall,
    hard: Math.round(hardScore),
    medium: Math.round(mediumScore),
    soft: Math.round(softScore),
    hasCritical: criticalCount > 0,
  };
}

// =============================================================================
// HELPERS
// =============================================================================

function normalizeAssignment(a) {
  return {
    ...a,
    day: a.day || a.dayOfWeek,
    period: a.period || a.periodNumber,
  };
}

function buildAssignmentMap(assignments) {
  const map = {};
  for (const a of assignments) {
    const day = a.day || a.dayOfWeek;
    const period = a.period || a.periodNumber;
    const key = `${day}:${period}`;
    if (!map[key]) map[key] = [];
    map[key].push(a);
  }
  return map;
}

function getTeacherName(teacherId, template) {
  const teacher = template.teachers?.find((t) => t.id === teacherId);
  return teacher?.name || teacherId;
}

function getClassName(classId, template) {
  const cls = template.classes?.find((c) => c.id === classId);
  return cls ? `${cls.grade || ''}-${cls.section || ''}` : classId;
}

function getMediumHint(constraint, a, subjectConfig, roomConfig) {
  const hints = {
    heavySubjectTiming: `Heavy subject scheduled in period ${a.period || a.periodNumber} — consider moving to morning`,
    noConsecutiveOverload: 'Teacher has too many consecutive periods — add a gap',
    balancedDailyLoad: 'Class load is unbalanced across days',
    roomTypeMatch: `Subject requires ${subjectConfig?.requiredRoomType || 'specific'} room type`,
    roomCapacityEfficiency: 'Room capacity not optimal for class size',
    subjectDailyCapOk: 'Subject appears too many times in one day',
    subjectGapNotTooLarge: 'Gap between same subject is too large',
  };
  return (
    hints[constraint] || `${constraint} penalty: ${MEDIUM_PENALTY_NAMES[constraint] || 'unknown'}`
  );
}

function getSoftHint(constraint, a, wellness, roomConfig) {
  const hints = {
    pregnancyFloorPreference: `Pregnant teacher on floor ${roomConfig?.floor} — prefer ground floor`,
    disabilityAccessibility: 'Teacher needs accessible room',
    seniorLoadPreference: 'Senior teacher may benefit from lighter load',
    preferredSlotHonoured: 'Teacher prefers different time slot',
    commuteBuffer: 'Teacher with long commute assigned to first/last period',
    mentalHealthEarlyMorning: 'Teacher prefers to avoid early morning periods',
    burnoutRiskGuard: 'Teacher flagged for burnout risk — consider reducing load',
    personalBlockRespected: 'Teacher has personal block at this time',
    juniorClassTiming: 'Junior class scheduled too late in the day',
    gradePeriodLimitOk: 'Period exceeds grade-level limit',
  };
  return hints[constraint] || `${constraint} penalty`;
}

const MEDIUM_PENALTY_NAMES = {
  heavySubjectTiming: 'Heavy Subject Afternoon',
  noConsecutiveOverload: 'Consecutive Overload',
  balancedDailyLoad: 'Unbalanced Day',
  roomTypeMatch: 'Room Type Mismatch',
  subjectDailyCapOk: 'Subject Daily Cap',
  teacherDailyBalance: 'Teacher Load Uneven',
  roomChangeFrequency: 'Frequent Room Changes',
};
