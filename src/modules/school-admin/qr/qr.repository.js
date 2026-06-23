// TODO: Add implementation
// school-admin/qr/qr.repository.js
import { prisma } from '#config/prisma.js';

export class QrRepository {
  async listTokens(schoolId, search, skip, take) {
    const where = { schoolId };
    if (search) {
      where.OR = [
        { student: { firstName: { contains: search, mode: 'insensitive' } } },
        { student: { lastName: { contains: search, mode: 'insensitive' } } },
        { student: { grade: { contains: search, mode: 'insensitive' } } },
        { qrCode: { contains: search, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await Promise.all([
      prisma.token.findMany({
        where,
        skip,
        take,
        include: { student: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.token.count({ where }),
    ]);
    return { items, total };
  }

  async findTokenById(id, schoolId) {
    return prisma.token.findFirst({
      where: { id, schoolId },
      include: { student: true },
    });
  }

  async updateToken(id, data) {
    return prisma.token.update({ where: { id }, data });
  }

  async getStats(schoolId) {
    const [total, withQr, active] = await Promise.all([
      prisma.token.count({ where: { schoolId, studentId: { not: null } } }),
      prisma.token.count({ where: { schoolId, qrGenerated: true } }),
      prisma.token.count({ where: { schoolId, status: 'ACTIVE' } }),
    ]);
    return { total, withQr, active };
  }

  async assignTokenToStudent(tokenId, studentId, schoolId) {
    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId },
    });
    if (!student) throw new Error('Student not found in this school');
    return prisma.token.update({
      where: { id: tokenId },
      data: {
        studentId,
        status: 'ACTIVE',
        issuedAt: new Date(),
        activatedAt: new Date(),
      },
      include: { student: true },
    });
  }
}