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
  targetAll,
  targetGrades,
  channels,
}) =>
  prisma.announcement.create({
    data: { schoolId, authorId, title, body, targetAll, targetGrades, channels },
    select: {
      id: true,
      title: true,
      targetAll: true,
      targetGrades: true,
      channels: true,
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
        targetAll: true,
        targetGrades: true,
        channels: true,
        sentAt: true,
        createdAt: true,
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
      targetAll: true,
      targetGrades: true,
      channels: true,
      sentAt: true,
      createdAt: true,
      author: { select: { id: true, name: true } },
    },
  });

// ═══════════════════════════════════════════════════════════════════════════════
// RECIPIENT LOOKUP (for worker)
// ═══════════════════════════════════════════════════════════════════════════════

export const findRecipients = async (schoolId, targetGrades, targetAll) => {
  const where = {
    schoolId,
    isActive: true,
  };

  if (!targetAll && targetGrades.length > 0) {
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
        select: {
          parent: {
            select: {
              id: true,
              phone: true,
              email: true,
              notificationPref: {
                select: {
                  pushEnabled: true,
                  smsEnabled: true,
                  emailEnabled: true,
                  onAnnouncement: true,
                },
              },
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

  // Flatten: each parent gets unique entry with their children info
  const parentMap = new Map();
  for (const student of students) {
    for (const link of student.parentLinks) {
      const parent = link.parent;
      if (!parentMap.has(parent.id)) {
        parentMap.set(parent.id, {
          parentId: parent.id,
          phone: parent.phone,
          email: parent.email,
          prefs: parent.notificationPref || {},
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

export const createMessage = ({ schoolId, senderId, parentId, studentId, body }) =>
  prisma.message.create({
    data: { schoolId, senderId, parentId, studentId, body },
    select: { id: true, parentId: true, studentId: true, body: true, createdAt: true },
  });

export const listMessages = (parentId, page = 1, limit = 20, studentId) => {
  const where = { parentId, ...(studentId && { studentId }) };
  return Promise.all([
    prisma.message.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        body: true,
        isRead: true,
        createdAt: true,
        student: { select: { id: true, firstName: true, lastName: true } },
        sender: { select: { id: true, name: true } },
      },
    }),
    prisma.message.count({ where }),
  ]);
};

export const markMessageRead = (id, parentId) =>
  prisma.message.updateMany({
    where: { id, parentId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
