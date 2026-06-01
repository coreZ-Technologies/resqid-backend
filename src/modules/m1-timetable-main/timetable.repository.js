/**
 * timetable.repository.js
 * Data access for timetables, job records, and slot operations.
 */

import { getPrisma } from '../config/prisma';

function prisma() {
  return getPrisma();
}

// ── Job records ──────────────────────────────────────────────

export async function createJobRecord(jobId, type, schoolId) {
  return prisma().timetableJob.create({
    data: { id: jobId, type, schoolId, status: 'queued', createdAt: new Date() },
  });
}

export async function updateJobStatus(jobId, status, extra = {}) {
  return prisma().timetableJob.update({
    where: { id: jobId },
    data: { status, updatedAt: new Date(), ...extra },
  });
}

export async function getJobRecord(jobId) {
  return prisma().timetableJob.findUnique({ where: { id: jobId } });
}

// ── Timetables ───────────────────────────────────────────────

export async function saveTimetable({ schoolId, templateId, assignments, validation, meta }) {
  const tt = await prisma().timetable.create({
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
  return tt.id;
}

export async function findTimetable(id, schoolId) {
  return prisma().timetable.findFirst({
    where: { id, schoolId },
    include: { assignments: true },
  });
}

export async function findAllBySchool(schoolId) {
  return prisma().timetable.findMany({
    where: { schoolId },
    orderBy: { createdAt: 'desc' },
    select: { id: true, schoolId: true, templateId: true, meta: true, createdAt: true },
  });
}

export async function removeTimetable(id) {
  return prisma().timetable.delete({ where: { id } });
}

// ── Validation reports ───────────────────────────────────────

export async function saveValidationReport(timetableId, report) {
  return prisma().timetableValidation.upsert({
    where: { timetableId },
    create: { timetableId, ...report, createdAt: new Date() },
    update: { ...report, updatedAt: new Date() },
  });
}

export async function getValidationReport(timetableId) {
  return prisma().timetableValidation.findUnique({ where: { timetableId } });
}

// ── Context loaders (used by workers) ────────────────────────

export async function loadTemplateContext(templateId, schoolId) {
  const template = await prisma().timetableTemplate.findUnique({ where: { id: templateId } });
  const wellness = await prisma().teacherWellness.findMany({ where: { schoolId } });
  const wellnessMap = Object.fromEntries(wellness.map((w) => [w.teacherId, w]));

  const schoolConfig = {
    periodsPerDay: template.periodsPerDay,
    workingDays: template.workingDays,
    breaks: template.breaks,
    firstHalfLastPeriod: template.firstHalfLastPeriod,
  };

  const resolvers = {
    getTeacherConfig: (teacherId) => template.teachers.find((t) => t.id === teacherId) || {},
    getTeacherWellness: (teacherId) => wellnessMap[teacherId] || null,
    getSubjectConfig: (subjectId) => template.subjects?.find((s) => s.id === subjectId) || {},
    getRoomConfig: () => null, // room pass is separate
  };

  return { template, schoolConfig, resolvers };
}

export async function loadTimetableContext(timetableId, schoolId) {
  const tt = await findTimetable(timetableId, schoolId);
  const { template, schoolConfig, resolvers } = await loadTemplateContext(tt.templateId, schoolId);
  return { assignments: tt.assignments, template, schoolConfig, resolvers };
}

// ── Slot operations (used by crisis service) ─────────────────

export async function getSlotsByTeacherAndDate(timetableId, teacherId, date) {
  return prisma().timetableAssignment.findMany({
    where: { timetableId, teacherId, day: date },
  });
}

export async function getSlotsByRoom(timetableId, roomId, date) {
  return prisma().timetableAssignment.findMany({
    where: { timetableId, roomId, day: date },
  });
}

export async function getTeacherIdsAtSlot(timetableId, day, period) {
  const slots = await prisma().timetableAssignment.findMany({
    where: { timetableId, day, period },
    select: { teacherId: true },
  });
  return slots.map((s) => s.teacherId);
}

export async function getRoomIdsAtSlot(timetableId, day, period) {
  const slots = await prisma().timetableAssignment.findMany({
    where: { timetableId, day, period },
    select: { roomId: true },
  });
  return slots.map((s) => s.roomId).filter(Boolean);
}

export async function updateSlotTeacher(slotId, newTeacherId, extra = {}) {
  return prisma().timetableAssignment.update({
    where: { id: slotId },
    data: { teacherId: newTeacherId, ...extra },
  });
}

export async function updateSlotRoom(slotId, newRoomId) {
  return prisma().timetableAssignment.update({
    where: { id: slotId },
    data: { roomId: newRoomId },
  });
}

export async function moveSlot(timetableId, slotId, newDay, newPeriod) {
  return prisma().timetableAssignment.update({
    where: { id: slotId, timetableId },
    data: { day: newDay, period: newPeriod },
  });
}
