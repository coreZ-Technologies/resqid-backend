/**
 * Timetable data access layer.
 */

import { prisma } from '#config/prisma.js';

export const timetableRepository = {
  // ─── Timetables ────────────────────────────────────────────────────────────

  /**
   * Find timetable by ID with ownership check.
   */
  async findById(id, schoolId) {
    return prisma.timetable.findFirst({
      where: { id, schoolId },
      include: {
        assignments: {
          include: {
            classGroup: { select: { grade: true, section: true, label: true } },
            subject: { select: { name: true, code: true } },
            teacher: { select: { name: true } },
            room: { select: { roomNumber: true, roomName: true } },
          },
        },
        template: {
          select: { name: true, academicYear: true, term: true },
        },
        validations: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  },

  /**
   * Find all timetables for a school.
   */
  async findAllBySchool(schoolId, filters = {}) {
    const { status, limit = 10, offset = 0 } = filters;
    const where = { schoolId };
    if (status) where.status = status;

    return prisma.timetable.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        status: true,
        generationType: true,
        totalSlots: true,
        healthScore: true,
        wellnessScore: true,
        createdAt: true,
        publishedAt: true,
        template: { select: { name: true } },
      },
    });
  },

  /**
   * Save a complete timetable with assignments.
   */
  async saveTimetable({ schoolId, templateId, assignments, validation, meta, generationType }) {
    const timetable = await prisma.timetable.create({
      data: {
        schoolId,
        templateId,
        generationType: generationType || 'FRESH',
        status: 'GENERATED',
        totalSlots: assignments.length,
        assignedSlots: assignments.length,
        healthScore: meta?.qualityScore || 0,
        wellnessScore: meta?.wellnessScore || 0,
        generatedAt: new Date(),
        meta,
        assignments: {
          create: assignments.map((a) => ({
            dayOfWeek: a.day || a.dayOfWeek,
            periodNumber: a.period || a.periodNumber,
            classGroupId: a.classId,
            subjectId: a.subjectId,
            teacherId: a.teacherId,
            roomId: a.roomId || null,
            periodType: a.periodType || 'REGULAR',
            isSubstituted: a.isSubstituted || false,
            isTemporary: a.isTemporary || false,
            isManuallyPlaced: a.isManuallyPlaced || false,
            notes: a.notes || null,
          })),
        },
      },
    });

    // Save validation report if provided
    if (validation) {
      await prisma.timetableValidation.create({
        data: {
          timetableId: timetable.id,
          overallScore: validation.score || 0,
          healthScore: validation.scores?.hard || 0,
          wellnessScore: validation.scores?.wellness || 0,
          utilizationScore: validation.scores?.utilization || 0,
          criticalIssues: validation.violations?.length || 0,
          warnings: validation.warnings?.length || 0,
          suggestions: validation.suggestions?.length || 0,
          criticalList: validation.violations || [],
          warningList: validation.warnings || [],
          suggestionList: validation.suggestions || [],
        },
      });
    }

    return timetable;
  },

  /**
   * Update timetable status.
   */
  async updateStatus(id, status) {
    const data = { status };
    if (status === 'PUBLISHED') data.publishedAt = new Date();

    return prisma.timetable.update({
      where: { id },
      data,
    });
  },

  /**
   * Delete a timetable.
   */
  async remove(id) {
    return prisma.timetable.delete({ where: { id } });
  },

  // ─── Jobs ──────────────────────────────────────────────────────────────────

  /**
   * Create a job record.
   */
  async createJobRecord(jobId, type, schoolId) {
    return prisma.timetableJob.create({
      data: {
        id: jobId,
        type,
        schoolId,
        status: 'QUEUED',
      },
    });
  },

  /**
   * Update job status.
   */
  async updateJobStatus(jobId, status, extra = {}) {
    return prisma.timetableJob.update({
      where: { id: jobId },
      data: { status, ...extra, updatedAt: new Date() },
    });
  },

  /**
   * Get job record.
   */
  async getJobRecord(jobId) {
    return prisma.timetableJob.findUnique({ where: { id: jobId } });
  },

  // ─── Context Loading ───────────────────────────────────────────────────────

  /**
   * Load full template context for solver.
   */
  async loadTemplateContext(templateId, schoolId) {
    const template = await prisma.timetableTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) return null;

    const [teachers, rooms, classes, subjects, wellness, config] = await Promise.all([
      prisma.teacher.findMany({ where: { schoolId, isActive: true } }),
      prisma.room.findMany({ where: { schoolId, isActive: true } }),
      prisma.classGroup.findMany({ where: { schoolId, isActive: true } }),
      prisma.subject.findMany({ where: { schoolId, isActive: true } }),
      prisma.teacherWellness.findMany({ where: { schoolId } }),
      prisma.schoolTimetableConfig.findUnique({ where: { schoolId } }),
    ]);

    const wellnessMap = Object.fromEntries(wellness.map((w) => [w.teacherId, w]));

    return {
      template: {
        ...template,
        configSnapshot: template.configSnapshot,
        constraintsSnapshot: template.constraintsSnapshot,
        classes,
        teachers,
        subjects,
        rooms,
      },
      schoolConfig: {
        periodsPerDay: config?.periodsPerDay || 8,
        workingDays: config?.workingDays || [1, 2, 3, 4, 5, 6],
        breakAfterPeriods: config?.breakAfterPeriods || [],
        morningPeriodsEnd: config?.morningPeriodsEnd || 4,
        gradeLevels: template.configSnapshot?.gradeLevels || [],
      },
      resolvers: {
        getTeacherConfig: (teacherId) => teachers.find((t) => t.id === teacherId) || {},
        getTeacherWellness: (teacherId) => wellnessMap[teacherId] || null,
        getSubjectConfig: (subjectId) => subjects.find((s) => s.id === subjectId) || {},
        getRoomConfig: (roomId) => rooms.find((r) => r.id === roomId) || null,
        getClassConfig: (classId) => classes.find((c) => c.id === classId) || null,
      },
    };
  },

  // ─── Slot Operations (for crisis) ──────────────────────────────────────────

  async getSlotsByTeacherAndDate(timetableId, teacherId, dayOfWeek) {
    return prisma.timetableAssignment.findMany({
      where: { timetableId, teacherId, dayOfWeek },
    });
  },

  async getSlotsByRoom(timetableId, roomId, dayOfWeek) {
    return prisma.timetableAssignment.findMany({
      where: { timetableId, roomId, dayOfWeek },
    });
  },

  async updateSlotTeacher(slotId, newTeacherId, extra = {}) {
    return prisma.timetableAssignment.update({
      where: { id: slotId },
      data: { teacherId: newTeacherId, ...extra },
    });
  },

  async updateSlotRoom(slotId, newRoomId) {
    return prisma.timetableAssignment.update({
      where: { id: slotId },
      data: { roomId: newRoomId },
    });
  },

  async moveSlot(slotId, newDay, newPeriod) {
    return prisma.timetableAssignment.update({
      where: { id: slotId },
      data: { dayOfWeek: newDay, periodNumber: newPeriod },
    });
  },
};
