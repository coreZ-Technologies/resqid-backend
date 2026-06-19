// =============================================================================
// modules/m2-emergency/emergency.repository.js — RESQID
// =============================================================================

import { prisma } from '#config/prisma.js';

// ─── Profile ──────────────────────────────────────────────────────────────────

export const findProfileByStudent = (studentId) =>
  prisma.emergencyProfile.findUnique({
    where: { studentId },
    include: {
      contacts: { where: { isActive: true }, orderBy: { priority: 'asc' } },
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          grade: true,
          section: true,
          photoUrl: true,
        },
      },
    },
  });

// 🔧 USED BY SCAN MODULE — returns profile with visibility flags
export const findProfileForScan = (studentId) =>
  prisma.emergencyProfile.findUnique({
    where: { studentId },
    select: {
      id: true,
      studentId: true,
      bloodGroup: true,
      allergies: true,
      medications: true,
      conditions: true,
      medicalNotes: true,
      emergencyInstructions: true,
      specialNeeds: true,
      doctorName: true,
      doctorPhone: true,
      hospitalName: true,
      hospitalPhone: true,
      showBloodGroup: true,
      showAllergies: true,
      showMedications: true,
      showConditions: true,
      showContacts: true,
      showDoctorInfo: true,
      showInstructions: true,
      showInsurance: true,
      showSpecialNeeds: true,
      contacts: { where: { isActive: true }, orderBy: { priority: 'asc' } },
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          grade: true,
          section: true,
          photoUrl: true,
        },
      },
    },
  });

// ✅ FIXED: Respect incoming isComplete; default to true only if not provided.
export const upsertProfile = (studentId, schoolId, data) => {
  // Ensure isComplete uses provided value, else default true for creation.
  const createData = {
    studentId,
    schoolId,
    isComplete: data.isComplete ?? true,
    ...data,
  };

  // For update, we simply spread data (no forced override)
  return prisma.emergencyProfile.upsert({
    where: { studentId },
    create: createData,
    update: {
      ...data,
      // No forced isComplete: true — respect incoming data.
      // Prisma's @updatedAt will handle updatedAt automatically.
    },
  });
};

// ─── Contacts ─────────────────────────────────────────────────────────────────

export const findContactsByStudent = (studentId) =>
  prisma.emergencyContact.findMany({
    where: { profile: { studentId }, isActive: true },
    orderBy: { priority: 'asc' },
  });

export const findContactById = (contactId) =>
  prisma.emergencyContact.findUnique({ where: { id: contactId } });

export const createContact = (profileId, data) =>
  prisma.emergencyContact.create({ data: { profileId, ...data } });

export const updateContact = (contactId, data) =>
  prisma.emergencyContact.update({ where: { id: contactId }, data });

export const deleteContact = (contactId) =>
  prisma.emergencyContact.delete({ where: { id: contactId } });

export const replaceContacts = async (studentId, contacts) => {
  const profile = await prisma.emergencyProfile.findUnique({
    where: { studentId },
    select: { id: true },
  });
  if (!profile) return;
  await prisma.emergencyContact.deleteMany({ where: { profileId: profile.id } });
  if (contacts?.length) {
    await prisma.emergencyContact.createMany({
      data: contacts.map((c) => ({ profileId: profile.id, ...c })),
    });
  }
};

// ─── Incidents ────────────────────────────────────────────────────────────────

export const createIncident = (data) => prisma.emergencyIncident.create({ data });

export const findIncidentsByStudent = (studentId, { page = 1, limit = 20 }) =>
  prisma.emergencyIncident.findMany({
    where: { studentId },
    orderBy: { occurredAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit,
  });

export const countIncidentsByStudent = (studentId) =>
  prisma.emergencyIncident.count({ where: { studentId } });

export const findIncidentById = (incidentId) =>
  prisma.emergencyIncident.findUnique({ where: { id: incidentId } });

export const updateIncident = (incidentId, data) =>
  prisma.emergencyIncident.update({ where: { id: incidentId }, data });

// ─────────────────────────────────────────────────────────────────────────────
// 🆕 NEW: Global Incidents (School-wide) — Added for Dashboard
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch paginated incidents across ALL students in a school.
 * Supports filtering by type, severity, and status.
 */
export const findIncidentsBySchool = (schoolId, { page = 1, limit = 20, type, severity, status }) => {
  const skip = (page - 1) * limit;
  const where = {
    schoolId,
    ...(type && { type }),
    ...(severity && { severity }),
    ...(status && { status }),
  };

  return prisma.emergencyIncident.findMany({
    where,
    skip,
    take: limit,
    orderBy: { occurredAt: 'desc' },
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
      reportedBy: { select: { name: true } },
      handledBy: { select: { name: true } },
    },
  });
};

/**
 * Count incidents across ALL students in a school.
 * Supports the same filters as findIncidentsBySchool.
 */
export const countIncidentsBySchool = (schoolId, { type, severity, status }) => {
  const where = {
    schoolId,
    ...(type && { type }),
    ...(severity && { severity }),
    ...(status && { status }),
  };
  return prisma.emergencyIncident.count({ where });
};

// ─── Access Logs ──────────────────────────────────────────────────────────────

export const logAccess = (data) => prisma.emergencyAccessLog.create({ data });

export const findAccessLogsByStudent = (studentId, { page = 1, limit = 20 }) =>
  prisma.emergencyAccessLog.findMany({
    where: { studentId },
    orderBy: { accessedAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit,
  });

export const countAccessLogsByStudent = (studentId) =>
  prisma.emergencyAccessLog.count({ where: { studentId } });

// ─── Drills ───────────────────────────────────────────────────────────────────

export const createDrill = (data) => prisma.emergencyDrill.create({ data });

export const findDrillsBySchool = (schoolId) =>
  prisma.emergencyDrill.findMany({
    where: { schoolId },
    orderBy: { conductedAt: 'desc' },
  });

// ─── Verification ─────────────────────────────────────────────────────────────

export const verifyParentAccess = (parentId, studentId) =>
  prisma.parentStudent.findFirst({
    where: { parentId, studentId, isActive: true },
    select: { id: true },
  });

export const findStudentById = (studentId) =>
  prisma.student.findUnique({
    where: { id: studentId },
    select: { id: true, schoolId: true, firstName: true, lastName: true },
  });