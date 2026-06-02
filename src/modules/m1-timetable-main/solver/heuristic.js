/**
 * heuristic.js
 * Ordering strategies for the backtracking solver.
 * Good heuristics dramatically cut search time.
 */

import { logger } from '#config/logger.js';

/**
 * MRV — Minimum Remaining Values.
 * Pick the assignment slot with fewest valid options first.
 * Fails fast, prunes tree early.
 * 
 * @param {Array} unassigned - Array of unassigned slots
 * @param {Function} getDomainSize - Function that returns domain size for a slot
 * @returns {Array} - Sorted array of slots
 */
export function mrvOrder(unassigned, getDomainSize) {
  const sorted = [...unassigned].sort((a, b) => getDomainSize(a) - getDomainSize(b));
  
  logger.debug({ 
    firstSlotId: sorted[0]?.id, 
    firstSlotDomainSize: sorted[0] ? getDomainSize(sorted[0]) : null,
    totalSlots: sorted.length 
  }, 'MRV ordering applied');
  
  return sorted;
}

/**
 * Degree heuristic tie-breaker.
 * Among slots with equal MRV, prefer the one involved in most constraints
 * (i.e. most other unassigned variables share its teacher or class).
 * 
 * @param {Array} unassigned - Array of unassigned slots
 * @param {Function} getConstraintDegree - Function that returns constraint degree for a slot
 * @returns {Array} - Sorted array of slots
 */
export function degreeOrder(unassigned, getConstraintDegree) {
  const sorted = [...unassigned].sort((a, b) => getConstraintDegree(b) - getConstraintDegree(a));
  
  logger.debug({ 
    topSlotId: sorted[0]?.id,
    topSlotDegree: sorted[0] ? getConstraintDegree(sorted[0]) : null 
  }, 'Degree ordering applied');
  
  return sorted;
}

/**
 * Combined MRV + Degree ordering.
 * First by MRV, then by degree for ties.
 * 
 * @param {Array} unassigned - Array of unassigned slots
 * @param {Function} getDomainSize - Function that returns domain size for a slot
 * @param {Function} getConstraintDegree - Function that returns constraint degree for a slot
 * @returns {Array} - Sorted array of slots
 */
export function mrvWithDegreeOrder(unassigned, getDomainSize, getConstraintDegree) {
  return [...unassigned].sort((a, b) => {
    const mrvDiff = getDomainSize(a) - getDomainSize(b);
    if (mrvDiff !== 0) return mrvDiff;
    // Tie-breaker: higher degree first
    return getConstraintDegree(b) - getConstraintDegree(a);
  });
}

/**
 * Part-time teacher priority — schedule part-time teachers first
 * since their window is narrowest.
 * 
 * @param {Array} slots - Array of slots (each with teacherId)
 * @param {Object} teacherMap - Map of teacherId to teacher object
 * @returns {Array} - Sorted array with part-time teachers first
 */
export function partTimeFirst(slots, teacherMap) {
  const sorted = [...slots].sort((a, b) => {
    const aTeacher = teacherMap[a.teacherId];
    const bTeacher = teacherMap[b.teacherId];
    
    // Part-time (true) comes before full-time (false)
    // Convert boolean to number: true -> 0, false -> 1
    const aIsPartTime = aTeacher?.isPartTime ? 0 : 1;
    const bIsPartTime = bTeacher?.isPartTime ? 0 : 1;
    
    if (aIsPartTime !== bIsPartTime) {
      return aIsPartTime - bIsPartTime;
    }
    
    // If both part-time, sort by available slots (fewer first)
    if (aTeacher?.isPartTime && bTeacher?.isPartTime) {
      const aAvailable = (aTeacher.availableSlots || []).length;
      const bAvailable = (bTeacher.availableSlots || []).length;
      return aAvailable - bAvailable;
    }
    
    return 0;
  });
  
  const partTimeCount = sorted.filter(s => teacherMap[s.teacherId]?.isPartTime).length;
  
  if (partTimeCount > 0) {
    logger.debug({ partTimeCount, totalSlots: slots.length }, 'Part-time first ordering applied');
  }
  
  return sorted;
}

/**
 * LCV — Least Constraining Value.
 * Among possible teacher assignments, prefer the one that eliminates
 * fewest options for remaining slots.
 * 
 * @param {Array} candidates - Array of candidate assignments
 * @param {Object} slot - The current slot being assigned
 * @param {Array} existing - Already assigned slots
 * @param {Function} computeRemainingOptions - Function that computes how many options remain after assigning a candidate
 * @returns {Array} - Sorted candidates (least constraining first)
 */
export function lcvOrder(candidates, slot, existing, computeRemainingOptions) {
  if (!candidates.length) return candidates;
  
  const withConstraintCount = candidates.map(candidate => ({
    candidate,
    remainingOptions: computeRemainingOptions(candidate, slot, existing),
  }));
  
  // Sort ascending (fewest remaining options eliminated = least constraining)
  // Actually LCV wants the candidate that leaves the MOST options for others
  // So we sort by remainingOptions descending
  const sorted = withConstraintCount
    .sort((a, b) => b.remainingOptions - a.remainingOptions)
    .map(item => item.candidate);
  
  logger.debug({ 
    slotId: slot.id, 
    candidateCount: candidates.length,
    bestCandidateRemaining: withConstraintCount[0]?.remainingOptions 
  }, 'LCV ordering applied');
  
  return sorted;
}

/**
 * Morning-first heuristic for heavy subjects.
 * Sort candidate periods ascending so morning slots are tried first.
 * 
 * @param {Array} periods - Array of period numbers
 * @returns {Array} - Sorted periods (ascending)
 */
export function morningFirstPeriods(periods) {
  const sorted = [...periods].sort((a, b) => a - b);
  
  logger.debug({ 
    periods: sorted,
    earliest: sorted[0],
    latest: sorted[sorted.length - 1]
  }, 'Morning-first period ordering applied');
  
  return sorted;
}

/**
 * Afternoon-first heuristic (alternative strategy).
 * For teachers who prefer afternoon slots.
 * 
 * @param {Array} periods - Array of period numbers
 * @returns {Array} - Sorted periods (descending)
 */
export function afternoonFirstPeriods(periods) {
  const sorted = [...periods].sort((a, b) => b - a);
  
  logger.debug({ 
    periods: sorted,
    earliest: sorted[sorted.length - 1],
    latest: sorted[0]
  }, 'Afternoon-first period ordering applied');
  
  return sorted;
}

/**
 * Dynamic ordering based on teacher preferences.
 * 
 * @param {Array} periods - Array of period numbers
 * @param {Object} teacherConfig - Teacher configuration with preferences
 * @returns {Array} - Periods ordered by teacher preference
 */
export function preferenceBasedPeriods(periods, teacherConfig) {
  const preferredPeriods = teacherConfig.preferredPeriods || [];
  const avoidedPeriods = teacherConfig.avoidedPeriods || [];
  
  // Score each period: +1 for preferred, -1 for avoided
  const scored = [...periods].map(period => ({
    period,
    score: (preferredPeriods.includes(period) ? 1 : 0) - (avoidedPeriods.includes(period) ? 1 : 0),
  }));
  
  // Sort by score descending (preferred first), then by period number
  scored.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score;
    return a.period - b.period;
  });
  
  const sorted = scored.map(item => item.period);
  
  logger.debug({ 
    periods: sorted,
    preferredPeriods,
    avoidedPeriods
  }, 'Preference-based period ordering applied');
  
  return sorted;
}

/**
 * Combined slot ordering: part-time first, then MRV proxy (fewest eligible teachers).
 * 
 * @param {Array} slots - Array of slots
 * @param {Object} teacherMap - Map of teacherId to teacher object
 * @param {Function} getEligibleCount - Function that returns eligible teacher count for a slot
 * @returns {Array} - Ordered slots
 */
export function orderSlots(slots, teacherMap, getEligibleCount) {
  if (!slots.length) return [];
  
  const startTime = Date.now();
  
  // First: part-time teachers first
  const partTimeOrdered = partTimeFirst(slots, teacherMap);
  
  // Then: sort by fewest eligible teachers (MRV proxy)
  const ordered = partTimeOrdered.sort((a, b) => {
    const aCount = getEligibleCount(a);
    const bCount = getEligibleCount(b);
    
    if (aCount !== bCount) {
      return aCount - bCount;
    }
    
    // Tie-breaker: prefer slots with part-time teachers already
    const aIsPartTime = teacherMap[a.teacherId]?.isPartTime ? 1 : 0;
    const bIsPartTime = teacherMap[b.teacherId]?.isPartTime ? 1 : 0;
    return bIsPartTime - aIsPartTime;
  });
  
  const durationMs = Date.now() - startTime;
  
  logger.debug({ 
    totalSlots: ordered.length,
    durationMs,
    firstSlotId: ordered[0]?.id,
    firstSlotEligibleCount: ordered[0] ? getEligibleCount(ordered[0]) : null
  }, 'Slots ordered for solving');
  
  return ordered;
}

/**
 * Adaptive ordering — changes strategy based on search depth.
 * Uses MRV for early decisions, switches to simpler heuristics deeper in the tree.
 * 
 * @param {Array} unassigned - Array of unassigned slots
 * @param {Function} getDomainSize - Function that returns domain size for a slot
 * @param {number} depth - Current search depth
 * @param {number} threshold - Depth threshold to switch strategies (default: 100)
 * @returns {Array} - Ordered slots
 */
export function adaptiveOrder(unassigned, getDomainSize, depth = 0, threshold = 100) {
  if (depth > threshold) {
    // Deep in search tree - use simpler ordering for speed
    logger.debug({ depth, threshold }, 'Switching to simple ordering (deep search)');
    return [...unassigned]; // No reordering for speed
  }
  
  // Shallow depth - use MRV for better pruning
  return mrvOrder(unassigned, getDomainSize);
}

/**
 * Calculate constraint degree for a slot.
 * Degree = number of other slots that share a teacher or class.
 * 
 * @param {Object} slot - The slot to calculate degree for
 * @param {Array} allSlots - All slots (including unassigned)
 * @returns {number} - Constraint degree
 */
export function calculateConstraintDegree(slot, allSlots) {
  let degree = 0;
  
  for (const other of allSlots) {
    if (other.id === slot.id) continue;
    
    // Same teacher or same class creates constraint
    if (other.teacherId === slot.teacherId || other.classId === slot.classId) {
      degree++;
    }
  }
  
  return degree;
}