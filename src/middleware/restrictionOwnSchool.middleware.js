// =============================================================================
// restrictionOwnSchool.middleware.js — RESQID
//
<<<<<<< HEAD
=======
<<<<<<< HEAD
// ⚠️ ROLE NAMES: Uses SUPER_ADMIN, SCHOOL_ADMIN, TEACHER, PARENT, GUARD, DEVICE
=======
>>>>>>> e674064afecbcf65dfae0ef363dfc4b63404f201
// STRICT access control — zero tolerance for cross-tenant access.
// School users can ONLY access their own school's data.
// Parents can ONLY access their own children's data.
// Single violation = immediate 403 + security log.
<<<<<<< HEAD
=======
>>>>>>> f12b34193109594a272a9511d4ea4c7b1fbd8b5f
>>>>>>> e674064afecbcf65dfae0ef363dfc4b63404f201
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

<<<<<<< HEAD
=======
<<<<<<< HEAD
const PARENT_CHILDREN_TTL = 2 * 60;          // 2 minutes
const AUDIT_LOG_THRESHOLD = 3;               // Log security events after 3 violations per IP

// Track violations for security monitoring
const violationTracker = new Map();           // IP → count

// ─── School User Restriction — STRICT ─────────────────────────────────────────

/**
 * ownSchoolOnly
 * Validates that any schoolId in params/body matches the authenticated school.
 * Applied on all routes that reference a school resource.
 *
 * REQUIRES: tenantScope middleware to set req.schoolId.
 * STRICT: Any mismatch → immediate 403 + security log + violation tracking.
=======
>>>>>>> e674064afecbcf65dfae0ef363dfc4b63404f201
const PARENT_CHILDREN_CACHE_TTL = 2 * 60; // 2 minutes
const VIOLATION_THRESHOLD = 3; // Alert after 3 violations from same IP

// ─── School Restriction ───────────────────────────────────────────────────────

/**
 * Ensure school-scoped users can only access their own school's data.
 *
 * REQUIRES: tenantScope middleware to run before this.
<<<<<<< HEAD
=======
>>>>>>> f12b34193109594a272a9511d4ea4c7b1fbd8b5f
>>>>>>> e674064afecbcf65dfae0ef363dfc4b63404f201
 */
export const ownSchoolOnly = asyncHandler(async (req, _res, next) => {
  // Global roles bypass
  if (GLOBAL_ROLES.includes(req.user?.role)) {
    return next();
  }

<<<<<<< HEAD
  // Device roles bypass (scoped by device auth)
  if (req.user?.role === ROLES.ATTENDANCE_DEVICE) {
    return next();
=======
<<<<<<< HEAD
  const requestedSchoolId = req.params.schoolId ?? req.params.school_id ?? req.body?.school_id;

  // No school reference → valid for routes like /dashboard
  if (!requestedSchoolId) return next();

  // Any user that is not SUPER_ADMIN and has a schoolId (set by tenantScope)
  // must match exactly.
  if (req.schoolId === undefined) {
    logger.error(
      {
        userId: req.userId,
        role: req.role,
        path: req.path,
        method: req.method,
        requestId: req.id,
      },
      'SECURITY: ownSchoolOnly called without tenantScope — route misconfiguration'
    );
    throw new ApiError(500, 'Access control configuration error');
=======
  // Device roles bypass (scoped by device auth)
  if (req.user?.role === ROLES.ATTENDANCE_DEVICE) {
    return next();
>>>>>>> f12b34193109594a272a9511d4ea4c7b1fbd8b5f
>>>>>>> e674064afecbcf65dfae0ef363dfc4b63404f201
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

<<<<<<< HEAD
    await trackViolation(req);
    throw ApiError.schoolAccessDenied();
=======
<<<<<<< HEAD
    trackViolation(req.ip);
    throw new ApiError(403, 'Access to this school is not permitted');
=======
    await trackViolation(req);
    throw ApiError.schoolAccessDenied();
>>>>>>> f12b34193109594a272a9511d4ea4c7b1fbd8b5f
>>>>>>> e674064afecbcf65dfae0ef363dfc4b63404f201
  }

  next();
});

// ─── Parent Restriction ───────────────────────────────────────────────────────

/**
<<<<<<< HEAD
=======
<<<<<<< HEAD
 * ownChildrenOnly
 * Parent can only access students that are linked to them.
 * Strict: No caching bypass, no soft failures.
 */
export const ownChildrenOnly = asyncHandler(async (req, _res, next) => {
  if (req.role !== 'PARENT') return next();

  const studentId = req.params.studentId ?? req.params.student_id ?? req.body?.student_id;
  if (!studentId) return next();

  const parentId = req.userId;
  if (!parentId) {
    throw new ApiError(401, 'Parent authentication required');
  }
=======
>>>>>>> e674064afecbcf65dfae0ef363dfc4b63404f201
 * Ensure parents can only access their own children.
 */
export const ownChildrenOnly = asyncHandler(async (req, _res, next) => {
  if (req.user?.role !== ROLES.PARENT) return next();

  const studentId =
    req.params.studentId || req.params.student_id || req.body?.studentId || req.body?.student_id;

  if (!studentId) return next();

  const parentId = req.user?.id;
  if (!parentId) throw ApiError.unauthorized('Parent authentication required');
<<<<<<< HEAD
=======
>>>>>>> f12b34193109594a272a9511d4ea4c7b1fbd8b5f
>>>>>>> e674064afecbcf65dfae0ef363dfc4b63404f201

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

<<<<<<< HEAD
    await trackViolation(req);
    throw ApiError.forbidden('You do not have access to this student');
=======
<<<<<<< HEAD
    trackViolation(req.ip);
    throw new ApiError(403, 'You do not have access to this student');
=======
    await trackViolation(req);
    throw ApiError.forbidden('You do not have access to this student');
>>>>>>> f12b34193109594a272a9511d4ea4c7b1fbd8b5f
>>>>>>> e674064afecbcf65dfae0ef363dfc4b63404f201
  }

  req.studentId = studentId;
  next();
});

/**
<<<<<<< HEAD
=======
<<<<<<< HEAD
 * ownProfileOnly
 * Parent can only access/modify their own profile.
 */
export const ownProfileOnly = asyncHandler(async (req, _res, next) => {
  if (req.role !== 'PARENT') return next();

  const requestedId = req.params.parentId ?? req.params.id;
  if (requestedId && requestedId !== req.userId) {
=======
>>>>>>> e674064afecbcf65dfae0ef363dfc4b63404f201
 * Ensure parents can only access their own profile.
 */
export const ownProfileOnly = asyncHandler(async (req, _res, next) => {
  if (req.user?.role !== ROLES.PARENT) return next();

  const requestedId = req.params.parentId || req.params.id;

  if (requestedId && requestedId !== req.user?.id) {
<<<<<<< HEAD
=======
>>>>>>> f12b34193109594a272a9511d4ea4c7b1fbd8b5f
>>>>>>> e674064afecbcf65dfae0ef363dfc4b63404f201
    logger.warn(
      {
        userId: req.user?.id,
        requestedId,
        path: req.path,
        requestId: req.requestId,
      },
      'SECURITY: Parent profile access violation'
    );

<<<<<<< HEAD
    await trackViolation(req);
    throw ApiError.forbidden('You can only access your own profile');
=======
<<<<<<< HEAD
    trackViolation(req.ip);
    throw new ApiError(403, 'You can only access your own profile');
=======
    await trackViolation(req);
    throw ApiError.forbidden('You can only access your own profile');
>>>>>>> f12b34193109594a272a9511d4ea4c7b1fbd8b5f
>>>>>>> e674064afecbcf65dfae0ef363dfc4b63404f201
  }

  next();
});

// ─── Token Restriction ────────────────────────────────────────────────────────

/**
<<<<<<< HEAD
 * Ensure school users can only access tokens from their school.
=======
<<<<<<< HEAD
 * ownTokenOnly
 * School user can only access tokens belonging to their school.
 * Always queries DB — no cache (security critical).
=======
 * Ensure school users can only access tokens from their school.
>>>>>>> f12b34193109594a272a9511d4ea4c7b1fbd8b5f
>>>>>>> e674064afecbcf65dfae0ef363dfc4b63404f201
 */
export const ownTokenOnly = asyncHandler(async (req, _res, next) => {
  if (GLOBAL_ROLES.includes(req.user?.role)) return next();

  const tokenId = req.params.tokenId || req.params.token_id;
  if (!tokenId) return next();

<<<<<<< HEAD
  if (SCHOOL_SCOPED_ROLES.includes(req.user?.role) && !req.schoolId) {
=======
<<<<<<< HEAD
  if (req.schoolId === undefined) {
=======
  if (SCHOOL_SCOPED_ROLES.includes(req.user?.role) && !req.schoolId) {
>>>>>>> f12b34193109594a272a9511d4ea4c7b1fbd8b5f
>>>>>>> e674064afecbcf65dfae0ef363dfc4b63404f201
    logger.error(
      { userId: req.user?.id, tokenId, path: req.path },
      'ownTokenOnly missing tenantScope'
    );
<<<<<<< HEAD
    throw ApiError.internal('Access control misconfiguration');
=======
<<<<<<< HEAD
    throw new ApiError(500, 'Access control configuration error');
=======
    throw ApiError.internal('Access control misconfiguration');
>>>>>>> f12b34193109594a272a9511d4ea4c7b1fbd8b5f
>>>>>>> e674064afecbcf65dfae0ef363dfc4b63404f201
  }

  const token = await prisma.token.findUnique({
    where: { id: tokenId },
    select: { schoolId: true, studentId: true },
  });

  if (!token) {
<<<<<<< HEAD
=======
<<<<<<< HEAD
    logger.warn(
      { userId: req.userId, tokenId, path: req.path },
      'SECURITY: Token not found access attempt'
    );
    throw new ApiError(404, 'Token not found');
  }

  if (token.schoolId !== req.schoolId) {
    logger.warn(
      {
        userId: req.userId,
        role: req.role,
        schoolId: req.schoolId,
=======
>>>>>>> e674064afecbcf65dfae0ef363dfc4b63404f201
    throw ApiError.notFound('Token not found');
  }

  if (req.schoolId && token.schoolId !== req.schoolId) {
    logger.warn(
      {
        userId: req.user?.id,
        userSchoolId: req.schoolId,
<<<<<<< HEAD
=======
>>>>>>> f12b34193109594a272a9511d4ea4c7b1fbd8b5f
>>>>>>> e674064afecbcf65dfae0ef363dfc4b63404f201
        tokenSchoolId: token.schoolId,
        tokenId,
      },
      'SECURITY: Token ownership violation'
    );

<<<<<<< HEAD
    await trackViolation(req);
    throw ApiError.forbidden('This token does not belong to your school');
=======
<<<<<<< HEAD
    trackViolation(req.ip);
    throw new ApiError(403, 'This token does not belong to your school');
=======
    await trackViolation(req);
    throw ApiError.forbidden('This token does not belong to your school');
>>>>>>> f12b34193109594a272a9511d4ea4c7b1fbd8b5f
>>>>>>> e674064afecbcf65dfae0ef363dfc4b63404f201
  }

  next();
});

<<<<<<< HEAD
=======
<<<<<<< HEAD
/**
 * ownStudentOnly
 * Combined check for student endpoints.
 * School user → student must belong to their school.
 * Parent → student must be their child.
 */
export const ownStudentOnly = asyncHandler(async (req, _res, next) => {
  const studentId = req.params.studentId ?? req.params.student_id ?? req.body?.student_id;
  if (!studentId) return next();

  // School user — check school ownership
  if (req.role === 'SCHOOL_ADMIN' || req.role === 'TEACHER' || req.role === 'GUARD' || req.role === 'DEVICE') {
    if (req.schoolId === undefined) {
      logger.error({ userId: req.userId, path: req.path }, 'ownStudentOnly missing tenantScope');
      throw new ApiError(500, 'Access control configuration error');
    }
=======
>>>>>>> e674064afecbcf65dfae0ef363dfc4b63404f201
// ─── Student Restriction (Combined) ───────────────────────────────────────────

export const ownStudentOnly = asyncHandler(async (req, _res, next) => {
  const studentId =
    req.params.studentId || req.params.student_id || req.body?.studentId || req.body?.student_id;

  if (!studentId) return next();

  // School user — check school ownership
  if (SCHOOL_SCOPED_ROLES.includes(req.user?.role)) {
    if (!req.schoolId) throw ApiError.internal('Access control misconfiguration');
<<<<<<< HEAD
=======
>>>>>>> f12b34193109594a272a9511d4ea4c7b1fbd8b5f
>>>>>>> e674064afecbcf65dfae0ef363dfc4b63404f201

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { schoolId: true },
    });

<<<<<<< HEAD
=======
<<<<<<< HEAD
    if (!student) {
      throw new ApiError(404, 'Student not found');
    }

    if (student.schoolId !== req.schoolId) {
      logger.warn(
        {
          userId: req.userId,
          studentId,
          schoolId: req.schoolId,
          studentSchoolId: student.schoolId,
        },
        'SECURITY: School user attempted to access student from another school'
      );
      trackViolation(req.ip);
      throw new ApiError(403, 'This student does not belong to your school');
    }
  }

  // Parent user — check parent-child relationship
  if (req.role === 'PARENT') {
    const isChild = await verifyParentChild(req.userId, studentId);
    if (!isChild) {
      logger.warn(
        { parentId: req.userId, studentId },
        'SECURITY: Parent attempted to access unauthorized student'
      );
      trackViolation(req.ip);
      throw new ApiError(403, 'You do not have access to this student');
=======
>>>>>>> e674064afecbcf65dfae0ef363dfc4b63404f201
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
<<<<<<< HEAD
=======
>>>>>>> f12b34193109594a272a9511d4ea4c7b1fbd8b5f
>>>>>>> e674064afecbcf65dfae0ef363dfc4b63404f201
    }
  }

  next();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function verifyParentChild(parentId, studentId) {
  const cacheKey = `parent_children:${parentId}`;

  try {
<<<<<<< HEAD
    const cached = await middlewareRedis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached).includes(studentId);
    }
=======
<<<<<<< HEAD
    const cached = await redis.get(key);
=======
    const cached = await middlewareRedis.get(cacheKey);
>>>>>>> f12b34193109594a272a9511d4ea4c7b1fbd8b5f
    if (cached) {
      return JSON.parse(cached).includes(studentId);
    }
<<<<<<< HEAD
  } catch (err) {
    logger.warn({ parentId, err: err.message }, 'Redis cache miss for parent children');
  }

  // Query DB directly — no soft failures
  const links = await prisma.parentStudent.findMany({
    where: { parentId: parentId },
    select: { studentId: true },
  });

  const childIds = links.map(l => l.studentId);

  // Cache the result (even empty array) to reduce DB load
  await redis.setex(key, PARENT_CHILDREN_TTL, JSON.stringify(childIds)).catch(() => {});
=======
>>>>>>> e674064afecbcf65dfae0ef363dfc4b63404f201
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
<<<<<<< HEAD
=======
>>>>>>> f12b34193109594a272a9511d4ea4c7b1fbd8b5f
>>>>>>> e674064afecbcf65dfae0ef363dfc4b63404f201

  return childIds.includes(studentId);
}

<<<<<<< HEAD
async function trackViolation(req) {
  const ip = req.ip || 'unknown';
  const key = `security:violations:${ip}`;
=======
<<<<<<< HEAD
/**
 * Track security violations for anomaly detection.
 * After threshold, trigger alert or auto-block.
 */
function trackViolation(ip) {
  const count = (violationTracker.get(ip) || 0) + 1;
  violationTracker.set(ip, count);
=======
async function trackViolation(req) {
  const ip = req.ip || 'unknown';
  const key = `security:violations:${ip}`;
>>>>>>> f12b34193109594a272a9511d4ea4c7b1fbd8b5f
>>>>>>> e674064afecbcf65dfae0ef363dfc4b63404f201

  try {
    const count = await middlewareRedis.incr(key);
    await middlewareRedis.expire(key, 15 * 60); // 15 min window

<<<<<<< HEAD
    if (count >= VIOLATION_THRESHOLD) {
      logger.error({ ip, violationCount: count }, 'SECURITY ALERT: Multiple access violations');
      await middlewareRedis.del(key); // Reset after alert
=======
<<<<<<< HEAD
    // Reset counter after alert
    violationTracker.delete(ip);

    // Optional: Trigger auto-block via ipBlock middleware
    // import { blockIpNow } from './ipBlock.middleware.js';
    // blockIpNow(ip, `ACCESS_VIOLATION_${count}`).catch(() => {});
  }

  // Clean up old entries periodically (simple size-based)
  if (violationTracker.size > 1000) {
    const keys = [...violationTracker.keys()];
    for (let i = 0; i < 500; i++) {
      violationTracker.delete(keys[i]);
=======
    if (count >= VIOLATION_THRESHOLD) {
      logger.error({ ip, violationCount: count }, 'SECURITY ALERT: Multiple access violations');
      await middlewareRedis.del(key); // Reset after alert
>>>>>>> f12b34193109594a272a9511d4ea4c7b1fbd8b5f
>>>>>>> e674064afecbcf65dfae0ef363dfc4b63404f201
    }
  } catch {
    // Non-critical
  }
}

<<<<<<< HEAD
=======
<<<<<<< HEAD
/**
 * invalidateParentChildrenCache
 * Call this whenever a parent-student link changes.
 */
export async function invalidateParentChildrenCache(parentId) {
  if (!parentId) return;
  await redis.del(`parent_children:${parentId}`).catch(() => {});
  logger.debug({ parentId }, 'Parent children cache invalidated');
}

/**
 * invalidateAllParentCache
 * Emergency function to flush all parent caches.
 */
export async function invalidateAllParentCache() {
  const keys = await redis.keys('parent_children:*').catch(() => []);
  if (keys.length) {
    await redis.del(...keys).catch(() => {});
    logger.info({ count: keys.length }, 'All parent children caches invalidated');
=======
>>>>>>> e674064afecbcf65dfae0ef363dfc4b63404f201
// ─── Cache Management ─────────────────────────────────────────────────────────

export async function invalidateParentChildrenCache(parentId) {
  try {
    await middlewareRedis.del(`parent_children:${parentId}`);
  } catch {
    // Non-critical
<<<<<<< HEAD
=======
>>>>>>> f12b34193109594a272a9511d4ea4c7b1fbd8b5f
>>>>>>> e674064afecbcf65dfae0ef363dfc4b63404f201
  }
}
