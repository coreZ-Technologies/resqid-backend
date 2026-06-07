// =============================================================================
// modules/parents/parent.repository.js — RESQID
// Purpose-built queries for each use case.
// =============================================================================

import { prisma } from '#config/prisma.js';

// ─── List (School Admin) ──────────────────────────────────────────────────────

export const findBySchool = async (schoolId, query = {}) => {
  const {
    page = 1,
    limit = 20,
    search,
    isActive,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = query;

  // Get all parent IDs linked to students in this school
  const parentIds = await prisma.parentStudent.findMany({
    where: { student: { schoolId }, isActive: true },
    select: { parentId: true },
    distinct: ['parentId'],
  });

  const where = {
    id: { in: parentIds.map((p) => p.parentId) },
  };

  if (isActive !== undefined) where.isActive = isActive;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [parents, total] = await Promise.all([
    prisma.parentUser.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: sortBy === 'name' ? { firstName: sortOrder } : { [sortBy]: sortOrder },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        name: true,
        phone: true,
        email: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        _count: { select: { students: true, devices: true } },
      },
    }),
    prisma.parentUser.count({ where }),
  ]);

  return { parents, total };
};

// ─── Find All (Super Admin) ───────────────────────────────────────────────────

export const findAll = async (query = {}) => {
  const {
    page = 1,
    limit = 20,
    search,
    isActive,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = query;

  const where = {};
  if (isActive !== undefined) where.isActive = isActive;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [parents, total] = await Promise.all([
    prisma.parentUser.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: sortBy === 'name' ? { firstName: sortOrder } : { [sortBy]: sortOrder },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        name: true,
        phone: true,
        email: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        _count: { select: { students: true } },
      },
    }),
    prisma.parentUser.count({ where }),
  ]);

  return { parents, total };
};

// ─── Detail View ──────────────────────────────────────────────────────────────

export const findById = (id) =>
  prisma.parentUser.findUnique({
    where: { id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      name: true,
      phone: true,
      email: true,
      photoUrl: true,
      address: true,
      city: true,
      state: true,
      pincode: true,
      occupation: true,
      canCall: true,
      canWhatsapp: true,
      canEmail: true,
      canSMS: true,
      isActive: true,
      isPhoneVerified: true,
      lastLoginAt: true,
      lastSeenAt: true,
      createdAt: true,
      isEmergencyContact: true,
      emergencyPriority: true,
      students: {
        where: { isActive: true },
        select: {
          relation: true,
          isPrimary: true,
          isEmergency: true,
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              grade: true,
              section: true,
              photoUrl: true,
              isActive: true,
              school: { select: { id: true, name: true } },
            },
          },
        },
      },
      devices: {
        where: { isActive: true },
        select: { id: true, platform: true, expoPushToken: true, lastSeenAt: true },
      },
    },
  });

// ─── Create ───────────────────────────────────────────────────────────────────

export const create = async (data) => {
  const { childIds, ...parentData } = data;

  const parent = await prisma.parentUser.create({
    data: {
      ...parentData,
      name: `${parentData.firstName} ${parentData.lastName}`.trim(),
      students: childIds?.length
        ? {
            create: childIds.map((studentId) => ({
              studentId,
              relation: 'GUARDIAN',
              isPrimary: true,
              isEmergency: true,
            })),
          }
        : undefined,
    },
  });

  return parent;
};

// ─── Update ───────────────────────────────────────────────────────────────────

export const update = (id, data) =>
  prisma.parentUser.update({
    where: { id },
    data: {
      ...data,
      name:
        data.firstName || data.lastName
          ? `${data.firstName || ''} ${data.lastName || ''}`.trim()
          : undefined,
    },
  });

// ─── Soft Delete ──────────────────────────────────────────────────────────────

export const remove = (id) =>
  prisma.parentUser.update({
    where: { id },
    data: { isActive: false, deletedAt: new Date() },
  });

// ─── Stats ─────────────────────────────────────────────────────────────────────

export const getStats = async (schoolId) => {
  const parentIds = await prisma.parentStudent.findMany({
    where: { student: { schoolId }, isActive: true },
    select: { parentId: true },
    distinct: ['parentId'],
  });

  const idList = parentIds.map((p) => p.parentId);

  const [total, active] = await Promise.all([
    prisma.parentUser.count({ where: { id: { in: idList } } }),
    prisma.parentUser.count({ where: { id: { in: idList }, isActive: true } }),
  ]);

  return { totalParents: total, activeParents: active };
};

// ─── Export ───────────────────────────────────────────────────────────────────

export const findForExport = async (schoolId, filters = {}) => {
  const parentIds = await prisma.parentStudent.findMany({
    where: {
      student: {
        schoolId,
        ...(filters.grade && { grade: filters.grade }),
        ...(filters.section && { section: filters.section }),
      },
      isActive: true,
    },
    select: { parentId: true },
    distinct: ['parentId'],
  });

  return prisma.parentUser.findMany({
    where: {
      id: { in: parentIds.map((p) => p.parentId) },
      ...(filters.isActive !== undefined && { isActive: filters.isActive }),
    },
    select: {
      firstName: true,
      lastName: true,
      phone: true,
      email: true,
      address: true,
      city: true,
      state: true,
      students: {
        where: { isActive: true },
        select: {
          relation: true,
          student: { select: { firstName: true, lastName: true, grade: true, section: true } },
        },
      },
    },
  });
};
