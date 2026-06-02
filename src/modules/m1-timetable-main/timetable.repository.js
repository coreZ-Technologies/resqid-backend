/**
 * timetable.repository.js
 * Data access for timetables, job records, and slot operations.
 */

import { prisma } from '#config/prisma.js';
import { logger } from '#config/logger.js';
import { ApiError } from '#shared/response/ApiError.js';

// ── Job records ──────────────────────────────────────────────

export async function createJobRecord(jobId, type, schoolId) {
  try {
    return await prisma.timetableJob.create({
      data: { id: jobId, type, schoolId, status: 'queued', createdAt: new Date() },
    });
  } catch (error) {
    logger.error({ error: error.message, jobId, type, schoolId }, 'Failed to create job record');
    throw ApiError.internal('Failed to create job record');
  }
}

export async function updateJobStatus(jobId, status, extra = {}) {
  try {
    return await prisma.timetableJob.update({
      where: { id: jobId },
      data: { status, updatedAt: new Date(), ...extra },
    });
  } catch (error) {
    logger.error({ error: error.message, jobId, status }, 'Failed to update job status');
    throw ApiError.internal('Failed to update job status');
  }
}

export async function getJobRecord(jobId) {
  try {
    const record = await prisma.timetableJob.findUnique({ where: { id: jobId } });
    if (!record) {
      throw ApiError.notFound(`Job record not found: ${jobId}`);
    }
    return record;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error({ error: error.message, jobId }, 'Failed to fetch job record');
    throw ApiError.internal('Failed to fetch job record');
  }
}

// ── Timetables ───────────────────────────────────────────────

export async function saveTimetable({ schoolId, templateId, assignments, validation, meta }) {
  try {
    const tt = await prisma.timetable.create({
      data: {
        schoolId,
        templateId,
        meta,
        createdAt: new Date(),
        assignments: {
          create: assignments.map((a) => ({
            classId: a.classId,
            subjectId: a.subjectId,
            teacherId: a.teacherId,
            day: a.day,
            period: a.period,
            roomId: a.roomId ?? null,
            isTemporary: false,
          })),
        },
      },
    });
    
    // Store validation separately
    if (validation) {
      await saveValidationReport(tt.id, validation);
    }
    
    logger.info({ timetableId: tt.id, schoolId, templateId, assignmentCount: assignments.length }, 'Timetable saved');
    return tt.id;
  } catch (error) {
    logger.error({ error: error.message, schoolId, templateId }, 'Failed to save timetable');
    throw ApiError.internal('Failed to save timetable');
  }
}

export async function findTimetable(id, schoolId) {
  try {
    const timetable = await prisma.timetable.findFirst({
      where: { id, schoolId },
      include: { assignments: true },
    });
    
    if (!timetable) {
      throw ApiError.notFound(`Timetable not found: ${id}`);
    }
    
    return timetable;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error({ error: error.message, id, schoolId }, 'Failed to find timetable');
    throw ApiError.internal('Failed to find timetable');
  }
}

export async function findAllBySchool(schoolId) {
  try {
    return await prisma.timetable.findMany({
      where: { schoolId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, schoolId: true, templateId: true, meta: true, createdAt: true },
    });
  } catch (error) {
    logger.error({ error: error.message, schoolId }, 'Failed to fetch timetables for school');
    throw ApiError.internal('Failed to fetch timetables');
  }
}

export async function removeTimetable(id) {
  try {
    return await prisma.timetable.delete({ where: { id } });
  } catch (error) {
    if (error.code === 'P2025') {
      throw ApiError.notFound(`Timetable not found: ${id}`);
    }
    logger.error({ error: error.message, id }, 'Failed to delete timetable');
    throw ApiError.internal('Failed to delete timetable');
  }
}

// ── Validation reports ───────────────────────────────────────

export async function saveValidationReport(timetableId, report) {
  try {
    return await prisma.timetableValidation.upsert({
      where: { timetableId },
      create: { timetableId, ...report, createdAt: new Date() },
      update: { ...report, updatedAt: new Date() },
    });
  } catch (error) {
    logger.error({ error: error.message, timetableId }, 'Failed to save validation report');
    throw ApiError.internal('Failed to save validation report');
  }
}

export async function getValidationReport(timetableId) {
  try {
    return await prisma.timetableValidation.findUnique({ where: { timetableId } });
  } catch (error) {
    logger.error({ error: error.message, timetableId }, 'Failed to fetch validation report');
    throw ApiError.internal('Failed to fetch validation report');
  }
}

// ── Context loaders (used by workers) ────────────────────────

export async function loadTemplateContext(templateId, schoolId) {
  try {
    const template = await prisma.timetableTemplate.findUnique({ 
      where: { id: templateId } 
    });
    
    if (!template) {
      throw ApiError.notFound(`Template not found: ${templateId}`);
    }
    
    const wellness = await prisma.teacherWellness.findMany({ 
      where: { schoolId } 
    });
    const wellnessMap = Object.fromEntries(wellness.map((w) => [w.teacherId, w]));

    const schoolConfig = {
      periodsPerDay: template.periodsPerDay,
      workingDays: template.workingDays,
      breaks: template.breaks,
      firstHalfLastPeriod: template.firstHalfLastPeriod,
    };

    const resolvers = {
      getTeacherConfig: (teacherId) => template.teachers?.find((t) => t.id === teacherId) || {},
      getTeacherWellness: (teacherId) => wellnessMap[teacherId] || null,
      getSubjectConfig: (subjectId) => template.subjects?.find((s) => s.id === subjectId) || {},
      getRoomConfig: () => null, // room pass is separate
    };

    return { template, schoolConfig, resolvers };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error({ error: error.message, templateId, schoolId }, 'Failed to load template context');
    throw ApiError.internal('Failed to load template context');
  }
}

export async function loadTimetableContext(timetableId, schoolId) {
  try {
    const tt = await findTimetable(timetableId, schoolId);
    const { template, schoolConfig, resolvers } = await loadTemplateContext(tt.templateId, schoolId);
    return { assignments: tt.assignments, template, schoolConfig, resolvers };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error({ error: error.message, timetableId, schoolId }, 'Failed to load timetable context');
    throw ApiError.internal('Failed to load timetable context');
  }
}

// ── Slot operations (used by crisis service) ─────────────────

export async function getSlotsByTeacherAndDate(timetableId, teacherId, date) {
  try {
    return await prisma.timetableAssignment.findMany({
      where: { timetableId, teacherId, day: date },
    });
  } catch (error) {
    logger.error({ error: error.message, timetableId, teacherId, date }, 'Failed to get slots by teacher');
    throw ApiError.internal('Failed to fetch teacher slots');
  }
}

export async function getSlotsByRoom(timetableId, roomId, date) {
  try {
    return await prisma.timetableAssignment.findMany({
      where: { timetableId, roomId, day: date },
    });
  } catch (error) {
    logger.error({ error: error.message, timetableId, roomId, date }, 'Failed to get slots by room');
    throw ApiError.internal('Failed to fetch room slots');
  }
}

export async function getTeacherIdsAtSlot(timetableId, day, period) {
  try {
    const slots = await prisma.timetableAssignment.findMany({
      where: { timetableId, day, period },
      select: { teacherId: true },
    });
    return slots.map((s) => s.teacherId);
  } catch (error) {
    logger.error({ error: error.message, timetableId, day, period }, 'Failed to get teacher IDs at slot');
    throw ApiError.internal('Failed to fetch teacher IDs');
  }
}

export async function getRoomIdsAtSlot(timetableId, day, period) {
  try {
    const slots = await prisma.timetableAssignment.findMany({
      where: { timetableId, day, period },
      select: { roomId: true },
    });
    return slots.map((s) => s.roomId).filter(Boolean);
  } catch (error) {
    logger.error({ error: error.message, timetableId, day, period }, 'Failed to get room IDs at slot');
    throw ApiError.internal('Failed to fetch room IDs');
  }
}

export async function updateSlotTeacher(slotId, newTeacherId, extra = {}) {
  try {
    return await prisma.timetableAssignment.update({
      where: { id: slotId },
      data: { teacherId: newTeacherId, ...extra },
    });
  } catch (error) {
    if (error.code === 'P2025') {
      throw ApiError.notFound(`Slot not found: ${slotId}`);
    }
    logger.error({ error: error.message, slotId, newTeacherId }, 'Failed to update slot teacher');
    throw ApiError.internal('Failed to update slot teacher');
  }
}

export async function updateSlotRoom(slotId, newRoomId) {
  try {
    return await prisma.timetableAssignment.update({
      where: { id: slotId },
      data: { roomId: newRoomId },
    });
  } catch (error) {
    if (error.code === 'P2025') {
      throw ApiError.notFound(`Slot not found: ${slotId}`);
    }
    logger.error({ error: error.message, slotId, newRoomId }, 'Failed to update slot room');
    throw ApiError.internal('Failed to update slot room');
  }
}

export async function moveSlot(timetableId, slotId, newDay, newPeriod) {
  try {
    return await prisma.timetableAssignment.update({
      where: { id: slotId, timetableId },
      data: { day: newDay, period: newPeriod },
    });
  } catch (error) {
    if (error.code === 'P2025') {
      throw ApiError.notFound(`Slot not found: ${slotId}`);
    }
    logger.error({ error: error.message, timetableId, slotId, newDay, newPeriod }, 'Failed to move slot');
    throw ApiError.internal('Failed to move slot');
  }
}