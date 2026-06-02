// src/modules/school-admin/card/card.repository.js
import prisma from '../../../config/prisma.js';

export const CardRepository = {
  async create(data) {
    return prisma.card.create({ data });
  },

  async findById(id, schoolId = null) {
    const where = { id };
    if (schoolId) {
      where.student = { schoolId };
    }
    return prisma.card.findFirst({
      where,
      include: {
        student: { select: { id: true, name: true, class: true, section: true, schoolId: true } },
        token: { select: { id: true, tokenHash: true, status: true } },
      },
    });
  },

  async findMany({ schoolId, page, limit, status, studentId, search }) {
    const skip = (page - 1) * limit;
    const where = { student: { schoolId } };
    if (status) where.status = status;
    if (studentId) where.studentId = studentId;
    if (search) {
      where.OR = [
        { cardNumber: { contains: search, mode: 'insensitive' } },
        { student: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }
    const [cards, total] = await Promise.all([
      prisma.card.findMany({
        where,
        skip,
        take: limit,
        include: {
          student: { select: { id: true, name: true, class: true, section: true } },
          token: { select: { id: true, tokenHash: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.card.count({ where }),
    ]);
    return { cards, total };
  },

  async update(id, data) {
    return prisma.card.update({ where: { id }, data });
  },

  async delete(id) {
    return prisma.card.delete({ where: { id } });
  },

  async findByStudentId(studentId, schoolId) {
    return prisma.card.findFirst({
      where: {
        studentId,
        student: { schoolId },
      },
    });
  },
};