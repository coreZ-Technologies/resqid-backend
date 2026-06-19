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
// CRUD CORE (for admin panel)
// ═══════════════════════════════════════════════════════════════════════════════

export const findAll = async (query = {}) => {
  const { page = 1, limit = 10, search, schoolId, engagement } = query;
  const where = {};

  if (schoolId) {
    where.students = { some: { student: { schoolId } } };
  }
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
    ];
  }
  // Engagement filter would require a computed field – skip for now

  const [items, total] = await Promise.all([
    prisma.parentUser.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        students: {
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                grade: true,
                section: true,
                schoolId: true,
              },
            },
          },
        },
        notificationPrefs: true,
      },
    }),
    prisma.parentUser.count({ where }),
  ]);

  return { data: items, total, page, limit };
};

export const findBySchool = async (schoolId, query) => {
  return findAll({ ...query, schoolId });
};

export const findById = async (id) => {
  return prisma.parentUser.findUnique({
    where: { id },
    include: {
      students: {
        include: {
          student: {
            include: {
              school: { select: { id: true, name: true } },
            },
          },
        },
      },
      notificationPrefs: true,
    },
  });
};

export const create = async (data) => {
  return prisma.parentUser.create({
    data: {
      name: data.name,
      email: data.email,
      phone: data.phone,
      address: data.address,
      city: data.city,
      state: data.state,
      pincode: data.pincode,
      occupation: data.occupation,
      photoUrl: data.photoUrl,
      canCall: data.canCall ?? true,
      canWhatsapp: data.canWhatsapp ?? true,
      canEmail: data.canEmail ?? true,
      canSMS: data.canSMS ?? true,
      isActive: data.isActive ?? true,
      notificationPrefs: data.notificationPrefs
        ? { create: data.notificationPrefs }
        : undefined,
    },
  });
};

export const update = async (id, data) => {
  const { notificationPrefs, ...rest } = data;
  const updateData = { ...rest };

  const result = await prisma.parentUser.update({
    where: { id },
    data: updateData,
  });

  if (notificationPrefs) {
    await prisma.notificationPreference.upsert({
      where: { parentId: id },
      create: { parentId: id, ...notificationPrefs },
      update: notificationPrefs,
    });
  }

  return result;
};

export const remove = async (id) => {
  // Soft delete – just deactivate
  return prisma.parentUser.update({
    where: { id },
    data: { isActive: false, deletedAt: new Date() },
  });
};

export const getStats = async (schoolId) => {
  const where = schoolId
    ? { students: { some: { student: { schoolId } } } }
    : {};

  const [total, active, withChildren] = await Promise.all([
    prisma.parentUser.count({ where }),
    prisma.parentUser.count({ where: { ...where, isActive: true } }),
    prisma.parentUser.count({ where: { ...where, students: { some: {} } } }),
  ]);

  return {
    total,
    active,
    withChildren,
    withoutChildren: total - withChildren,
    engagement: { high: 0, medium: 0, low: 0 }, // placeholder
  };
};

export const findForExport = async (schoolId, filters = {}) => {
  const where = {};

  if (schoolId) {
    where.students = { some: { student: { schoolId } } };
  }
  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { email: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  return prisma.parentUser.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      students: {
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              grade: true,
              section: true,
            },
          },
        },
      },
      notificationPrefs: true,
    },
  });
};

// ═══════════════════════════════════════════════════════════════════════════════
// HOME / DASHBOARD (Parent Self-Service)
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

  // Get scan stats for primary (or first) student
  const activeLink = studentLinks.find((l) => l.isPrimary) || studentLinks[0];
  const activeStudentId = activeLink?.student?.id;

  let lastScan = null,
    scanCount = 0;
  if (activeStudentId) {
    const [scan, count] = await Promise.all([
      prisma.scan.findFirst({
        where: { token: { studentId: activeStudentId } },
        orderBy: { scannedAt: 'desc' },
        select: { id: true, result: true, scannedAt: true, ipAddress: true },
      }),
      prisma.scan.count({ where: { token: { studentId: activeStudentId } } }),
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
<<<<<<< HEAD

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
      OR: [{ rfidTagNumber: cardNumber }, { scanCode: cardNumber }],
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
// STUDENT MANAGEMENT (for card linking)
// ═══════════════════════════════════════════════════════════════════════════════

export const createStudent = (schoolId) =>
  prisma.student.create({
    data: { schoolId, firstName: 'New', lastName: 'Student', isActive: true },
    select: { id: true },
  });

export const createEmergencyProfile = (studentId, schoolId) =>
  prisma.emergencyProfile.create({
    data: { studentId, schoolId, isComplete: false },
  });

export const activateCard = (cardId, studentId) =>
  prisma.token.update({
    where: { id: cardId },
    data: { studentId, status: 'ACTIVE', issuedAt: new Date() },
  });

export const findParentStudentLink = (parentId, studentId) =>
  prisma.parentStudent.findUnique({
    where: { parentId_studentId: { parentId, studentId } },
  });

export const createParentStudentLink = (parentId, studentId, isPrimary) =>
  prisma.parentStudent.create({
    data: { parentId, studentId, relation: 'GUARDIAN', isPrimary },
  });

export const countParentChildren = (parentId) =>
  prisma.parentStudent.count({ where: { parentId } });

// ═══════════════════════════════════════════════════════════════════════════════
// DEVICE (Push Notifications)
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

export const getScanHistory = async (
  parentId,
  { studentId, page = 1, limit = 20, filter }
) => {
  await verifyStudentOwnership(parentId, studentId);

  const where = { token: { studentId } };
  if (filter === 'emergency') where.result = 'ACTIVE';
  if (filter === 'success') where.result = 'SUCCESS';

  const [rows, total] = await Promise.all([
    prisma.scan.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { scannedAt: 'desc' },
      select: { id: true, result: true, scannedAt: true, ipAddress: true, city: true },
    }),
    prisma.scan.count({ where }),
  ]);

  return { scans: rows, total, page, limit };
};
=======
>>>>>>> fc2f457f3fe5f95777ea9ced16e959883f9d995e
