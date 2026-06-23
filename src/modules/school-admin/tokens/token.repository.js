// src/modules/school-admin/tokens/token.repository.js
import { prisma } from '#config/prisma.js';

export const TokenRepository = {
  async create(data) {
    return prisma.token.create({ data });
  },

  async findById(id, schoolId = null) {
    const where = { id };
    if (schoolId) where.schoolId = schoolId;
    return prisma.token.findFirst({
      where,
      include: {
        student: { select: { id: true, firstName: true, lastName: true, grade: true, section: true, schoolId: true } },
      },
    });
  },

  async findByQrCode(qrCode, schoolId = null) {
    const where = { qrCode };
    if (schoolId) where.schoolId = schoolId;
    return prisma.token.findFirst({ where, include: { student: true } });
  },

  async findMany({ schoolId, page, limit, status, type, studentId, search }) {
    const skip = (page - 1) * limit;
    const where = { schoolId };
    if (status) where.status = status;
    if (type) where.type = type;
    if (studentId) where.studentId = studentId;
    if (search) {
      where.OR = [
        { qrCode: { contains: search, mode: 'insensitive' } },
        { student: { firstName: { contains: search, mode: 'insensitive' } } },
        { student: { lastName: { contains: search, mode: 'insensitive' } } },
        { student: { grade: { contains: search, mode: 'insensitive' } } },
        { label: { contains: search, mode: 'insensitive' } },
      ];
    }
    const [tokens, total] = await Promise.all([
      prisma.token.findMany({
        where,
        skip,
        take: limit,
        include: {
          student: { select: { id: true, firstName: true, lastName: true, grade: true, section: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.token.count({ where }),
    ]);
    return { tokens, total };
  },

  async update(id, data) {
    return prisma.token.update({ where: { id }, data });
  },

  async delete(id) {
    return prisma.token.delete({ where: { id } });
  },

  async findByStudentId(studentId, schoolId) {
    return prisma.token.findFirst({
      where: { studentId, schoolId },
    });
  },

  async countBySchool(schoolId, filters = {}) {
    return prisma.token.count({ where: { schoolId, ...filters } });
  },
};