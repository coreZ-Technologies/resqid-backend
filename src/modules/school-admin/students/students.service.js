// TODO: Add implementation
// =============================================================================
// students.service.js — RESQID
// Business logic for student management.
// Calls repository for DB access; never touches prisma directly.
// =============================================================================

import { ApiError } from '#shared/response/ApiError.js';
import { logger } from '#config/logger.js';
import { getPagination } from '#shared/utils/paginate.js';
import { auditLog } from '#config/logger.js';
import { AUDIT_ACTION } from '#shared/constants/audit.js';
import {
  findStudentById,
  findStudentByRollNumber,
  findStudents,
  createStudent,
  bulkCreateStudents,
  updateStudent,
  linkParentToStudent,
  unlinkParentFromStudent,
  transferStudent,
  setStudentActive,
  softDeleteStudent,
  countStudents,
  getStudentsByClass,
  decryptStudentSensitiveFields,
} from './students.repository.js';
import { prisma } from '#config/prisma.js';

import { listStudentsSchema } from './students.validation.js';

// =============================================================================
// READ
// =============================================================================

/**
 * Get paginated student list with filters.
 */
export const listStudents = async (schoolId, rawQuery) => {
  // Validate + coerce query params (safe parse — returns defaults on invalid)
  const parsed = listStudentsSchema.parse(rawQuery);
  const pagination = getPagination(parsed);

  const result = await findStudents(schoolId, {
    ...pagination,
    search: parsed.search,
    class: parsed.class,
    section: parsed.section,
    gender: parsed.gender,
    bloodGroup: parsed.bloodGroup,
    isActive: parsed.isActive,
    hasParent: parsed.hasParent,
    hasCard: parsed.hasCard,
    sortBy: parsed.sortBy,
    sortOrder: parsed.sortOrder,
  });

  return result;
};

/**
 * Get a single student by ID.
 * Decrypts sensitive fields before returning.
 */
export const getStudent = async (studentId, schoolId) => {
  const student = await findStudentById(studentId, schoolId);

  if (!student) {
    throw ApiError.studentNotFound();
  }

  return decryptStudentSensitiveFields(student);
};

/**
 * Get student count and class breakdown (for dashboard stats).
 */
export const getStudentStats = async (schoolId) => {
  const [total, active, byClass] = await Promise.all([
    countStudents(schoolId),
    countStudents(schoolId, { isActive: true }),
    getStudentsByClass(schoolId),
  ]);

  return {
    total,
    active,
    inactive: total - active,
    byClass,
  };
};

// =============================================================================
// CREATE
// =============================================================================

/**
 * Create a single student.
 * Enforces: roll number uniqueness, subscription student limit.
 */
export const addStudent = async (schoolId, data, actorId) => {
  // 1. Check roll number uniqueness
  const existing = await findStudentByRollNumber(data.rollNumber, schoolId);
  if (existing) {
    throw ApiError.conflict(
      `Roll number '${data.rollNumber}' is already in use`,
      'ROLL_NUMBER_TAKEN'
    );
  }

  // 2. Check subscription student limit
  await enforceStudentLimit(schoolId);

  // 3. Validate parent exists (if provided)
  if (data.parentId) {
    await assertParentExists(data.parentId);
  }

  // 4. Create
  const student = await createStudent(schoolId, data);

  logger.info({ studentId: student.id, schoolId, actorId }, 'Student created');
  auditLog(AUDIT_ACTION.STUDENT_CREATED, {
    actorId,
    schoolId,
    studentId: student.id,
    rollNumber: data.rollNumber,
  });

  return student;
};

/**
 * Bulk import students from CSV/JSON.
 * Returns created count and any skipped roll numbers.
 */
export const importStudents = async (schoolId, students, skipDuplicates, actorId) => {
  // Check subscription limit
  const currentCount = await countStudents(schoolId);
  const subscription = await getSchoolSubscription(schoolId);

  if (subscription && currentCount + students.length > subscription.studentLimit) {
    throw ApiError.subscriptionLimitReached(subscription.studentLimit);
  }

  // Detect duplicates in the import batch itself
  const rollNumbers = students.map((s) => s.rollNumber);
  const uniqueRollNumbers = new Set(rollNumbers);
  const batchDuplicates = rollNumbers.length - uniqueRollNumbers.size;

  if (batchDuplicates > 0 && !skipDuplicates) {
    throw ApiError.conflict(
      `Import batch contains ${batchDuplicates} duplicate roll number(s)`,
      'BATCH_DUPLICATES'
    );
  }

  const result = await bulkCreateStudents(schoolId, students, skipDuplicates);

  logger.info({ schoolId, actorId, count: result.count }, 'Bulk student import');
  auditLog(AUDIT_ACTION.STUDENT_BULK_IMPORTED, {
    actorId,
    schoolId,
    count: result.count,
    batchDuplicates,
  });

  return {
    created: result.count,
    skipped: students.length - result.count,
  };
};

// =============================================================================
// UPDATE
// =============================================================================

/**
 * Update a student's profile.
 */
export const editStudent = async (studentId, schoolId, data, actorId) => {
  // Verify student exists
  const existing = await findStudentById(studentId, schoolId);
  if (!existing) throw ApiError.studentNotFound();

  // If roll number changing, check uniqueness
  if (data.rollNumber && data.rollNumber !== existing.rollNumber) {
    const conflict = await findStudentByRollNumber(data.rollNumber, schoolId, studentId);
    if (conflict) {
      throw ApiError.conflict(
        `Roll number '${data.rollNumber}' is already in use`,
        'ROLL_NUMBER_TAKEN'
      );
    }
  }

  // Validate parent if changing
  if (data.parentId && data.parentId !== existing.parentId) {
    await assertParentExists(data.parentId);
  }

  const updated = await updateStudent(studentId, schoolId, data);

  auditLog(AUDIT_ACTION.STUDENT_UPDATED, { actorId, schoolId, studentId });

  return decryptStudentSensitiveFields(updated);
};

/**
 * Link a parent to a student.
 */
export const attachParent = async (studentId, schoolId, parentId, actorId) => {
  const student = await findStudentById(studentId, schoolId);
  if (!student) throw ApiError.studentNotFound();

  if (student.parentId === parentId) {
    throw ApiError.conflict('This parent is already linked to the student', 'PARENT_ALREADY_LINKED');
  }

  await assertParentExists(parentId);

  const updated = await linkParentToStudent(studentId, schoolId, parentId);

  auditLog(AUDIT_ACTION.PARENT_CHILD_LINKED, { actorId, schoolId, studentId, parentId });

  return updated;
};

/**
 * Unlink the current parent from a student.
 */
export const detachParent = async (studentId, schoolId, actorId) => {
  const student = await findStudentById(studentId, schoolId);
  if (!student) throw ApiError.studentNotFound();

  if (!student.parentId) {
    throw ApiError.badRequest('Student has no linked parent', 'NO_PARENT_LINKED');
  }

  const updated = await unlinkParentFromStudent(studentId, schoolId);

  auditLog(AUDIT_ACTION.PARENT_CHILD_UNLINKED, { actorId, schoolId, studentId });

  return updated;
};

/**
 * Transfer a student to a new class/section.
 */
export const transferStudentClass = async (studentId, schoolId, transferData, actorId) => {
  const student = await findStudentById(studentId, schoolId);
  if (!student) throw ApiError.studentNotFound();

  // If roll number changing, validate uniqueness
  if (transferData.rollNumber && transferData.rollNumber !== student.rollNumber) {
    const conflict = await findStudentByRollNumber(transferData.rollNumber, schoolId, studentId);
    if (conflict) {
      throw ApiError.conflict(`Roll number '${transferData.rollNumber}' is already taken`, 'ROLL_NUMBER_TAKEN');
    }
  }

  const updated = await transferStudent(studentId, schoolId, transferData);

  auditLog(AUDIT_ACTION.STUDENT_TRANSFERRED, {
    actorId,
    schoolId,
    studentId,
    from: { class: student.class, section: student.section },
    to: { class: transferData.class, section: transferData.section },
  });

  return updated;
};

/**
 * Activate a student.
 */
export const activateStudent = async (studentId, schoolId, actorId) => {
  const student = await findStudentById(studentId, schoolId);
  if (!student) throw ApiError.studentNotFound();

  if (student.isActive) {
    throw ApiError.conflict('Student is already active', 'ALREADY_ACTIVE');
  }

  return setStudentActive(studentId, schoolId, true);
};

/**
 * Deactivate a student.
 */
export const deactivateStudent = async (studentId, schoolId, actorId) => {
  const student = await findStudentById(studentId, schoolId);
  if (!student) throw ApiError.studentNotFound();

  if (!student.isActive) {
    throw ApiError.conflict('Student is already inactive', 'ALREADY_INACTIVE');
  }

  return setStudentActive(studentId, schoolId, false);
};

// =============================================================================
// DELETE
// =============================================================================

/**
 * Soft delete a student.
 * Cannot delete if student has an active card.
 */
export const removeStudent = async (studentId, schoolId, actorId) => {
  const student = await findStudentById(studentId, schoolId);
  if (!student) throw ApiError.studentNotFound();

  // Block deletion if student has an active card
  if (student.card?.status === 'ACTIVE') {
    throw ApiError.conflict(
      'Cannot delete a student with an active ID card. Revoke the card first.',
      'CARD_ACTIVE'
    );
  }

  const deleted = await softDeleteStudent(studentId, schoolId);

  logger.info({ studentId, schoolId, actorId }, 'Student soft deleted');
  auditLog(AUDIT_ACTION.STUDENT_DELETED, { actorId, schoolId, studentId });

  return deleted;
};

// =============================================================================
// PRIVATE HELPERS
// =============================================================================

/**
 * Assert that a parent with this ID exists and is active.
 */
async function assertParentExists(parentId) {
  const parent = await prisma.parent.findUnique({
    where: { id: parentId },
    select: { id: true, isActive: true },
  });

  if (!parent) {
    throw ApiError.notFound('Parent not found', 'PARENT_NOT_FOUND');
  }

  if (!parent.isActive) {
    throw ApiError.badRequest('Parent account is inactive', 'PARENT_INACTIVE');
  }
}

/**
 * Enforce the subscription student limit.
 */
async function enforceStudentLimit(schoolId) {
  const subscription = await getSchoolSubscription(schoolId);
  if (!subscription) return; // No sub record = no cap enforced (handle in billing later)

  const current = await countStudents(schoolId);
  if (current >= subscription.studentLimit) {
    throw ApiError.studentLimitReached(subscription.studentLimit);
  }
}

/**
 * Get school subscription for limit checks.
 */
async function getSchoolSubscription(schoolId) {
  return prisma.subscription.findFirst({
    where: { schoolId, status: 'ACTIVE' },
    select: { studentLimit: true, plan: true },
    orderBy: { createdAt: 'desc' },
  });
}