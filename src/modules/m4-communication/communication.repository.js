// =============================================================================
// modules/m4-communication/communication.repository.js — RESQID
// All DB queries — no business logic.
// =============================================================================

import { prisma } from '#config/prisma.js';

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
  }

  return Array.from(parentMap.values());
};

// ═══════════════════════════════════════════════════════════════════════════════
// DIRECT MESSAGES
// ═══════════════════════════════════════════════════════════════════════════════

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
      },
    }),
    prisma.message.count({ where }),
  ]);
};

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