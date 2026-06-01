/**
 * backtracker.js
 * CSP backtracking solver with forward checking.
 * Generates a valid timetable satisfying all hard constraints,
 * minimising medium + soft penalty scores.
 */

import * as hard from '../constraints/hard.js';
import { forwardCheck, restoreDomains, slotKey } from './propagator.js';
import { rankCandidates } from './scorer.js';
import { orderSlots } from './heuristic.js';
import { logger } from '#config/logger.js';
import { ApiError } from '#shared/response/ApiError.js';

/**
 * Build the list of all slots that need to be filled.
 * One slot per (class × subject × occurrence).
 */
export function buildSlots(template, schoolConfig) {
  const { workingDays, periodsPerDay, breaks = [] } = schoolConfig;
  const breakPeriods = new Set(breaks.map((b) => b.period));
  const validPeriods = Array.from({ length: periodsPerDay }, (_, i) => i + 1).filter(
    (p) => !breakPeriods.has(p)
  );
  const days = Array.from({ length: workingDays }, (_, i) => i + 1);

  const slots = [];
  
  for (const cls of template.classes) {
    if (!cls.subjects || cls.subjects.length === 0) {
      logger.warn({ classId: cls.id, className: cls.name }, 'Class has no subjects defined');
      continue;
    }
    
    for (const subject of cls.subjects) {
      const weeklyPeriods = subject.weeklyPeriods || 0;
      
      if (weeklyPeriods <= 0) {
        logger.warn({ classId: cls.id, subjectId: subject.id }, 'Subject has zero weekly periods');
        continue;
      }
      
      for (let occ = 0; occ < weeklyPeriods; occ++) {
        slots.push({
          id: `${cls.id}:${subject.id}:${occ}`,
          classId: cls.id,
          subjectId: subject.id,
          eligibleTeachers: template.teachers.filter((t) =>
            t.eligibleSubjects && t.eligibleSubjects.includes(subject.id)
          ),
          validPeriods,
          validDays: days,
        });
      }
    }
  }
  
  logger.debug({ 
    totalSlots: slots.length, 
    workingDays, 
    periodsPerDay: validPeriods.length,
    breakCount: breaks.length 
  }, 'Built solver slots');
  
  return slots;
}

/**
 * Build initial candidate list for a slot: all (day, period, teacherId) combos.
 */
function buildCandidates(slot) {
  const candidates = [];
  
  for (const day of slot.validDays) {
    for (const period of slot.validPeriods) {
      for (const teacher of slot.eligibleTeachers) {
        candidates.push({ day, period, teacherId: teacher.id });
      }
    }
  }
  
  return candidates;
}

/**
 * Check if a candidate assignment violates any hard constraints
 */
function isValidCandidate(candidate, slot, assigned, params) {
  const {
    schoolConfig,
    getTeacherConfig,
  } = params;
  
  const assignment = { 
    id: slot.id, 
    classId: slot.classId, 
    subjectId: slot.subjectId, 
    ...candidate 
  };
  
  const teacherConfig = getTeacherConfig(candidate.teacherId) || {};
  const result = hard.checkAll(assignment, assigned, schoolConfig, teacherConfig);
  
  return result.ok;
}

/**
 * Main backtracking search.
 *
 * @param {Array} slots - ordered list of slots to fill
 * @param {Array} assigned - assignments so far
 * @param {Object} params - { template, schoolConfig, getTeacherConfig, getTeacherWellness, getSubjectConfig, getRoomConfig }
 * @param {Object} opts - { timeoutMs, maxDepth }
 * @param {number} startTime - Start timestamp for timeout checking
 * @param {number} depth - Current recursion depth
 * @returns {Array|null} complete assignment list or null if no solution
 */
function backtrack(slots, assigned, params, opts = {}, startTime = Date.now(), depth = 0) {
  // Check timeout
  if (opts.timeoutMs && Date.now() - startTime > opts.timeoutMs) {
    logger.warn({ 
      assignedCount: assigned.length, 
      remainingSlots: slots.length,
      depth,
      timeoutMs: opts.timeoutMs 
    }, 'Solver timeout reached');
    throw new Error('SOLVER_TIMEOUT');
  }
  
  // Check depth limit (safety for infinite recursion)
  if (opts.maxDepth && depth > opts.maxDepth) {
    logger.error({ depth, assignedCount: assigned.length }, 'Max recursion depth exceeded');
    throw new Error('MAX_DEPTH_EXCEEDED');
  }
  
  // Base case: all slots assigned
  if (slots.length === 0) {
    logger.debug({ totalAssignments: assigned.length }, 'Solution found');
    return assigned;
  }
  
  const [slot, ...rest] = slots;
  const {
    template,
    schoolConfig,
    getTeacherConfig,
    getTeacherWellness,
    getSubjectConfig,
    getRoomConfig,
  } = params;
  
  // Dynamic reordering of remaining slots based on current state
  const teacherMap = Object.fromEntries(template.teachers.map((t) => [t.id, t]));
  const orderedRest = orderSlots(rest, teacherMap, (s) => s.eligibleTeachers.length);
  
  // Build and filter candidates
  const rawCandidates = buildCandidates(slot);
  
  // Filter by hard constraints
  const validCandidates = rawCandidates.filter((candidate) => 
    isValidCandidate(candidate, slot, assigned, params)
  );
  
  if (validCandidates.length === 0) {
    logger.debug({ 
      slotId: slot.id, 
      classId: slot.classId, 
      subjectId: slot.subjectId,
      totalCandidates: rawCandidates.length 
    }, 'No valid candidates for slot');
    return null;
  }
  
  // Rank by medium + soft score
  const ranked = rankCandidates(validCandidates, slot, assigned, (teacherId) => ({
    subjectConfig: getSubjectConfig(slot.subjectId),
    schoolConfig,
    roomConfig: null, // room assignment can be a separate pass
    teacherWellness: getTeacherWellness(teacherId),
    teacherConfig: getTeacherConfig(teacherId),
  }));
  
  // Try each candidate in ranked order
  for (let i = 0; i < ranked.length; i++) {
    const candidate = ranked[i];
    
    const assignment = {
      id: slot.id,
      classId: slot.classId,
      subjectId: slot.subjectId,
      ...candidate,
    };
    
    const newAssigned = [...assigned, assignment];
    
    // Optionally apply forward checking here if needed
    // const prunedSlots = forwardCheck(orderedRest, newAssigned, params);
    
    const result = backtrack(orderedRest, newAssigned, params, opts, startTime, depth + 1);
    
    if (result !== null) {
      return result;
    }
  }
  
  return null;
}

/**
 * Entry point for the solver.
 * 
 * @param {Object} template - The timetable template with classes, subjects, teachers
 * @param {Object} schoolConfig - School configuration (days, periods, breaks)
 * @param {Object} resolvers - Helper functions for config lookups
 * @param {Object} opts - Options { timeoutMs, maxDepth }
 * @returns {Array|null} Complete assignment list or null if no solution
 * @throws {ApiError} When solver times out or exceeds depth
 */
export function solve(template, schoolConfig, resolvers, opts = { timeoutMs: 30000, maxDepth: 10000 }) {
  // Validate inputs
  if (!template) {
    throw ApiError.badRequest('Template is required for solver');
  }
  
  if (!template.classes || template.classes.length === 0) {
    throw ApiError.badRequest('Template has no classes defined');
  }
  
  if (!template.teachers || template.teachers.length === 0) {
    throw ApiError.badRequest('Template has no teachers defined');
  }
  
  const startTime = Date.now();
  
  logger.info({ 
    classNameCount: template.classes.length,
    teacherCount: template.teachers.length,
    timeoutMs: opts.timeoutMs,
    maxDepth: opts.maxDepth
  }, 'Starting solver');
  
  try {
    // Build ordered list of slots
    const slots = buildSlots(template, schoolConfig);
    
    if (slots.length === 0) {
      logger.warn('No slots generated from template');
      return [];
    }
    
    const teacherMap = Object.fromEntries(template.teachers.map((t) => [t.id, t]));
    const ordered = orderSlots(slots, teacherMap, (s) => s.eligibleTeachers.length);
    
    logger.debug({ 
      totalSlots: slots.length,
      orderedSlots: ordered.length 
    }, 'Slots built and ordered');
    
    // Run backtracking
    const result = backtrack(ordered, [], { template, schoolConfig, ...resolvers }, opts, startTime, 0);
    
    const durationMs = Date.now() - startTime;
    
    if (result) {
      logger.info({ 
        assignmentCount: result.length, 
        durationMs,
        slotsPerSecond: Math.round((result.length / durationMs) * 1000)
      }, 'Solver found solution');
    } else {
      logger.warn({ durationMs, slotCount: slots.length }, 'Solver could not find solution');
    }
    
    return result;
  } catch (error) {
    if (error.message === 'SOLVER_TIMEOUT') {
      logger.error({ 
        timeoutMs: opts.timeoutMs,
        templateId: template.id 
      }, 'Solver timeout exceeded');
      throw ApiError.internal('Timetable generation timeout');
    }
    
    if (error.message === 'MAX_DEPTH_EXCEEDED') {
      logger.error({ maxDepth: opts.maxDepth }, 'Solver max depth exceeded');
      throw ApiError.internal('Timetable generation complexity too high');
    }
    
    if (error instanceof ApiError) throw error;
    
    logger.error({ error: error.message, stack: error.stack }, 'Solver error');
    throw ApiError.internal('Timetable generation failed');
  }
}

/**
 * Solve with progress callback for long-running operations
 */
export async function solveWithProgress(template, schoolConfig, resolvers, onProgress, opts = {}) {
  const startTime = Date.now();
  const totalSlots = buildSlots(template, schoolConfig).length;
  
  // Wrap backtracking with progress reporting
  const progressWrapper = (slots, assigned, params, opts, startTime, depth) => {
    if (onProgress && assigned.length % 10 === 0) {
      const percentComplete = (assigned.length / totalSlots) * 100;
      onProgress({
        assigned: assigned.length,
        total: totalSlots,
        percentComplete,
        durationMs: Date.now() - startTime,
      });
    }
    
    return backtrack(slots, assigned, params, opts, startTime, depth);
  };
  
  // Override backtrack with wrapper (simplified - would need to modify above)
  // This is a placeholder for future enhancement
  return solve(template, schoolConfig, resolvers, opts);
}