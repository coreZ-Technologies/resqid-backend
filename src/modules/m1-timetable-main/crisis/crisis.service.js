/**
 * crisis/crisis.service.js
 * Handles emergency schedule changes:
 * - Teacher absent → find replacement
 * - Room unavailable → reassign room
 * - Sudden partial-day reschedule
 */

import * as timetableRepository from '../timetable.repository.js';
import { prisma } from '#config/prisma.js';
import { ApiError } from '#shared/response/ApiError.js';
import { logger } from '#config/logger.js';

/**
 * Main crisis dispatcher.
 */
export async function handleCrisis(schoolId, type, payload) {
  const startTime = Date.now();
  
  logger.info({ 
    schoolId, 
    crisisType: type, 
    payloadKeys: Object.keys(payload || {}) 
  }, 'Handling crisis');
  
  try {
    let result;
    
    switch (type) {
      case 'TEACHER_ABSENT':
        result = await handleTeacherAbsent(schoolId, payload);
        break;
      case 'ROOM_UNAVAILABLE':
        result = await handleRoomUnavailable(schoolId, payload);
        break;
      case 'PARTIAL_RESCHEDULE':
        result = await handlePartialReschedule(schoolId, payload);
        break;
      default:
        throw ApiError.badRequest(`Unknown crisis type: ${type}`);
    }
    
    const durationMs = Date.now() - startTime;
    
    logger.info({ 
      schoolId, 
      crisisType: type, 
      durationMs,
      resultSummary: {
        resolved: result.replaced?.length || result.reassigned?.length || result.results?.length || 0,
        unresolved: result.unresolved?.length || 0,
      }
    }, 'Crisis handled successfully');
    
    return result;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error({ error: error.message, schoolId, crisisType: type }, 'Failed to handle crisis');
    throw ApiError.internal('Failed to handle crisis');
  }
}

/**
 * Teacher absent — find best replacement for their slots today/this week.
 *
 * @param {string} schoolId
 * @param {{ teacherId, date, timetableId }} payload
 */
async function handleTeacherAbsent(schoolId, { teacherId, date, timetableId }) {
  // Validate required fields
  if (!teacherId || !date || !timetableId) {
    throw ApiError.badRequest('Missing required fields: teacherId, date, or timetableId');
  }
  
  logger.info({ schoolId, teacherId, date, timetableId }, 'Handling teacher absence');
  
  // Get the absent teacher's slots on the given date
  const affectedSlots = await timetableRepository.getSlotsByTeacherAndDate(
    timetableId,
    teacherId,
    date
  );

  if (affectedSlots.length === 0) {
    logger.debug({ teacherId, date }, 'No slots to replace for absent teacher');
    return { 
      replaced: [], 
      unresolved: [],
      message: 'No slots to replace',
      totalAffected: 0,
    };
  }

  const replacements = [];
  let resolvedCount = 0;

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
      replacements.push({ 
        slotId: slot.id, 
        newTeacherId: candidate.id, 
        subjectId: slot.subjectId,
        className: slot.classId,
        period: slot.period,
        day: slot.day,
      });
      resolvedCount++;
    } else {
      replacements.push({ 
        slotId: slot.id, 
        newTeacherId: null, 
        unresolved: true,
        subjectId: slot.subjectId,
        reason: 'No eligible teacher available',
      });
    }
  }

  const unresolved = replacements.filter((r) => r.unresolved);
  const resolved = replacements.filter((r) => !r.unresolved);
  
  logger.info({ 
    teacherId, 
    date, 
    totalAffected: affectedSlots.length,
    resolvedCount: resolved.length,
    unresolvedCount: unresolved.length 
  }, 'Teacher absence handling completed');

  return {
    replaced: resolved,
    unresolved,
    totalAffected: affectedSlots.length,
    message: unresolved.length > 0
      ? `${unresolved.length} slot(s) could not be covered automatically. Manual intervention required.`
      : `All ${resolved.length} slot(s) covered successfully`,
  };
}

/**
 * Find a replacement teacher for a slot.
 */
async function findReplacement(schoolId, timetableId, slot, absentTeacherId) {
  try {
    // Get all teachers in school who can teach this subject
    const eligible = await prisma.teacher.findMany({
      where: {
        schoolId,
        id: { not: absentTeacherId },
        eligibleSubjects: { has: slot.subjectId },
        // Check if teacher is not on leave on this day
        leaveDays: { not: { has: slot.day } },
      },
    });

    if (eligible.length === 0) {
      logger.debug({ subjectId: slot.subjectId, day: slot.day }, 'No eligible teachers found');
      return null;
    }

    // Filter out those already assigned at this period
    const busyTeacherIds = await timetableRepository.getTeacherIdsAtSlot(
      timetableId,
      slot.day,
      slot.period
    );

    const available = eligible.filter((t) => !busyTeacherIds.includes(t.id));

    if (available.length === 0) {
      logger.debug({ 
        subjectId: slot.subjectId, 
        day: slot.day, 
        period: slot.period,
        eligibleCount: eligible.length,
        allBusy: true 
      }, 'All eligible teachers are busy');
      return null;
    }

    // Prefer part-time teachers first (they often have free windows)
    // Then prefer teachers with lower current load
    available.sort((a, b) => {
      // Part-time first
      if (a.isPartTime !== b.isPartTime) {
        return (b.isPartTime ? 1 : 0) - (a.isPartTime ? 1 : 0);
      }
      // Then by current load (if available)
      return (a.currentLoad || 0) - (b.currentLoad || 0);
    });

    const selected = available[0];
    
    logger.debug({ 
      slotId: slot.id, 
      absentTeacherId,
      replacementTeacherId: selected.id,
      isPartTime: selected.isPartTime 
    }, 'Replacement teacher found');

    return selected;
  } catch (error) {
    logger.error({ error: error.message, slotId: slot.id }, 'Error finding replacement teacher');
    return null;
  }
}

/**
 * Room unavailable — reassign all slots in that room to another room.
 */
async function handleRoomUnavailable(schoolId, { roomId, timetableId, date }) {
  // Validate required fields
  if (!roomId || !timetableId) {
    throw ApiError.badRequest('Missing required fields: roomId or timetableId');
  }
  
  logger.info({ schoolId, roomId, timetableId, date }, 'Handling room unavailability');
  
  const affectedSlots = await timetableRepository.getSlotsByRoom(timetableId, roomId, date);

  if (affectedSlots.length === 0) {
    logger.debug({ roomId, date }, 'No slots affected by room unavailability');
    return { 
      reassigned: [], 
      unresolved: [],
      message: 'No slots to reassign',
      totalAffected: 0,
    };
  }

  const reassigned = [];
  let resolvedCount = 0;

  for (const slot of affectedSlots) {
    const newRoom = await findAlternativeRoom(schoolId, timetableId, slot, roomId);
    
    if (newRoom) {
      await timetableRepository.updateSlotRoom(slot.id, newRoom.id);
      reassigned.push({ 
        slotId: slot.id, 
        newRoomId: newRoom.id,
        oldRoomId: roomId,
        classId: slot.classId,
        period: slot.period,
        day: slot.day,
      });
      resolvedCount++;
    } else {
      reassigned.push({ 
        slotId: slot.id, 
        newRoomId: null, 
        unresolved: true,
        oldRoomId: roomId,
        reason: 'No alternative room available',
      });
    }
  }

  const unresolved = reassigned.filter((r) => r.unresolved);
  const resolved = reassigned.filter((r) => !r.unresolved);
  
  logger.info({ 
    roomId, 
    date, 
    totalAffected: affectedSlots.length,
    resolvedCount: resolved.length,
    unresolvedCount: unresolved.length 
  }, 'Room unavailability handling completed');

  return {
    reassigned: resolved,
    unresolved,
    totalAffected: affectedSlots.length,
    message: unresolved.length > 0
      ? `${unresolved.length} slot(s) could not be reassigned. Manual intervention required.`
      : `All ${resolved.length} slot(s) reassigned successfully`,
  };
}

/**
 * Find an alternative room for a slot.
 */
async function findAlternativeRoom(schoolId, timetableId, slot, excludeRoomId) {
  try {
    const rooms = await prisma.room.findMany({
      where: {
        schoolId,
        id: { not: excludeRoomId },
        isAvailable: true,
        ...(slot.requiredRoomType && { type: slot.requiredRoomType }),
      },
    });

    if (rooms.length === 0) {
      logger.debug({ excludeRoomId, requiredType: slot.requiredRoomType }, 'No alternative rooms found');
      return null;
    }

    const busyRoomIds = await timetableRepository.getRoomIdsAtSlot(
      timetableId,
      slot.day,
      slot.period
    );

    const available = rooms.filter((r) => !busyRoomIds.includes(r.id));

    if (available.length === 0) {
      logger.debug({ 
        excludeRoomId, 
        day: slot.day, 
        period: slot.period,
        totalRooms: rooms.length,
        allBusy: true 
      }, 'All alternative rooms are busy');
      return null;
    }

    // Prefer rooms with similar capacity
    available.sort((a, b) => {
      if (slot.requiredCapacity && a.capacity && b.capacity) {
        return Math.abs(a.capacity - slot.requiredCapacity) - Math.abs(b.capacity - slot.requiredCapacity);
      }
      return 0;
    });

    const selected = available[0];
    
    logger.debug({ 
      slotId: slot.id, 
      oldRoomId: excludeRoomId,
      newRoomId: selected.id,
      roomType: selected.type 
    }, 'Alternative room found');

    return selected;
  } catch (error) {
    logger.error({ error: error.message, slotId: slot.id }, 'Error finding alternative room');
    return null;
  }
}

/**
 * Partial reschedule — move a set of specific slots to new times.
 */
async function handlePartialReschedule(schoolId, { timetableId, moves }) {
  // Validate required fields
  if (!timetableId) {
    throw ApiError.badRequest('Missing required field: timetableId');
  }
  
  if (!moves || !Array.isArray(moves) || moves.length === 0) {
    throw ApiError.badRequest('moves must be a non-empty array');
  }
  
  logger.info({ schoolId, timetableId, moveCount: moves.length }, 'Handling partial reschedule');
  
  const results = [];
  let successCount = 0;
  let failureCount = 0;

  for (const move of moves) {
    // Validate each move
    if (!move.slotId || move.newDay === undefined || move.newPeriod === undefined) {
      results.push({ 
        slotId: move.slotId, 
        moved: false, 
        error: 'Missing required fields: slotId, newDay, or newPeriod' 
      });
      failureCount++;
      continue;
    }
    
    try {
      await timetableRepository.moveSlot(timetableId, move.slotId, move.newDay, move.newPeriod);
      results.push({ 
        slotId: move.slotId, 
        moved: true,
        newDay: move.newDay,
        newPeriod: move.newPeriod,
      });
      successCount++;
    } catch (error) {
      logger.error({ error: error.message, move }, 'Failed to move slot');
      results.push({ 
        slotId: move.slotId, 
        moved: false, 
        error: error.message 
      });
      failureCount++;
    }
  }
  
  logger.info({ 
    timetableId, 
    totalMoves: moves.length,
    successCount,
    failureCount 
  }, 'Partial reschedule completed');

  return {
    results,
    summary: {
      total: moves.length,
      success: successCount,
      failed: failureCount,
    },
    message: failureCount > 0
      ? `${failureCount} of ${moves.length} move(s) failed. Manual intervention may be required.`
      : `All ${successCount} move(s) completed successfully`,
  };
}

/**
 * Get crisis history for a school
 */
export async function getCrisisHistory(schoolId, limit = 50, offset = 0) {
  try {
    const crises = await prisma.crisisLog.findMany({
      where: { schoolId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
    
    logger.debug({ schoolId, count: crises.length, limit, offset }, 'Retrieved crisis history');
    
    return {
      crises,
      pagination: {
        limit,
        offset,
        returned: crises.length,
      },
    };
  } catch (error) {
    logger.error({ error: error.message, schoolId }, 'Failed to get crisis history');
    throw ApiError.internal('Failed to retrieve crisis history');
  }
}