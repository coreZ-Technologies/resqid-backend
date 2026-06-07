// src/modules/teachers/teacher.repository.js
import { prisma } from '#config/prisma.js';

export const teacherRepository = {
  // ─── Dropdown Options ──────────────────────────────────────────────────

  async getDropdownOptions(schoolId) {
    const [subjects, classGroups] = await Promise.all([
      prisma.subject.findMany({
        where: { schoolId, isActive: true },
        select: { name: true },
        orderBy: { name: 'asc' },
      }),
      prisma.classGroup.findMany({
        where: { schoolId, isActive: true },
        select: { grade: true, section: true },
        orderBy: [{ grade: 'asc' }, { section: 'asc' }],
      }),
    ]);

    return {
      subjects: subjects.map((s) => s.name),
      classes: classGroups.map((c) => `Class ${c.grade}-${c.section}`),
      qualifications: [
        'B.Ed',
        'M.Ed',
        'B.Sc + B.Ed',
        'M.Sc',
        'M.A',
        'B.Tech',
        'M.Tech',
        'B.P.Ed',
        'B.F.A',
        'Other',
      ],
      salutations: ['Mr.', 'Ms.', 'Mrs.', 'Dr.'],
    };
  },

  // ─── Email / Phone Availability ────────────────────────────────────────

  async isEmailAvailable(email, schoolId, excludeId = null) {
    const where = { schoolId, email: email.toLowerCase() };
    if (excludeId) where.id = { not: excludeId };

    const exists = await prisma.teacher.findFirst({
      where,
      select: { id: true },
    });

    if (exists) return false;

    // Also check SchoolUser table
    const userExists = await prisma.schoolUser.findFirst({
      where: { email: email.toLowerCase(), ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { id: true },
    });

    return !userExists;
  },

  async isPhoneAvailable(phone, schoolId, excludeId = null) {
    const where = { schoolId, phone };
    if (excludeId) where.id = { not: excludeId };

    const exists = await prisma.teacher.findFirst({
      where,
      select: { id: true },
    });

    return !exists;
  },

  // ─── Create ─────────────────────────────────────────────────────────────

  async create(schoolId, data) {
    const fullName =
      `${data.salutation ? data.salutation + ' ' : ''}${data.firstName} ${data.lastName}`.trim();

    // Resolve assigned classes to classGroup IDs
    const classGroups = await prisma.classGroup.findMany({
      where: {
        schoolId,
        isActive: true,
      },
      select: { id: true, grade: true, section: true },
    });

    const classMap = new Map();
    for (const c of classGroups) {
      classMap.set(`Class ${c.grade}-${c.section}`, c.id);
    }

    const assignedClassIds = data.assignedClasses.map((name) => classMap.get(name)).filter(Boolean);

    // Create teacher record
    const teacher = await prisma.teacher.create({
      data: {
        schoolId,
        name: fullName,
        email: data.email.toLowerCase(),
        phone: data.phone,
        subjects: [data.subject],
        qualifications: [data.qualification],
        experience: data.experience ? parseInt(data.experience) || 0 : 0,
        joiningDate: data.joiningDate ? new Date(data.joiningDate) : new Date(),
        employeeId: data.employeeId || null,
        isActive: true,
        maxPeriodsPerDay: 6,
        maxPeriodsPerWeek: 30,
        classGroups: {
          connect: assignedClassIds.map((id) => ({ id })),
        },
      },
      select: { id: true },
    });

    // Create SchoolUser for portal login
    await prisma.schoolUser.create({
      data: {
        schoolId,
        name: fullName,
        email: data.email.toLowerCase(),
        phone: data.phone,
        passwordHash: data.password, // Already hashed from service
        role: 'TEACHER',
        isActive: true,
        teacher: { connect: { id: teacher.id } },
      },
    });

    return { id: teacher.id };
  },

  // ─── List ───────────────────────────────────────────────────────────────

  async findAll(schoolId, filters = {}) {
    const { page = 1, limit = 20, search, subject, status = 'All', sortBy = 'Name' } = filters;

    const where = { schoolId };

    if (status === 'Active') where.isActive = true;
    else if (status === 'Inactive') where.isActive = false;

    if (subject) {
      where.subjects = { has: subject };
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { employeeId: { contains: search, mode: 'insensitive' } },
      ];
    }

    const orderBy =
      sortBy === 'JoiningDate'
        ? { joiningDate: 'desc' }
        : sortBy === 'Subject'
          ? { subjects: 'asc' }
          : { name: 'asc' };

    const [teachers, total] = await Promise.all([
      prisma.teacher.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          subjects: true,
          qualifications: true,
          experience: true,
          joiningDate: true,
          employeeId: true,
          isActive: true,
          classGroups: {
            select: { grade: true, section: true },
            orderBy: { grade: 'asc' },
          },
        },
      }),
      prisma.teacher.count({ where }),
    ]);

    const formatted = teachers.map((t) => ({
      id: t.id,
      name: t.name,
      email: t.email,
      phone: t.phone,
      subjects: t.subjects,
      qualifications: t.qualifications,
      experience: t.experience ? `${t.experience} years` : 'Fresher',
      joiningDate: t.joiningDate?.toISOString().split('T')[0] || null,
      employeeId: t.employeeId,
      assignedClasses: t.classGroups.map((c) => `Class ${c.grade}-${c.section}`),
      status: t.isActive ? 'Active' : 'Inactive',
    }));

    return { teachers: formatted, total, page, limit };
  },

  // ─── Single ─────────────────────────────────────────────────────────────

  async findById(id, schoolId) {
    const t = await prisma.teacher.findFirst({
      where: { id, schoolId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        subjects: true,
        qualifications: true,
        experience: true,
        joiningDate: true,
        employeeId: true,
        isActive: true,
        maxPeriodsPerDay: true,
        maxPeriodsPerWeek: true,
        schoolUser: {
          select: { id: true, role: true, lastLoginAt: true },
        },
        classGroups: {
          select: { id: true, grade: true, section: true, studentCount: true },
          orderBy: { grade: 'asc' },
        },
        wellness: {
          select: {
            isPregnant: true,
            needsAccessibleRoom: true,
            needsGroundFloor: true,
            isSenior: true,
            burnoutRisk: true,
          },
        },
      },
    });

    if (!t) return null;

    return {
      id: t.id,
      name: t.name,
      email: t.email,
      phone: t.phone,
      subjects: t.subjects,
      qualifications: t.qualifications,
      experience: t.experience ? `${t.experience} years` : 'Fresher',
      joiningDate: t.joiningDate?.toISOString().split('T')[0] || null,
      employeeId: t.employeeId,
      status: t.isActive ? 'Active' : 'Inactive',
      maxPeriodsPerDay: t.maxPeriodsPerDay,
      maxPeriodsPerWeek: t.maxPeriodsPerWeek,
      assignedClasses: t.classGroups.map((c) => ({
        id: c.id,
        name: `Class ${c.grade}-${c.section}`,
        studentCount: c.studentCount,
      })),
      portalRole: t.schoolUser?.role || 'TEACHER',
      lastLogin: t.schoolUser?.lastLoginAt || null,
      wellness: t.wellness || null,
    };
  },

  // ─── Update ─────────────────────────────────────────────────────────────

  async update(id, schoolId, data) {
    const updateData = {};

    if (
      data.firstName !== undefined ||
      data.lastName !== undefined ||
      data.salutation !== undefined
    ) {
      const existing = await prisma.teacher.findFirst({
        where: { id, schoolId },
        select: { name: true, firstName: true, lastName: true },
      });
      // We don't store salutation separately, so just rebuild name
      if (data.firstName || data.lastName) {
        const salutation = data.salutation || '';
        const first = data.firstName || existing?.firstName || '';
        const last = data.lastName || existing?.lastName || '';
        updateData.name = `${salutation ? salutation + ' ' : ''}${first} ${last}`.trim();
      }
    }

    if (data.email !== undefined) updateData.email = data.email.toLowerCase();
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.subject !== undefined) updateData.subjects = [data.subject];
    if (data.qualification !== undefined) updateData.qualifications = [data.qualification];
    if (data.experience !== undefined) updateData.experience = parseInt(data.experience) || 0;
    if (data.joiningDate !== undefined) updateData.joiningDate = new Date(data.joiningDate);
    if (data.employeeId !== undefined) updateData.employeeId = data.employeeId || null;

    await prisma.teacher.update({
      where: { id },
      data: updateData,
    });

    // Update assigned classes if provided
    if (data.assignedClasses !== undefined) {
      const classGroups = await prisma.classGroup.findMany({
        where: { schoolId, isActive: true },
        select: { id: true, grade: true, section: true },
      });

      const classMap = new Map();
      for (const c of classGroups) {
        classMap.set(`Class ${c.grade}-${c.section}`, c.id);
      }

      const newClassIds = data.assignedClasses.map((name) => classMap.get(name)).filter(Boolean);

      await prisma.teacher.update({
        where: { id },
        data: {
          classGroups: {
            set: [],
          },
        },
      });

      if (newClassIds.length > 0) {
        await prisma.teacher.update({
          where: { id },
          data: {
            classGroups: {
              connect: newClassIds.map((cid) => ({ id: cid })),
            },
          },
        });
      }
    }

    // Update SchoolUser if email changes
    if (data.email) {
      await prisma.schoolUser.updateMany({
        where: { teacherId: id },
        data: { email: data.email.toLowerCase() },
      });
    }

    return this.findById(id, schoolId);
  },

  // ─── Delete (Soft) ─────────────────────────────────────────────────────

  async remove(id, schoolId) {
    const teacher = await prisma.teacher.findFirst({
      where: { id, schoolId },
      select: { id: true, name: true },
    });

    if (!teacher) return null;

    // Check if teacher has active timetable assignments
    const assignmentCount = await prisma.timetableAssignment.count({
      where: { teacherId: id },
    });

    if (assignmentCount > 0) {
      throw new Error(
        `Cannot delete "${teacher.name}" — has ${assignmentCount} active timetable assignments`
      );
    }

    // Soft delete: mark inactive
    await Promise.all([
      prisma.teacher.update({
        where: { id },
        data: { isActive: false, deletedAt: new Date() },
      }),
      prisma.schoolUser.updateMany({
        where: { teacherId: id },
        data: { isActive: false, deletedAt: new Date() },
      }),
    ]);

    return true;
  },

  // ─── Bulk Create ────────────────────────────────────────────────────────

  async bulkCreate(schoolId, rows) {
    let created = 0;
    let updated = 0;
    const errors = [];

    for (let i = 0; i < rows.length; i++) {
      try {
        const row = rows[i];
        if (!row.firstName || !row.lastName || !row.email || !row.phone) {
          errors.push({
            row: i + 2,
            message: 'First name, last name, email, and phone are required',
          });
          continue;
        }

        const existing = await prisma.teacher.findFirst({
          where: { schoolId, email: row.email.toLowerCase() },
          select: { id: true },
        });

        if (existing) {
          await this.update(existing.id, schoolId, row);
          updated++;
        } else {
          await prisma.teacher.create({
            data: {
              schoolId,
              name: `${row.firstName} ${row.lastName}`,
              email: row.email.toLowerCase(),
              phone: row.phone,
              subjects: row.subject ? [row.subject] : [],
              qualifications: row.qualification ? [row.qualification] : [],
              experience: row.experience ? parseInt(row.experience) || 0 : 0,
              employeeId: row.employeeId || null,
              isActive: true,
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
    const result = await this.findAll(schoolId, { ...filters, limit: 9999, page: 1 });
    return result.teachers;
  },

  // ─── Duplicate Check ────────────────────────────────────────────────────

  async findDuplicate(schoolId, email, phone, excludeId = null) {
    const where = {
      schoolId,
      OR: [],
    };

    if (email) where.OR.push({ email: email.toLowerCase() });
    if (phone) where.OR.push({ phone });
    if (excludeId) where.id = { not: excludeId };

    return prisma.teacher.findFirst({
      where,
      select: { id: true, email: true, phone: true },
    });
  },
};
