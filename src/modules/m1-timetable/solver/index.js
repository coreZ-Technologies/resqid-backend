// =============================================================================
// modules/m1-timetable/solver/index.js — RESQID
// 🐉 THE DRAGON BRAIN — Entry point for timetable generation
//
// Flow: feasibility → heuristic → propagate → backtrack → score
// =============================================================================

import { logger } from '#config/logger.js';
import { runFeasibilityCheck } from './feasibility.js';
import { orderSlotsByHeuristic } from './heuristic.js';
import { propagateConstraints } from './propagator.js';
import { backtrackSearch } from './backtracker.js';
import { scoreSolution } from './scorer.js';
import * as repo from '../timetable.repository.js';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

const SOLVER_CONFIG = {
  TIMEOUT_MS: 60_000, // 60 seconds max
  MAX_RETRIES: 3, // Retry with different seeds if score < threshold
  MIN_SCORE: 70, // Minimum acceptable quality score
  BATCH_SIZE: 20, // Slots per batch for progress reporting
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN — Generate Timetable
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate a complete timetable for specified classes.
 *
 * @param {Object} params
 * @param {string} params.schoolId
 * @param {string[]} params.classIds - Classes to generate for
 * @param {boolean} params.strictMode - Stop on first hard violation
 * @param {boolean} params.preferMorningCore - Core subjects in morning
 * @param {boolean} params.balanceTeacherLoad - Even workload distribution
 * @param {Function} params.onProgress - Progress callback (percent, message)
 * @returns {Object} { success, timetable, score, violations, stats }
 */
export const generateTimetable = async ({
  schoolId,
  classIds,
  strictMode = true,
  preferMorningCore = true,
  balanceTeacherLoad = true,
  onProgress = null,
}) => {
  const startTime = Date.now();

  // ── Phase 0: Load all data ──────────────────────────────────────────────
  reportProgress(onProgress, 0, 'Loading school configuration...');

  const [config, teachers, subjects, classes, existingPeriods] = await Promise.all([
    repo.getTimetableConfig(schoolId),
    repo.getTeachersWithConstraints(schoolId),
    repo.getSubjectsForClasses(schoolId, classIds),
    repo.getClassesWithDetails(classIds),
    repo.getExistingPeriods(classIds),
  ]);

  if (!config) {
    return { success: false, error: 'Timetable config not found. Please set up first.' };
  }

  if (!teachers.length) {
    return { success: false, error: 'No teachers found. Please add teachers first.' };
  }

  if (!subjects.length) {
    return { success: false, error: 'No subjects found. Please add subjects first.' };
  }

  reportProgress(
    onProgress,
    5,
    `Loaded ${teachers.length} teachers, ${subjects.length} subjects, ${classes.length} classes`
  );

  // ── Phase 1: Feasibility Check ──────────────────────────────────────────
  reportProgress(onProgress, 10, 'Running feasibility check...');

  const feasibility = runFeasibilityCheck({
    config,
    teachers,
    subjects,
    classes,
    existingPeriods,
  });

  if (!feasibility.feasible) {
    return {
      success: false,
      error: 'Cannot generate timetable with current configuration.',
      reasons: feasibility.reasons,
      suggestions: feasibility.suggestions,
    };
  }

  reportProgress(onProgress, 15, 'Feasibility check passed ✓');

  // ── Phase 2: Build Slots ────────────────────────────────────────────────
  reportProgress(onProgress, 20, 'Building slot grid...');

  const slots = buildSlotGrid(config, classes, subjects);

  reportProgress(onProgress, 25, `Created ${slots.length} slots across ${classes.length} classes`);

  // ── Phase 3: Heuristic Ordering ─────────────────────────────────────────
  reportProgress(onProgress, 30, 'Ordering slots by difficulty...');

  const orderedSlots = orderSlotsByHeuristic(slots, teachers, config);

  reportProgress(onProgress, 35, 'Slots ordered ✓');

  // ── Phase 4: Build Initial Domains ──────────────────────────────────────
  const domains = buildInitialDomains(orderedSlots, teachers, subjects, config);

  // ── Phase 5: Constraint Propagation ─────────────────────────────────────
  reportProgress(onProgress, 40, 'Propagating constraints...');

  const propagatedDomains = propagateConstraints(orderedSlots, domains, teachers, config);

  // Check for empty domains (unsolvable)
  const emptyDomains = propagatedDomains.filter((d) => d.teachers.length === 0);
  if (emptyDomains.length > 0) {
    return {
      success: false,
      error: `${emptyDomains.length} slots have no qualified teachers available.`,
      stuckSlots: emptyDomains.map((d) => ({
        class: d.className,
        day: d.dayOfWeek,
        period: d.periodNumber,
        subject: d.subjectName,
        required: d.requiredQualifications,
        available: 'None',
      })),
    };
  }

  reportProgress(onProgress, 50, 'Domains ready ✓');

  // ── Phase 6: Backtracking Search ────────────────────────────────────────
  reportProgress(onProgress, 55, 'Searching for valid timetable...');

  let bestSolution = null;
  let bestScore = 0;

  for (let attempt = 0; attempt < SOLVER_CONFIG.MAX_RETRIES; attempt++) {
    const attemptStart = Date.now();

    if (attempt > 0) {
      // Shuffle domains slightly for different solution
      shuffleDomains(propagatedDomains);
      reportProgress(onProgress, 55 + attempt * 10, `Retry attempt ${attempt + 1}...`);
    }

    const result = backtrackSearch({
      slots: orderedSlots,
      domains: propagatedDomains,
      teachers,
      config,
      strictMode,
      preferMorningCore,
      balanceTeacherLoad,
      timeoutMs: SOLVER_CONFIG.TIMEOUT_MS - (Date.now() - startTime),
      onProgress: (pct) => {
        const overall = 55 + Math.floor(pct * 0.35); // 55-90% range
        reportProgress(onProgress, overall, `Solving... ${pct}%`);
      },
    });

    if (result.solution) {
      const score = scoreSolution(result.solution, teachers, config, {
        preferMorningCore,
        balanceTeacherLoad,
      });

      if (score.total > bestScore) {
        bestSolution = result.solution;
        bestScore = score.total;
      }

      if (bestScore >= SOLVER_CONFIG.MIN_SCORE) {
        break; // Good enough
      }
    }

    if (Date.now() - startTime > SOLVER_CONFIG.TIMEOUT_MS) {
      break; // Time's up
    }
  }

  // ── Phase 7: Result ─────────────────────────────────────────────────────
  reportProgress(onProgress, 95, 'Finalizing...');

  if (!bestSolution) {
    return {
      success: false,
      error: 'Could not find a valid timetable within time limit.',
      suggestion: 'Try relaxing some constraints or reducing the number of classes.',
    };
  }

  const finalScore = scoreSolution(bestSolution, teachers, config, {
    preferMorningCore,
    balanceTeacherLoad,
  });

  const stats = computeStats(bestSolution, teachers, classes);

  reportProgress(onProgress, 100, 'Complete!');

  return {
    success: true,
    timetable: bestSolution,
    score: finalScore,
    stats,
    generationTimeMs: Date.now() - startTime,
    attempts: bestScore >= SOLVER_CONFIG.MIN_SCORE ? 1 : SOLVER_CONFIG.MAX_RETRIES,
  };
};

// ═══════════════════════════════════════════════════════════════════════════════
// SLOT GRID BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

function buildSlotGrid(config, classes, subjects) {
  const slots = [];
  const workingDays = getWorkingDays(config.workingDays || 31); // Default Mon-Fri

  for (const cls of classes) {
    const classSubjects = subjects.filter((s) =>
      s.classSubjects?.some((cs) => cs.classId === cls.id)
    );

    for (const subject of classSubjects) {
      const periodsNeeded = subject.periodsPerWeek || 5;
      const labPeriods = subject.requiresLab ? subject.labPeriodsPerWeek || 0 : 0;

      // Regular periods
      for (let i = 0; i < periodsNeeded; i++) {
        slots.push({
          classId: cls.id,
          className: `${cls.grade}-${cls.section}`,
          subjectId: subject.id,
          subjectName: subject.name,
          subjectCategory: subject.category,
          type: 'REGULAR',
          requiredQualifications: subject.requiredQualifications || [subject.id],
        });
      }

      // Lab periods (must be consecutive)
      if (labPeriods > 0) {
        for (let i = 0; i < labPeriods; i++) {
          slots.push({
            classId: cls.id,
            className: `${cls.grade}-${cls.section}`,
            subjectId: subject.id,
            subjectName: `${subject.name} Lab`,
            subjectCategory: 'LAB',
            type: 'LAB',
            requiresConsecutive: true,
            consecutiveGroup: `lab_${cls.id}_${subject.id}`,
            requiredQualifications: [subject.id, 'LAB'],
          });
        }
      }
    }
  }

  return slots;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DOMAIN BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

function buildInitialDomains(slots, teachers, subjects, config) {
  return slots.map((slot) => {
    const qualified = teachers.filter((teacher) => {
      // Must teach this subject
      if (!teacher.subjects.includes(slot.subjectId)) return false;

      // Must cover this grade range
      const grade = parseInt(slot.className.split('-')[0]);
      if (teacher.gradeMin && grade < teacher.gradeMin) return false;
      if (teacher.gradeMax && grade > teacher.gradeMax) return false;

      // Lab requires special qualification
      if (slot.type === 'LAB' && teacher.noLabDuty) return false;

      return true;
    });

    return {
      ...slot,
      teachers: qualified.map((t) => t.id),
      teacherObjects: qualified,
    };
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function getWorkingDays(bitmask) {
  const days = [];
  for (let i = 0; i < 6; i++) {
    if (bitmask & (1 << i)) days.push(i + 1); // 1=Mon, 2=Tue, ..., 6=Sat
  }
  return days;
}

function shuffleDomains(domains) {
  for (const domain of domains) {
    // Fisher-Yates shuffle on teachers array
    for (let i = domain.teachers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [domain.teachers[i], domain.teachers[j]] = [domain.teachers[j], domain.teachers[i]];
    }
  }
}

function reportProgress(callback, percent, message) {
  if (callback) {
    callback({ percent: Math.min(100, Math.round(percent)), message });
  }
  logger.debug({ percent, message }, '[solver] Progress');
}

function computeStats(solution, teachers, classes) {
  const teacherLoad = {};
  for (const slot of solution) {
    if (!teacherLoad[slot.teacherId]) {
      teacherLoad[slot.teacherId] = { periods: 0, subjects: new Set() };
    }
    teacherLoad[slot.teacherId].periods++;
    teacherLoad[slot.teacherId].subjects.add(slot.subjectId);
  }

  return {
    totalSlots: solution.length,
    classesCovered: classes.length,
    teachersUsed: Object.keys(teacherLoad).length,
    avgPeriodsPerTeacher: Math.round(
      solution.length / Math.max(1, Object.keys(teacherLoad).length)
    ),
    maxPeriods: Math.max(...Object.values(teacherLoad).map((t) => t.periods)),
    minPeriods: Math.min(...Object.values(teacherLoad).map((t) => t.periods)),
  };
}
