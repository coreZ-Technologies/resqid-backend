// =============================================================================
// modules/parents/parent.repository.js — RESQID
// All DB queries — ownership-gated, index-optimized.
// =============================================================================

import { prisma } from '#config/prisma.js';
import { ApiError } from '#shared/response/ApiError.js';

// ═══════════════════════════════════════════════════════════════════════════════
// OWNERSHIP GUARD
// ═══════════════════════════════════════════════════════════════════════════════

export const verifyStudentOwnership = async (parentId, studentId) => {
  const link = await prisma.parentStudent.findUnique({
    where: { parentId_studentId: { parentId, studentId } },
  });
  if (!link) throw ApiError.forbidden('Student not linked to your account');
  return link;
};

// ═══════════════════════════════════════════════════════════════════════════════
// HOME / DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════

export const getParentHome = async (parentId) => {
  const parent = await prisma.parentUser.findUnique({
    where: { id: parentId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      isActive: true,
      notificationPrefs: {
        // 🔧 Fixed: notificationPrefs (not notificationPref)
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
  });

  if (!parent) return null;

  const studentLinks = await prisma.parentStudent.findMany({
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
          isActive: true,
          school: { select: { id: true, name: true, code: true, logoUrl: true } },
          emergencyProfile: {
            select: {
              bloodGroup: true,
              allergies: true,
              conditions: true,
              medications: true,
              doctorName: true,
              doctorPhone: true,
              isComplete: true,
            },
          },
          cardVisibility: { select: { visibility: true } },
        },
      },
    },
  });

  // Get scan stats for first student
  const activeLink = studentLinks.find((l) => l.isPrimary) || studentLinks[0];
  const activeStudentId = activeLink?.student?.id;

  let lastScan = null,
    scanCount = 0;
  if (activeStudentId) {
    const [scan, count] = await Promise.all([
      prisma.scan.findFirst({
        // 🔧 Fixed: scan (not scanLog)
        where: { token: { studentId: activeStudentId } },
        orderBy: { scannedAt: 'desc' },
        select: { id: true, result: true, scannedAt: true, ipAddress: true },
      }),
      prisma.scan.count({ where: { token: { studentId: activeStudentId } } }), // 🔧 Fixed
    ]);
    lastScan = scan;
    scanCount = count;
  }

  const students = studentLinks.map((l) => ({
    id: l.student.id,
    name: `${l.student.firstName || ''} ${l.student.lastName || ''}`.trim(),
    grade: l.student.grade,
    section: l.student.section,
    photoUrl: l.student.photoUrl,
    isActive: l.student.isActive,
    relation: l.relation,
    isPrimary: l.isPrimary,
    school: l.student.school,
    emergency: l.student.emergencyProfile,
    visibility: l.student.cardVisibility?.visibility || 'PUBLIC',
  }));

  return {
    parent: {
      id: parent.id,
      name: parent.name,
      email: parent.email,
      phone: parent.phone,
      isActive: parent.isActive,
      notificationPrefs: parent.notificationPrefs || {},
    },
    students,
    lastScan,
    scanCount,
  };
};

// ═══════════════════════════════════════════════════════════════════════════════
// PROFILE
// ═══════════════════════════════════════════════════════════════════════════════

export const updateParentProfile = (parentId, data) =>
  prisma.parentUser.update({ where: { id: parentId }, data });

// ═══════════════════════════════════════════════════════════════════════════════
// CARD VISIBILITY
// ═══════════════════════════════════════════════════════════════════════════════

export const updateCardVisibility = (studentId, visibility) =>
  prisma.cardVisibility.upsert({
    where: { id: studentId },
    create: { id: studentId, visibility },
    update: { visibility },
  });

// ═══════════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════════

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
      OR: [
        { rfidTagNumber: cardNumber }, // 🔧 Fixed
        { scanCode: cardNumber }, // 🔧 Fixed
      ],
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

// ═══════════════════════════════════════════════════════════════════════════════
// STUDENT MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

export const createStudent = (
  schoolId // 🔧 Renamed from createStubStudent
) =>
  prisma.student.create({
    data: { schoolId, firstName: 'New', lastName: 'Student', isActive: true },
    select: { id: true },
  });

export const createEmergencyProfile = (
  studentId,
  schoolId // 🔧 Added schoolId
) => prisma.emergencyProfile.create({ data: { studentId, schoolId, isComplete: false } });

export const activateCard = (cardId, studentId) =>
  prisma.token.update({
    where: { id: cardId },
    data: { studentId, status: 'ACTIVE', issuedAt: new Date() },
  });

export const findParentStudentLink = (parentId, studentId) =>
  prisma.parentStudent.findUnique({ where: { parentId_studentId: { parentId, studentId } } });

export const createParentStudentLink = (parentId, studentId, isPrimary) =>
  prisma.parentStudent.create({ data: { parentId, studentId, relation: 'GUARDIAN', isPrimary } }); // 🔧 Fixed enum

export const countParentChildren = (parentId) =>
  prisma.parentStudent.count({ where: { parentId } });

// ═══════════════════════════════════════════════════════════════════════════════
// DEVICE
// ═══════════════════════════════════════════════════════════════════════════════

export const upsertParentDevice = (parentId, { token, platform }) =>
  prisma.parentDevice.upsert({
    where: { deviceFingerprint: token },
    create: {
      parentId,
      deviceFingerprint: token,
      platform: platform || 'unknown',
      expoPushToken: token,
      isActive: true,
    },
    update: {
      platform: platform || 'unknown',
      expoPushToken: token,
      isActive: true,
      lastSeenAt: new Date(),
      loggedOutAt: null,
    },
  });

// ═══════════════════════════════════════════════════════════════════════════════
// SCAN HISTORY
// ═══════════════════════════════════════════════════════════════════════════════

export const getScanHistory = async (parentId, { studentId, page = 1, limit = 20, filter }) => {
  await verifyStudentOwnership(parentId, studentId);

  const where = { token: { studentId } };
  if (filter === 'emergency') where.result = 'ACTIVE';
  if (filter === 'success') where.result = 'SUCCESS';

  const [rows, total] = await Promise.all([
    prisma.scan.findMany({
      // 🔧 Fixed
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { scannedAt: 'desc' },
      select: { id: true, result: true, scannedAt: true, ipAddress: true, city: true },
    }),
    prisma.scan.count({ where }), // 🔧 Fixed
  ]);

  return { scans: rows, total, page, limit };
};