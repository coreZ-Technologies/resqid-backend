// TODO: Add implementation
// =============================================================================
// students.repository.js — RESQID
// Raw DB access for student records. No business logic here.
// All queries are school-scoped via schoolId.
// =============================================================================

import { prisma } from '#config/prisma.js';
import { getPagination, paginateMeta } from '#shared/utils/paginate.js';
import { encrypt, decrypt, lookupHash } from '#shared/security/encryption.js';

// =============================================================================
// FIND
// =============================================================================

/**
 * Find a single student by ID, scoped to the school.
 */
export const findStudentById = async (studentId, schoolId) => {
  return prisma.student.findFirst({
    where: { id: studentId, schoolId, deletedAt: null },
    include: {
      parent: {
        select: {
          id: true,
          name: true,
          phone: true,
          isVerified: true,
        },
      },
      card: {
        select: {
          id: true,
          status: true,
          qrCode: true,
          issuedAt: true,
          expiresAt: true,
        },
      },
      emergencyProfile: {
        select: {
          id: true,
          bloodGroup: true,
          hasEmergencyContacts: true,
        },
      },
    },
  });
};

/**
 * Find student by roll number within a school (for uniqueness check).
 */
export const findStudentByRollNumber = async (rollNumber, schoolId, excludeId = null) => {
  return prisma.student.findFirst({
    where: {
      rollNumber,
      schoolId,
      deletedAt: null,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true, rollNumber: true, name: true },
  });
};

/**
 * Paginated list with filters.
 */
export const findStudents = async (schoolId, query = {}) => {
  const {
    page,
    limit,
    skip,
    take,
    search,
    class: className,
    section,
    gender,
    bloodGroup,
    isActive,
    hasParent,
    hasCard,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = query;

  // ── Build where clause ────────────────────────────────────────────────────
  const where = {
    schoolId,
    deletedAt: null,
  };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { rollNumber: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (className) where.class = className;
  if (section) where.section = section;
  if (gender) where.gender = gender;
  if (bloodGroup) where.bloodGroup = bloodGroup;
  if (typeof isActive === 'boolean') where.isActive = isActive;

  if (typeof hasParent === 'boolean') {
    where.parentId = hasParent ? { not: null } : null;
  }

  if (typeof hasCard === 'boolean') {
    where.card = hasCard ? { isNot: null } : { is: null };
  }

  // ── Execute count + data in parallel ─────────────────────────────────────
  const [data, total] = await Promise.all([
    prisma.student.findMany({
      where,
      skip,
      take,
      orderBy: { [sortBy]: sortOrder },
      select: {
        id: true,
        name: true,
        rollNumber: true,
        class: true,
        section: true,
        gender: true,
        photoUrl: true,
        bloodGroup: true,
        isActive: true,
        createdAt: true,
        parent: {
          select: {
            id: true,
            name: true,
            isVerified: true,
          },
        },
        card: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    }),
    prisma.student.count({ where }),
  ]);

  return { data, meta: paginateMeta(total, page, limit) };
};

// =============================================================================
// CREATE
// =============================================================================

/**
 * Create a new student.
 * medicalInfo is encrypted before storage.
 */
export const createStudent = async (schoolId, data) => {
  const payload = buildStudentPayload(data);

  return prisma.student.create({
    data: {
      ...payload,
      schoolId,
    },
    include: {
      parent: { select: { id: true, name: true } },
    },
  });
};

/**
 * Bulk create students — uses createManyAndReturn for efficiency.
 * Skips duplicates by roll number if skipDuplicates is true.
 */
export const bulkCreateStudents = async (schoolId, students, skipDuplicates = true) => {
  const rows = students.map((s) => ({
    ...buildStudentPayload(s),
    schoolId,
  }));

  if (skipDuplicates) {
    return prisma.student.createMany({
      data: rows,
      skipDuplicates: true,
    });
  }

  return prisma.student.createMany({ data: rows });
};

// =============================================================================
// UPDATE
// =============================================================================

/**
 * Update student fields.
 */
export const updateStudent = async (studentId, schoolId, data) => {
  const payload = buildStudentPayload(data);

  return prisma.student.update({
    where: { id: studentId, schoolId },
    data: payload,
    include: {
      parent: { select: { id: true, name: true } },
      card: { select: { id: true, status: true } },
    },
  });
};

/**
 * Link a parent to a student.
 */
export const linkParentToStudent = async (studentId, schoolId, parentId) => {
  return prisma.student.update({
    where: { id: studentId, schoolId },
    data: { parentId },
    select: { id: true, name: true, parentId: true },
  });
};

/**
 * Unlink a parent from a student.
 */
export const unlinkParentFromStudent = async (studentId, schoolId) => {
  return prisma.student.update({
    where: { id: studentId, schoolId },
    data: { parentId: null },
    select: { id: true, name: true, parentId: true },
  });
};

/**
 * Transfer student to a new class/section.
 */
export const transferStudent = async (studentId, schoolId, transferData) => {
  const { class: newClass, section, rollNumber } = transferData;

  return prisma.student.update({
    where: { id: studentId, schoolId },
    data: {
      ...(newClass ? { class: newClass } : {}),
      ...(section !== undefined ? { section } : {}),
      ...(rollNumber ? { rollNumber } : {}),
    },
    select: { id: true, name: true, class: true, section: true, rollNumber: true },
  });
};

/**
 * Activate or deactivate a student.
 */
export const setStudentActive = async (studentId, schoolId, isActive) => {
  return prisma.student.update({
    where: { id: studentId, schoolId },
    data: { isActive },
    select: { id: true, name: true, isActive: true },
  });
};

// =============================================================================
// DELETE
// =============================================================================

/**
 * Soft delete a student.
 */
export const softDeleteStudent = async (studentId, schoolId) => {
  return prisma.student.update({
    where: { id: studentId, schoolId },
    data: { deletedAt: new Date(), isActive: false },
    select: { id: true, name: true },
  });
};

// =============================================================================
// AGGREGATIONS
// =============================================================================

/**
 * Count students in a school.
 */
export const countStudents = async (schoolId, filters = {}) => {
  return prisma.student.count({
    where: { schoolId, deletedAt: null, ...filters },
  });
};

/**
 * Get student distribution by class.
 */
export const getStudentsByClass = async (schoolId) => {
  return prisma.student.groupBy({
    by: ['class', 'section'],
    where: { schoolId, deletedAt: null, isActive: true },
    _count: { id: true },
    orderBy: [{ class: 'asc' }, { section: 'asc' }],
  });
};

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Build the Prisma-ready data payload.
 * Encrypts medicalInfo if present.
 */
function buildStudentPayload(data) {
  const {
    medicalInfo,
    address,
    allergies,
    dateOfBirth,
    parentId,
    ...rest
  } = data;

  const payload = { ...rest };

  // Encrypt sensitive fields
  if (medicalInfo !== undefined) {
    payload.medicalInfo = medicalInfo ? encrypt(medicalInfo) : null;
  }

  // Serialize address as JSON
  if (address !== undefined) {
    payload.address = address ?? null;
  }

  // Serialize allergies as JSON array
  if (allergies !== undefined) {
    payload.allergies = allergies ?? [];
  }

  // Parse date
  if (dateOfBirth !== undefined) {
    payload.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
  }

  if (parentId !== undefined) {
    payload.parentId = parentId ?? null;
  }

  return payload;
}

/**
 * Decrypt medicalInfo on a student record (call after fetching from DB).
 */
export const decryptStudentSensitiveFields = (student) => {
  if (!student) return student;

  return {
    ...student,
    medicalInfo: student.medicalInfo ? decrypt(student.medicalInfo) : null,
  };
};