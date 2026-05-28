// =============================================================================
// modules/parents/parent.repository.js — RESQID
// All DB queries. Ownership-gated. Index-optimized.
// =============================================================================

import { prisma } from '#config/prisma.js';
import { ApiError } from '#shared/response/ApiError.js';

// ═══════════════════════════════════════════════════════════════════════════════
// OWNERSHIP GUARDS
// ═══════════════════════════════════════════════════════════════════════════════

async function verifyStudentOwnership(parentId, studentId) {
  const link = await prisma.parentStudent.findUnique({
    where: { parentId_studentId: { parentId, studentId } },
  });
  if (!link) throw ApiError.forbidden('Student not linked to this parent');
  return link;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOME DATA
// ═══════════════════════════════════════════════════════════════════════════════

export async function getParentHome(parentId) {
  const [parent, studentLinks] = await Promise.all([
    prisma.parentUser.findUnique({
      where: { id: parentId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isActive: true,
        notificationPref: {
          select: {
            pushEnabled: true,
            smsEnabled: true,
            emailEnabled: true,
            onScan: true,
            onAttendance: true,
            onEmergency: true,
            onAnnouncement: true,
          },
        },
      },
    }),
    prisma.parentStudent.findMany({
      where: { parentId },
      select: {
        relation: true,
        isPrimary: true,
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            grade: true,
            section: true,
            photoUrl: true,
            gender: true,
            dateOfBirth: true,
            school: { select: { id: true, name: true, code: true } },
            tokens: {
              where: { status: 'ACTIVE' },
              take: 1,
              select: { id: true, status: true, expiresAt: true, rfidUid: true, qrCode: true },
            },
            emergencyProfile: {
              select: {
                bloodGroup: true,
                allergies: true,
                conditions: true,
                medications: true,
                doctorName: true,
                doctorPhone: true,
                notes: true,
                isComplete: true,
                contacts: {
                  where: { isActive: true },
                  orderBy: { priority: 'asc' },
                  select: {
                    id: true,
                    name: true,
                    phone: true,
                    relation: true,
                    priority: true,
                    callEnabled: true,
                    whatsappEnabled: true,
                  },
                },
              },
            },
            cardVisibility: {
              select: { visibility: true },
            },
          },
        },
      },
    }),
  ]);

  if (!parent) return null;

  // Get scan stats for active student
  const activeStudent = studentLinks.find((l) => l.isPrimary) || studentLinks[0];
  const activeStudentId = activeStudent?.student?.id;

  let lastScan = null,
    scanCount = 0;
  if (activeStudentId) {
    const [scan, count] = await Promise.all([
      prisma.scanLog.findFirst({
        where: { token: { studentId: activeStudentId } },
        orderBy: { scannedAt: 'desc' },
        select: { id: true, result: true, scannedAt: true, ipAddress: true },
      }),
      prisma.scanLog.count({ where: { token: { studentId: activeStudentId } } }),
    ]);
    lastScan = scan;
    scanCount = count;
  }

  return {
    parent: {
      id: parent.id,
      name: parent.name,
      email: parent.email,
      phone: parent.phone,
      isActive: parent.isActive,
      notificationPrefs: parent.notificationPref || {},
    },
    students: studentLinks.map((l) => ({
      id: l.student.id,
      name: `${l.student.firstName || ''} ${l.student.lastName || ''}`.trim(),
      grade: l.student.grade,
      section: l.student.section,
      photoUrl: l.student.photoUrl,
      relation: l.relation,
      isPrimary: l.isPrimary,
      school: l.student.school,
      token: l.student.tokens[0] || null,
      emergency: l.student.emergencyProfile,
      visibility: l.student.cardVisibility?.visibility || 'PUBLIC',
    })),
    lastScan,
    scanCount,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROFILE UPDATES
// ═══════════════════════════════════════════════════════════════════════════════

export const findParentStudentLink = (parentId, studentId) =>
  prisma.parentStudent.findUnique({
    where: { parentId_studentId: { parentId, studentId } },
  });

export const updateStudentProfile = (studentId, data) =>
  prisma.student.update({ where: { id: studentId }, data });

export const upsertEmergencyProfile = (studentId, data) =>
  prisma.emergencyProfile.upsert({
    where: { studentId },
    create: { studentId, ...data },
    update: data,
  });

export const replaceEmergencyContacts = async (studentId, contacts) => {
  const profile = await prisma.emergencyProfile.findUnique({ where: { studentId } });
  if (!profile) throw ApiError.notFound('Emergency profile not found');

  await prisma.emergencyContact.deleteMany({ where: { profileId: profile.id } });

  for (const c of contacts) {
    await prisma.emergencyContact.create({
      data: {
        profileId: profile.id,
        name: c.name,
        phone: c.phone,
        relation: c.relation,
        priority: c.priority,
        isPrimary: c.isPrimary || false,
        callEnabled: c.callEnabled ?? true,
        whatsappEnabled: c.whatsappEnabled ?? true,
      },
    });
  }
};

export const updateCardVisibility = (studentId, visibility) =>
  prisma.cardVisibility.upsert({
    where: { id: studentId },
    create: { id: studentId, visibility },
    update: { visibility },
  });

export const upsertNotificationPrefs = (parentId, prefs) =>
  prisma.notificationPreference.upsert({
    where: { parentId },
    create: { parentId, ...prefs },
    update: prefs,
  });

// ═══════════════════════════════════════════════════════════════════════════════
// CARD ACTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export const lockStudentCard = (studentId) =>
  prisma.token.updateMany({
    where: { studentId, status: 'ACTIVE' },
    data: { status: 'INACTIVE' },
  });

export const findCardByNumber = (cardNumber) =>
  prisma.token.findFirst({
    where: {
      OR: [{ rfidUid: cardNumber }, { qrCode: cardNumber }],
      status: { in: ['UNREGISTERED', 'ISSUED', 'ACTIVE'] },
    },
    select: {
      id: true,
      studentId: true,
      schoolId: true,
      status: true,
      student: {
        select: {
          id: true,
          firstName: true,
          isActive: true,
          parentLinks: { select: { parentId: true }, take: 1 },
        },
      },
    },
  });

export const activateCard = (cardId, studentId) =>
  prisma.token.update({
    where: { id: cardId },
    data: { studentId, status: 'ACTIVE', issuedAt: new Date() },
  });

// ═══════════════════════════════════════════════════════════════════════════════
// STUDENT MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

export const createStubStudent = (schoolId) =>
  prisma.student.create({
    data: { schoolId, isActive: true },
    select: { id: true },
  });

export const createEmergencyProfile = (studentId) =>
  prisma.emergencyProfile.create({
    data: { studentId, isComplete: false },
  });

export const createParentStudentLink = (parentId, studentId, isPrimary) =>
  prisma.parentStudent.create({
    data: { parentId, studentId, relation: 'PARENT', isPrimary },
  });

export const deleteParentStudentLink = (parentId, studentId) =>
  prisma.parentStudent.delete({
    where: { parentId_studentId: { parentId, studentId } },
  });

export const countParentChildren = (parentId) =>
  prisma.parentStudent.count({ where: { parentId } });

export const setActiveStudent = (parentId, studentId) =>
  prisma.parentUser.update({
    where: { id: parentId },
    data: { activeStudentId: studentId },
  });

// ═══════════════════════════════════════════════════════════════════════════════
// DEVICE
// ═══════════════════════════════════════════════════════════════════════════════

export const upsertParentDevice = (
  parentId,
  { token, platform, deviceName, deviceModel, osVersion }
) =>
  prisma.parentDevice.upsert({
    where: { deviceFingerprint: token },
    create: {
      parentId,
      deviceFingerprint: token,
      platform,
      expoPushToken: token,
    },
    update: {
      platform,
      expoPushToken: token,
      isActive: true,
      lastSeenAt: new Date(),
      loggedOutAt: null,
    },
  });

// ═══════════════════════════════════════════════════════════════════════════════
// SCAN HISTORY
// ═══════════════════════════════════════════════════════════════════════════════

export const getScanHistory = async ({
  parentId,
  studentId,
  cursor,
  limit = 20,
  filter = 'all',
}) => {
  await verifyStudentOwnership(parentId, studentId);

  const where = { token: { studentId } };
  if (filter === 'emergency') where.scanPurpose = 'EMERGENCY';
  if (filter === 'success') where.result = 'SUCCESS';

  const rows = await prisma.scanLog.findMany({
    where,
    orderBy: { scannedAt: 'desc' },
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    select: {
      id: true,
      result: true,
      scannedAt: true,
      ipAddress: true,
      city: true,
      device: true,
    },
  });

  const hasMore = rows.length > limit;
  if (hasMore) rows.pop();

  return {
    scans: rows,
    hasMore,
    nextCursor: hasMore ? rows[rows.length - 1]?.id : null,
  };
};
