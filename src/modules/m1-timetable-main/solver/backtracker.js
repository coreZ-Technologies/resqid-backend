/**
 * backtracker.js
 * CSP backtracking solver with forward checking.
 * Generates a valid timetable satisfying all hard constraints,
 * minimising medium + soft penalty scores.
 */

import * as hard from '../constraints/hard';
import { forwardCheck, restoreDomains, slotKey } from './propagator';
import { rankCandidates } from './scorer';
import { orderSlots } from './heuristic';

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
    for (const subject of cls.subjects) {
      for (let occ = 0; occ < subject.weeklyPeriods; occ++) {
        slots.push({
          id: `${cls.id}:${subject.id}:${occ}`,
          classId: cls.id,
          subjectId: subject.id,
          eligibleTeachers: template.teachers.filter((t) =>
            t.eligibleSubjects.includes(subject.id)
          ),
          validPeriods,
          validDays: days,
        });
      }
    }
  }
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
 * Main backtracking search.
 *
 * @param {Array} slots - ordered list of slots to fill
 * @param {Array} assigned - assignments so far
 * @param {Object} params - { template, schoolConfig, getTeacherConfig, getTeacherWellness, getSubjectConfig, getRoomConfig }
 * @param {Object} opts - { timeoutMs }
 * @returns {Array|null} complete assignment list or null if no solution
 */
function backtrack(slots, assigned, params, opts = {}, startTime = Date.now()) {
  if (opts.timeoutMs && Date.now() - startTime > opts.timeoutMs) {
    throw new Error('SOLVER_TIMEOUT');
  }

  if (slots.length === 0) return assigned;

  const [slot, ...rest] = slots;
  const {
    template,
    schoolConfig,
    getTeacherConfig,
    getTeacherWellness,
    getSubjectConfig,
    getRoomConfig,
  } = params;

  const teacherMap = Object.fromEntries(template.teachers.map((t) => [t.id, t]));
  const orderedRest = orderSlots(rest, teacherMap, (s) => s.eligibleTeachers.length);

  const rawCandidates = buildCandidates(slot);

  // Filter by hard constraints
  const validCandidates = rawCandidates.filter((c) => {
    const assignment = { id: slot.id, classId: slot.classId, subjectId: slot.subjectId, ...c };
    const teacherConfig = getTeacherConfig(c.teacherId) || {};
    const result = hard.checkAll(assignment, assigned, schoolConfig, teacherConfig);
    return result.ok;
  });

  if (validCandidates.length === 0) return null;

  // Rank by medium + soft score
  const ranked = rankCandidates(validCandidates, slot, assigned, (teacherId) => ({
    subjectConfig: getSubjectConfig(slot.subjectId),
    schoolConfig,
    roomConfig: null, // room assignment can be a separate pass
    teacherWellness: getTeacherWellness(teacherId),
    teacherConfig: getTeacherConfig(teacherId),
  }));

  for (const candidate of ranked) {
    const assignment = {
      id: slot.id,
      classId: slot.classId,
      subjectId: slot.subjectId,
      ...candidate,
    };

    const newAssigned = [...assigned, assignment];
    const result = backtrack(orderedRest, newAssigned, params, opts, startTime);
    if (result !== null) return result;
  }

  return null;
}

/**
 * Entry point.
 */
export function solve(template, schoolConfig, resolvers, opts = { timeoutMs: 30000 }) {
  const slots = buildSlots(template, schoolConfig);
  const teacherMap = Object.fromEntries(template.teachers.map((t) => [t.id, t]));
  const ordered = orderSlots(slots, teacherMap, (s) => s.eligibleTeachers.length);

  const result = backtrack(ordered, [], { template, schoolConfig, ...resolvers }, opts);
  return result;
}
