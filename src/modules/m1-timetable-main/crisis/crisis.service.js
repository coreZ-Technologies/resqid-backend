/**
 * crisis/crisis.service.js
 * Handles emergency schedule changes:
 * - Teacher absent → find replacement
 * - Room unavailable → reassign room
 * - Sudden partial-day reschedule
 */

import timetableRepository from '../timetable.repository';
import { getPrisma } from '../../config/prisma';

function prisma() {
  return getPrisma();
}

/**
 * Main crisis dispatcher.
 */
export async function handleCrisis(schoolId, type, payload) {
  switch (type) {
    case 'TEACHER_ABSENT':
      return handleTeacherAbsent(schoolId, payload);
    case 'ROOM_UNAVAILABLE':
      return handleRoomUnavailable(schoolId, payload);
    case 'PARTIAL_RESCHEDULE':
      return handlePartialReschedule(schoolId, payload);
    default:
      throw new Error(`Unknown crisis type: ${type}`);
  }
}

/**
 * Teacher absent — find best replacement for their slots today/this week.
 *
 * @param {string} schoolId
 * @param {{ teacherId, date, timetableId }} payload
 */
async function handleTeacherAbsent(schoolId, { teacherId, date, timetableId }) {
  // Get the absent teacher's slots on the given date
  const affectedSlots = await timetableRepository.getSlotsByTeacherAndDate(
    timetableId,
    teacherId,
    date
  );

  if (affectedSlots.length === 0) {
    return { replaced: [], message: 'No slots to replace' };
  }

  const replacements = [];

  for (const slot of affectedSlots) {
    // Find an eligible teacher who is:
    // 1. qualified for the subject
    // 2. not already assigned at this day/period
    // 3. not on leave
    const candidate = await findReplacement(schoolId, timetableId, slot, teacherId);

    if (candidate) {
      await timetableRepository.updateSlotTeacher(slot.id, candidate.id, {
        replacementFor: teacherId,
        isTemporary: true,
        date,
      });
      replacements.push({ slotId: slot.id, newTeacherId: candidate.id, subjectId: slot.subjectId });
    } else {
      replacements.push({ slotId: slot.id, newTeacherId: null, unresolved: true });
    }
  }

  const unresolved = replacements.filter((r) => r.unresolved);
  return {
    replaced: replacements.filter((r) => !r.unresolved),
    unresolved,
    message:
      unresolved.length > 0
        ? `${unresolved.length} slot(s) could not be covered automatically`
        : 'All slots covered',
  };
}

async function findReplacement(schoolId, timetableId, slot, absentTeacherId) {
  // Get all teachers in school who can teach this subject
  const eligible = await prisma().teacher.findMany({
    where: {
      schoolId,
      id: { not: absentTeacherId },
      eligibleSubjects: { has: slot.subjectId },
      leaveDays: { not: { has: slot.day } },
    },
  });

  // Filter out those already assigned at this period
  const busyTeacherIds = await timetableRepository.getTeacherIdsAtSlot(
    timetableId,
    slot.day,
    slot.period
  );

  const available = eligible.filter((t) => !busyTeacherIds.includes(t.id));

  // Prefer part-time teachers first (they often have free windows)
  available.sort((a, b) => (b.isPartTime ? 1 : 0) - (a.isPartTime ? 1 : 0));

  return available[0] || null;
}

/**
 * Room unavailable — reassign all slots in that room to another room.
 */
async function handleRoomUnavailable(schoolId, { roomId, timetableId, date }) {
  const affectedSlots = await timetableRepository.getSlotsByRoom(timetableId, roomId, date);

  const reassigned = [];
  for (const slot of affectedSlots) {
    const newRoom = await findAlternativeRoom(schoolId, timetableId, slot, roomId);
    if (newRoom) {
      await timetableRepository.updateSlotRoom(slot.id, newRoom.id);
      reassigned.push({ slotId: slot.id, newRoomId: newRoom.id });
    } else {
      reassigned.push({ slotId: slot.id, newRoomId: null, unresolved: true });
    }
  }

  return { reassigned };
}

async function findAlternativeRoom(schoolId, timetableId, slot, excludeRoomId) {
  const rooms = await prisma().room.findMany({
    where: {
      schoolId,
      id: { not: excludeRoomId },
      type: slot.requiredRoomType || undefined,
    },
  });

  const busyRoomIds = await timetableRepository.getRoomIdsAtSlot(
    timetableId,
    slot.day,
    slot.period
  );

  return rooms.find((r) => !busyRoomIds.includes(r.id)) || null;
}

/**
 * Partial reschedule — move a set of specific slots to new times.
 */
async function handlePartialReschedule(schoolId, { timetableId, moves }) {
  // moves: [{ slotId, newDay, newPeriod }]
  const results = [];
  for (const move of moves) {
    await timetableRepository.moveSlot(timetableId, move.slotId, move.newDay, move.newPeriod);
    results.push({ slotId: move.slotId, moved: true });
  }
  return { results };
}
