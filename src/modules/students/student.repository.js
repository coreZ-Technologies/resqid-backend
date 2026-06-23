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
