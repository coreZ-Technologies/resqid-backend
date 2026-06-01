// =============================================================================
// modules/m1-timetable/timetable.repository.js — RESQID
// All DB queries for timetable module.
// =============================================================================

import { prisma } from '#config/prisma.js';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

export const getTimetableConfig = (schoolId) =>
  prisma.schoolTimetableConfig.findUnique({ where: { schoolId } });

export const upsertTimetableConfig = (schoolId, data) =>
  prisma.schoolTimetableConfig.upsert({
    where: { schoolId },
    create: { schoolId, ...data },
    update: data,
  });

// ═══════════════════════════════════════════════════════════════════════════════
// TEACHER
// ═══════════════════════════════════════════════════════════════════════════════

export const createTeacher = (data) => prisma.teacher.create({ data });

export const listTeachers = (schoolId) =>
  prisma.teacher.findMany({ where: { schoolId, isActive: true } });

export const findTeacher = (id, schoolId) => prisma.teacher.findFirst({ where: { id, schoolId } });

export const updateTeacher = (id, data) => prisma.teacher.update({ where: { id }, data });

export const deleteTeacher = (id) =>
  prisma.teacher.update({ where: { id }, data: { isActive: false, deletedAt: new Date() } });

export const getTeachersWithConstraints = (schoolId) =>
  prisma.teacher.findMany({
    where: { schoolId, isActive: true },
    select: {
      id: true,
      name: true,
      subjects: true,
      maxPeriodsPerDay: true,
      maxPeriodsPerWeek: true,
      maxConsecutive: true,
      gradeMin: true,
      gradeMax: true,
      floorRestriction: true,
      noLabDuty: true,
      noSubstitutionDuty: true,
      unavailableDays: true,
      preferredSlots: true,
      loadPreference: true,
    },
  });

// ═══════════════════════════════════════════════════════════════════════════════
// SUBJECT
// ═══════════════════════════════════════════════════════════════════════════════

export const createSubject = (data) => prisma.subject.create({ data });

export const listSubjects = (schoolId) =>
  prisma.subject.findMany({ where: { schoolId, isActive: true } });

export const findSubject = (id, schoolId) => prisma.subject.findFirst({ where: { id, schoolId } });

export const getSubjectsForClasses = (schoolId, classIds) =>
  prisma.subject.findMany({
    where: {
      schoolId,
      isActive: true,
      periods: { some: { classId: { in: classIds } } },
    },
    include: {
      classSubjects: {
        where: { classId: { in: classIds } },
        select: { classId: true },
      },
    },
  });

// ═══════════════════════════════════════════════════════════════════════════════
// CLASS GROUP
// ═══════════════════════════════════════════════════════════════════════════════

export const createClassGroup = (data) => prisma.classGroup.create({ data });

export const listClassGroups = (schoolId) =>
  prisma.classGroup.findMany({ where: { schoolId, isActive: true } });

export const findClassGroup = (id, schoolId) =>
  prisma.classGroup.findFirst({ where: { id, schoolId } });

export const getClassesWithDetails = (classIds) =>
  prisma.classGroup.findMany({
    where: { id: { in: classIds }, isActive: true },
    select: { id: true, grade: true, section: true, roomNumber: true, studentCount: true },
  });

// ═══════════════════════════════════════════════════════════════════════════════
// PERIOD
// ═══════════════════════════════════════════════════════════════════════════════

export const createPeriod = (data) => prisma.period.create({ data });

export const bulkCreatePeriods = (periods) =>
  prisma.period.createMany({ data: periods, skipDuplicates: true });

export const getClassTimetable = (classId, schoolId) =>
  prisma.period.findMany({
    where: { classId, schoolId, isActive: true },
    orderBy: [{ dayOfWeek: 'asc' }, { periodNumber: 'asc' }],
    include: {
      teacher: { select: { id: true, name: true } },
      subject: { select: { id: true, name: true, code: true, category: true } },
    },
  });

export const getTeacherTimetable = (teacherId, schoolId) =>
  prisma.period.findMany({
    where: { teacherId, schoolId, isActive: true },
    orderBy: [{ dayOfWeek: 'asc' }, { periodNumber: 'asc' }],
    include: {
      classGroup: { select: { id: true, grade: true, section: true } },
      subject: { select: { id: true, name: true } },
    },
  });

export const getExistingPeriods = (classIds) =>
  prisma.period.findMany({
    where: { classId: { in: classIds }, isActive: true },
  });

export const deletePeriod = (id) =>
  prisma.period.update({ where: { id }, data: { isActive: false } });

export const clearClassTimetable = (classId) =>
  prisma.period.updateMany({ where: { classId }, data: { isActive: false } });

export const findTeacherPeriodAtSlot = (teacherId, dayOfWeek, periodNumber, excludeId) =>
  prisma.period.findFirst({
    where: {
      teacherId,
      dayOfWeek,
      periodNumber,
      isActive: true,
      ...(excludeId && { id: { not: excludeId } }),
    },
  });

export const findClassPeriodAtSlot = (classId, dayOfWeek, periodNumber, excludeId) =>
  prisma.period.findFirst({
    where: {
      classId,
      dayOfWeek,
      periodNumber,
      isActive: true,
      ...(excludeId && { id: { not: excludeId } }),
    },
  });

// ═══════════════════════════════════════════════════════════════════════════════
// SUBSTITUTION
// ═══════════════════════════════════════════════════════════════════════════════

export const createSubstitution = (data) => prisma.substitution.create({ data });

export const listSubstitutions = (schoolId, date) =>
  prisma.substitution.findMany({
    where: { schoolId, ...(date && { date: new Date(date) }) },
    orderBy: { date: 'desc' },
    include: {
      period: {
        include: {
          classGroup: { select: { grade: true, section: true } },
          subject: { select: { name: true } },
          teacher: { select: { name: true } },
        },
      },
      substitute: { select: { name: true } },
      originalTeacher: { select: { name: true } },
    },
  });

export const findSubstitution = (id, schoolId) =>
  prisma.substitution.findFirst({ where: { id, schoolId } });

export const updateSubstitutionStatus = (id, status, approvedBy) =>
  prisma.substitution.update({
    where: { id },
    data: { status, approvedBy, approvedAt: new Date() },
  });

// ═══════════════════════════════════════════════════════════════════════════════
// BULK SAVE GENERATED TIMETABLE
// ═══════════════════════════════════════════════════════════════════════════════

export const saveGeneratedTimetable = async (schoolId, classIds, periods) => {
  // Clear existing for these classes
  await prisma.period.updateMany({
    where: { classId: { in: classIds }, schoolId },
    data: { isActive: false },
  });

  // Insert new periods
  if (periods.length > 0) {
    await prisma.period.createMany({
      data: periods.map((p) => ({
        schoolId,
        classId: p.classId,
        teacherId: p.teacherId,
        subjectId: p.subjectId,
        dayOfWeek: p.dayOfWeek,
        periodNumber: p.periodNumber,
        roomNumber: p.roomNumber || null,
        periodType: p.type || 'REGULAR',
        isActive: true,
      })),
      skipDuplicates: true,
    });
  }

  return { replaced: periods.length };
};
