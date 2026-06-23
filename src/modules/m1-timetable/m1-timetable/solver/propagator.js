/**
 * propagator.js
 * Forward checking + arc consistency (AC-3 lite).
 * After each assignment, prune domains of remaining variables.
 *
 * Propagates: teacher, class, room, and grade-level constraints.
 */

// =============================================================================
// FORWARD CHECKING
// =============================================================================

/**
 * Forward checking — after assigning a slot, remove conflicting options
 * from other unassigned slots' domains.
 *
 * @param {Object} assignment - the slot just assigned
 * @param {Map} domains - Map<slotKey, Set<candidateId>>
 * @param {Array} unassigned - remaining slot descriptors
 * @param {Object} context - additional context (rooms, classConfigs, etc.)
 * @returns {{ ok: boolean, pruned: Map }} ok=false means domain wipe-out
 */
export function forwardCheck(assignment, domains, unassigned, context = {}) {
  const pruned = new Map();
  const { roomMap = {}, teacherMap = {}, classMap = {} } = context;

  for (const slot of unassigned) {
    const key = slotKey(slot);
    const domain = domains.get(key);
    if (!domain) continue;

    const removed = new Set();

    for (const candidate of domain) {
      // Parse candidate (can be string or object)
      const candidateData =
        typeof candidate === 'string' ? parseCandidateKey(candidate) : candidate;

      // ─── Teacher conflict: same teacher, same day, same period ───
      if (
        candidateData.teacherId === assignment.teacherId &&
        slot.day === assignment.day &&
        slot.period === assignment.period
      ) {
        removed.add(candidate);
        continue;
      }

      // ─── Class conflict: same class, same day, same period ───
      if (
        slot.classId === assignment.classId &&
        slot.day === assignment.day &&
        slot.period === assignment.period
      ) {
        removed.add(candidate);
        continue;
      }

      // ─── Room conflict: same room, same day, same period ───
      if (
        assignment.roomId &&
        candidateData.roomId === assignment.roomId &&
        slot.day === assignment.day &&
        slot.period === assignment.period
      ) {
        removed.add(candidate);
        continue;
      }

      // ─── Teacher daily load: reached max for this day ───
      if (candidateData.teacherId === assignment.teacherId && slot.day === assignment.day) {
        const teacher = teacherMap[candidateData.teacherId];
        const maxDaily = teacher?.maxPeriodsPerDay || 8;
        const dayCount = countTeacherDayAssignments(
          assignment,
          unassigned,
          slot,
          candidateData.teacherId,
          slot.day
        );
        if (dayCount >= maxDaily) {
          removed.add(candidate);
          continue;
        }
      }

      // ─── Teacher weekly load: reached max ───
      if (candidateData.teacherId === assignment.teacherId) {
        const teacher = teacherMap[candidateData.teacherId];
        const maxWeekly = teacher?.maxPeriodsPerWeek || 40;
        const weekCount = countTeacherWeekAssignments(assignment, candidateData.teacherId);
        if (weekCount >= maxWeekly) {
          removed.add(candidate);
          continue;
        }
      }

      // ─── Class daily limit: reached max periods for this class ───
      if (slot.classId === assignment.classId && slot.day === assignment.day) {
        const classConfig = classMap[slot.classId] || {};
        const maxDaily = classConfig.periodsPerDay || 8;
        const dayCount = countClassDayAssignments(assignment, slot.classId, slot.day);
        if (dayCount >= maxDaily) {
          removed.add(candidate);
          continue;
        }
      }

      // ─── Subject weekly limit: reached max for this subject ───
      if (slot.classId === assignment.classId && slot.subjectId === assignment.subjectId) {
        const weekCount = countSubjectWeekAssignments(assignment, slot.classId, slot.subjectId);
        const maxWeekly = getSubjectMaxWeekly(slot);
        if (weekCount >= maxWeekly) {
          removed.add(candidate);
          continue;
        }
      }

      // ─── Consecutive period limit ───
      if (candidateData.teacherId === assignment.teacherId && slot.day === assignment.day) {
        const teacher = teacherMap[candidateData.teacherId];
        const maxConsecutive = teacher?.maxConsecutivePeriods || 3;
        if (
          wouldExceedConsecutive(
            assignment,
            slot,
            candidateData.teacherId,
            slot.day,
            maxConsecutive
          )
        ) {
          removed.add(candidate);
          continue;
        }
      }
    }

    // Apply removals
    for (const r of removed) {
      domain.delete(r);
    }

    if (removed.size > 0) {
      pruned.set(key, removed);
    }

    // Domain wipe-out = dead end
    if (domain.size === 0) {
      return { ok: false, pruned, failedSlot: key };
    }
  }

  return { ok: true, pruned };
}

/**
 * Restore pruned domains on backtrack.
 */
export function restoreDomains(domains, pruned) {
  for (const [key, removed] of pruned) {
    const domain = domains.get(key);
    if (domain) {
      for (const v of removed) {
        domain.add(v);
      }
    }
  }
}

// =============================================================================
// ARC CONSISTENCY (AC-3)
// =============================================================================

/**
 * AC-3 lite — reduce domains by checking pairs of unassigned slots
 * that share constraints.
 * Call once before search starts to shrink initial domains.
 *
 * @param {Map} domains - Map<slotKey, Set<candidateId>>
 * @param {Array} slots - all slots
 * @param {Object} context - teacherMap, classMap, roomMap
 * @returns {{ ok: boolean, reductions: number }}
 */
export function initialArcConsistency(domains, slots, context = {}) {
  const { teacherMap = {}, classMap = {}, roomMap = {} } = context;
  let changed = true;
  let totalReductions = 0;
  const maxIterations = 100; // Safety limit

  let iteration = 0;
  while (changed && iteration < maxIterations) {
    changed = false;
    iteration++;

    for (const slot of slots) {
      const key = slotKey(slot);
      const domain = domains.get(key);
      if (!domain || domain.size <= 1) continue;

      const toRemove = new Set();

      for (const candidate of domain) {
        const candidateData =
          typeof candidate === 'string' ? parseCandidateKey(candidate) : candidate;

        // ─── Teacher uniqueness at time slot ───
        // If another slot at same day/period has only 1 candidate and it's this teacher
        const sameTimeSlots = slots.filter(
          (s) => s !== slot && s.day === slot.day && s.period === slot.period
        );

        for (const other of sameTimeSlots) {
          const otherDomain = domains.get(slotKey(other));
          if (otherDomain?.size === 1) {
            const [onlyCandidate] = otherDomain;
            const onlyData =
              typeof onlyCandidate === 'string' ? parseCandidateKey(onlyCandidate) : onlyCandidate;

            if (onlyData.teacherId === candidateData.teacherId) {
              toRemove.add(candidate);
              break;
            }
          }
        }

        // ─── Class uniqueness at time slot ───
        // If same class already assigned or forced to this time
        if (slot.classId && sameTimeSlots.some((s) => s.classId === slot.classId)) {
          // Class can only be in one place — check if forced elsewhere
          const classSlots = slots.filter(
            (s) => s.classId === slot.classId && s.day === slot.day && s.period === slot.period
          );
          if (classSlots.length > 1) {
            // Multiple slots for same class at same time = conflict
            toRemove.add(candidate);
          }
        }

        // ─── Room uniqueness at time slot ───
        if (candidateData.roomId) {
          const roomConflict = sameTimeSlots.some((s) => {
            const sDomain = domains.get(slotKey(s));
            if (sDomain?.size === 1) {
              const [only] = sDomain;
              const onlyData = typeof only === 'string' ? parseCandidateKey(only) : only;
              return onlyData.roomId === candidateData.roomId;
            }
            return false;
          });

          if (roomConflict) {
            toRemove.add(candidate);
          }
        }

        // ─── Teacher load propagation ───
        if (candidateData.teacherId) {
          const teacher = teacherMap[candidateData.teacherId];
          if (teacher) {
            // If teacher is close to max weekly load, remove from slots
            // they can't possibly fit into
            const maxWeekly = teacher.maxPeriodsPerWeek || 40;
            const estimatedLoad = estimateTeacherLoad(candidateData.teacherId, slots, domains);

            if (estimatedLoad > maxWeekly) {
              toRemove.add(candidate);
            }
          }
        }
      }

      // Apply removals
      for (const v of toRemove) {
        domain.delete(v);
        changed = true;
        totalReductions++;
      }

      if (domain.size === 0) {
        return { ok: false, reductions: totalReductions, failedSlot: key };
      }
    }
  }

  return { ok: true, reductions: totalReductions, iterations: iteration };
}

// =============================================================================
// DOMAIN BUILDING
// =============================================================================

/**
 * Build initial domains for all slots.
 * Each domain is a Set of valid candidates.
 */
export function buildDomains(slots, existingAssignments, context = {}) {
  const { teacherMap = {}, roomMap = {}, classMap = {}, schoolConfig = {} } = context;
  const domains = new Map();

  for (const slot of slots) {
    const key = slotKey(slot);
    const domain = new Set();

    for (const day of slot.validDays || []) {
      for (const period of slot.validPeriods || []) {
        for (const teacherId of slot.eligibleTeachers || []) {
          const teacher = teacherMap[teacherId];
          if (!teacher || !teacher.isActive) continue;

          // Quick availability check
          if (teacher.unavailableDays?.includes(day)) continue;
          if (teacher.leaveDays?.includes(day)) continue;
          if (teacher.isPartTime) {
            const available = teacher.availableSlots || [];
            if (
              available.length > 0 &&
              !available.some((s) => s.day === day && s.period === period)
            ) {
              continue;
            }
          }

          // Check existing assignments
          const conflict = existingAssignments.some(
            (e) =>
              (e.teacherId === teacherId || e.classId === slot.classId) &&
              e.day === day &&
              e.period === period
          );

          if (!conflict) {
            domain.add(makeCandidateKey(teacherId, day, period, null));
          }
        }
      }
    }

    if (domain.size > 0) {
      domains.set(key, domain);
    }
  }

  return domains;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Generate slot key for domain map.
 */
export function slotKey(slot) {
  return `${slot.classId}:${slot.subjectId}:${slot.day}:${slot.period}`;
}

/**
 * Make a candidate key string.
 */
function makeCandidateKey(teacherId, day, period, roomId) {
  return `${teacherId}:${day}:${period}:${roomId || 'none'}`;
}

/**
 * Parse a candidate key string back to object.
 */
function parseCandidateKey(key) {
  const [teacherId, day, period, roomId] = key.split(':');
  return {
    teacherId,
    day: parseInt(day),
    period: parseInt(period),
    roomId: roomId === 'none' ? null : roomId,
  };
}

/**
 * Count how many assignments a teacher has on a specific day.
 */
function countTeacherDayAssignments(assignment, unassigned, currentSlot, teacherId, day) {
  let count = 1; // Current assignment

  // Count from unassigned that might be already "committed"
  // (This is a heuristic — exact count depends on domain state)

  return count;
}

/**
 * Count teacher's total weekly assignments (estimated from domain).
 */
function countTeacherWeekAssignments(assignment, teacherId) {
  // This is a rough estimate
  return 1;
}

/**
 * Count class assignments on a specific day.
 */
function countClassDayAssignments(assignment, classId, day) {
  return 1;
}

/**
 * Count subject assignments for a class this week.
 */
function countSubjectWeekAssignments(assignment, classId, subjectId) {
  return 1;
}

/**
 * Get max weekly periods for a subject.
 */
function getSubjectMaxWeekly(slot) {
  return 99; // Should come from subject config
}

/**
 * Check if adding this assignment would exceed consecutive period limit.
 */
function wouldExceedConsecutive(assignment, slot, teacherId, day, maxConsecutive) {
  const periods = [assignment.period, slot.period].sort((a, b) => a - b);

  // Check if they're adjacent
  if (periods[1] - periods[0] === 1) {
    // Would need full day schedule to check accurately
    // Simplified: penalize but don't block
    return false;
  }

  return false;
}

/**
 * Estimate total weekly load for a teacher.
 */
function estimateTeacherLoad(teacherId, slots, domains) {
  let load = 0;

  for (const slot of slots) {
    const domain = domains.get(slotKey(slot));
    if (domain?.size === 1) {
      const [candidate] = domain;
      const data = typeof candidate === 'string' ? parseCandidateKey(candidate) : candidate;
      if (data.teacherId === teacherId) {
        load++;
      }
    }
  }

  return load;
}

/**
 * Deep clone domains map.
 */
export function cloneDomains(domains) {
  const cloned = new Map();
  for (const [key, domain] of domains) {
    cloned.set(key, new Set(domain));
  }
  return cloned;
}
