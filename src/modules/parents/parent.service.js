// =============================================================================
// modules/parents/parent.service.js — RESQID
// Business logic for parents (CRUD + self‑service)
// =============================================================================

import { ApiError } from '#shared/response/ApiError.js';
import * as repo from './parent.repository.js';
import { prisma } from '#config/prisma.js';

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN / SCHOOL ADMIN CRUD
// ═══════════════════════════════════════════════════════════════════════════════

export const list = async (req) => {
  const { role, schoolId } = req.user;

  if (role === 'SUPER_ADMIN') {
    return repo.findAll(req.query);
  }

  if (role === 'SCHOOL_ADMIN') {
    if (!schoolId) throw ApiError.tenantRequired();
    return repo.findBySchool(schoolId, req.query);
  }

  throw ApiError.forbidden('Access denied');
};

export const getOne = async (id, req) => {
  const { role, schoolId, id: userId } = req.user;

  // Parent can only view own profile
  if (role === 'PARENT' && userId !== id) {
    throw ApiError.forbidden('You can only view your own profile');
  }

  const parent = await repo.findById(id);
  if (!parent) throw ApiError.notFound('Parent not found');

  // School admin can only view parents in their school
  if (role === 'SCHOOL_ADMIN') {
    const hasChildInSchool = parent.students?.some(
      (link) => link.student?.schoolId === schoolId
    );
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

  // Check duplicate phone / email
  const existing = await prisma.parentUser.findFirst({
    where: {
      OR: [{ phone: data.phone }, { email: data.email }],
    },
  });
  if (existing) throw ApiError.conflict('Parent with this phone or email already exists');

  const newParent = await repo.create(data);

  // Link children
  if (data.childIds?.length) {
    for (const childId of data.childIds) {
      await prisma.parentStudent.create({
        data: {
          parentId: newParent.id,
          studentId: childId,
          relation: data.relation || 'GUARDIAN',
          isPrimary: false,
        },
      });
    }
  }

  return newParent;
};

export const update = async (id, data, req) => {
  const { role, id: userId, schoolId } = req.user;

  // Parent self‑update — restricted fields
  if (role === 'PARENT') {
    if (userId !== id) throw ApiError.forbidden('Can only edit own profile');
    const allowed = [
      'name',
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

  // Admin update — full access, but must verify school scope
  const parent = await repo.findById(id);
  if (!parent) throw ApiError.notFound('Parent not found');

  if (role === 'SCHOOL_ADMIN') {
    const hasChildInSchool = parent.students?.some(
      (link) => link.student?.schoolId === schoolId
    );
    if (!hasChildInSchool) throw ApiError.forbidden('Parent not in your school');
  }

  return repo.update(id, data);
};

export const remove = async (id, req) => {
  const { role, schoolId } = req.user;

  const parent = await repo.findById(id);
  if (!parent) throw ApiError.notFound('Parent not found');

  if (role === 'SCHOOL_ADMIN') {
    const hasChildInSchool = parent.students?.some(
      (link) => link.student?.schoolId === schoolId
    );
    if (!hasChildInSchool) throw ApiError.forbidden('Parent not in your school');
  } else if (role !== 'SUPER_ADMIN') {
    throw ApiError.forbidden('Access denied');
  }

  return repo.remove(id);
};

export const getStats = async (schoolId) => {
  return repo.getStats(schoolId);
};

export const exportList = async (schoolId, filters) => {
  return repo.findForExport(schoolId, filters);
};

// ═══════════════════════════════════════════════════════════════════════════════
// PARENT SELF‑SERVICE (called by parent.controller.js)
// ═══════════════════════════════════════════════════════════════════════════════

export const getParentHome = (parentId) => repo.getParentHome(parentId);

export const updateParentProfile = (parentId, data) =>
  repo.updateParentProfile(parentId, data);

export const updateVisibility = async (parentId, studentId, visibility) => {
  await repo.verifyStudentOwnership(parentId, studentId);
  return repo.updateCardVisibility(studentId, visibility);
};

export const updateNotifications = (parentId, prefs) =>
  repo.upsertNotificationPrefs(parentId, prefs);

export const lockCard = async (parentId, studentId) => {
  await repo.verifyStudentOwnership(parentId, studentId);
  return repo.lockStudentCard(studentId);
};

export const registerDeviceToken = (parentId, body) =>
  repo.upsertParentDevice(parentId, body);

export const linkCard = async (parentId, { cardNumber }) => {
  const card = await repo.findCardByNumber(cardNumber);
  if (!card) throw ApiError.notFound('Card not found');

  if (card.studentId) {
    // Already linked – check if already linked to this parent
    const existingLink = await repo.findParentStudentLink(parentId, card.studentId);
    if (existingLink) throw ApiError.conflict('Child already linked to your account');
    await repo.createParentStudentLink(parentId, card.studentId, false);
  } else {
    // New student
    const newStudent = await repo.createStudent(card.schoolId);
    await repo.createEmergencyProfile(newStudent.id, card.schoolId);
    await repo.activateCard(card.id, newStudent.id);
    await repo.createParentStudentLink(parentId, newStudent.id, true);
  }
  return { success: true };
};

export const setActiveStudent = async (parentId, studentId) => {
  // Verify ownership, then store in Redis or a user‑specific table.
  // For simplicity, just verify and return.
  await repo.verifyStudentOwnership(parentId, studentId);
  // You can also store a "activeStudentId" in a parent_settings table.
  return { studentId };
};

export const getScanHistory = (parentId, { studentId, page, limit, filter }) =>
  repo.getScanHistory(parentId, { studentId, page, limit, filter });