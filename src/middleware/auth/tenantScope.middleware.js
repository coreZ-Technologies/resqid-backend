// =============================================================================
// tenantScope.middleware.js — RESQID
//
// Injects verified schoolId into every school-scoped request.
// Prevents cross-tenant data leakage — every DB query must filter by schoolId.
// =============================================================================

import { prisma } from '#config/prisma.js';
import { redis } from '#config/redis.js';
import { ApiError } from '#shared/response/ApiError.js';
import { asyncHandler } from '#shared/response/asyncHandler.js';
import { logger } from '#config/logger.js';
import {
  ROLES,
  SCHOOL_SCOPED_ROLES,
  GLOBAL_ROLES,
  PARENT_SCOPED_ROLES,
  DEVICE_SCOPED_ROLES,
  PUBLIC_ROLES,
} from '#shared/constants/roles.js';
import { isPublicPath } from '#shared/constants/publicPaths.js';

const SCHOOL_CACHE_TTL = 5 * 60; // 5 minutes

// =============================================================================
// MAIN MIDDLEWARE
// =============================================================================

export const tenantScope = asyncHandler(async (req, _res, next) => {
  // Skip public paths
  if (isPublicPath(req.path)) {
    return next();
  }

  const role = req.user?.role;
  if (!role) {
    throw ApiError.unauthorized('Authentication required for tenant scoping');
  }

  // Global roles — no school scope
  if (GLOBAL_ROLES.includes(role)) {
    req.schoolId = null;
    req.school = null;
    return next();
  }

  // School-scoped roles
  if (SCHOOL_SCOPED_ROLES.includes(role)) {
    const schoolId = req.user?.schoolId || req.params?.schoolId || req.body?.schoolId;

    if (!schoolId) {
      logger.error({ userId: req.user.id, role }, 'School-scoped user has no schoolId');
      throw ApiError.tenantRequired();
    }

    const school = await getSchool(schoolId);
    if (!school) throw ApiError.schoolNotFound();
    if (school.status !== 'ACTIVE') throw ApiError.schoolInactive();

    req.schoolId = schoolId;
    req.school = school;
    return next();
  }

  // Device roles
  if (DEVICE_SCOPED_ROLES.includes(role)) {
    const schoolId = req.user?.schoolId;
    if (!schoolId) throw ApiError.tenantRequired();

    const schoolExists = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { id: true, status: true },
    });

    if (!schoolExists) throw ApiError.schoolNotFound();
    if (schoolExists.status !== 'ACTIVE') throw ApiError.schoolInactive();

    req.schoolId = schoolId;
    req.school = { id: schoolId, status: 'ACTIVE' };
    return next();
  }

  // Parent roles — no single school scope
  if (PARENT_SCOPED_ROLES.includes(role)) {
    req.schoolId = null;
    req.school = null;
    return next();
  }

  // Public roles — no scope
  if (PUBLIC_ROLES.includes(role)) {
    req.schoolId = null;
    req.school = null;
    return next();
  }

  // Unknown role — hard block
  logger.error({ role, userId: req.user?.id }, 'Unknown role in tenant scope');
  throw ApiError.forbidden(`Cannot determine tenant scope for role: '${role}'`);
});

// =============================================================================
// SCHOOL FETCHER (with Redis cache)
// =============================================================================

async function getSchool(schoolId) {
  const cacheKey = `school:${schoolId}`;

  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch (err) {
    logger.debug({ err: err.message, schoolId }, 'School cache miss');
  }

  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: {
      id: true,
      name: true,
      code: true,
      status: true,
      timezone: true,
      logoUrl: true,
    },
  });

  if (school) {
    try {
      await redis.set(cacheKey, JSON.stringify(school), 'EX', SCHOOL_CACHE_TTL);
    } catch (err) {
      logger.debug({ err: err.message, schoolId }, 'School cache write failed');
    }
  }

  return school;
}

// =============================================================================
// HELPERS
// =============================================================================

export const getEffectiveSchoolId = (req) => {
  return req.schoolId || req.user?.schoolId || null;
};

export const requireSchoolId = (req) => {
  const schoolId = getEffectiveSchoolId(req);
  if (!schoolId) throw ApiError.tenantRequired();
  return schoolId;
};
