<<<<<<< HEAD
// src/modules/m6-students/student.repository.js
import { prisma } from '#config/prisma.js';

export class StudentRepository {
  // ─── Student CRUD ──────────────────────────────────────────────
  async createStudent(data) {
    return prisma.student.create({ data });
  }

  async updateStudent(id, data) {
    return prisma.student.update({ where: { id }, data });
  }

  async deleteStudent(id) {
    return prisma.student.update({ where: { id }, data: { isActive: false, status: 'INACTIVE' } });
  }

  async findStudentById(id, schoolId = null) {
    const where = { id };
    if (schoolId) where.schoolId = schoolId;
    return prisma.student.findFirst({
      where,
      include: {
        cardVisibility: true,
        parentLinks: { include: { parent: true } },
        emergencyProfile: true,
        documents: true,
        attendanceRecords: { orderBy: { createdAt: 'desc' }, take: 100 },
      },
    });
  }

  async findStudentByRFID(rfidTagNumber) {
    return prisma.student.findFirst({ where: { rfidTagNumber } });
  }

  async listStudents(where, skip, take, orderBy = { createdAt: 'desc' }) {
    const [items, total] = await Promise.all([
      prisma.student.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          parentLinks: { include: { parent: true } },
          _count: { select: { attendanceRecords: true, documents: true } },
        },
      }),
      prisma.student.count({ where }),
    ]);
    return { items, total };
  }

  // ─── Card Visibility ────────────────────────────────────────────
  async createCardVisibility(data) {
    return prisma.cardVisibility.create({ data });
  }

  async updateCardVisibility(id, data) {
    return prisma.cardVisibility.update({ where: { id }, data });
  }

  async findCardVisibilityByStudentId(studentId) {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { cardVisibility: true, cardVisibilityId: true },
    });
    return student?.cardVisibility;
  }

  // ─── Parent-Student Links ──────────────────────────────────────
  async linkParent(studentId, parentId, relation = 'GUARDIAN', isPrimary = false, priority = 1) {
    return prisma.parentStudent.create({
      data: { studentId, parentId, relation, isPrimary, priority },
    });
  }

  async unlinkParent(studentId, parentId) {
    return prisma.parentStudent.deleteMany({ where: { studentId, parentId } });
  }

  async getLinkedParents(studentId) {
    return prisma.parentStudent.findMany({
      where: { studentId, isActive: true },
      include: { parent: true },
    });
  }

  // ─── Student Documents ─────────────────────────────────────────
  async createDocument(data) {
    return prisma.studentDocument.create({ data });
  }

  async deleteDocument(id, studentId) {
    return prisma.studentDocument.deleteMany({ where: { id, studentId } });
  }

  async listDocuments(studentId) {
    return prisma.studentDocument.findMany({ where: { studentId } });
  }

  // ─── Attendance ────────────────────────────────────────────────
  async getAttendanceSummary(studentId, startDate, endDate) {
    const records = await prisma.studentAttendanceRecord.findMany({
      where: {
        studentId,
        markedAt: { gte: startDate, lte: endDate },
      },
      select: { status: true, markedAt: true },
    });
    return records;
  }

  // ─── Stats ─────────────────────────────────────────────────────
  async getStats(schoolId) {
    const [total, active, classCount] = await Promise.all([
      prisma.student.count({ where: { schoolId, isActive: true } }),
      prisma.student.count({ where: { schoolId, isActive: true, status: 'ACTIVE' } }),
      prisma.student.groupBy({ by: ['grade'], where: { schoolId }, _count: true }).then(g => g.length),
    ]);
    const sections = 4; // Could be dynamic if you have Section model
    return { total, active, classCount, sections };
  }
}
=======
// =============================================================================
// modules/students/student.repository.js — RESQID
// =============================================================================

import { prisma } from '#config/prisma.js';

// ─── List ─────────────────────────────────────────────────────────────────────

export const findBySchool = async (schoolId, query = {}) => {
  const {
    page = 1,
    limit = 20,
    search,
    grade,
    section,
    status,
    sortBy = 'firstName',
    sortOrder = 'asc',
  } = query;

  const where = { schoolId };
  if (grade) where.grade = grade;
  if (section) where.section = section;
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { rollNumber: { contains: search, mode: 'insensitive' } },
      { studentId: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [students, total] = await Promise.all([
    prisma.student.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        grade: true,
        section: true,
        rollNumber: true,
        gender: true,
        photoUrl: true,
        status: true,
        isActive: true,
        email: true,
        phone: true,
        studentId: true,
        rfidTagNumber: true,
        createdAt: true,
        parentLinks: {
          where: { isActive: true },
          take: 2,
          select: {
            relation: true,
            isPrimary: true,
            parent: { select: { id: true, name: true, phone: true } },
          },
        },
        classGroup: { select: { id: true, grade: true, section: true, label: true } },
      },
    }),
    prisma.student.count({ where }),
  ]);

  return { students, total };
};

// ─── Find by parent ───────────────────────────────────────────────────────────

export const findByParent = async (parentId, query = {}) => {
  const { page = 1, limit = 20 } = query;

  const links = await prisma.parentStudent.findMany({
    where: { parentId, isActive: true },
    skip: (page - 1) * limit,
    take: limit,
    include: {
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          grade: true,
          section: true,
          rollNumber: true,
          photoUrl: true,
          status: true,
          emergencyProfile: { select: { bloodGroup: true, allergies: true, isComplete: true } },
          school: { select: { id: true, name: true, logoUrl: true } },
        },
      },
    },
  });

  const total = await prisma.parentStudent.count({ where: { parentId, isActive: true } });

  return { students: links.map((l) => l.student), total };
};

// ─── Find all (super admin) ───────────────────────────────────────────────────

export const findAll = async (query = {}) => {
  const { page = 1, limit = 20, search, status, sortBy = 'createdAt', sortOrder = 'desc' } = query;

  const where = {};
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [students, total] = await Promise.all([
    prisma.student.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        grade: true,
        section: true,
        rollNumber: true,
        photoUrl: true,
        status: true,
        isActive: true,
        schoolId: true,
        createdAt: true,
        school: { select: { id: true, name: true, code: true } },
        _count: { select: { tokens: true, scans: true } },
      },
    }),
    prisma.student.count({ where }),
  ]);

  return { students, total };
};

// ─── Get One ──────────────────────────────────────────────────────────────────

export const findById = (id, schoolId = null) => {
  const where = { id };
  if (schoolId) where.schoolId = schoolId;

  return prisma.student.findFirst({
    where,
    include: {
      school: { select: { id: true, name: true, code: true, logoUrl: true } },
      classGroup: {
        select: { id: true, grade: true, section: true, label: true, teacherId: true },
      },
      emergencyProfile: {
        include: {
          contacts: { where: { isActive: true }, orderBy: { priority: 'asc' } },
        },
      },
      tokens: {
        where: { status: 'ACTIVE' },
        take: 5,
        select: { id: true, status: true, scanCode: true, rfidTagNumber: true },
      },
      parentLinks: {
        where: { isActive: true },
        include: {
          parent: { select: { id: true, name: true, phone: true, email: true, occupation: true } },
        },
      },
      documents: { orderBy: { uploadedAt: 'desc' }, take: 10 },
    },
  });
};

// ─── Create ───────────────────────────────────────────────────────────────────

export const create = (schoolId, data) => {
  const { parents, emergencyContacts, medicalInfo, ...studentData } = data;

  return prisma.student.create({
    data: {
      ...studentData,
      schoolId,
      emergencyProfile: {
        create: {
          schoolId,
          ...medicalInfo,
          isComplete: !!(medicalInfo?.bloodGroup || medicalInfo?.allergies?.length),
          contacts: emergencyContacts?.length
            ? {
                create: emergencyContacts.map((c) => ({ ...c, schoolId })),
              }
            : undefined,
        },
      },
    },
    include: {
      emergencyProfile: { include: { contacts: true } },
      parentLinks: { include: { parent: true } },
    },
  });
};

// ─── Update ───────────────────────────────────────────────────────────────────

export const update = (id, data) => {
  const { parents, emergencyContacts, medicalInfo, ...studentData } = data;

  return prisma.student.update({
    where: { id },
    data: studentData,
  });
};

// ─── Soft Delete ──────────────────────────────────────────────────────────────

export const remove = (id) =>
  prisma.student.update({
    where: { id },
    data: { isActive: false, status: 'INACTIVE' },
  });

// ─── Bulk Create ──────────────────────────────────────────────────────────────

export const bulkCreate = (schoolId, students) =>
  prisma.student.createMany({
    data: students.map((s) => {
      const { parents, emergencyContacts, medicalInfo, ...data } = s;
      return { ...data, schoolId };
    }),
    skipDuplicates: true,
  });

// ─── Stats ─────────────────────────────────────────────────────────────────────

export const getStats = async (schoolId) => {
  const [total, active, classes] = await Promise.all([
    prisma.student.count({ where: { schoolId } }),
    prisma.student.count({ where: { schoolId, isActive: true } }),
    prisma.student.groupBy({ by: ['grade'], where: { schoolId }, _count: true }),
  ]);

  return {
    totalStudents: total,
    activeStudents: active,
    totalClasses: classes.length,
    classBreakdown: classes.map((c) => ({ grade: c.grade, count: c._count })),
  };
};

// ─── Update Emergency Profile ─────────────────────────────────────────────────

export const updateEmergencyProfile = (studentId, data) =>
  prisma.emergencyProfile.upsert({
    where: { studentId },
    create: { studentId, ...data },
    update: data,
  });

export const updateCardVisibility = (studentId, visibility) =>
  prisma.cardVisibility.upsert({
    where: { id: studentId },
    create: { id: studentId, visibility },
    update: { visibility },
  });
>>>>>>> 2306bae69da370bc7bfb048c15cfd0f99e474bff
