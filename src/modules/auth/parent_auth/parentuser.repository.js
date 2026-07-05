// modules/auth/parent_user_auth/parent-user.repository.js — RESQID
// Parent user data access layer

import { prisma } from '#config/prisma.js';
import crypto from 'crypto';

// PARENT USER QUERIES
/**
 * Find parent by phone number (full profile with students).
 */
export const findByPhone = (phone) =>
  prisma.parentUser.findUnique({
    where: { phone },
    select: {
      id: true,
      phone: true,
      firstName: true,
      lastName: true,
      name: true,
      email: true,
      photoUrl: true,
      address: true,
      city: true,
      state: true,
      pincode: true,
      occupation: true,
      isActive: true,
      isPhoneVerified: true,
      lastLoginAt: true,
      students: {
        where: { isActive: true },
        select: {
          relation: true,
          isPrimary: true,
          isEmergency: true,
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              grade: true,
              section: true,
              photoUrl: true,
              schoolId: true,
              school: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                  logoUrl: true,
                },
              },
            },
          },
        },
      },
    },
  });

/**
 * Find parent by ID (basic info, no students).
 */
export const findById = (id) =>
  prisma.parentUser.findUnique({
    where: { id },
    select: {
      id: true,
      phone: true,
      firstName: true,
      lastName: true,
      name: true,
      email: true,
      isActive: true,
      isPhoneVerified: true,
    },
  });

/**
 * Find parent profile by ID (with students).
 */
export const findProfileById = (id) =>
  prisma.parentUser.findUnique({
    where: { id },
    select: {
      id: true,
      phone: true,
      firstName: true,
      lastName: true,
      name: true,
      email: true,
      photoUrl: true,
      address: true,
      city: true,
      state: true,
      pincode: true,
      occupation: true,
      canCall: true,
      canWhatsapp: true,
      canEmail: true,
      canSMS: true,
      isActive: true,
      isPhoneVerified: true,
      isEmergencyContact: true,
      emergencyPriority: true,
      lastLoginAt: true,
      lastSeenAt: true,
      createdAt: true,
      updatedAt: true,
      students: {
        where: { isActive: true },
        select: {
          relation: true,
          isPrimary: true,
          isEmergency: true,
          priority: true,
          canPickup: true,
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              grade: true,
              section: true,
              photoUrl: true,
              schoolId: true,
              school: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                  logoUrl: true,
                },
              },
            },
          },
        },
      },
    },
  });

/**
 * Find parent by email.
 */
export const findByEmail = (email) =>
  prisma.parentUser.findFirst({
    where: { email: email?.toLowerCase() },
    select: {
      id: true,
      phone: true,
      email: true,
      name: true,
      isActive: true,
    },
  });

/**
 * Check if phone is already registered.
 */
export const phoneExists = (phone) =>
  prisma.parentUser.findUnique({
    where: { phone },
    select: { id: true },
  });

/**
 * Create new parent user.
 */
export const createParent = (data) =>
  prisma.parentUser.create({
    data: {
      phone: data.phone,
      firstName: data.firstName,
      lastName: data.lastName || null,
      name: data.name,
      email: data.email?.toLowerCase() || null,
      photoUrl: data.photoUrl || null,
      address: data.address || null,
      city: data.city || null,
      state: data.state || null,
      pincode: data.pincode || null,
      occupation: data.occupation || null,
      isPhoneVerified: data.isPhoneVerified ?? false,
      isActive: data.isActive ?? true,
    },
    select: {
      id: true,
      phone: true,
      firstName: true,
      lastName: true,
      name: true,
      email: true,
      isActive: true,
    },
  });

/**
 * Update parent profile.
 */
export const updateProfile = (id, data) =>
  prisma.parentUser.update({
    where: { id },
    data: {
      ...(data.firstName !== undefined && { firstName: data.firstName }),
      ...(data.lastName !== undefined && { lastName: data.lastName }),
      ...(data.name !== undefined && { name: data.name }),
      ...(data.email !== undefined && { email: data.email?.toLowerCase() }),
      ...(data.photoUrl !== undefined && { photoUrl: data.photoUrl }),
      ...(data.address !== undefined && { address: data.address }),
      ...(data.city !== undefined && { city: data.city }),
      ...(data.state !== undefined && { state: data.state }),
      ...(data.pincode !== undefined && { pincode: data.pincode }),
      ...(data.occupation !== undefined && { occupation: data.occupation }),
    },
    select: {
      id: true,
      phone: true,
      firstName: true,
      lastName: true,
      name: true,
      email: true,
      photoUrl: true,
      address: true,
      city: true,
      state: true,
      pincode: true,
      occupation: true,
    },
  });

/**
 * Update parent last login timestamp.
 */
export const updateLastLogin = (id) =>
  prisma.parentUser.update({
    where: { id },
    data: {
      lastLoginAt: new Date(),
      lastSeenAt: new Date(),
    },
  });

// CARD / TOKEN QUERIES
/**
 * Find card/token by number (for registration validation).
 */
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
      isActive: true,
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          grade: true,
          section: true,
          schoolId: true,
          school: {
            select: { id: true, name: true },
          },
        },
      },
    },
  });

/**
 * Link card to student after parent registration.
 */
export const linkCardToParentStudent = (cardId, studentId, parentId) =>
  Promise.all([
    prisma.token.update({
      where: { id: cardId },
      data: {
        studentId,
        status: 'ACTIVE',
        issuedAt: new Date(),
      },
    }),
    prisma.parentStudent.upsert({
      where: {
        parentId_studentId: { parentId, studentId },
      },
      create: {
        parentId,
        studentId,
        relation: 'GUARDIAN',
        isPrimary: true,
        isEmergency: true,
      },
      update: {
        isPrimary: true,
        isEmergency: true,
      },
    }),
  ]);

// SESSION MANAGEMENT
/**
 * Create a new session for parent.
 */
export const createSession = (parentId, sessionId, refreshToken) =>
  prisma.userSession.create({
    data: {
      id: sessionId,
      parentUserId: parentId,
      refreshTokenHash: crypto.createHash('sha256').update(refreshToken).digest('hex'),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
    select: { id: true },
  });

/**
 * Find session by refresh token.
 */
export const findSessionByToken = (refreshToken) => {
  const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  return prisma.userSession.findUnique({
    where: { refreshTokenHash: hash },
    select: {
      id: true,
      parentUserId: true,
      expiresAt: true,
      revokedAt: true,
    },
  });
};

/**
 * Revoke a session.
 */
export const revokeSession = (sessionId) =>
  prisma.userSession.update({
    where: { id: sessionId },
    data: { revokedAt: new Date() },
  });

/**
 * Revoke all sessions for a parent.
 */
export const revokeAllSessions = (parentId) =>
  prisma.userSession.updateMany({
    where: {
      parentUserId: parentId,
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  });

// DEVICE MANAGEMENT
/**
 * Upsert parent device (for push notifications).
 */
export const upsertDevice = ({ parentId, deviceFingerprint, platform, expoPushToken }) =>
  prisma.parentDevice.upsert({
    where: { deviceFingerprint },
    create: {
      parentId,
      deviceFingerprint,
      platform: platform || 'unknown',
      expoPushToken,
      isActive: true,
      lastSeenAt: new Date(),
    },
    update: {
      isActive: true,
      loggedOutAt: null,
      logoutReason: null,
      lastSeenAt: new Date(),
      expoPushToken: expoPushToken || undefined,
    },
  });

/**
 * Logout device.
 */
export const logoutDevice = (deviceFingerprint, reason = 'USER_LOGOUT') =>
  prisma.parentDevice.update({
    where: { deviceFingerprint },
    data: {
      isActive: false,
      loggedOutAt: new Date(),
      logoutReason: reason,
    },
  });
