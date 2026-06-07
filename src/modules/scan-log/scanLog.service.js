// =============================================================================
// modules/scan-log/scanLog.service.js — RESQID
// =============================================================================

import { ApiError } from '#shared/response/ApiError.js';
import * as repo from './scanLog.repository.js';
import { prisma } from '#config/prisma.js';

// ─── List (Role-based) ────────────────────────────────────────────────────────

export const list = async (req) => {
  const { role, schoolId, id: userId } = req.user;
  const query = req.query;

  if (role === 'SUPER_ADMIN') {
    if (req.params.schoolId) {
      return repo.findBySchool(req.params.schoolId, query);
    }
    return repo.findAll(query);
  }

  if (role === 'PARENT') {
    return repo.findByParent(userId, query);
  }

  // TEACHER, SCHOOL_ADMIN — their school
  if (!schoolId) throw ApiError.tenantRequired();
  return repo.findBySchool(schoolId, query);
};

// ─── Get One ──────────────────────────────────────────────────────────────────

export const getOne = async (id, req) => {
  const scan = await repo.findById(id);
  if (!scan) throw ApiError.notFound('Scan log not found');

  // Role-based access check
  const { role, schoolId, id: userId } = req.user;
  if (role === 'SUPER_ADMIN') return scan;
  if (role === 'PARENT') {
    const studentId = scan.token?.studentId;
    if (!studentId) throw ApiError.forbidden('Access denied');
    const link = await prisma.parentStudent.findFirst({
      where: { parentId: userId, studentId, isActive: true },
    });
    if (!link) throw ApiError.forbidden('Not your child');
    return scan;
  }
  // School-scoped
  if (scan.token?.schoolId !== schoolId) throw ApiError.forbidden('Access denied');
  return scan;
};

// ─── Delete (Super Admin only) ────────────────────────────────────────────────

export const remove = async (id) => {
  const scan = await repo.findById(id);
  if (!scan) throw ApiError.notFound('Scan log not found');
  return repo.remove(id);
};

export const bulkDelete = async (ids) => {
  return repo.bulkDelete(ids);
};

export const cleanupOld = async (beforeDate) => {
  return repo.cleanupOld(beforeDate);
};

// ─── Stats ─────────────────────────────────────────────────────────────────────

export const getStats = async (schoolId) => {
  return repo.getStats(schoolId);
};
