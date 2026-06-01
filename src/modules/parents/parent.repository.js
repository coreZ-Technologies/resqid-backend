// src/modules/parents/parent.repository.js
import { prisma } from '#config/prisma.js';
import { generateParentId } from '#services/IdGenerator.service.js';
import { logger } from '#config/logger.js';

export class ParentRepository {
  // ─── Create ─────────────────────────────────────────────────────────────
  async create(data) {
    const { childIds, passwordHash, ...rest } = data;
    const parentId = generateParentId();

    return prisma.$transaction(async (tx) => {
      // Create parent
      const parent = await tx.parentUser.create({
        data: {
          id: parentId,
          ...rest,
          passwordHash,
          isPhoneVerified: true, // since admin creates, phone is trusted
          metadata: {
            notifyAttendance: rest.notifyAttendance,
            notifyAbsent: rest.notifyAbsent,
            notifyLate: rest.notifyLate,
            notifyEmergency: rest.notifyEmergency,
            weeklyReport: rest.weeklyReport,
            notifChannel: rest.notifChannel,
            relation: rest.relation,
            address: rest.address,
          },
        },
      });

      // Link children
      if (childIds?.length) {
        await tx.parentStudent.createMany({
          data: childIds.map(studentId => ({
            parentId: parent.id,
            studentId,
            relation: rest.relation,
            isPrimary: false,
            isEmergency: true,
          })),
          skipDuplicates: true,
        });
      }

      return parent;
    });
  }

  // ─── Find by ID (with children and preferences) ─────────────────────────
  async findById(id, schoolId = null) {
    const where = { id };
    if (schoolId) {
      // For school admins, ensure parent belongs to their school (via children)
      where.students = { some: { student: { schoolId } } };
    }
    return prisma.parentUser.findUnique({
      where,
      include: {
        students: {
          include: { student: true },
        },
        preferences: true,
      },
    });
  }

  // ─── List with filters, search, pagination ──────────────────────────────
  async list({ page, limit, search, engagement, dateRange, sortBy, sortOrder, schoolId }) {
    const skip = (page - 1) * limit;
    const where = this._buildListWhereClause({ search, engagement, dateRange, schoolId });

    const [parents, total] = await Promise.all([
      prisma.parentUser.findMany({
        where,
        skip,
        take: limit,
        orderBy: this._getOrderBy(sortBy, sortOrder),
        include: {
          students: { include: { student: true } },
          sessions: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      }),
      prisma.parentUser.count({ where }),
    ]);

    return { parents, total };
  }

  // ─── Update ─────────────────────────────────────────────────────────────
  async update(id, data, schoolId = null) {
    const { childIds, ...rest } = data;

    return prisma.$transaction(async (tx) => {
      // Update parent metadata
      if (Object.keys(rest).length) {
        const current = await tx.parentUser.findUnique({ where: { id } });
        await tx.parentUser.update({
          where: { id },
          data: {
            ...rest,
            metadata: {
              ...(current.metadata || {}),
              ...rest,
            },
          },
        });
      }

      // Update child links if provided
      if (childIds !== undefined) {
        await tx.parentStudent.deleteMany({ where: { parentId: id } });
        if (childIds.length) {
          await tx.parentStudent.createMany({
            data: childIds.map(studentId => ({
              parentId: id,
              studentId,
              relation: rest.relation || 'GUARDIAN',
              isPrimary: false,
              isEmergency: true,
            })),
          });
        }
      }

      return tx.parentUser.findUnique({ where: { id } });
    });
  }

  // ─── Delete (soft delete) ───────────────────────────────────────────────
  async delete(id) {
    return prisma.parentUser.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  // ─── Stats for dashboard ────────────────────────────────────────────────
  async getStats(schoolId) {
    const where = schoolId ? { students: { some: { student: { schoolId } } } } : {};

    const [
      totalParents,
      totalChildrenLinked,
      highEngagementCount,
      pendingNotificationsSum,
    ] = await Promise.all([
      prisma.parentUser.count({ where }),
      prisma.parentStudent.count({ where: { parent: where } }),
      prisma.parentUser.count({
        where: { ...where, lastLoginAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      }),
      prisma.notification.count({ where: { recipientId: { not: null }, readAt: null } }),
    ]);

    return { totalParents, totalChildrenLinked, highEngagementCount, pendingNotificationsSum };
  }

  // ─── Export raw data (for export endpoints) ─────────────────────────────
  async exportData({ engagement, dateRange, schoolId }) {
    const where = this._buildListWhereClause({ engagement, dateRange, schoolId });
    return prisma.parentUser.findMany({
      where,
      include: {
        students: { include: { student: true } },
        sessions: true,
      },
    });
  }

  // ─── Private helpers ────────────────────────────────────────────────────
  _buildListWhereClause({ search, engagement, dateRange, schoolId }) {
    const where = { deletedAt: null };

    if (schoolId) {
      where.students = { some: { student: { schoolId } } };
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { students: { some: { student: { firstName: { contains: search, mode: 'insensitive' } } } } },
      ];
    }

    if (engagement === 'high') {
      where.lastLoginAt = { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) };
    } else if (engagement === 'medium') {
      where.lastLoginAt = { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) };
    } else if (engagement === 'low') {
      where.OR = [
        { lastLoginAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
        { lastLoginAt: null },
      ];
    }

    if (dateRange !== 'all') {
      const now = new Date();
      let startDate;
      switch (dateRange) {
        case 'this_month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'last_month':
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          break;
        case 'this_year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        case 'last_quarter':
          startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
          break;
      }
      if (startDate) where.createdAt = { gte: startDate };
    }

    return where;
  }

  _getOrderBy(sortBy, sortOrder) {
    const map = {
      name: { firstName: sortOrder, lastName: sortOrder },
      joinedDate: { createdAt: sortOrder },
      engagement: { lastLoginAt: sortOrder },
      notifications: {}, // Notifications count not sortable directly – handled in service
    };
    return map[sortBy] || { createdAt: 'desc' };
  }
}