// school-admin/students/students.repository.js
import { prisma } from '#config/prisma.js';

export class StudentRepository {
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

  async createCardVisibility(data) {
    return prisma.cardVisibility.create({ data });
  }

  async updateCardVisibility(id, data) {
    return prisma.cardVisibility.update({ where: { id }, data });
  }

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

  async createDocument(data) {
    return prisma.studentDocument.create({ data });
  }

  async deleteDocument(id, studentId) {
    return prisma.studentDocument.deleteMany({ where: { id, studentId } });
  }

  async listDocuments(studentId) {
    return prisma.studentDocument.findMany({ where: { studentId } });
  }

  async getAttendanceSummary(studentId, startDate, endDate) {
    const records = await prisma.studentAttendanceRecord.findMany({
      where: {
        studentId,
        markedAt: { gte: startDate, lte: endDate },
      },
      select: { status: true, markedAt: true, reason: true },
    });
    return records;
  }

  async getStats(schoolId) {
    const [total, active, classCount, sectionsCount] = await Promise.all([
      prisma.student.count({ where: { schoolId, isActive: true } }),
      prisma.student.count({ where: { schoolId, isActive: true, status: 'ACTIVE' } }),
      prisma.student.groupBy({ by: ['grade'], where: { schoolId }, _count: true }).then(g => g.length),
      prisma.student.groupBy({ by: ['section'], where: { schoolId, section: { not: null } }, _count: true }).then(g => g.length),
    ]);
    return { total, active, classCount, sections: sectionsCount };
  }

  async getAllStudentsForExport(schoolId, filters) {
    const where = { schoolId, isActive: true };
    if (filters.class) where.grade = filters.class;
    if (filters.section) where.section = filters.section;
    if (filters.status) where.status = filters.status;
    return prisma.student.findMany({
      where,
      include: { parentLinks: { include: { parent: true } } },
    });
  }
}