// school-admin/sessions/sessions.service.js
import { ApiError } from '#shared/response/ApiError.js';
import { getPagination, paginateMeta } from '#shared/response/paginate.js';
import { SessionRepository } from './sessions.repository.js';

const repo = new SessionRepository();

export class SessionService {
  async createSession(data, schoolId) {
    // Check uniqueness for same academicYear + term
    if (data.academicYear && data.term) {
      const existing = await repo.findSessionByYearAndTerm(data.academicYear, data.term, schoolId);
      if (existing) throw ApiError.conflict(`Session for ${data.academicYear} - ${data.term} already exists`);
    }

    // If this session should be current, unset any existing current session
    if (data.isCurrent) {
      await repo.setAllNonCurrent(schoolId);
    }

    return repo.createSession({
      ...data,
      schoolId,
      isActive: data.isActive ?? true,
      isCurrent: data.isCurrent ?? false,
    });
  }

  async updateSession(id, data, schoolId) {
    const session = await repo.findSessionById(id, schoolId);
    if (!session) throw ApiError.notFound('Academic session not found');

    // Check uniqueness if academicYear/term are being changed
    if ((data.academicYear && data.academicYear !== session.academicYear) ||
        (data.term && data.term !== session.term)) {
      const year = data.academicYear ?? session.academicYear;
      const term = data.term ?? session.term;
      if (year && term) {
        const existing = await repo.findSessionByYearAndTerm(year, term, schoolId);
        if (existing && existing.id !== id) {
          throw ApiError.conflict(`Session for ${year} - ${term} already exists`);
        }
      }
    }

    // If setting this session as current, unset others
    if (data.isCurrent && !session.isCurrent) {
      await repo.setAllNonCurrent(schoolId);
    }

    return repo.updateSession(id, data);
  }

  async deleteSession(id, schoolId) {
    const session = await repo.findSessionById(id, schoolId);
    if (!session) throw ApiError.notFound('Academic session not found');
    if (session.isCurrent) {
      throw ApiError.badRequest('Cannot delete the current academic session');
    }
    await repo.deleteSession(id);
    return { success: true };
  }

  async getSession(id, schoolId) {
    const session = await repo.findSessionById(id, schoolId);
    if (!session) throw ApiError.notFound('Academic session not found');
    return session;
  }

  async listSessions(query, schoolId) {
    const { page, limit, skip } = getPagination(query);
    const where = { schoolId };

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { academicYear: { contains: query.search } },
        { term: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.isActive !== undefined) where.isActive = query.isActive === 'true';
    if (query.isCurrent !== undefined) where.isCurrent = query.isCurrent === 'true';
    if (query.academicYear) where.academicYear = query.academicYear;
    if (query.term) where.term = query.term;
    if (query.fromDate) where.startDate = { gte: new Date(query.fromDate) };
    if (query.toDate) where.endDate = { lte: new Date(query.toDate) };

    const { items, total } = await repo.listSessions(where, skip, limit);
    const meta = paginateMeta(total, page, limit);
    return { items, meta };
  }

  async getStats(schoolId) {
    return repo.getStats(schoolId);
  }

  async setCurrentSession(id, schoolId) {
    const session = await repo.findSessionById(id, schoolId);
    if (!session) throw ApiError.notFound('Academic session not found');
    if (!session.isActive) throw ApiError.badRequest('Cannot set inactive session as current');
    await repo.setAllNonCurrent(schoolId);
    const updated = await repo.updateSession(id, { isCurrent: true });
    return updated;
  }
}