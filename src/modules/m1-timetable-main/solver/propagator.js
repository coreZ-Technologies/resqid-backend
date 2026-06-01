/**
 * propagator.js
 * Forward checking + arc consistency (AC-3 lite).
 * After each assignment, prune domains of remaining variables.
 */

/**
 * Forward checking — after assigning a slot, remove conflicting options
 * from other unassigned slots' domains.
 *
 * @param {Object} assignment - the slot just assigned
 * @param {Map} domains - Map<slotKey, Set<candidateId>>
 * @param {Array} unassigned - remaining slot descriptors
 * @returns {{ ok: boolean, pruned: Map }} ok=false means domain wipe-out
 */
export function forwardCheck(assignment, domains, unassigned) {
  const pruned = new Map();

  for (const slot of unassigned) {
    const key = slotKey(slot);
    const domain = domains.get(key);
    if (!domain) continue;

    const removed = new Set();

    for (const candidateTeacherId of domain) {
      // Same teacher same day same period → prune
      if (
        candidateTeacherId === assignment.teacherId &&
        slot.day === assignment.day &&
        slot.period === assignment.period
      ) {
        removed.add(candidateTeacherId);
      }
    }

    for (const r of removed) domain.delete(r);
    if (removed.size > 0) pruned.set(key, removed);

    if (domain.size === 0) {
      return { ok: false, pruned };
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
      for (const v of removed) domain.add(v);
    }
  }
}

/**
 * AC-3 lite — reduce domains by checking pairs of unassigned slots
 * that share a teacher constraint.
 * Call once before search starts to shrink initial domains.
 *
 * @param {Map} domains - Map<slotKey, Set<candidateId>>
 * @param {Array} slots - all slots
 * @returns {{ ok: boolean }}
 */
export function initialArcConsistency(domains, slots) {
  let changed = true;
  while (changed) {
    changed = false;
    for (const slot of slots) {
      const key = slotKey(slot);
      const domain = domains.get(key);
      if (!domain) continue;

      const toRemove = new Set();
      for (const teacherId of domain) {
        // Find any other slot with same day+period — teacher can't be there too
        const conflicts = slots.filter(
          (s) =>
            s !== slot &&
            s.day === slot.day &&
            s.period === slot.period &&
            domains.get(slotKey(s))?.size === 1 &&
            [...domains.get(slotKey(s))][0] === teacherId
        );
        if (conflicts.length > 0) toRemove.add(teacherId);
      }

      for (const v of toRemove) {
        domain.delete(v);
        changed = true;
      }

      if (domain.size === 0) return { ok: false };
    }
  }
  return { ok: true };
}

export function slotKey(slot) {
  return `${slot.classId}:${slot.subjectId}:${slot.day}:${slot.period}`;
}
