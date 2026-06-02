/**
 * backtracker.js
 * CSP backtracking solver with forward checking.
 * Generates a valid timetable satisfying all hard constraints,
 * minimising medium + soft penalty scores.
 *
 * Supports grade-level flexibility, room assignment, and wellness awareness.
 */

import * as hard from '../constraints/hard.js';
import { forwardCheck, restoreDomains, initialArcConsistency, slotKey } from './propagator.js';
import { rankCandidates } from './scorer.js';
import { orderSlots, mrvOrder } from './heuristic.js';

// =============================================================================
// SLOT BUILDING
// =============================================================================

/**
 * Build the list of all slots that need to be filled.
 * One slot per (class × subject × occurrence).
 * Now respects grade-level period limits.
 */
export function buildSlots(template, schoolConfig, gradeConfigs = []) {
  const workingDays = schoolConfig.workingDays || [1, 2, 3, 4, 5, 6];
  const days = workingDays; // Already 1-6 format

  const slots = [];

  for (const cls of template.classes) {
    // 🔧 Get grade-specific config
    const gradeLevel = getGradeConfig(cls.grade, gradeConfigs);
    const periodsPerDay =
      cls.periodsPerDay || gradeLevel?.periodsPerDay || schoolConfig.periodsPerDay || 8;
    const breakPeriods = new Set(
      cls.breakSchedule?.breakAfterPeriods ||
        gradeLevel?.breakAfterPeriods ||
        schoolConfig.breakAfterPeriods ||
        []
    );

    // Only generate valid periods for this class
    const validPeriods = Array.from({ length: periodsPerDay }, (_, i) => i + 1).filter(
      (p) => !breakPeriods.has(p)
    );

    for (const subject of cls.subjects) {
      for (let occ = 0; occ < subject.weeklyPeriods; occ++) {
        slots.push({
          id: `${cls.id}:${subject.id}:${occ}`,
          classId: cls.id,
          subjectId: subject.id,
          grade: cls.grade,
          section: cls.section,
          eligibleTeachers: template.teachers.filter(
            (t) => t.eligibleSubjects?.includes(subject.id) || t.subjects?.includes(subject.id)
          ),
          validPeriods,
          validDays: days,
          periodsPerDay,
          classConfig: cls, // Store full class config for constraint checking
        });
      }
    }
  }

  return slots;
}

/**
 * Build slots for a single class (class-by-class generation).
 */
export function buildSlotsForClass(cls, template, schoolConfig, gradeConfigs = []) {
  const workingDays = schoolConfig.workingDays || [1, 2, 3, 4, 5, 6];
  const days = workingDays;

  const gradeLevel = getGradeConfig(cls.grade, gradeConfigs);
  const periodsPerDay =
    cls.periodsPerDay || gradeLevel?.periodsPerDay || schoolConfig.periodsPerDay || 8;
  const breakPeriods = new Set(
    cls.breakSchedule?.breakAfterPeriods ||
      gradeLevel?.breakAfterPeriods ||
      schoolConfig.breakAfterPeriods ||
      []
  );

  const validPeriods = Array.from({ length: periodsPerDay }, (_, i) => i + 1).filter(
    (p) => !breakPeriods.has(p)
  );

  const slots = [];
  for (const subject of cls.subjects) {
    for (let occ = 0; occ < subject.weeklyPeriods; occ++) {
      slots.push({
        id: `${cls.id}:${subject.id}:${occ}`,
        classId: cls.id,
        subjectId: subject.id,
        grade: cls.grade,
        section: cls.section,
        eligibleTeachers: template.teachers.filter(
          (t) => t.eligibleSubjects?.includes(subject.id) || t.subjects?.includes(subject.id)
        ),
        validPeriods,
        validDays: days,
        periodsPerDay,
        classConfig: cls,
      });
    }
  }
  return slots;
}

// =============================================================================
// CANDIDATE GENERATION
// =============================================================================

/**
 * Build initial candidate list for a slot: all (day, period, teacherId, roomId) combos.
 * Now includes room assignment.
 */
function buildCandidates(slot, rooms = []) {
  const candidates = [];

  for (const day of slot.validDays) {
    for (const period of slot.validPeriods) {
      for (const teacher of slot.eligibleTeachers) {
        // If rooms available, generate room combos too
        if (rooms.length > 0) {
          const suitableRooms = getSuitableRooms(slot, rooms);
          for (const room of suitableRooms) {
            candidates.push({
              day,
              period,
              teacherId: teacher.id,
              roomId: room.id,
            });
          }
        } else {
          candidates.push({
            day,
            period,
            teacherId: teacher.id,
            roomId: null,
          });
        }
      }
    }
  }

  return candidates;
}

/**
 * Filter rooms suitable for a slot.
 */
function getSuitableRooms(slot, rooms) {
  return rooms.filter((room) => {
    // Check floor accessibility for known wellness needs
    // (Detailed check happens in constraints)
    if (!room.isActive || room.status !== 'AVAILABLE') return false;
    return true;
  });
}

// =============================================================================
// BACKTRACKING SOLVER
// =============================================================================

/**
 * Main backtracking search with forward checking.
 *
 * @param {Array} slots - ordered list of slots to fill
 * @param {Array} assigned - assignments so far
 * @param {Object} params - { template, schoolConfig, getTeacherConfig, getTeacherWellness, getSubjectConfig, getRoomConfig, getClassConfig }
 * @param {Object} opts - { timeoutMs, maxBacktracks, onProgress }
 * @param {Object} state - { startTime, backtracks, domains }
 * @returns {Array|null} complete assignment list or null if no solution
 */
function backtrack(slots, assigned, params, opts = {}, state = {}) {
  // Initialize state
  if (!state.startTime) state.startTime = Date.now();
  if (!state.backtracks) state.backtracks = 0;
  if (!state.domains) state.domains = new Map();

  // ─── Timeout check ───
  if (opts.timeoutMs && Date.now() - state.startTime > opts.timeoutMs) {
    const error = new Error('SOLVER_TIMEOUT');
    error.code = 'SOLVER_TIMEOUT';
    error.partial = assigned;
    error.progress = assigned.length / (assigned.length + slots.length);
    throw error;
  }

  // ─── Max backtrack limit ───
  if (opts.maxBacktracks && state.backtracks > opts.maxBacktracks) {
    const error = new Error('MAX_BACKTRACKS_EXCEEDED');
    error.code = 'MAX_BACKTRACKS';
    error.backtracks = state.backtracks;
    error.partial = assigned;
    throw error;
  }

  // ─── Base case: all slots assigned ───
  if (slots.length === 0) return assigned;

  // ─── Progress callback ───
  if (opts.onProgress) {
    const progress = assigned.length / (assigned.length + slots.length);
    opts.onProgress({
      progress,
      assigned: assigned.length,
      remaining: slots.length,
      backtracks: state.backtracks,
    });
  }

  const [slot, ...rest] = slots;
  const {
    template,
    schoolConfig,
    getTeacherConfig,
    getTeacherWellness,
    getSubjectConfig,
    getRoomConfig,
    getClassConfig,
  } = params;

  // ─── Domain management ───
  let domain = state.domains.get(slot.id);
  if (!domain) {
    // Build domain for this slot
    const rawCandidates = buildCandidates(slot, template.rooms || []);

    // Filter by hard constraints
    const validCandidates = rawCandidates.filter((c) => {
      const assignment = {
        id: slot.id,
        classId: slot.classId,
        subjectId: slot.subjectId,
        grade: slot.grade,
        ...c,
      };

      const teacherConfig = getTeacherConfig(c.teacherId) || {};
      const roomConfig = c.roomId ? getRoomConfig(c.roomId) : null;
      const classConfig = getClassConfig(slot.classId) || slot.classConfig || {};
      const subjectConfig = getSubjectConfig(slot.subjectId) || {};
      const teacherWellness = getTeacherWellness(c.teacherId) || null;

      const result = hard.checkAll(assignment, assigned, schoolConfig, teacherConfig, {
        roomConfig,
        classConfig,
        subjectConfig,
        teacherWellness,
      });

      return result.ok;
    });

    if (validCandidates.length === 0) {
      state.backtracks++;
      return null; // Dead end
    }

    domain = validCandidates;
    state.domains.set(slot.id, domain);
  }

  if (domain.length === 0) {
    state.backtracks++;
    return null;
  }

  // ─── Rank candidates by score ───
  const ranked = rankCandidates(domain, slot, assigned, (teacherId) => ({
    subjectConfig: getSubjectConfig(slot.subjectId) || {},
    schoolConfig,
    roomConfig: null, // Will be scored per candidate
    teacherWellness: getTeacherWellness(teacherId) || null,
    teacherConfig: getTeacherConfig(teacherId) || {},
    classConfig: getClassConfig(slot.classId) || slot.classConfig || {},
  }));

  // ─── Order remaining slots ───
  const teacherMap = Object.fromEntries(template.teachers.map((t) => [t.id, t]));
  const orderedRest = orderSlots(rest, teacherMap, (s) => s.eligibleTeachers?.length || 1);

  // ─── Try each candidate ───
  for (const candidate of ranked) {
    const assignment = {
      id: slot.id,
      classId: slot.classId,
      subjectId: slot.subjectId,
      grade: slot.grade,
      section: slot.section,
      ...candidate,
    };

    // Forward checking
    const fcResult = forwardCheck(assignment, state.domains, orderedRest);

    if (!fcResult.ok) {
      restoreDomains(state.domains, fcResult.pruned);
      state.backtracks++;
      continue;
    }

    const newAssigned = [...assigned, assignment];
    const result = backtrack(orderedRest, newAssigned, params, opts, state);

    if (result !== null) return result;

    // Restore domains on backtrack
    restoreDomains(state.domains, fcResult.pruned);
    state.backtracks++;
  }

  return null;
}

// =============================================================================
// CLASS-BY-CLASS GENERATION
// =============================================================================

/**
 * Generate timetable class by class (recommended approach).
 * Each class is solved independently with existing assignments as constraints.
 */
export function solveByClass(template, schoolConfig, resolvers, opts = {}) {
  const { timeoutMs = 30000, onProgress } = opts;
  const startTime = Date.now();

  // Sort classes by "hardness" (most constrained first)
  const orderedClasses = prioritizeClasses(template.classes, template);

  const allAssignments = [];
  const results = [];
  const gradeConfigs = schoolConfig.gradeLevels || [];

  for (let i = 0; i < orderedClasses.length; i++) {
    const cls = orderedClasses[i];

    // Check timeout
    if (timeoutMs && Date.now() - startTime > timeoutMs) {
      return {
        success: false,
        error: 'PARTIAL_TIMEOUT',
        completedClasses: results.length,
        totalClasses: orderedClasses.length,
        partialTimetable: allAssignments,
        message: `Timed out after completing ${results.length}/${orderedClasses.length} classes`,
      };
    }

    if (onProgress) {
      onProgress({
        phase: 'class',
        current: i + 1,
        total: orderedClasses.length,
        className: `${cls.grade}-${cls.section}`,
        progress: i / orderedClasses.length,
      });
    }

    // Build slots for this class only
    const classSlots = buildSlotsForClass(cls, template, schoolConfig, gradeConfigs);

    // Solve with existing assignments as blockers
    try {
      const classAssignments = solve(
        { ...template, classes: [cls] },
        schoolConfig,
        {
          ...resolvers,
          existingAssignments: allAssignments, // Block already scheduled slots
        },
        {
          timeoutMs: (timeoutMs - (Date.now() - startTime)) / (orderedClasses.length - i),
          maxBacktracks: 10000,
        }
      );

      if (!classAssignments) {
        return {
          success: false,
          error: 'CLASS_UNSOLVABLE',
          failedClass: { grade: cls.grade, section: cls.section, id: cls.id },
          completedClasses: results,
          partialTimetable: allAssignments,
          message: `Cannot schedule ${cls.grade}-${cls.section}. Try relaxing constraints.`,
        };
      }

      allAssignments.push(...classAssignments);
      results.push({
        classId: cls.id,
        grade: cls.grade,
        section: cls.section,
        assignments: classAssignments,
      });
    } catch (err) {
      if (err.code === 'SOLVER_TIMEOUT') {
        return {
          success: false,
          error: 'CLASS_TIMEOUT',
          failedClass: { grade: cls.grade, section: cls.section, id: cls.id },
          completedClasses: results,
          partialTimetable: allAssignments,
          message: `Timed out while scheduling ${cls.grade}-${cls.section}`,
        };
      }
      throw err;
    }
  }

  return {
    success: true,
    timetable: allAssignments,
    classBreakdown: results,
    totalSlots: allAssignments.length,
    totalClasses: orderedClasses.length,
    processingTimeMs: Date.now() - startTime,
  };
}

// =============================================================================
// ENTRY POINTS
// =============================================================================

/**
 * Solve entire timetable at once (all classes together).
 */
export function solve(template, schoolConfig, resolvers, opts = {}) {
  const { timeoutMs = 30000, existingAssignments = [] } = opts;

  const gradeConfigs = schoolConfig.gradeLevels || [];
  const slots = buildSlots(template, schoolConfig, gradeConfigs);
  const teacherMap = Object.fromEntries(template.teachers.map((t) => [t.id, t]));

  // Order slots: part-time first, then by MRV
  const ordered = orderSlots(slots, teacherMap, (s) => s.eligibleTeachers?.length || 1);

  try {
    const result = backtrack(
      ordered,
      existingAssignments,
      { template, schoolConfig, ...resolvers },
      { timeoutMs, maxBacktracks: 50000 },
      { domains: new Map() }
    );
    return result;
  } catch (err) {
    if (err.code === 'SOLVER_TIMEOUT' || err.code === 'MAX_BACKTRACKS') {
      return null; // Return null instead of throwing
    }
    throw err;
  }
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Prioritize classes for ordering (most constrained first).
 */
function prioritizeClasses(classes, template) {
  return [...classes].sort((a, b) => {
    // 1. Classes with fewer eligible teachers first
    const aMinTeachers = Math.min(
      ...a.subjects.map((s) => getEligibleTeacherCount(s.id, template))
    );
    const bMinTeachers = Math.min(
      ...b.subjects.map((s) => getEligibleTeacherCount(s.id, template))
    );
    if (aMinTeachers !== bMinTeachers) return aMinTeachers - bMinTeachers;

    // 2. Classes with more subjects first
    if (a.subjects.length !== b.subjects.length) return b.subjects.length - a.subjects.length;

    // 3. Higher grades first
    const aGrade = parseInt(a.grade) || 0;
    const bGrade = parseInt(b.grade) || 0;
    return bGrade - aGrade;
  });
}

/**
 * Get count of eligible teachers for a subject.
 */
function getEligibleTeacherCount(subjectId, template) {
  return template.teachers.filter(
    (t) => t.eligibleSubjects?.includes(subjectId) || t.subjects?.includes(subjectId)
  ).length;
}

/**
 * Get grade-level configuration for a specific grade.
 */
function getGradeConfig(grade, gradeConfigs) {
  if (!gradeConfigs || gradeConfigs.length === 0) return null;
  const gradeNum = parseInt(grade) || 0;
  return gradeConfigs.find((gc) => gradeNum >= gc.gradeFrom && gradeNum <= gc.gradeTo);
}
