// =============================================================================
// solver/index.js — RESQID
// Central export for all solver modules
// =============================================================================

// ─── Scheduler (orchestrator) ─────────────────────────────────────────────────
export { generate, validateAndSuggest } from './scheduler.js';

// ─── Feasibility (pre-checks) ─────────────────────────────────────────────────
export {
  checkAll as feasibilityCheck,
  isFeasible,
  periodsVsSlots,
  subjectTeacherCoverage,
  teacherLoadFeasibility,
  teacherConflictFeasibility,
  roomAvailabilityFeasibility,
  partTimeCapacity,
  teacherLeaveFeasibility,
  accessibilityFeasibility,
  gradeLevelFeasibility,
} from './feasibility.js';

// ─── Backtracker (CSP solver) ─────────────────────────────────────────────────
export { solve, solveByClass, buildSlots, buildSlotsForClass } from './backtracker.js';

// ─── Validator (timetable validation) ─────────────────────────────────────────
export { validate } from './validator.js';

// ─── Scorer (candidate scoring) ───────────────────────────────────────────────
export {
  score,
  scoreDetailed,
  scoreWeighted,
  rankCandidates,
  rankCandidatesDetailed,
  topCandidates,
  scoreTimetable,
  compareTimetables,
} from './scorer.js';

// ─── Heuristics (ordering strategies) ─────────────────────────────────────────
export {
  mrvOrder,
  degreeOrder,
  mcvOrder,
  partTimeFirst,
  uniqueTeacherFirst,
  highWorkloadFirst,
  seniorClassFirst,
  labSubjectsFirst,
  lcvOrder,
  morningFirstPeriods,
  balancedDayOrder,
  teacherPreferenceFirst,
  wellnessFirstOrder,
  lowestPenaltyFirst,
  orderSlots,
  orderClassSlots,
  orderCandidates,
  calculateDomainSize,
  calculateConstraintDegree,
} from './heuristic.js';

// ─── Propagator (forward checking) ────────────────────────────────────────────
export {
  forwardCheck,
  restoreDomains,
  initialArcConsistency,
  buildDomains,
  cloneDomains,
  slotKey,
} from './propagator.js';

// ─── Constraints ──────────────────────────────────────────────────────────────
export * as hardConstraints from '../constraints/hard.js';
export * as mediumConstraints from '../constraints/medium.js';
export * as softConstraints from '../constraints/soft.js';

// =============================================================================
// DEFAULT EXPORT (commonly used functions)
// =============================================================================

export default {
  generate,
  validateAndSuggest,
  validate,
  solve,
  solveByClass,
  feasibilityCheck,
  isFeasible,
  score,
  scoreDetailed,
  rankCandidates,
  orderSlots,
  orderCandidates,
  forwardCheck,
  restoreDomains,
  buildSlots,
  buildSlotsForClass,
  buildDomains,
  cloneDomains,
};
