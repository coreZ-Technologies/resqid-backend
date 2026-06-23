// school-admin/subjects/subjects.service.js
import { ApiError } from '#shared/response/ApiError.js';
import { getPagination, paginateMeta } from '#shared/response/paginate.js';
import { SubjectRepository } from './subjects.repository.js';

const repo = new SubjectRepository();

export class SubjectService {
  async createSubject(data, schoolId) {
    if (data.code) {
      const existing = await repo.findSubjectByCode(data.code, schoolId);
      if (existing) throw ApiError.conflict(`Subject with code ${data.code} already exists`);
    }
    return repo.createSubject({
      ...data,
      schoolId,
      isActive: data.isActive ?? true,
      periodsPerWeek: data.periodsPerWeek ?? 5,
    });
  }

  async updateSubject(id, data, schoolId) {
    const subject = await repo.findSubjectById(id, schoolId);
    if (!subject) throw ApiError.notFound('Subject not found');

    if (data.code && data.code !== subject.code) {
      const existing = await repo.findSubjectByCode(data.code, schoolId);
      if (existing) throw ApiError.conflict(`Subject with code ${data.code} already exists`);
    }

    return repo.updateSubject(id, data);
  }

  async deleteSubject(id, schoolId) {
    const subject = await repo.findSubjectById(id, schoolId);
    if (!subject) throw ApiError.notFound('Subject not found');
    await repo.deleteSubject(id);
    return { success: true };
  }

  async getSubject(id, schoolId) {
    const subject = await repo.findSubjectById(id, schoolId);
    if (!subject) throw ApiError.notFound('Subject not found');
    return subject;
  }

  async listSubjects(query, schoolId) {
    const { page, limit, skip } = getPagination(query);
    const where = { schoolId };

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
        { category: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.isActive !== undefined) where.isActive = query.isActive === 'true';
    if (query.requiresLab !== undefined) where.requiresLab = query.requiresLab === 'true';
    if (query.isHeavy !== undefined) where.isHeavy = query.isHeavy === 'true';
    if (query.isPractical !== undefined) where.isPractical = query.isPractical === 'true';
    if (query.category) where.category = query.category;

    const { items, total } = await repo.listSubjects(where, skip, limit);
    const enriched = items.map(s => ({
      id: s.id,
      name: s.name,
      code: s.code,
      category: s.category,
      periodsPerWeek: s.periodsPerWeek,
      requiresLab: s.requiresLab,
      labPeriodsPerWeek: s.labPeriodsPerWeek,
      isHeavy: s.isHeavy,
      isPractical: s.isPractical,
      requiredRoomType: s.requiredRoomType,
      isActive: s.isActive,
      usageCount: s._count.timetableAssignments,
      createdAt: s.createdAt,
    }));
    const meta = paginateMeta(total, page, limit);
    return { items: enriched, meta };
  }

  async getStats(schoolId) {
    return repo.getStats(schoolId);
  }

  async bulkUpdateSubjects(updates, schoolId) {
    // Validate each subject belongs to the school
    const ids = updates.map(u => u.id);
    const existing = await prisma.subject.findMany({
      where: { id: { in: ids }, schoolId },
      select: { id: true },
    });
    const existingIds = new Set(existing.map(e => e.id));
    const invalid = ids.filter(id => !existingIds.has(id));
    if (invalid.length) {
      throw ApiError.badRequest(`Subjects not found in this school: ${invalid.join(', ')}`);
    }
    return repo.bulkUpdate(updates);
  }
}