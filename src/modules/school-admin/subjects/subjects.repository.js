// school-admin/subjects/subjects.repository.js
import { prisma } from '#config/prisma.js';

export class SubjectRepository {
  async createSubject(data) {
    return prisma.subject.create({ data });
  }

  async updateSubject(id, data) {
    return prisma.subject.update({ where: { id }, data });
  }

  async deleteSubject(id) {
    return prisma.subject.update({ where: { id }, data: { isActive: false } });
  }

  async findSubjectById(id, schoolId = null) {
    const where = { id };
    if (schoolId) where.schoolId = schoolId;
    return prisma.subject.findFirst({
      where,
      include: {
        timetableAssignments: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: { classGroup: true, teacher: true },
        },
      },
    });
  }

  async findSubjectByCode(code, schoolId) {
    return prisma.subject.findFirst({ where: { code, schoolId } });
  }

  async listSubjects(where, skip, take, orderBy = { createdAt: 'desc' }) {
    const [items, total] = await Promise.all([
      prisma.subject.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          _count: { select: { timetableAssignments: true } },
        },
      }),
      prisma.subject.count({ where }),
    ]);
    return { items, total };
  }

  async getStats(schoolId) {
    const [total, active, withLab, heavy, practical] = await Promise.all([
      prisma.subject.count({ where: { schoolId } }),
      prisma.subject.count({ where: { schoolId, isActive: true } }),
      prisma.subject.count({ where: { schoolId, requiresLab: true } }),
      prisma.subject.count({ where: { schoolId, isHeavy: true } }),
      prisma.subject.count({ where: { schoolId, isPractical: true } }),
    ]);
    return { total, active, withLab, heavy, practical };
  }

  async bulkUpdate(updates) {
    const results = { success: 0, failed: 0, errors: [] };
    for (const update of updates) {
      try {
        await prisma.subject.update({
          where: { id: update.id },
          data: update.data,
        });
        results.success++;
      } catch (err) {
        results.failed++;
        results.errors.push({ id: update.id, message: err.message });
      }
    }
    return results;
  }
}