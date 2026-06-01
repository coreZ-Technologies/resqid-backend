/**
 * heuristic.js
 * Ordering strategies for the backtracking solver.
 * Good heuristics dramatically cut search time.
 */

/**
 * MRV — Minimum Remaining Values.
 * Pick the assignment slot with fewest valid options first.
 * Fails fast, prunes tree early.
 */
export function mrvOrder(unassigned, getDomainSize) {
  return [...unassigned].sort((a, b) => getDomainSize(a) - getDomainSize(b));
}

/**
 * Degree heuristic tie-breaker.
 * Among slots with equal MRV, prefer the one involved in most constraints
 * (i.e. most other unassigned variables share its teacher or class).
 */
export function degreeOrder(unassigned, getConstraintDegree) {
  return [...unassigned].sort((a, b) => getConstraintDegree(b) - getConstraintDegree(a));
}

/**
 * Part-time teacher priority — schedule part-time teachers first
 * since their window is narrowest.
 */
export function partTimeFirst(slots, teacherMap) {
  return [...slots].sort((a, b) => {
    const aPartTime = teacherMap[a.teacherId]?.isPartTime ? 0 : 1;
    const bPartTime = teacherMap[b.teacherId]?.isPartTime ? 0 : 1;
    return aPartTime - bPartTime;
  });
}

/**
 * LCV — Least Constraining Value.
 * Among possible teacher assignments, prefer the one that eliminates
 * fewest options for remaining slots.
 */
export function lcvOrder(candidates, slot, existing, computeRemainingOptions) {
  return [...candidates].sort(
    (a, b) =>
      computeRemainingOptions(b, slot, existing) - computeRemainingOptions(a, slot, existing)
  );
}

/**
 * Morning-first heuristic for heavy subjects.
 * Sort candidate periods ascending so morning slots are tried first.
 */
export function morningFirstPeriods(periods) {
  return [...periods].sort((a, b) => a - b);
}

/**
 * Combined slot ordering: part-time first, then MRV proxy (fewest eligible teachers).
 */
export function orderSlots(slots, teacherMap, getEligibleCount) {
  return partTimeFirst(slots, teacherMap).sort((a, b) => getEligibleCount(a) - getEligibleCount(b));
}
