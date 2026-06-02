// school-admin/notification/notification.repository.js
import { prisma } from '#config/prisma.js';

export class NotificationRepository {
  async create(data) {
    return prisma.notification.create({ data });
  }

  async update(id, data) {
    return prisma.notification.update({ where: { id }, data });
  }

  async delete(id) {
    return prisma.notification.delete({ where: { id } });
  }

  async findById(id, schoolId) {
    return prisma.notification.findFirst({
      where: { id, schoolId },
      include: {
        parent: true,
        schoolUser: true,
        student: true,
        createdByUser: { select: { name: true } }, // ✅ added for sentBy name
      },
    });
  }

  async list(where, skip, take, orderBy = { createdAt: 'desc' }) {
    const [items, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          createdByUser: { select: { name: true } }, // ✅ added for sentBy name
        },
      }),
      prisma.notification.count({ where }),
    ]);
    return { items, total };
  }

  async getStats(schoolId) {
    const [totalSent, totalDelivered, totalRead] = await Promise.all([
      prisma.notification.count({ where: { schoolId } }),
      prisma.notification.count({ where: { schoolId, status: 'DELIVERED' } }),
      prisma.notification.count({ where: { schoolId, isRead: true } }),
    ]);
    const avgOpenRate = totalDelivered ? ((totalRead / totalDelivered) * 100).toFixed(1) : '0';
    return { totalSent, totalDelivered, totalRead, avgOpenRate };
  }

  // Resolve parent IDs based on recipient type
  async getRecipientParentIds(schoolId, recipientType, selectedClass, selectedSection, selectedParents) {
    if (recipientType === 'all') {
      const parents = await prisma.parentUser.findMany({
        where: { students: { some: { student: { schoolId } } }, isActive: true },
        select: { id: true },
      });
      return parents.map(p => p.id);
    }
    if (recipientType === 'class' && selectedClass) {
      const where = { grade: selectedClass, schoolId };
      if (selectedSection) where.section = selectedSection;
      const students = await prisma.student.findMany({
        where,
        select: { parentLinks: { select: { parentId: true } } },
      });
      const parentIds = new Set();
      students.forEach(s => s.parentLinks.forEach(pl => parentIds.add(pl.parentId)));
      return Array.from(parentIds);
    }
    if (recipientType === 'individual' && selectedParents?.length) {
      return selectedParents;
    }
    return [];
  }
}