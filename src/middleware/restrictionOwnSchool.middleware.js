// =============================================================================
// restrictionOwnSchool.middleware.js — RESQID
//
// STRICT access control — zero tolerance for cross-tenant access.
// School users can ONLY access their own school's data.
// Parents can ONLY access their own children's data.
// Single violation = immediate 403 + security log.
// =============================================================================

import { prisma } from '#config/prisma.js';
import { middlewareRedis } from '#config/redis.js';
import { ApiError } from '#shared/response/ApiError.js';
import { asyncHandler } from '#shared/response/asyncHandler.js';
import { logger } from '#config/logger.js';
import {
  ROLES,
  SCHOOL_SCOPED_ROLES,
  GLOBAL_ROLES,
  PARENT_SCOPED_ROLES,
} from '#shared/constants/roles.js';

const PARENT_CHILDREN_CACHE_TTL = 2 * 60; // 2 minutes
const VIOLATION_THRESHOLD = 3; // Alert after 3 violations from same IP

// ─── School Restriction ───────────────────────────────────────────────────────

/**
 * Ensure school-scoped users can only access their own school's data.
 *
 * REQUIRES: tenantScope middleware to run before this.
 */
export const ownSchoolOnly = asyncHandler(async (req, _res, next) => {
  // Global roles bypass
  if (GLOBAL_ROLES.includes(req.user?.role)) {
    return next();
  }

  // Device roles bypass (scoped by device auth)
  if (req.user?.role === ROLES.ATTENDANCE_DEVICE) {
    return next();
  }

  const requestedSchoolId =
    req.params.schoolId || req.params.school_id || req.body?.schoolId || req.body?.school_id;

  // No school reference — valid
  if (!requestedSchoolId) return next();

  // Tenant scope must be applied
  if (SCHOOL_SCOPED_ROLES.includes(req.user?.role) && !req.schoolId) {
    logger.error(
      {
        userId: req.user?.id,
        path: req.path,
        requestId: req.requestId,
      },
      'SECURITY: ownSchoolOnly called without tenantScope'
    );
    throw ApiError.internal('Access control misconfiguration');
  }

  // Strict comparison
  if (req.schoolId !== requestedSchoolId) {
    logger.warn(
      {
        userId: req.user?.id,
        role: req.user?.role,
        userSchoolId: req.schoolId,
        requestedSchoolId,
        path: req.path,
        ip: req.ip,
        requestId: req.requestId,
      },
      'SECURITY: School access violation'
    );

    await trackViolation(req);
    throw ApiError.schoolAccessDenied();
  }

  next();
});

// ─── Parent Restriction ───────────────────────────────────────────────────────

/**
 * Ensure parents can only access their own children.
 */
export const ownChildrenOnly = asyncHandler(async (req, _res, next) => {
  if (req.user?.role !== ROLES.PARENT) return next();

  const studentId =
    req.params.studentId || req.params.student_id || req.body?.studentId || req.body?.student_id;

  if (!studentId) return next();

  const parentId = req.user?.id;
  if (!parentId) throw ApiError.unauthorized('Parent authentication required');

  const isChild = await verifyParentChild(parentId, studentId);
  if (!isChild) {
    logger.warn(
      {
        parentId,
        studentId,
        path: req.path,
        ip: req.ip,
        requestId: req.requestId,
      },
      'SECURITY: Parent access violation'
    );

    await trackViolation(req);
    throw ApiError.forbidden('You do not have access to this student');
  }

  req.studentId = studentId;
  next();
});

/**
 * Ensure parents can only access their own profile.
 */
export const ownProfileOnly = asyncHandler(async (req, _res, next) => {
  if (req.user?.role !== ROLES.PARENT) return next();

  const requestedId = req.params.parentId || req.params.id;

  if (requestedId && requestedId !== req.user?.id) {
    logger.warn(
      {
        userId: req.user?.id,
        requestedId,
        path: req.path,
        requestId: req.requestId,
      },
      'SECURITY: Parent profile access violation'
    );

    await trackViolation(req);
    throw ApiError.forbidden('You can only access your own profile');
  }

  next();
});

// ─── Token Restriction ────────────────────────────────────────────────────────

/**
 * Ensure school users can only access tokens from their school.
 */
export const ownTokenOnly = asyncHandler(async (req, _res, next) => {
  if (GLOBAL_ROLES.includes(req.user?.role)) return next();

  const tokenId = req.params.tokenId || req.params.token_id;
  if (!tokenId) return next();

  if (SCHOOL_SCOPED_ROLES.includes(req.user?.role) && !req.schoolId) {
    logger.error(
      { userId: req.user?.id, tokenId, path: req.path },
      'ownTokenOnly missing tenantScope'
    );
    throw ApiError.internal('Access control misconfiguration');
  }

  const token = await prisma.token.findUnique({
    where: { id: tokenId },
    select: { schoolId: true, studentId: true },
  });

  if (!token) {
    throw ApiError.notFound('Token not found');
  }

  if (req.schoolId && token.schoolId !== req.schoolId) {
    logger.warn(
      {
        userId: req.user?.id,
        userSchoolId: req.schoolId,
        tokenSchoolId: token.schoolId,
        tokenId,
      },
      'SECURITY: Token ownership violation'
    );

    await trackViolation(req);
    throw ApiError.forbidden('This token does not belong to your school');
  }

  next();
});

// ─── Student Restriction (Combined) ───────────────────────────────────────────

export const ownStudentOnly = asyncHandler(async (req, _res, next) => {
  const studentId =
    req.params.studentId || req.params.student_id || req.body?.studentId || req.body?.student_id;

  if (!studentId) return next();

  // School user — check school ownership
  if (SCHOOL_SCOPED_ROLES.includes(req.user?.role)) {
    if (!req.schoolId) throw ApiError.internal('Access control misconfiguration');

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { schoolId: true },
    });

    if (!student) throw ApiError.studentNotFound();

    if (student.schoolId !== req.schoolId) {
      logger.warn({ userId: req.user?.id, studentId }, 'Cross-school student access attempt');
      await trackViolation(req);
      throw ApiError.schoolAccessDenied();
    }
  }

  // Parent — check parent-child relationship
  if (req.user?.role === ROLES.PARENT) {
    const isChild = await verifyParentChild(req.user.id, studentId);
    if (!isChild) {
      await trackViolation(req);
      throw ApiError.forbidden('You do not have access to this student');
    }
  }

  next();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function verifyParentChild(parentId, studentId) {
  const cacheKey = `parent_children:${parentId}`;

  try {
    const cached = await middlewareRedis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached).includes(studentId);
    }
  } catch {
    // Fall through to DB
  }

  const links = await prisma.parentStudent.findMany({
    where: { parentId },
    select: { studentId: true },
  });

  const childIds = links.map((l) => l.studentId);

  try {
    await middlewareRedis.set(cacheKey, JSON.stringify(childIds), 'EX', PARENT_CHILDREN_CACHE_TTL);
  } catch {
    // Non-critical
  }

  return childIds.includes(studentId);
}

async function trackViolation(req) {
  const ip = req.ip || 'unknown';
  const key = `security:violations:${ip}`;

  try {
    const count = await middlewareRedis.incr(key);
    await middlewareRedis.expire(key, 15 * 60); // 15 min window

    if (count >= VIOLATION_THRESHOLD) {
      logger.error({ ip, violationCount: count }, 'SECURITY ALERT: Multiple access violations');
      await middlewareRedis.del(key); // Reset after alert
    }
  } catch {
    // Non-critical
  }
}

// ─── Cache Management ─────────────────────────────────────────────────────────

export async function invalidateParentChildrenCache(parentId) {
  try {
    await middlewareRedis.del(`parent_children:${parentId}`);
  } catch {
    // Non-critical
  }
}
