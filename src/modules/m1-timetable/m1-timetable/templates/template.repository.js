/**
 * Template data access layer.
 */

import { prisma } from '#config/prisma.js';

export const templateRepository = {
  /**
   * Create a new template.
   */
  async create(data) {
    return prisma.timetableTemplate.create({
      data: {
        ...data,
        version: 1,
        isActive: false,
        configSnapshot: data.config || {},
        constraintsSnapshot: data.constraints || {},
        totalClasses: data.classes?.length || 0,
        totalTeachers: data.teachers?.length || 0,
        totalSubjects: data.subjects?.length || 0,
        totalRooms: data.rooms?.length || 0,
      },
    });
  },

  /**
   * Find template by ID with ownership check.
   */
  async findById(id, schoolId) {
    return prisma.timetableTemplate.findFirst({
      where: { id, schoolId },
      include: {
        timetables: {
          select: { id: true, status: true, createdAt: true },
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  },

  /**
   * Find all templates for a school.
   */
  async findAllBySchool(schoolId, filters = {}) {
    const { isActive, academicYear, limit = 10, offset = 0 } = filters;
    const where = { schoolId };

    if (isActive !== undefined) where.isActive = isActive;
    if (academicYear) where.academicYear = academicYear;

    return prisma.timetableTemplate.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        _count: {
          select: { timetables: true },
        },
      },
    });
  },

  /**
   * Update a template.
   */
  async update(id, data) {
    return prisma.timetableTemplate.update({
      where: { id },
      data: {
        ...data,
        configSnapshot: data.config || undefined,
        constraintsSnapshot: data.constraints || undefined,
        version: { increment: 1 },
      },
    });
  },

  /**
   * Delete a template.
   */
  async remove(id) {
    return prisma.timetableTemplate.delete({
      where: { id },
    });
  },

  /**
   * Set a template as active (deactivates others).
   */
  async setActive(id, schoolId) {
    // Deactivate all templates for this school
    await prisma.timetableTemplate.updateMany({
      where: { schoolId, isActive: true },
      data: { isActive: false },
    });

    // Activate the selected one
    return prisma.timetableTemplate.update({
      where: { id },
      data: { isActive: true },
    });
  },

  /**
   * Duplicate a template.
   */
  async duplicate(id, newName) {
    const original = await prisma.timetableTemplate.findUnique({ where: { id } });
    if (!original) return null;

    return prisma.timetableTemplate.create({
      data: {
        schoolId: original.schoolId,
        name: newName || `${original.name} (Copy)`,
        description: original.description,
        configSnapshot: original.configSnapshot,
        constraintsSnapshot: original.constraintsSnapshot,
        academicYear: original.academicYear,
        term: original.term,
        basedOnTemplateId: id,
        version: 1,
        isActive: false,
        createdBy: original.createdBy,
      },
    });
  },

  /**
   * Archive a template.
   */
  async archive(id) {
    return prisma.timetableTemplate.update({
      where: { id },
      data: { isArchived: true, isActive: false },
    });
  },
};
