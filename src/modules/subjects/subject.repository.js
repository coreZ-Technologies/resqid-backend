// src/modules/subjects/subject.repository.js
import { prisma } from '#config/prisma.js';

export const subjectRepository = {
  // ─── Stats ──────────────────────────────────────────────────────────────

  async getStats(schoolId) {
    const [totalSubjects, activeSubjects, periodSum, classSubjectLinks] = await Promise.all([
      prisma.subject.count({ where: { schoolId } }),
      prisma.subject.count({ where: { schoolId, isActive: true } }),
      prisma.subject.aggregate({
        where: { schoolId },
        _sum: { periodsPerWeek: true },
      }),
      prisma.timetableAssignment.findMany({
        where: { timetable: { schoolId } },
        select: { classGroupId: true },
        distinct: ['classGroupId'],
      }),
    ]);

    return {
      totalSubjects,
      activeSubjects,
      totalPeriodsPerWeek: periodSum._sum.periodsPerWeek || 0,
      classesCovered: classSubjectLinks.length,
    };
  },

  // ─── List ───────────────────────────────────────────────────────────────

  async findAll(schoolId, filters = {}) {
    const {
      page = 1,
      limit = 50,
      search,
      status = 'All',
      sortBy = 'Name',
      sortOrder = 'asc',
    } = filters;

    const where = { schoolId };

    if (status === 'Active') where.isActive = true;
    else if (status === 'Inactive') where.isActive = false;

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    const orderBy = {};
    if (sortBy === 'Name') orderBy.name = sortOrder;
    else if (sortBy === 'Code') orderBy.code = sortOrder;
    else if (sortBy === 'Periods') orderBy.periodsPerWeek = sortOrder;

    const [subjects, total] = await Promise.all([
      prisma.subject.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy,
        select: {
          id: true,
          name: true,
          code: true,
          periodsPerWeek: true,
          isActive: true,
        },
      }),
      prisma.subject.count({ where }),
    ]);

    // Get teacher counts and class assignments for these subjects
    const subjectIds = subjects.map((s) => s.id);

    const [teacherCounts, classAssignments] = await Promise.all([
      prisma.teacher.findMany({
        where: {
          schoolId,
          subjects: { hasSome: subjectIds },
        },
        select: { subjects: true },
      }),
      prisma.timetableAssignment.findMany({
        where: {
          subjectId: { in: subjectIds },
          timetable: { schoolId, status: 'PUBLISHED' },
        },
        select: {
          subjectId: true,
          classGroup: { select: { grade: true, section: true } },
        },
        distinct: ['subjectId', 'classGroupId'],
      }),
    ]);

    // Build maps
    const teacherCountMap = {};
    for (const t of teacherCounts) {
      for (const subjId of t.subjects) {
        teacherCountMap[subjId] = (teacherCountMap[subjId] || 0) + 1;
      }
    }

    const classMap = {};
    for (const a of classAssignments) {
      if (!classMap[a.subjectId]) classMap[a.subjectId] = new Set();
      classMap[a.subjectId].add(`${a.classGroup.grade || 'Cls ?'}-${a.classGroup.section || '?'}`);
    }

    const formatted = subjects.map((s) => ({
      id: s.id,
      name: s.name,
      code: s.code,
      description: null, // Subject model doesn't have description — can add later
      teachers: teacherCountMap[s.id] || 0,
      classes: [...(classMap[s.id] || [])].sort(),
      periodsPerWeek: s.periodsPerWeek || 0,
      status: s.isActive ? 'Active' : 'Inactive',
    }));

    return { subjects: formatted, total, page, limit };
  },

  // ─── Single ─────────────────────────────────────────────────────────────

  async findById(id, schoolId) {
    const s = await prisma.subject.findFirst({
      where: { id, schoolId },
      select: {
        id: true,
        name: true,
        code: true,
        periodsPerWeek: true,
        isActive: true,
        requiresLab: true,
        labPeriodsPerWeek: true,
        category: true,
      },
    });

    if (!s) return null;

    // Get teacher count
    const teacherCount = await prisma.teacher.count({
      where: { schoolId, subjects: { has: id } },
    });

    // Get class assignments
    const classAssignments = await prisma.timetableAssignment.findMany({
      where: {
        subjectId: id,
        timetable: { schoolId, status: 'PUBLISHED' },
      },
      select: {
        classGroup: { select: { grade: true, section: true } },
      },
      distinct: ['classGroupId'],
    });

    const classes = classAssignments
      .map((a) => `${a.classGroup.grade || 'Cls ?'}-${a.classGroup.section || '?'}`)
      .sort();

    return {
      id: s.id,
      name: s.name,
      code: s.code,
      description: null,
      teachers: teacherCount,
      classes,
      periodsPerWeek: s.periodsPerWeek || 0,
      status: s.isActive ? 'Active' : 'Inactive',
    };
  },

  // ─── Create ─────────────────────────────────────────────────────────────

  async create(schoolId, data) {
    const subject = await prisma.subject.create({
      data: {
        schoolId,
        name: data.name,
        code: data.code,
        periodsPerWeek: data.periodsPerWeek,
        isActive: data.status !== 'Inactive',
      },
      select: {
        id: true,
        name: true,
        code: true,
        periodsPerWeek: true,
        isActive: true,
      },
    });

    return {
      id: subject.id,
      name: subject.name,
      code: subject.code,
      description: null,
      teachers: 0,
      classes: [],
      periodsPerWeek: subject.periodsPerWeek,
      status: subject.isActive ? 'Active' : 'Inactive',
    };
  },

  // ─── Update ─────────────────────────────────────────────────────────────

  async update(id, schoolId, data) {
    const updateData = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.code !== undefined) updateData.code = data.code;
    if (data.periodsPerWeek !== undefined) updateData.periodsPerWeek = data.periodsPerWeek;
    if (data.status !== undefined) updateData.isActive = data.status === 'Active';

    await prisma.subject.update({
      where: { id },
      data: updateData,
    });

    return this.findById(id, schoolId);
  },

  // ─── Delete ─────────────────────────────────────────────────────────────

  async remove(id, schoolId) {
    const subject = await prisma.subject.findFirst({
      where: { id, schoolId },
      select: { id: true, name: true },
    });

    if (!subject) return null;

    // Check if subject is assigned to any teachers
    const teacherCount = await prisma.teacher.count({
      where: { schoolId, subjects: { has: id } },
    });

    if (teacherCount > 0) {
      throw new Error(`Cannot delete "${subject.name}" — assigned to ${teacherCount} teacher(s)`);
    }

    // Check if subject is used in any timetable
    const timetableCount = await prisma.timetableAssignment.count({
      where: { subjectId: id },
    });

    if (timetableCount > 0) {
      throw new Error(
        `Cannot delete "${subject.name}" — used in ${timetableCount} timetable assignment(s)`
      );
    }

    await prisma.subject.delete({ where: { id } });
    return true;
  },

  // ─── Bulk Create ────────────────────────────────────────────────────────

  async bulkCreate(schoolId, rows) {
    let created = 0;
    let updated = 0;
    const errors = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        if (!row.name || !row.code) {
          errors.push({ row: i + 2, message: 'Name and Code are required' });
          continue;
        }

        const periodsPerWeek = parseInt(row.periodsPerWeek) || 5;

        // Upsert — check if subject exists by code
        const existing = await prisma.subject.findFirst({
          where: { schoolId, code: row.code.toUpperCase() },
          select: { id: true },
        });

        if (existing) {
          await prisma.subject.update({
            where: { id: existing.id },
            data: {
              name: row.name,
              periodsPerWeek,
              isActive: row.status !== 'Inactive',
            },
          });
          updated++;
        } else {
          await prisma.subject.create({
            data: {
              schoolId,
              name: row.name,
              code: row.code.toUpperCase(),
              periodsPerWeek,
              isActive: row.status !== 'Inactive',
            },
          });
          created++;
        }
      } catch (err) {
        errors.push({ row: i + 2, message: err.message });
      }
    }

    return { created, updated, errors, total: rows.length };
  },

  // ─── Export ─────────────────────────────────────────────────────────────

  async findAllForExport(schoolId, filters = {}) {
    const { search, status } = filters;

    const where = { schoolId };
    if (status === 'Active') where.isActive = true;
    else if (status === 'Inactive') where.isActive = false;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    const subjects = await prisma.subject.findMany({
      where,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        code: true,
        periodsPerWeek: true,
        isActive: true,
      },
    });

    const subjectIds = subjects.map((s) => s.id);

    const [teacherCounts, classAssignments] = await Promise.all([
      prisma.teacher.findMany({
        where: { schoolId, subjects: { hasSome: subjectIds } },
        select: { subjects: true },
      }),
      prisma.timetableAssignment.findMany({
        where: {
          subjectId: { in: subjectIds },
          timetable: { schoolId, status: 'PUBLISHED' },
        },
        select: { subjectId: true, classGroup: { select: { grade: true, section: true } } },
        distinct: ['subjectId', 'classGroupId'],
      }),
    ]);

    const teacherCountMap = {};
    for (const t of teacherCounts) {
      for (const subjId of t.subjects) {
        teacherCountMap[subjId] = (teacherCountMap[subjId] || 0) + 1;
      }
    }

    const classMap = {};
    for (const a of classAssignments) {
      if (!classMap[a.subjectId]) classMap[a.subjectId] = new Set();
      classMap[a.subjectId].add(`${a.classGroup.grade || 'Cls ?'}-${a.classGroup.section || '?'}`);
    }

    return subjects.map((s) => ({
      id: s.id,
      name: s.name,
      code: s.code,
      description: null,
      teachers: teacherCountMap[s.id] || 0,
      classes: [...(classMap[s.id] || [])].sort().join('; '),
      periodsPerWeek: s.periodsPerWeek || 0,
      status: s.isActive ? 'Active' : 'Inactive',
    }));
  },

  // ─── Filter Options ─────────────────────────────────────────────────────

  async getFilterOptions() {
    return {
      statuses: ['All', 'Active', 'Inactive'],
      sortOptions: ['Name', 'Code', 'Periods'],
    };
  },

  // ─── Duplicate Check ────────────────────────────────────────────────────

  async findDuplicate(schoolId, name, code, excludeId = null) {
    const where = {
      schoolId,
      OR: [
        { name: { equals: name, mode: 'insensitive' } },
        { code: { equals: code.toUpperCase() } },
      ],
    };
    if (excludeId) where.id = { not: excludeId };

    return prisma.subject.findFirst({ where, select: { id: true, name: true, code: true } });
  },
};
