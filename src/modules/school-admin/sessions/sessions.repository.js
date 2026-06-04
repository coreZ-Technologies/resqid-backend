// school-admin/sessions/sessions.repository.js
import { prisma } from '#config/prisma.js';

export class SessionRepository {
  async createSession(data) {
    return prisma.academicSession.create({ data });
  }

  async updateSession(id, data) {
    return prisma.academicSession.update({ where: { id }, data });
  }

  async deleteSession(id) {
    return prisma.academicSession.update({ where: { id }, data: { isActive: false } });
  }

  async findSessionById(id, schoolId = null) {
    const where = { id };
    if (schoolId) where.schoolId = schoolId;
    return prisma.academicSession.findFirst({
      where,
      include: {
        _count: { select: { /* e.g., related timetables? */ } },
      },
    });
  }

  async findSessionByYearAndTerm(academicYear, term, schoolId) {
    return prisma.academicSession.findFirst({
      where: { academicYear, term, schoolId },
    });
  }

  async listSessions(where, skip, take, orderBy = { startDate: 'desc' }) {
    const [items, total] = await Promise.all([
      prisma.academicSession.findMany({
        where,
        skip,
        take,
        orderBy,
      }),
      prisma.academicSession.count({ where }),
    ]);
    return { items, total };
  }

  async getStats(schoolId) {
    const [total, active, current] = await Promise.all([
      prisma.academicSession.count({ where: { schoolId } }),
      prisma.academicSession.count({ where: { schoolId, isActive: true } }),
      prisma.academicSession.count({ where: { schoolId, isCurrent: true } }),
    ]);
    return { total, active, current };
  }

  async setAllNonCurrent(schoolId) {
    return prisma.academicSession.updateMany({
      where: { schoolId, isCurrent: true },
      data: { isCurrent: false },
    });
  }
}