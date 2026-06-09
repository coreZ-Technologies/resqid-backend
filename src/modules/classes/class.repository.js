// src/modules/classes/class.repository.js
import { prisma } from '#config/prisma.js';

const GRADE_GROUP_MAP = {
  Primary: ['Nursery', 'LKG', 'UKG', 'Cls 1', 'Cls 2', 'Cls 3', 'Cls 4', 'Cls 5'],
  Middle: ['Cls 6', 'Cls 7', 'Cls 8'],
  Secondary: ['Cls 9', 'Cls 10'],
  Senior: ['Cls 11', 'Cls 12'],
};

function gradeToNumeric(grade) {
  const num = parseInt(
    grade.replace('Cls ', '').replace('Nursery', '-3').replace('LKG', '-2').replace('UKG', '-1')
  );
  return isNaN(num) ? 0 : num;
}

export const classRepository = {
  // ─── Stats ──────────────────────────────────────────────────────────────

  async getStats(schoolId) {
    const [totalClasses, totalStudents, activeClasses] = await Promise.all([
      prisma.classGroup.count({ where: { schoolId } }),
      prisma.student.count({ where: { schoolId, status: 'ACTIVE' } }),
      prisma.classGroup.count({ where: { schoolId, isActive: true } }),
    ]);

    return {
      totalClasses,
      totalStudents,
      activeClasses,
      gradeGroups: 4,
    };
  },

  // ─── List ───────────────────────────────────────────────────────────────

  async findAll(schoolId, filters = {}) {
    const { gradeGroup, status, search, limit = 100, offset = 0 } = filters;

    const where = { schoolId };

    if (gradeGroup && gradeGroup !== 'All') {
      where.grade = { in: GRADE_GROUP_MAP[gradeGroup] || [] };
    }

    if (status === 'Active') where.isActive = true;
    else if (status === 'Inactive') where.isActive = false;

    if (search) {
      where.OR = [
        { grade: { contains: search, mode: 'insensitive' } },
        { section: { contains: search, mode: 'insensitive' } },
        { teacher: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [classGroups, total] = await Promise.all([
      prisma.classGroup.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { grade: 'asc' },
        select: {
          id: true,
          grade: true,
          section: true,
          studentCount: true,
          isActive: true,
          teacher: { select: { name: true } },
          room: { select: { roomNumber: true } },
          subjects: {
            select: { name: true },
            orderBy: { name: 'asc' },
          },
        },
      }),
      prisma.classGroup.count({ where }),
    ]);

    const classes = classGroups
      .map((c) => ({
        id: c.id,
        grade: c.grade || '—',
        section: c.section || '—',
        classTeacher: c.teacher?.name || null,
        students: c.studentCount || 0,
        subjects: c.subjects?.map((s) => s.name) || [],
        room: c.room?.roomNumber || null,
        status: c.isActive ? 'Active' : 'Inactive',
      }))
      .sort(
        (a, b) =>
          gradeToNumeric(a.grade) - gradeToNumeric(b.grade) || a.section.localeCompare(b.section)
      );

    return { classes, total, limit, offset };
  },

  // ─── Single ─────────────────────────────────────────────────────────────

  async findById(id, schoolId) {
    const c = await prisma.classGroup.findFirst({
      where: { id, schoolId },
      select: {
        id: true,
        grade: true,
        section: true,
        studentCount: true,
        isActive: true,
        periodsPerDay: true,
        startTime: true,
        endTime: true,
        teacherId: true,
        teacher: { select: { id: true, name: true } },
        roomId: true,
        room: { select: { id: true, roomNumber: true } },
        subjects: {
          select: { id: true, name: true, code: true },
          orderBy: { name: 'asc' },
        },
      },
    });

    if (!c) return null;

    return {
      id: c.id,
      grade: c.grade,
      section: c.section,
      classTeacher: c.teacher?.name || null,
      teacherId: c.teacherId,
      students: c.studentCount || 0,
      subjects: c.subjects?.map((s) => ({ id: s.id, name: s.name, code: s.code })) || [],
      room: c.room?.roomNumber || null,
      roomId: c.roomId,
      status: c.isActive ? 'Active' : 'Inactive',
      periodsPerDay: c.periodsPerDay,
      startTime: c.startTime,
      endTime: c.endTime,
    };
  },

  // ─── Create ─────────────────────────────────────────────────────────────

  async create(schoolId, data) {
    // Resolve teacherId from name if provided
    let teacherId = null;
    if (data.classTeacher) {
      const teacher = await prisma.teacher.findFirst({
        where: { schoolId, name: data.classTeacher },
        select: { id: true },
      });
      teacherId = teacher?.id || null;
    }

    // Resolve roomId from room number if provided
    let roomId = null;
    if (data.room) {
      const room = await prisma.room.findFirst({
        where: { schoolId, roomNumber: data.room },
        select: { id: true },
      });
      roomId = room?.id || null;
    }

    const classGroup = await prisma.classGroup.create({
      data: {
        schoolId,
        grade: data.grade,
        section: data.section,
        teacherId,
        roomId,
        isActive: data.status !== 'Inactive',
        studentCount: 0,
      },
      select: {
        id: true,
        grade: true,
        section: true,
        studentCount: true,
        isActive: true,
        teacher: { select: { name: true } },
        room: { select: { roomNumber: true } },
      },
    });

    return {
      id: classGroup.id,
      grade: classGroup.grade,
      section: classGroup.section,
      classTeacher: classGroup.teacher?.name || null,
      students: classGroup.studentCount || 0,
      subjects: [],
      room: classGroup.room?.roomNumber || null,
      status: classGroup.isActive ? 'Active' : 'Inactive',
    };
  },

  // ─── Update ─────────────────────────────────────────────────────────────

  async update(id, schoolId, data) {
    const updateData = {};

    if (data.grade !== undefined) updateData.grade = data.grade;
    if (data.section !== undefined) updateData.section = data.section;
    if (data.status !== undefined) updateData.isActive = data.status === 'Active';

    if (data.classTeacher !== undefined) {
      if (data.classTeacher) {
        const teacher = await prisma.teacher.findFirst({
          where: { schoolId, name: data.classTeacher },
          select: { id: true },
        });
        updateData.teacherId = teacher?.id || null;
      } else {
        updateData.teacherId = null;
      }
    }

    if (data.room !== undefined) {
      if (data.room) {
        const room = await prisma.room.findFirst({
          where: { schoolId, roomNumber: data.room },
          select: { id: true },
        });
        updateData.roomId = room?.id || null;
      } else {
        updateData.roomId = null;
      }
    }

    const updated = await prisma.classGroup.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        grade: true,
        section: true,
        studentCount: true,
        isActive: true,
        teacher: { select: { name: true } },
        room: { select: { roomNumber: true } },
        subjects: {
          select: { name: true },
          orderBy: { name: 'asc' },
        },
      },
    });

    return {
      id: updated.id,
      grade: updated.grade,
      section: updated.section,
      classTeacher: updated.teacher?.name || null,
      students: updated.studentCount || 0,
      subjects: updated.subjects?.map((s) => s.name) || [],
      room: updated.room?.roomNumber || null,
      status: updated.isActive ? 'Active' : 'Inactive',
    };
  },

  // ─── Delete ─────────────────────────────────────────────────────────────

  async remove(id, schoolId) {
    const classGroup = await prisma.classGroup.findFirst({
      where: { id, schoolId },
      select: { id: true, studentCount: true },
    });

    if (!classGroup) return null;

    if (classGroup.studentCount > 0) {
      throw new Error(`Cannot delete class with ${classGroup.studentCount} enrolled students`);
    }

    await prisma.classGroup.delete({ where: { id } });
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
        // Validate required fields
        if (!row.grade || !row.section) {
          errors.push({ row: i + 2, message: 'Grade and Section are required' });
          continue;
        }

        // Upsert — check if class already exists
        const existing = await prisma.classGroup.findFirst({
          where: { schoolId, grade: row.grade, section: row.section },
          select: { id: true },
        });

        if (existing) {
          await this.update(existing.id, schoolId, {
            classTeacher: row.classTeacher || null,
            room: row.room || null,
            status: row.status || 'Active',
          });
          updated++;
        } else {
          await this.create(schoolId, {
            grade: row.grade,
            section: row.section,
            classTeacher: row.classTeacher || null,
            room: row.room || null,
            status: row.status || 'Active',
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
    const { gradeGroup, status, search } = filters;
    const result = await this.findAll(schoolId, {
      gradeGroup,
      status,
      search,
      limit: 9999,
      offset: 0,
    });
    return result.classes;
  },

  // ─── Filter Options ─────────────────────────────────────────────────────

  async getFilterOptions() {
    return {
      gradeGroups: ['Primary', 'Middle', 'Secondary', 'Senior'],
      statuses: ['Active', 'Inactive'],
    };
  },
};
