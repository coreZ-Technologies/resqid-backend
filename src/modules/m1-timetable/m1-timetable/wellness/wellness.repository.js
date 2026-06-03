/**
 * Wellness data access layer.
 */

import { prisma } from '#config/prisma.js';

export const wellnessRepository = {
  /**
   * Find wellness record by teacher ID and school.
   */
  async findByTeacher(teacherId, schoolId) {
    return prisma.teacherWellness.findFirst({
      where: { teacherId, schoolId },
    });
  },

  /**
   * Create a new wellness record.
   */
  async create(teacherId, schoolId, data) {
    return prisma.teacherWellness.create({
      data: {
        teacherId,
        schoolId,
        ...data,
      },
    });
  },

  /**
   * Update an existing wellness record.
   */
  async update(id, data) {
    return prisma.teacherWellness.update({
      where: { id },
      data,
    });
  },

  /**
   * Upsert wellness record.
   */
  async upsert(teacherId, schoolId, data) {
    return prisma.teacherWellness.upsert({
      where: {
        teacherId_schoolId: {
          teacherId,
          schoolId,
        },
      },
      create: {
        teacherId,
        schoolId,
        ...data,
      },
      update: data,
    });
  },

  /**
   * Delete wellness record.
   */
  async remove(teacherId, schoolId) {
    return prisma.teacherWellness.deleteMany({
      where: { teacherId, schoolId },
    });
  },

  /**
   * Verify teacher exists and belongs to school.
   */
  async verifyTeacher(teacherId, schoolId) {
    return prisma.teacher.findFirst({
      where: { id: teacherId, schoolId },
      select: { id: true, name: true },
    });
  },

  /**
   * Get all wellness records for a school.
   */
  async findAllBySchool(schoolId) {
    return prisma.teacherWellness.findMany({
      where: { schoolId },
      include: {
        teacher: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  },

  /**
   * Get wellness records for teachers flagged with burnout risk.
   */
  async findBurnoutRisks(schoolId) {
    return prisma.teacherWellness.findMany({
      where: {
        schoolId,
        burnoutRisk: true,
      },
      include: {
        teacher: {
          select: { id: true, name: true },
        },
      },
    });
  },

  /**
   * Get teachers needing accessibility accommodations.
   */
  async findAccessibilityNeeds(schoolId) {
    return prisma.teacherWellness.findMany({
      where: {
        schoolId,
        OR: [{ needsAccessibleRoom: true }, { needsGroundFloor: true }, { isPregnant: true }],
      },
      include: {
        teacher: {
          select: { id: true, name: true },
        },
      },
    });
  },
};
