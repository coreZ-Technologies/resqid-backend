// =============================================================================
// modules/parents/parent.service.js — RESQID
// =============================================================================

import { ApiError } from '#shared/response/ApiError.js';
import * as repo from './parent.repository.js';
import { prisma } from '#config/prisma.js';

export const list = async (req) => {
  const { role, schoolId } = req.user;

  if (role === 'SUPER_ADMIN') {
    return repo.findAll(req.query);
  }

  if (!schoolId) throw ApiError.tenantRequired();
  return repo.findBySchool(schoolId, req.query);
};

export const getOne = async (id, req) => {
  const { role, schoolId } = req.user;

  // Parent can only view own profile
  if (role === 'PARENT' && req.user.id !== id) {
    throw ApiError.forbidden('You can only view your own profile');
  }

  const parent = await repo.findById(id);
  if (!parent) throw ApiError.notFound('Parent not found');

  // School admin can only view parents in their school
  if (role === 'SCHOOL_ADMIN') {
    const hasChildInSchool = parent.students?.some((s) => s.student?.schoolId === schoolId);
    if (!hasChildInSchool) throw ApiError.forbidden('Parent not in your school');
  }

  return parent;
};

export const create = async (data, schoolId) => {
  // Verify child IDs belong to this school
  if (data.childIds?.length) {
    const students = await prisma.student.findMany({
      where: { id: { in: data.childIds }, schoolId },
      select: { id: true },
    });
    if (students.length !== data.childIds.length) {
      throw ApiError.badRequest('One or more students not found in your school');
    }
  }

  // Check duplicate phone
  const existing = await prisma.parentUser.findUnique({ where: { phone: data.phone } });
  if (existing) throw ApiError.conflict('Parent with this phone already exists');

  return repo.create(data);
};

export const update = async (id, data, req) => {
  const { role } = req.user;

  // Parent self‑update — restricted fields + email uniqueness
  if (role === 'PARENT') {
    if (req.user.id !== id) throw ApiError.forbidden('Can only edit own profile');

    // Check email uniqueness if provided
    if (data.email) {
      const existing = await prisma.parentUser.findFirst({
        where: {
          email: data.email,
          id: { not: id },
        },
      });
      if (existing) throw ApiError.conflict('Email already used by another parent');
    }

    const allowed = [
      'firstName',
      'lastName',
      'email',
      'address',
      'city',
      'state',
      'pincode',
      'occupation',
      'photoUrl',
      'canCall',
      'canWhatsapp',
      'canEmail',
      'canSMS',
    ];
    const safeData = {};
    for (const key of allowed) {
      if (data[key] !== undefined) safeData[key] = data[key];
    }
    return repo.update(id, safeData);
  }

  // Admin update — full access
  const parent = await repo.findById(id);
  if (!parent) throw ApiError.notFound('Parent not found');
  return repo.update(id, data);
};

export const remove = async (id, schoolId) => {
  const parent = await repo.findById(id);
  if (!parent) throw ApiError.notFound('Parent not found');
  return repo.remove(id);
};

export const getStats = async (schoolId) => {
  return repo.getStats(schoolId);
};

export const exportList = async (schoolId, filters) => {
  // Legacy export (kept for backward compatibility)
  return repo.findForExport(schoolId, filters);
};

// ─── Streaming CSV Export ─────────────────────────────────────────────────────
export const exportCsvStream = async (schoolId, filters, res) => {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=parents-${Date.now()}.csv`);
  await repo.streamExport(schoolId, filters, res);
};