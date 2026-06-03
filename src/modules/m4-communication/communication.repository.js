// src/modules/m4-communication/communication.repository.js
import { prisma } from '#config/prisma.js';

<<<<<<< HEAD
export class CommunicationRepository {
  // ─── Announcements ──────────────────────────────────────────────
  async createAnnouncement(data) {
    return prisma.announcement.create({ data });
  }

  async updateAnnouncement(id, data) {
    return prisma.announcement.update({ where: { id }, data });
  }

  async deleteAnnouncement(id) {
    return prisma.announcement.update({ where: { id }, data: { isArchived: true } });
  }

  async findAnnouncementById(id, schoolId) {
    return prisma.announcement.findFirst({ where: { id, schoolId } });
  }

  async listAnnouncements(where, skip, take, orderBy = { createdAt: 'desc' }) {
    const [items, total] = await Promise.all([
      prisma.announcement.findMany({ where, skip, take, orderBy }),
      prisma.announcement.count({ where }),
    ]);
    return { items, total };
  }

  // ─── Announcement Deliveries ────────────────────────────────────
  async createDelivery(data) {
    return prisma.announcementDelivery.create({ data });
  }

  async updateDelivery(id, data) {
    return prisma.announcementDelivery.update({ where: { id }, data });
  }

  async findDeliveryById(id) {
    return prisma.announcementDelivery.findUnique({
      where: { id },
      include: { announcement: true, parent: true },
    });
  }

  async listDeliveries(where, skip, take) {
    const [items, total] = await Promise.all([
      prisma.announcementDelivery.findMany({
        where,
        skip,
        take,
        include: {
          announcement: { select: { title: true, type: true, category: true } },
          parent: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } }
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.announcementDelivery.count({ where }),
    ]);
    return { items, total };
=======
// ═══════════════════════════════════════════════════════════════════════════════
// ANNOUNCEMENTS
// ═══════════════════════════════════════════════════════════════════════════════

export const createAnnouncement = ({
  schoolId,
  authorId,
  title,
  body,
  target,
  targetGrades,
  targetSections,
  priority,
}) =>
  prisma.announcement.create({
    data: {
      schoolId,
      authorId,
      title,
      body,
      target: target || 'ALL',
      targetGrades: targetGrades || [],
      targetSections: targetSections || [],
      priority: priority || 'NORMAL',
    },
    select: {
      id: true,
      title: true,
      target: true,
      targetGrades: true,
      targetSections: true,
      priority: true,
      createdAt: true,
    },
  });

export const listAnnouncements = (schoolId, page = 1, limit = 20) => {
  const where = { schoolId };
  return Promise.all([
    prisma.announcement.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        target: true,
        targetGrades: true,
        priority: true,
        publishedAt: true,
        createdAt: true,
        totalRecipients: true,
        deliveredCount: true,
        readCount: true,
        author: { select: { id: true, name: true } },
      },
    }),
    prisma.announcement.count({ where }),
  ]);
};

export const findAnnouncement = (id, schoolId) =>
  prisma.announcement.findFirst({
    where: { id, schoolId },
    select: {
      id: true,
      title: true,
      body: true,
      target: true,
      targetGrades: true,
      targetSections: true,
      priority: true,
      publishedAt: true,
      totalRecipients: true,
      deliveredCount: true,
      readCount: true,
      createdAt: true,
      author: { select: { id: true, name: true } },
    },
  });

export const deleteAnnouncement = (id, schoolId) =>
  prisma.announcement.deleteMany({ where: { id, schoolId } });

// ═══════════════════════════════════════════════════════════════════════════════
// RECIPIENT LOOKUP (for notification worker)
// ═══════════════════════════════════════════════════════════════════════════════

export const findRecipients = async (schoolId, targetGrades, targetAll) => {
  const where = { schoolId, isActive: true };
  if (!targetAll && targetGrades?.length > 0) {
    where.grade = { in: targetGrades };
  }

  const students = await prisma.student.findMany({
    where,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      grade: true,
      section: true,
      parentLinks: {
        where: { isActive: true },
        select: {
          parent: {
            select: {
              id: true,
              phone: true,
              email: true,
              devices: {
                where: { isActive: true, expoPushToken: { not: null } },
                select: { expoPushToken: true },
              },
            },
          },
        },
      },
    },
  });

  // Deduplicate parents
  const parentMap = new Map();
  for (const student of students) {
    for (const link of student.parentLinks) {
      const parent = link.parent;
      if (!parentMap.has(parent.id)) {
        parentMap.set(parent.id, {
          parentId: parent.id,
          phone: parent.phone,
          email: parent.email,
          expoTokens: parent.devices.map((d) => d.expoPushToken),
          students: [],
        });
      }
      parentMap.get(parent.id).students.push({
        id: student.id,
        name: `${student.firstName} ${student.lastName}`.trim(),
        grade: student.grade,
        section: student.section,
      });
    }
>>>>>>> f769c34b07b38ef93f84fb7ec946cdc6fdb91efd
  }

  // ─── Messages ───────────────────────────────────────────────────
  async createMessage(data) {
    return prisma.message.create({ data });
  }

  async findMessageById(id, schoolId) {
    return prisma.message.findFirst({ where: { id, schoolId } });
  }

<<<<<<< HEAD
  async listMessages(where, skip, take) {
    const [items, total] = await Promise.all([
      prisma.message.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { parent: true, student: true },
      }),
      prisma.message.count({ where }),
    ]);
    return { items, total };
  }

  // Mark a single message as read (used internally)
  async markMessageRead(messageId, parentId) {
    return prisma.message.updateMany({
      where: { id: messageId, parentId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  // Mark all messages in a thread (from a specific parent) as read
  async markThreadRead(parentId, schoolId) {
    return prisma.message.updateMany({
      where: {
        schoolId,
        parentId,
        direction: 'PARENT_TO_SCHOOL',
        isRead: false
=======
export const createMessage = ({ schoolId, senderId, parentId, studentId, subject, body, type }) =>
  prisma.message.create({
    data: {
      schoolId,
      senderId,
      parentId,
      studentId,
      subject,
      body,
      type: type || 'GENERAL',
      direction: 'SCHOOL_TO_PARENT',
    },
    select: {
      id: true,
      parentId: true,
      studentId: true,
      subject: true,
      body: true,
      createdAt: true,
    },
  });

export const listMessages = (parentId, page = 1, limit = 20, studentId = null) => {
  const where = {
    parentId,
    ...(studentId && { studentId }),
  };
  return Promise.all([
    prisma.message.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        subject: true,
        body: true,
        type: true,
        isRead: true,
        createdAt: true,
        student: { select: { id: true, firstName: true, lastName: true } },
        sender: { select: { id: true, name: true } },
>>>>>>> f769c34b07b38ef93f84fb7ec946cdc6fdb91efd
      },
      data: { isRead: true, readAt: new Date() }
    });
  }

<<<<<<< HEAD
  // ─── Threads (group messages by parent) ─────────────────────────
  async getThreads(schoolId, skip, take, search) {
    // Simplified: group by parentId, get last message
    const threads = await prisma.message.groupBy({
      by: ['parentId'],
      where: { schoolId },
      _count: { id: true },
      _max: { createdAt: true, id: true },
      orderBy: { _max: { createdAt: 'desc' } },
      skip,
      take,
    });
    
    const parentIds = threads.map(t => t.parentId).filter(Boolean);
    const parents = await prisma.parentUser.findMany({
      where: { id: { in: parentIds } },
      select: { id: true, firstName: true, lastName: true, phone: true },
    });
    
    const unreadCounts = await prisma.message.groupBy({
      by: ['parentId'],
      where: { schoolId, isRead: false, direction: 'PARENT_TO_SCHOOL' },
      _count: { id: true },
    });
    const unreadMap = Object.fromEntries(unreadCounts.map(u => [u.parentId, u._count.id]));
    
    return threads.map(t => ({
      parentId: t.parentId,
      parent: parents.find(p => p.id === t.parentId),
      lastMessageAt: t._max.createdAt,
      lastMessageId: t._max.id,
      totalMessages: t._count.id,
      unreadCount: unreadMap[t.parentId] || 0,
    }));
  }

  // ─── Stats ──────────────────────────────────────────────────────
  async getAnnouncementStats(schoolId) {
    const [total, published, pinned, totalViews] = await Promise.all([
      prisma.announcement.count({ where: { schoolId, isArchived: false } }),
      prisma.announcement.count({ where: { schoolId, status: 'SENT', isArchived: false } }),
      prisma.announcement.count({ where: { schoolId, pinned: true, isArchived: false } }),
      prisma.announcement.aggregate({ where: { schoolId, isArchived: false }, _sum: { views: true } }),
    ]);
    return { total, published, pinned, totalViews: totalViews._sum.views || 0 };
  }

  async getDeliveryStats(schoolId) {
    const where = { announcement: { schoolId, isArchived: false } };
    const [total, delivered, failed] = await Promise.all([
      prisma.announcementDelivery.count({ where }),
      prisma.announcementDelivery.count({ where: { ...where, status: 'DELIVERED' } }),
      prisma.announcementDelivery.count({ where: { ...where, status: 'FAILED' } })
    ]);
    const rate = total ? Math.round((delivered / total) * 100) : 0;
    return { total, delivered, failed, rate };
  }
}
=======
export const findThread = (threadId) =>
  prisma.message.findMany({
    where: { threadId },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      subject: true,
      body: true,
      direction: true,
      isRead: true,
      createdAt: true,
      sender: { select: { id: true, name: true } },
    },
  });

export const markMessageRead = (id, parentId) =>
  prisma.message.updateMany({
    where: { id, parentId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });

// ═══════════════════════════════════════════════════════════════════════════════
// MESSAGE TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════════

export const createTemplate = ({ schoolId, createdById, name, type, subject, body, variables }) =>
  prisma.messageTemplate.create({
    data: { schoolId, createdById, name, type, subject, body, variables: variables || [] },
  });

export const listTemplates = (schoolId) =>
  prisma.messageTemplate.findMany({
    where: { schoolId, isActive: true },
    orderBy: { name: 'asc' },
  });

export const deleteTemplate = (id, schoolId) =>
  prisma.messageTemplate.deleteMany({ where: { id, schoolId } });

// ═══════════════════════════════════════════════════════════════════════════════
// CAMPAIGNS
// ═══════════════════════════════════════════════════════════════════════════════

export const createCampaign = ({
  schoolId,
  createdById,
  name,
  type,
  subject,
  body,
  target,
  targetGrades,
}) =>
  prisma.communicationCampaign.create({
    data: {
      schoolId,
      createdById,
      name,
      type: type || 'GENERAL',
      subject,
      body,
      target: target || 'ALL',
      targetGrades: targetGrades || [],
      targetSections: [],
      totalRecipients: 0,
    },
  });

export const listCampaigns = (schoolId) =>
  prisma.communicationCampaign.findMany({
    where: { schoolId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      type: true,
      status: true,
      totalRecipients: true,
      sentCount: true,
      deliveredCount: true,
      createdAt: true,
    },
  });

export const findCampaign = (id, schoolId) =>
  prisma.communicationCampaign.findFirst({
    where: { id, schoolId },
  });
>>>>>>> f769c34b07b38ef93f84fb7ec946cdc6fdb91efd
