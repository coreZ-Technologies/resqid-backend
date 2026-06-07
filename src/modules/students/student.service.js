// =============================================================================
// modules/students/student.service.js — RESQID
// =============================================================================

import { ApiError } from '#shared/response/ApiError.js';
import * as repo from './student.repository.js';
import { prisma } from '#config/prisma.js';

// ─── List (Role-based) ────────────────────────────────────────────────────────

export const list = async (req) => {
  const { role, schoolId, id: userId } = req.user;
  const query = req.query;

  if (role === 'SUPER_ADMIN') {
    if (req.params.schoolId) {
      const [result, total] = await repo.findBySchool(req.params.schoolId, query);
      return { students: result, total };
    }
    const [result, total] = await repo.findAll(query);
    return { students: result, total };
  }

  if (role === 'PARENT') {
    const { students, total } = await repo.findByParent(userId, query);
    return { students, total };
  }

  // SCHOOL_ADMIN, TEACHER — scoped to their school
  if (!schoolId) throw ApiError.tenantRequired();
  const { students, total } = await repo.findBySchool(schoolId, query);
  return { students, total };
};

// ─── Get One ──────────────────────────────────────────────────────────────────

export const getOne = async (id, req) => {
  const { role, schoolId } = req.user;
  const student = await repo.findById(id, role === 'SUPER_ADMIN' ? null : schoolId);
  if (!student) throw ApiError.studentNotFound();

  // PARENT — verify ownership
  if (role === 'PARENT') {
    const link = await prisma.parentStudent.findFirst({
      where: { parentId: req.user.id, studentId: id, isActive: true },
    });
    if (!link) throw ApiError.forbidden('Student not linked to your account');
  }

  return student;
};

// ─── Create ───────────────────────────────────────────────────────────────────

export const create = async (data, schoolId) => {
  return repo.create(schoolId, data);
};

// ─── Update ───────────────────────────────────────────────────────────────────

export const update = async (id, data, schoolId) => {
  const student = await repo.findById(id, schoolId);
  if (!student) throw ApiError.studentNotFound();
  return repo.update(id, data);
};

// ─── Delete ───────────────────────────────────────────────────────────────────

export const remove = async (id, schoolId) => {
  const student = await repo.findById(id, schoolId);
  if (!student) throw ApiError.studentNotFound();
  return repo.remove(id);
};

// ─── Bulk Create ──────────────────────────────────────────────────────────────

export const bulkCreate = async (students, schoolId) => {
  return repo.bulkCreate(schoolId, students);
};

// ─── Stats ─────────────────────────────────────────────────────────────────────

export const getStats = async (schoolId) => {
  return repo.getStats(schoolId);
};
