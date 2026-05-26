// =============================================================================
// tenantScope.middleware.js — RESQID
// Injects verified schoolId into every school-scoped request
// Prevents cross-tenant data leakage — every DB query must filter by schoolId
// =============================================================================

import { prisma } from '#config/prisma.js';
import { redis } from '#config/redis.js';
import { ApiError } from '#shared/response/ApiError.js';
import { asyncHandler } from '#shared/response/asyncHandler.js';
import { ROLES } from '#middleware/auth/rbac.middleware.js'; // single source of truth
import { PUBLIC_PATHS, isPublicPath } from '#shared/constants/publicPaths.js'; // shared constant

const SCHOOL_CACHE_TTL = 5 * 60; // 5 minutes

export const tenantScope = asyncHandler(async (req, _res, next) => {
  // ── Skip public paths — no tenant scope needed ─────────────────────────────
  if (isPublicPath(req.path)) return next();

  const role = req.user?.role;

  if (!role) throw ApiError.unauthorized('Not authenticated');

  // ── Super admin — no tenant scope, can access all schools ─────────────────
  if (role === ROLES.SUPER_ADMIN) {
    req.schoolId = null;
    req.school = null;
    return next();
  }

  // ── School admin / Teacher — scoped to their own school ───────────────────
  if (role === ROLES.SCHOOL_ADMIN || role === ROLES.TEACHER) {
    const schoolId = req.user?.schoolId;

    if (!schoolId) {
      throw ApiError.forbidden('School staff has no associated school — check auth config');
    }

    const school = await getSchool(schoolId);

    if (!school) throw ApiError.notFound('School not found');
    if (!school.isActive) throw ApiError.forbidden('School account is inactive');

    req.schoolId = schoolId;
    req.school = school;
    return next();
  }

  // ── Parent — no single school scope (children can be in multiple schools) ──
  if (role === ROLES.PARENT) {
    req.schoolId = null; // scope enforced per-query via parentId
    req.school = null;
    return next();
  }

  // ── Anything else — hard block ─────────────────────────────────────────────
  throw ApiError.forbidden(`Cannot determine tenant scope for role: '${role}'`);
});

// ─── School fetcher with Redis cache ─────────────────────────────────────────

async function getSchool(schoolId) {
  const key = `school:${schoolId}`;
  const cached = await redis.get(key);

  if (cached) return JSON.parse(cached);

  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: {
      id: true,
      name: true, // ← added — useful for logs, emails, responses
      code: true,
      isActive: true,
      timezone: true,
    },
  });

  if (school) {
    await redis.setex(key, SCHOOL_CACHE_TTL, JSON.stringify(school));
  }

  return school;
}
