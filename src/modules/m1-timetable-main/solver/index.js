// solver/index.js
// Solver module exports - entry point for timetable generation

export { generate, validateAndSuggest } from './scheduler.js';
export {
  checkAll as feasibilityCheck,
  periodsVsSlots,
  subjectTeacherCoverage,
  partTimeCapacity,
} from './feasibility.js';
export { solve, buildSlots } from './backtracker.js';
export { validate } from './validator.js';
export { score, rankCandidates } from './scorer.js';
export {
  mrvOrder,
  degreeOrder,
  partTimeFirst,
  lcvOrder,
  morningFirstPeriods,
  orderSlots,
} from './heuristic.js';
export { 
  forwardCheck, 
  restoreDomains, 
  initialArcConsistency, 
  slotKey 
} from './propagator.js';