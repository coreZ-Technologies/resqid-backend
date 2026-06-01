/**
 * propagator.js
 * Forward checking + arc consistency (AC-3 lite).
 * After each assignment, prune domains of remaining variables.
 */

import { logger } from '#config/logger.js';

/**
 * Forward checking — after assigning a slot, remove conflicting options
 * from other unassigned slots' domains.
 *
 * @param {Object} assignment - the slot just assigned (with teacherId, day, period)
 * @param {Map} domains - Map<slotKey, Set<candidateTeacherId>>
 * @param {Array} unassigned - remaining slot descriptors
 * @returns {{ ok: boolean, pruned: Map, prunedCount: number }} ok=false means domain wipe-out
 */
export function forwardCheck(assignment, domains, unassigned) {
  const pruned = new Map();
  let prunedCount = 0;

  for (const slot of unassigned) {
    const key = slotKey(slot);
    const domain = domains.get(key);
    if (!domain || domain.size === 0) continue;

    const removed = new Set();

    for (const candidateTeacherId of domain) {
      // Same teacher teaching at same day and period → conflict
      if (
        candidateTeacherId === assignment.teacherId &&
        slot.day === assignment.day &&
        slot.period === assignment.period
      ) {
        removed.add(candidateTeacherId);
      }
    }

    if (removed.size > 0) {
      for (const r of removed) {
        domain.delete(r);
        prunedCount++;
      }
      pruned.set(key, removed);
    }

    // Domain wipe-out - this branch is dead
    if (domain.size === 0) {
      logger.debug({ 
        slotKey: key, 
        assignmentTeacherId: assignment.teacherId,
        assignmentDay: assignment.day,
        assignmentPeriod: assignment.period
      }, 'Forward check: domain wiped out');
      
      return { ok: false, pruned, prunedCount };
    }
  }

  if (prunedCount > 0) {
    logger.debug({ 
      assignmentTeacherId: assignment.teacherId,
      assignmentDay: assignment.day,
      assignmentPeriod: assignment.period,
      prunedCount,
      affectedSlots: pruned.size
    }, 'Forward check pruned domains');
  }

  return { ok: true, pruned, prunedCount };
}

/**
 * Restore pruned domains on backtrack.
 *
 * @param {Map} domains - Map<slotKey, Set<candidateTeacherId>>
 * @param {Map} pruned - Map<slotKey, Set<removedValues>> from forwardCheck
 */
export function restoreDomains(domains, pruned) {
  let restoredCount = 0;
  
  for (const [key, removed] of pruned) {
    const domain = domains.get(key);
    if (domain) {
      for (const v of removed) {
        domain.add(v);
        restoredCount++;
      }
    }
  }
  
  if (restoredCount > 0) {
    logger.debug({ restoredCount, affectedSlots: pruned.size }, 'Domains restored on backtrack');
  }
}

/**
 * AC-3 lite — reduce domains by checking pairs of unassigned slots
 * that share a teacher constraint.
 * Call once before search starts to shrink initial domains.
 *
 * @param {Map} domains - Map<slotKey, Set<candidateTeacherId>>
 * @param {Array} slots - all slots
 * @returns {{ ok: boolean, reducedCount: number }}
 */
export function initialArcConsistency(domains, slots) {
  const startTime = Date.now();
  let changed = true;
  let iteration = 0;
  let totalReduced = 0;
  
  while (changed && iteration < 100) { // Safety limit: max 100 iterations
    changed = false;
    iteration++;
    
    for (const slot of slots) {
      const key = slotKey(slot);
      const domain = domains.get(key);
      if (!domain || domain.size === 0) continue;

      const toRemove = new Set();
      
      for (const teacherId of domain) {
        // Find any other slot with same day+period that can ONLY take this teacher
        // That would force a conflict
        const conflicts = slots.filter((s) => {
          if (s === slot) return false;
          if (s.day !== slot.day) return false;
          if (s.period !== slot.period) return false;
          
          const otherKey = slotKey(s);
          const otherDomain = domains.get(otherKey);
          
          // If other slot has exactly one option and it's this teacher → conflict
          return otherDomain && otherDomain.size === 1 && [...otherDomain][0] === teacherId;
        });
        
        if (conflicts.length > 0) {
          toRemove.add(teacherId);
        }
      }

      for (const v of toRemove) {
        domain.delete(v);
        totalReduced++;
        changed = true;
      }

      if (domain.size === 0) {
        const durationMs = Date.now() - startTime;
        logger.warn({ 
          slotKey: key, 
          iteration,
          durationMs 
        }, 'Arc consistency: domain wiped out');
        
        return { ok: false, reducedCount: totalReduced };
      }
    }
  }
  
  const durationMs = Date.now() - startTime;
  
  if (totalReduced > 0) {
    logger.info({ 
      iterations: iteration,
      totalReduced,
      durationMs 
    }, 'Arc consistency reduced domains');
  } else {
    logger.debug({ iterations: iteration, durationMs }, 'Arc consistency: no reductions');
  }
  
  return { ok: true, reducedCount: totalReduced };
}

/**
 * Generate a unique key for a slot.
 * Used as key in domains Map.
 *
 * @param {Object} slot - Slot object with classId, subjectId, day, period
 * @returns {string} - Unique slot key
 */
export function slotKey(slot) {
  return `${slot.classId}:${slot.subjectId}:${slot.day}:${slot.period}`;
}

/**
 * Generate a teacher conflict key (for teacher availability constraints).
 *
 * @param {Object} assignment - Assignment with teacherId, day, period
 * @returns {string} - Teacher conflict key
 */
export function teacherConflictKey(assignment) {
  return `${assignment.teacherId}:${assignment.day}:${assignment.period}`;
}

/**
 * Generate a room conflict key (for room availability constraints).
 *
 * @param {Object} assignment - Assignment with roomId, day, period
 * @returns {string} - Room conflict key
 */
export function roomConflictKey(assignment) {
  return `${assignment.roomId}:${assignment.day}:${assignment.period}`;
}

/**
 * Check if a candidate assignment conflicts with existing assignments.
 *
 * @param {Object} candidate - Candidate assignment
 * @param {Array} assignments - Already assigned slots
 * @returns {boolean} - True if conflict exists
 */
export function hasConflict(candidate, assignments) {
  for (const assigned of assignments) {
    // Same teacher at same day/period
    if (assigned.teacherId === candidate.teacherId &&
        assigned.day === candidate.day &&
        assigned.period === candidate.period) {
      return true;
    }
    
    // Same room at same day/period (if rooms are used)
    if (assigned.roomId && candidate.roomId &&
        assigned.roomId === candidate.roomId &&
        assigned.day === candidate.day &&
        assigned.period === candidate.period) {
      return true;
    }
  }
  return false;
}

/**
 * Initialize domains for all slots.
 *
 * @param {Array} slots - All slots to assign
 * @param {Function} getCandidatesForSlot - Function that returns candidate teacher IDs for a slot
 * @returns {Map} - Map of slotKey -> Set of candidate teacher IDs
 */
export function initializeDomains(slots, getCandidatesForSlot) {
  const domains = new Map();
  let totalCandidates = 0;
  
  for (const slot of slots) {
    const key = slotKey(slot);
    const candidates = getCandidatesForSlot(slot);
    domains.set(key, new Set(candidates));
    totalCandidates += candidates.length;
  }
  
  const avgDomainSize = totalCandidates / slots.length;
  
  logger.debug({ 
    totalSlots: slots.length,
    totalCandidates,
    avgDomainSize: avgDomainSize.toFixed(2)
  }, 'Domains initialized');
  
  return domains;
}

/**
 * Get current domain size for a slot.
 *
 * @param {Map} domains - Domains map
 * @param {Object} slot - Slot object
 * @returns {number} - Domain size (0 if no domain)
 */
export function getDomainSize(domains, slot) {
  const key = slotKey(slot);
  const domain = domains.get(key);
  return domain ? domain.size : 0;
}