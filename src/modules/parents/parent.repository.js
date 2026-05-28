// =============================================================================
// parent.repository.js — RESQID
//
// Data access layer for the Parent module.
// All Prisma queries live here — service layer calls these, never queries directly.
//
// Models touched:
//   ParentUser, ParentStudent, ParentDevice, UserSession,
//   Student, CardVisibility, NotificationPreference, ScanLog
// =============================================================================

import { prisma } from '#config/prisma.js';

// =============================================================================
// PROFILE
// =============================================================================

/**
 * Find a parent by their ID (active only)
 */
const findById = (parentId) =>
  prisma.parentUser.findFirst({
    where: { id: parentId, deletedAt: null },
    select: {
      id:          true,
      name:        true,
      phone:       true,
      email:       true,
      isActive:    true,
      lastLoginAt: true,
      createdAt:   true,
      updatedAt:   true,
      _count: {
        select: { students: true, devices: true },
      },
    },
  });

/**
 * Find a parent by phone (for duplicate checks)
 */
const findByPhone = (phone) =>
  prisma.parentUser.findFirst({
    where: { phone, deletedAt: null },
    select: { id: true, phone: true, isActive: true },
  });

/**
 * Find a parent by email (for duplicate checks)
 */
const findByEmail = (email) =>
  prisma.parentUser.findFirst({
    where: { email, deletedAt: null },
    select: { id: true, email: true },
  });

/**
 * Update parent profile fields
 */
const updateProfile = (parentId, data) =>
  prisma.parentUser.update({
    where: { id: parentId },
    data,
    select: {
      id:        true,
      name:      true,
      phone:     true,
      email:     true,
      isActive:  true,
      updatedAt: true,
    },
  });

/**
 * Soft-delete parent account
 */
const softDelete = (parentId) =>
  prisma.parentUser.update({
    where: { id: parentId },
    data: {
      deletedAt: new Date(),
      isActive:  false,
    },
  });

// =============================================================================
// CHILDREN (ParentStudent links)
// =============================================================================

/**
 * List all children linked to this parent with full student info
 */
const listChildren = (parentId, { skip, take }) =>
  prisma.parentStudent.findMany({
    where:   { parentId },
    skip,
    take,
    orderBy: { createdAt: 'asc' },
    select: {
      id:        true,
      relation:  true,
      isPrimary: true,
      createdAt: true,
      student: {
        select: {
          id:          true,
          firstName:   true,
          lastName:    true,
          grade:       true,
          section:     true,
          photoUrl:    true,
          isActive:    true,
          school: {
            select: { id: true, name: true, logoUrl: true },
          },
          cardVisibility: {
            select: { visibility: true },
          },
          tokens: {
            where:  { status: 'ACTIVE' },
            take:   1,
            select: { id: true, type: true, status: true },
          },
        },
      },
    },
  });

/**
 * Count children for pagination
 */
const countChildren = (parentId) =>
  prisma.parentStudent.count({ where: { parentId } });

/**
 * Find a specific parent-student link
 */
const findChildLink = (parentId, studentId) =>
  prisma.parentStudent.findFirst({
    where: { parentId, studentId },
    select: {
      id:        true,
      relation:  true,
      isPrimary: true,
      createdAt: true,
    },
  });

/**
 * Create a parent-student link
 */
const createChildLink = (parentId, studentId, data) =>
  prisma.parentStudent.create({
    data: {
      parentId,
      studentId,
      relation:  data.relation  ?? 'PARENT',
      isPrimary: data.isPrimary ?? false,
    },
    select: {
      id:        true,
      relation:  true,
      isPrimary: true,
      createdAt: true,
      student: {
        select: {
          id:        true,
          firstName: true,
          lastName:  true,
          grade:     true,
          section:   true,
          photoUrl:  true,
          school: {
            select: { id: true, name: true },
          },
        },
      },
    },
  });

/**
 * Update a parent-student link (relation, isPrimary)
 */
const updateChildLink = (linkId, data) =>
  prisma.parentStudent.update({
    where: { id: linkId },
    data,
    select: {
      id:        true,
      relation:  true,
      isPrimary: true,
      updatedAt: true,
    },
  });

/**
 * Delete a parent-student link
 */
const deleteChildLink = (parentId, studentId) =>
  prisma.parentStudent.delete({
    where: {
      parentId_studentId: { parentId, studentId },
    },
  });

/**
 * Count how many parents are linked to this student (used before unlinking)
 */
const countStudentParents = (studentId) =>
  prisma.parentStudent.count({ where: { studentId } });

// =============================================================================
// STUDENT (read-only access for parent's own children)
// =============================================================================

/**
 * Find a student by ID — only if parent is linked to them
 */
const findChildById = (parentId, studentId) =>
  prisma.student.findFirst({
    where: {
      id:          studentId,
      parentLinks: { some: { parentId } },
    },
    select: {
      id:          true,
      firstName:   true,
      lastName:    true,
      dateOfBirth: true,
      gender:      true,
      grade:       true,
      section:     true,
      photoUrl:    true,
      isActive:    true,
      school: {
        select: { id: true, name: true, logoUrl: true, address: true },
      },
      cardVisibility: {
        select: { id: true, visibility: true },
      },
      tokens: {
        where:   { status: 'ACTIVE' },
        take:    1,
        select:  { id: true, type: true, status: true, expiresAt: true },
      },
      emergencyProfile: {
        select: {
          id:              true,
          bloodGroup:      true,
          allergies:       true,
          medicalNotes:    true,
          emergencyContacts: {
            select: {
              id:           true,
              name:         true,
              phone:        true,
              relationship: true,
              isPrimary:    true,
            },
            orderBy: { isPrimary: 'desc' },
          },
        },
      },
    },
  });

// =============================================================================
// CARD VISIBILITY
// =============================================================================

/**
 * Upsert card visibility for a student
 * Creates a new CardVisibility record or updates the existing one
 */
const upsertCardVisibility = async (studentId, visibility) => {
  // Find student's current cardVisibilityId
  const student = await prisma.student.findUnique({
    where:  { id: studentId },
    select: { cardVisibilityId: true },
  });

  if (student?.cardVisibilityId) {
    // Update existing
    return prisma.cardVisibility.update({
      where: { id: student.cardVisibilityId },
      data:  { visibility },
      select: { id: true, visibility: true },
    });
  }

  // Create new and link to student
  return prisma.$transaction(async (tx) => {
    const cv = await tx.cardVisibility.create({
      data:   { visibility },
      select: { id: true, visibility: true },
    });
    await tx.student.update({
      where: { id: studentId },
      data:  { cardVisibilityId: cv.id },
    });
    return cv;
  });
};

// =============================================================================
// NOTIFICATION PREFERENCES
// =============================================================================

/**
 * Get notification preferences for a parent
 */
const getNotificationPreferences = (parentId) =>
  prisma.notificationPreference.findUnique({
    where: { parentUserId: parentId },
  });

/**
 * Upsert notification preferences
 */
const upsertNotificationPreferences = (parentId, data) =>
  prisma.notificationPreference.upsert({
    where:  { parentUserId: parentId },
    create: { parentUserId: parentId, ...data },
    update: data,
  });

// =============================================================================
// DEVICES
// =============================================================================

/**
 * List all devices for a parent
 */
const listDevices = (parentId, { skip, take }) =>
  prisma.parentDevice.findMany({
    where:   { parentId },
    skip,
    take,
    orderBy: { lastSeenAt: 'desc' },
    select: {
      id:                true,
      platform:          true,
      deviceFingerprint: true,
      isActive:          true,
      lastSeenAt:        true,
      loggedOutAt:       true,
      createdAt:         true,
    },
  });

/**
 * Count devices for pagination
 */
const countDevices = (parentId) =>
  prisma.parentDevice.count({ where: { parentId } });

/**
 * Find a specific device (verifies ownership)
 */
const findDevice = (parentId, deviceId) =>
  prisma.parentDevice.findFirst({
    where:  { id: deviceId, parentId },
    select: { id: true, parentId: true, platform: true, isActive: true },
  });

/**
 * Deactivate and soft-logout a device
 */
const deactivateDevice = (deviceId) =>
  prisma.parentDevice.update({
    where: { id: deviceId },
    data: {
      isActive:     false,
      loggedOutAt:  new Date(),
      logoutReason: 'REMOVED_BY_PARENT',
    },
  });

// =============================================================================
// SESSIONS
// =============================================================================

/**
 * List active sessions for a parent
 */
const listSessions = (parentId, { skip, take }) =>
  prisma.userSession.findMany({
    where: {
      parentUserId: parentId,
      revokedAt:    null,
      expiresAt:    { gt: new Date() },
    },
    skip,
    take,
    orderBy: { createdAt: 'desc' },
    select: {
      id:                true,
      deviceFingerprint: true,
      deviceInfo:        true,
      ipAddress:         true,
      createdAt:         true,
      expiresAt:         true,
    },
  });

/**
 * Count sessions for pagination
 */
const countSessions = (parentId) =>
  prisma.userSession.count({
    where: {
      parentUserId: parentId,
      revokedAt:    null,
      expiresAt:    { gt: new Date() },
    },
  });

/**
 * Find a specific session (verifies ownership)
 */
const findSession = (parentId, sessionId) =>
  prisma.userSession.findFirst({
    where: {
      id:           sessionId,
      parentUserId: parentId,
      revokedAt:    null,
    },
    select: { id: true, parentUserId: true },
  });

/**
 * Revoke a single session
 */
const revokeSession = (sessionId) =>
  prisma.userSession.update({
    where: { id: sessionId },
    data:  { revokedAt: new Date() },
  });

/**
 * Revoke all sessions for a parent, optionally keeping one (currentSessionId)
 */
const revokeAllSessions = (parentId, exceptSessionId = null) =>
  prisma.userSession.updateMany({
    where: {
      parentUserId: parentId,
      revokedAt:    null,
      ...(exceptSessionId ? { NOT: { id: exceptSessionId } } : {}),
    },
    data: { revokedAt: new Date() },
  });

// =============================================================================
// SCAN HISTORY
// =============================================================================

/**
 * List scan logs for a specific student (parent view — read-only)
 */
const listChildScans = (studentId, { skip, take, from, to, result }) =>
  prisma.scanLog.findMany({
    where: {
      token: { studentId },
      ...(from || to
        ? {
            scannedAt: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to   ? { lte: new Date(to)   } : {}),
            },
          }
        : {}),
      ...(result ? { result } : {}),
    },
    skip,
    take,
    orderBy: { scannedAt: 'desc' },
    select: {
      id:        true,
      result:    true,
      scannedAt: true,
      ipAddress: true,
      city:      true,
      device:    true,
      os:        true,
      token: {
        select: { id: true, type: true },
      },
    },
  });

/**
 * Count scan logs for pagination
 */
const countChildScans = (studentId, { from, to, result }) =>
  prisma.scanLog.count({
    where: {
      token: { studentId },
      ...(from || to
        ? {
            scannedAt: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to   ? { lte: new Date(to)   } : {}),
            },
          }
        : {}),
      ...(result ? { result } : {}),
    },
  });

// =============================================================================
// EXPORT
// =============================================================================

export const parentRepository = {
  // Profile
  findById,
  findByPhone,
  findByEmail,
  updateProfile,
  softDelete,

  // Children
  listChildren,
  countChildren,
  findChildLink,
  findChildById,
  createChildLink,
  updateChildLink,
  deleteChildLink,
  countStudentParents,

  // Card Visibility
  upsertCardVisibility,

  // Notification Preferences
  getNotificationPreferences,
  upsertNotificationPreferences,

  // Devices
  listDevices,
  countDevices,
  findDevice,
  deactivateDevice,

  // Sessions
  listSessions,
  countSessions,
  findSession,
  revokeSession,
  revokeAllSessions,

  // Scans
  listChildScans,
  countChildScans,
};