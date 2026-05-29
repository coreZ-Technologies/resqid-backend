// =============================================================================
// modules/auth/auth.repository.js — RESQID
// PURE DATABASE ACCESS LAYER — NO BUSINESS LOGIC
// =============================================================================

import { prisma } from '#config/prisma.js';

// ═══════════════════════════════════════════════════════════════════════════════
// SUPER ADMIN
// ═══════════════════════════════════════════════════════════════════════════════

export const findSuperAdminByEmail = (email) =>
  prisma.superAdmin.findUnique({
    where: { email: email.toLowerCase() },
    select: {
      id: true,
      email: true,
      passwordHash: true,
      name: true,
      isActive: true,
      isPasswordDefault: true,
    },
  });

export const findSuperAdminById = (id) =>
  prisma.superAdmin.findUnique({
    where: { id },
    select: {
      id: true,
      isActive: true,
      name: true,
      email: true,
      passwordHash: true,
    },
  });

export const updateSuperAdminLastLogin = (id) =>
  prisma.superAdmin.update({
    where: { id },
    data: { lastLoginAt: new Date() },
  });

export const updateSuperAdminPassword = (id, hashedPassword) =>
  prisma.superAdmin.update({
    where: { id },
    data: { passwordHash: hashedPassword, isPasswordDefault: false, passwordChangedAt: new Date() },
  });

// ═══════════════════════════════════════════════════════════════════════════════
// SCHOOL USER (Teacher + School Admin)
// ═══════════════════════════════════════════════════════════════════════════════

export const findSchoolUserByPhone = (phone) =>
  prisma.schoolUser.findUnique({
    where: { phone },
    select: {
      id: true,
      schoolId: true,
      phone: true,
      email: true,
      passwordHash: true,
      name: true,
      role: true,
      isActive: true,
      isPasswordDefault: true,
      school: {
        select: { id: true, name: true, code: true, status: true, logoUrl: true },
      },
    },
  });

export const findSchoolUserByEmail = (email) =>
  prisma.schoolUser.findUnique({
    where: { email: email.toLowerCase() },
    select: {
      id: true,
      schoolId: true,
      email: true,
      passwordHash: true,
      name: true,
      role: true,
      isActive: true,
      isPasswordDefault: true,
      school: {
        select: { id: true, name: true, code: true, status: true },
      },
    },
  });

export const findSchoolUserById = (id) =>
  prisma.schoolUser.findUnique({
    where: { id },
    select: {
      id: true,
      schoolId: true,
      role: true,
      isActive: true,
      name: true,
      phone: true,
    },
  });

export const updateSchoolUserLastLogin = (id) =>
  prisma.schoolUser.update({
    where: { id },
    data: { lastLoginAt: new Date() },
  });

export const updateSchoolUserPassword = (id, hashedPassword) =>
  prisma.schoolUser.update({
    where: { id },
    data: {
      passwordHash: hashedPassword,
      isPasswordDefault: false,
      passwordChangedAt: new Date(),
    },
  });

// ═══════════════════════════════════════════════════════════════════════════════
// PARENT USER
// ═══════════════════════════════════════════════════════════════════════════════

export const findParentByPhone = (phone) =>
  prisma.parentUser.findUnique({
    where: { phone },
    select: {
      id: true,
      phone: true,
      name: true,
      email: true,
      isActive: true,
      otp: true,
      otpExpiresAt: true,
      otpAttempts: true,
      students: {
        select: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              grade: true,
              section: true,
              photoUrl: true,
              schoolId: true,
              school: { select: { id: true, name: true } },
              tokens: {
                where: { status: 'ACTIVE' },
                select: { id: true, rfidUid: true, qrCode: true },
                take: 1,
              },
            },
          },
        },
      },
    },
  });

export const findParentById = (id) =>
  prisma.parentUser.findUnique({
    where: { id },
    select: {
      id: true,
      phone: true,
      name: true,
      email: true,
      isActive: true,
    },
  });

export const findParentByPhoneBasic = (phone) =>
  prisma.parentUser.findUnique({
    where: { phone },
    select: {
      id: true,
      phone: true,
      otp: true,
      otpExpiresAt: true,
      otpAttempts: true,
      isActive: true,
    },
  });

export const upsertParentOtp = (phone, otpHash, expiresAt) =>
  prisma.parentUser.upsert({
    where: { phone },
    create: {
      phone,
      otp: otpHash,
      otpExpiresAt: expiresAt,
      otpAttempts: 0,
    },
    update: {
      otp: otpHash,
      otpExpiresAt: expiresAt,
      otpAttempts: 0,
    },
    select: { id: true },
  });

export const incrementOtpAttempts = (phone) =>
  prisma.parentUser.update({
    where: { phone },
    data: { otpAttempts: { increment: 1 } },
  });

export const clearOtp = (phone) =>
  prisma.parentUser.update({
    where: { phone },
    data: { otp: null, otpExpiresAt: null, otpAttempts: 0 },
  });

export const updateParentProfile = (parentId, data) =>
  prisma.parentUser.update({
    where: { id: parentId },
    data,
  });

export const updateParentLastLogin = (id) =>
  prisma.parentUser.update({
    where: { id },
    data: { lastLoginAt: new Date() },
  });

// ═══════════════════════════════════════════════════════════════════════════════
// CARD / TOKEN LOOKUP
// ═══════════════════════════════════════════════════════════════════════════════

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
          lastName: true,
          grade: true,
          section: true,
          schoolId: true,
          school: { select: { id: true, name: true } },
          parentLinks: {
            select: { parent: { select: { phone: true } } },
            take: 1,
          },
        },
      },
    },
  });

export const activateCard = (cardId, studentId) =>
  prisma.token.update({
    where: { id: cardId },
    data: {
      studentId,
      status: 'ACTIVE',
      issuedAt: new Date(),
    },
  });

// ═══════════════════════════════════════════════════════════════════════════════
// STUDENT
// ═══════════════════════════════════════════════════════════════════════════════

export const createStubStudent = (schoolId) =>
  prisma.student.create({
    data: {
      schoolId,
      firstName: null,
      lastName: null,
      isActive: true,
    },
    select: { id: true },
  });

export const createEmergencyProfile = (studentId) =>
  prisma.emergencyProfile.create({
    data: {
      studentId,
      isComplete: false,
    },
  });

// ═══════════════════════════════════════════════════════════════════════════════
// PARENT-STUDENT LINK
// ═══════════════════════════════════════════════════════════════════════════════

export const linkParentToStudent = (parentId, studentId) =>
  prisma.parentStudent.upsert({
    where: {
      parentId_studentId: { parentId, studentId },
    },
    create: {
      parentId,
      studentId,
      relation: 'PARENT',
      isPrimary: true,
    },
    update: {
      isPrimary: true,
    },
  });

// ═══════════════════════════════════════════════════════════════════════════════
// SESSION MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

export const createSession = ({
  superAdminId,
  schoolUserId,
  parentUserId,
  refreshTokenHash,
  deviceFingerprint,
  deviceInfo,
  ipAddress,
}) => {
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  return prisma.userSession.create({
    data: {
      refreshTokenHash,
      deviceFingerprint,
      deviceInfo: deviceInfo || undefined,
      ipAddress,
      expiresAt,
      ...(superAdminId && { superAdmin: { connect: { id: superAdminId } } }),
      ...(schoolUserId && { schoolUser: { connect: { id: schoolUserId } } }),
      ...(parentUserId && { parentUser: { connect: { id: parentUserId } } }),
    },
    select: { id: true },
  });
};

export const findSessionByRefreshHash = (hash) =>
  prisma.userSession.findUnique({
    where: { refreshTokenHash: hash },
    select: {
      id: true,
      superAdminId: true,
      schoolUserId: true,
      parentUserId: true,
      expiresAt: true,
      revokedAt: true,
      deviceFingerprint: true,
    },
  });

export const revokeSession = (sessionId) =>
  prisma.userSession.update({
    where: { id: sessionId },
    data: { revokedAt: new Date() },
  });

export const revokeAllUserSessions = async (userId, role) => {
  const where = { revokedAt: null };

  if (role === 'SUPER_ADMIN') where.superAdminId = userId;
  else if (role === 'SCHOOL_ADMIN' || role === 'TEACHER') where.schoolUserId = userId;
  else if (role === 'PARENT') where.parentUserId = userId;

  return prisma.userSession.updateMany({
    where,
    data: { revokedAt: new Date() },
  });
};

// ═══════════════════════════════════════════════════════════════════════════════
// DEVICE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

export const upsertParentDevice = ({ parentId, deviceFingerprint, platform, expoPushToken }) =>
  prisma.parentDevice.upsert({
    where: { deviceFingerprint },
    create: {
      parentId,
      deviceFingerprint,
      platform: platform || 'unknown',
      expoPushToken,
      isActive: true,
    },
    update: {
      isActive: true,
      loggedOutAt: null,
      lastSeenAt: new Date(),
      expoPushToken: expoPushToken || undefined,
    },
  });

// ═══════════════════════════════════════════════════════════════════════════════
// AUDIT LOG
// ═══════════════════════════════════════════════════════════════════════════════

export const createAuditLog = ({
  actorId,
  actorType,
  action,
  entity,
  entityId,
  metadata,
  ip,
  ua,
}) =>
  prisma.auditLog.create({
    data: {
      actorId,
      actorType,
      action,
      entity,
      entityId,
      metadata: metadata || undefined,
      ipAddress: ip,
      userAgent: ua,
    },
  });
