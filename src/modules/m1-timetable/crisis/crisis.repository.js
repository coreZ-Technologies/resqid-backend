/**
 * Crisis data access layer.
 * All Prisma queries for crisis operations.
 */

import { prisma } from '#config/prisma.js';

export const crisisRepository = {
  /**
   * Find a timetable by ID and school.
   */
  async findTimetable(timetableId, schoolId) {
    return prisma.timetable.findFirst({
      where: { id: timetableId, schoolId },
      select: { id: true, status: true },
    });
  },

  /**
   * Find a teacher by ID and school.
   */
  async findTeacher(teacherId, schoolId) {
    return prisma.teacher.findFirst({
      where: { id: teacherId, schoolId },
      select: { id: true, isOnLeave: true, leaveStart: true, leaveEnd: true, name: true },
    });
  },

  /**
   * Find a room by ID and school.
   */
  async findRoom(roomId, schoolId) {
    return prisma.room.findFirst({
      where: { id: roomId, schoolId },
      select: { id: true, status: true, roomNumber: true },
    });
  },

  /**
   * Find active crisis for the same resource to prevent duplicates.
   */
  async findActiveCrisis(schoolId, type, payload) {
    const where = {
      schoolId,
      status: { in: ['REPORTED', 'ANALYZING'] },
      type,
    };

    if (type === 'TEACHER_ABSENT' && payload.teacherId) {
      where.affectedTeacherIds = { has: payload.teacherId };
    } else if (type === 'ROOM_UNAVAILABLE' && payload.roomId) {
      where.affectedRoomIds = { has: payload.roomId };
    }

    return prisma.crisisEvent.findFirst({ where });
  },

  /**
   * Create a crisis event record.
   */
  async createCrisisEvent(data) {
    return prisma.crisisEvent.create({ data });
  },

  /**
   * Create a job record for async processing.
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
   * Get job record by ID.
   */
  async getJobRecord(jobId) {
    return prisma.timetableJob.findUnique({
      where: { id: jobId },
    });
  },

  /**
   * Find crisis by ID and school.
   */
  async findCrisisById(crisisId, schoolId) {
    return prisma.crisisEvent.findFirst({
      where: { id: crisisId, schoolId },
    });
  },

  /**
   * Get all active crises for a school.
   */
  async findActiveCrises(schoolId) {
    return prisma.crisisEvent.findMany({
      where: {
        schoolId,
        status: { in: ['REPORTED', 'ANALYZING', 'PARTIALLY_RESOLVED'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
  },

  /**
   * Update crisis status.
   */
  async updateCrisisStatus(crisisId, status, extra = {}) {
    return prisma.crisisEvent.update({
      where: { id: crisisId },
      data: { status, ...extra, updatedAt: new Date() },
    });
  },

  /**
   * Get crisis history with pagination.
   */
  async findCrisisHistory(schoolId, filters = {}) {
    const { startDate, endDate, type, status, limit = 20, offset = 0 } = filters;

    const where = { schoolId };
    if (type) where.type = type;
    if (status) where.status = status;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [crises, total] = await Promise.all([
      prisma.crisisEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.crisisEvent.count({ where }),
    ]);

    return { crises, total };
  },
};
