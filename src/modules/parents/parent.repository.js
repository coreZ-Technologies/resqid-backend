// src/modules/m5-parents/parent.repository.js
import { prisma } from '#config/prisma.js';

export class ParentRepository {
  // ─── Parent CRUD ──────────────────────────────────────────────
  async createParent(data) {
    return prisma.parentUser.create({ data });
  }

  async updateParent(id, data) {
    return prisma.parentUser.update({ where: { id }, data });
  }

  async deleteParent(id) {
    return prisma.parentUser.update({
      where: { id },
      data: { isActive: false, deletedAt: new Date() },
    });
  }

  async findParentById(id, schoolId = null) {
    const where = { id };
    if (schoolId) {
      where.students = { some: { student: { schoolId } } };
    }
    return prisma.parentUser.findFirst({
      where,
      include: {
        students: {
          include: { student: true },
        },
        devices: true,
      },
    });
  }

  async findParentByPhone(phone) {
    return prisma.parentUser.findUnique({ where: { phone } });
  }

  async findParentByEmail(email) {
    return prisma.parentUser.findUnique({ where: { email } });
  }

  async listParents(where, skip, take, orderBy = { createdAt: 'desc' }) {
    const [items, total] = await Promise.all([
      prisma.parentUser.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          students: { include: { student: true } },
          _count: { select: { students: true, notifications: true } },
        },
      }),
      prisma.parentUser.count({ where }),
    ]);
    return { items, total };
  }

  // ─── Parent-Student Links ────────────────────────────────────
  async linkStudent(parentId, studentId, relation, isPrimary = false, priority = 1) {
    return prisma.parentStudent.create({
      data: { parentId, studentId, relation, isPrimary, priority },
    });
  }

  async unlinkStudent(parentId, studentId) {
    return prisma.parentStudent.deleteMany({ where: { parentId, studentId } });
  }

  async getLinkedStudents(parentId) {
    return prisma.parentStudent.findMany({
      where: { parentId, isActive: true },
      include: { student: true },
    });
  }

  // ─── Notification Preferences ─────────────────────────────────
  async getPreferences(parentId) {
    let prefs = await prisma.notificationPreference.findUnique({ where: { parentId } });
    if (!prefs) {
      prefs = await prisma.notificationPreference.create({
        data: {
          parentId,
          smsEnabled: true,
          emailEnabled: false,
          pushEnabled: true,
          inAppEnabled: true,
          onAttendance: true,
          onEmergency: true,
          onAnnouncement: true,
        },
      });
    }
    return prefs;
  }

  async updatePreferences(parentId, data) {
    return prisma.notificationPreference.update({
      where: { parentId },
      data,
    });
  }

  // ─── Stats ────────────────────────────────────────────────────
  async getStats(schoolId) {
    const parents = await prisma.parentUser.findMany({
      where: { students: { some: { student: { schoolId } } }, isActive: true },
      include: { students: true },
    });
    const total = parents.length;
    const totalChildren = parents.reduce((acc, p) => acc + p.students.length, 0);
    // Engagement is calculated in service based on last login, notification reads, etc.
    // For now, return raw data; service will compute.
    return { total, totalChildren, parents };
  }

  // ─── Available Students (not yet linked to any parent) ────────
  async getAvailableStudents(schoolId, excludeParentId = null) {
    const linkedStudentIds = excludeParentId
      ? await prisma.parentStudent
          .findMany({
            where: { parentId: excludeParentId },
            select: { studentId: true },
          })
          .then((links) => links.map((l) => l.studentId))
      : [];
    return prisma.student.findMany({
      where: {
        schoolId,
        isActive: true,
        id: { notIn: linkedStudentIds },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        grade: true,
        section: true,
        rfidTagNumber: true,
      },
    });
  }
}
