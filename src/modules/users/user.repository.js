// src/modules/users/user.repository.js
import { prisma } from '#config/prisma.js';
import { hashPassword } from '#shared/security/hashUtil.js';

export const userRepository = {
  // ─── Stats ──────────────────────────────────────────────────────────────
  async getStats(schoolId) {
    const [total, active, schoolAdminCount, teacherCount] = await Promise.all([
      prisma.schoolUser.count({ where: { schoolId } }),
      prisma.schoolUser.count({ where: { schoolId, isActive: true } }),
      prisma.schoolUser.count({ where: { schoolId, role: 'SCHOOL_ADMIN' } }),
      prisma.schoolUser.count({ where: { schoolId, role: 'TEACHER' } }),
    ]);
    return { total, active, schoolAdminCount, teacherCount };
  },

  // ─── List (school-scoped) ───────────────────────────────────────────────
  async findAll(schoolId, filters = {}) {
    const { page = 1, limit = 20, search, role, status = 'All', sortBy = 'name', sortOrder = 'asc' } = filters;

    const where = { schoolId };

    if (role) where.role = role;
    if (status === 'Active') where.isActive = true;
    else if (status === 'Inactive') where.isActive = false;

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ];
    }

    const orderBy = {};
    if (sortBy === 'name') orderBy.name = sortOrder;
    else if (sortBy === 'email') orderBy.email = sortOrder;
    else if (sortBy === 'role') orderBy.role = sortOrder;
    else if (sortBy === 'createdAt') orderBy.createdAt = sortOrder;

    const [users, total] = await Promise.all([
      prisma.schoolUser.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
        },
      }),
      prisma.schoolUser.count({ where }),
    ]);

    const formatted = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone || '',
      role: u.role,
      status: u.isActive ? 'Active' : 'Inactive',
      lastLogin: u.lastLoginAt,
      createdAt: u.createdAt,
    }));

    return { users: formatted, total, page, limit };
  },

  // ─── Single (school-scoped) ─────────────────────────────────────────────
  async findById(id, schoolId) {
    const user = await prisma.schoolUser.findFirst({
      where: { id, schoolId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        teacherId: true,
        teacher: {
          select: { id: true, subjects: true, classGroups: { select: { grade: true, section: true } } },
        },
      },
    });
    if (!user) return null;

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      role: user.role,
      status: user.isActive ? 'Active' : 'Inactive',
      lastLogin: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      teacherId: user.teacherId,
      teacherSubjects: user.teacher?.subjects || [],
      teacherClasses: user.teacher?.classGroups?.map((c) => `Class ${c.grade}-${c.section}`) || [],
    };
  },

  // ─── Email availability (within school) ─────────────────────────────────
  async isEmailAvailable(email, schoolId, excludeId = null) {
    const where = { schoolId, email };
    if (excludeId) where.id = { not: excludeId };
    const existing = await prisma.schoolUser.findFirst({ where, select: { id: true } });
    return !existing;
  },

  // ─── Phone availability (within school) ─────────────────────────────────
  async isPhoneAvailable(phone, schoolId, excludeId = null) {
    if (!phone) return true;
    const where = { schoolId, phone };
    if (excludeId) where.id = { not: excludeId };
    const existing = await prisma.schoolUser.findFirst({ where, select: { id: true } });
    return !existing;
  },

  // ─── Create user ────────────────────────────────────────────────────────
  async create(schoolId, data) {
    const hashedPassword = await hashPassword(data.password);
    const user = await prisma.schoolUser.create({
      data: {
        schoolId,
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        passwordHash: hashedPassword,
        role: data.role,
        isActive: data.isActive !== false,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      role: user.role,
      status: user.isActive ? 'Active' : 'Inactive',
      createdAt: user.createdAt,
    };
  },

  // ─── Update user (no password here) ─────────────────────────────────────
  async update(id, schoolId, data) {
    const updateData = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.phone !== undefined) updateData.phone = data.phone || null;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    await prisma.schoolUser.update({
      where: { id },
      data: updateData,
    });

    return this.findById(id, schoolId);
  },

  // ─── Change password (by user) ──────────────────────────────────────────
  async changePassword(id, newPassword) {
    const hashed = await hashPassword(newPassword);
    await prisma.schoolUser.update({
      where: { id },
      data: { passwordHash: hashed, passwordChangedAt: new Date() },
    });
    return true;
  },

  // ─── Reset password (by admin) ─────────────────────────────────────────
  async resetPassword(id, newPassword) {
    const hashed = await hashPassword(newPassword);
    await prisma.schoolUser.update({
      where: { id },
      data: { passwordHash: hashed, passwordChangedAt: new Date(), isPasswordDefault: true },
    });
    return true;
  },

  // ─── Soft delete (deactivate) ──────────────────────────────────────────
  async remove(id, schoolId) {
    await prisma.schoolUser.update({
      where: { id },
      data: { isActive: false, deletedAt: new Date() },
    });
    return true;
  },

  // ─── Reactivate ─────────────────────────────────────────────────────────
  async reactivate(id, schoolId) {
    await prisma.schoolUser.update({
      where: { id },
      data: { isActive: true, deletedAt: null },
    });
    return true;
  },

  // ─── Export all users (school-scoped) ───────────────────────────────────
  async findAllForExport(schoolId, filters = {}) {
    const { search, role, status } = filters;
    const where = { schoolId };
    if (role) where.role = role;
    if (status === 'Active') where.isActive = true;
    else if (status === 'Inactive') where.isActive = false;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ];
    }

    const users = await prisma.schoolUser.findMany({
      where,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    return users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone || '',
      role: u.role,
      status: u.isActive ? 'Active' : 'Inactive',
      lastLogin: u.lastLoginAt || '',
      createdAt: u.createdAt,
    }));
  },
};