// =============================================================================
// requireModule.middleware.js — RESQID
//
// Module access gate — verifies the school's subscription includes
// the required module before allowing access.
//
// Usage:
//   router.use('/api/attendance', requireModule('attendance'), attendanceRoutes);
//   router.use('/api/emergency', requireModule('emergency'), emergencyRoutes);
//   router.use('/api/timetable', requireModule('timetable'), timetableRoutes);
//   router.get('/dashboard', requireModule('attendance', 'read'), controller.dashboard);
// =============================================================================

import { prisma } from '#config/prisma.js';
import { redis } from '#config/redis.js';
import { ApiError } from '#shared/response/ApiError.js';
import { asyncHandler } from '#shared/response/asyncHandler.js';
import { MODULES, ALL_MODULES, MODULE_LABELS } from '#shared/constants/modules.js';
import { ROLES, GLOBAL_ROLES } from '#shared/constants/roles.js';
import { logger } from '#config/logger.js';

const CACHE_TTL = 10 * 60; // 10 minutes

// ─── Core Middleware ──────────────────────────────────────────────────────────

/**
 * Require a specific module to be active in the school's subscription.
 *
 * @param {string} moduleId - Module ID from MODULES constant
 * @param {string} [accessLevel='read'] - Required access level (read/write/admin)
 * @returns {Function} Express middleware
 */
export const requireModule = (moduleId, accessLevel = 'read') =>
  asyncHandler(async (req, _res, next) => {
    // Skip for unauthenticated requests
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }

    // Global roles bypass module check
    if (GLOBAL_ROLES.includes(req.user.role)) {
      return next();
    }

    // Device roles — module check is implicit (attendance devices get attendance module)
    if (req.user.role === ROLES.ATTENDANCE_DEVICE && moduleId === MODULES.ATTENDANCE) {
      return next();
    }

    // Emergency responder — only emergency module access
    if (req.user.role === ROLES.EMERGENCY_RESPONDER && moduleId === MODULES.EMERGENCY) {
      return next();
    }

    const schoolId = req.user.schoolId || req.schoolId;

    if (!schoolId) {
      throw ApiError.tenantRequired();
    }

    // Get school's subscription
    const subscription = await getSubscription(schoolId);

    if (!subscription) {
      throw ApiError.noSubscription();
    }

    // Check expiry
    if (subscription.validUntil && new Date(subscription.validUntil) < new Date()) {
      throw ApiError.subscriptionExpired();
    }

    // Check if module is included
    const modules = subscription.modules || [];
    if (!modules.includes(moduleId)) {
      const moduleLabel = MODULE_LABELS[moduleId] || moduleId;
      throw ApiError.moduleNotAllowed(moduleLabel);
    }

    // Attach subscription info to request for downstream use
    req.subscription = {
      modules,
      validUntil: subscription.validUntil,
    };

    next();
  });

/**
 * Require any one of the specified modules.
 *
 * Usage:
 *   router.use('/api/dashboard', requireAnyModule(['attendance', 'emergency']), dashboardRoutes);
 */
export const requireAnyModule = (moduleIds) =>
  asyncHandler(async (req, _res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }

    if (GLOBAL_ROLES.includes(req.user.role)) {
      return next();
    }

    const schoolId = req.user.schoolId || req.schoolId;
    if (!schoolId) {
      throw ApiError.tenantRequired();
    }

    const subscription = await getSubscription(schoolId);

    if (!subscription) {
      throw ApiError.noSubscription();
    }

    const modules = subscription.modules || [];
    const hasAny = moduleIds.some((m) => modules.includes(m));

    if (!hasAny) {
      throw ApiError.moduleNotAllowed(moduleIds.join(' or '));
    }

    req.subscription = { modules, validUntil: subscription.validUntil };
    next();
  });

/**
 * Require all specified modules.
 *
 * Usage:
 *   router.use('/api/safety', requireAllModules(['emergency', 'attendance']), safetyRoutes);
 */
export const requireAllModules = (moduleIds) =>
  asyncHandler(async (req, _res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }

    if (GLOBAL_ROLES.includes(req.user.role)) {
      return next();
    }

    const schoolId = req.user.schoolId || req.schoolId;
    if (!schoolId) {
      throw ApiError.tenantRequired();
    }

    const subscription = await getSubscription(schoolId);

    if (!subscription) {
      throw ApiError.noSubscription();
    }

    const modules = subscription.modules || [];
    const missing = moduleIds.filter((m) => !modules.includes(m));

    if (missing.length > 0) {
      throw ApiError.moduleNotAllowed(missing.join(', '));
    }

    req.subscription = { modules, validUntil: subscription.validUntil };
    next();
  });

// ─── Subscription Fetcher ─────────────────────────────────────────────────────

async function getSubscription(schoolId) {
  const cacheKey = `subscription:${schoolId}`;

  // Try cache
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch {
    // Cache miss
  }

  // Fetch from DB
  const subscription = await prisma.subscription.findFirst({
    where: {
      schoolId,
      status: 'ACTIVE',
    },
    select: {
      modules: true,        // e.g. ['m1-timetable', 'm2-emergency', ...]
      validUntil: true,
      plan: true,
      status: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  // Cache result
  if (subscription) {
    try {
      await redis.set(cacheKey, JSON.stringify(subscription), 'EX', CACHE_TTL);
    } catch {
      // Non-critical
    }
  }

  return subscription;
}

// ─── Cache Management ─────────────────────────────────────────────────────────

/**
 * Invalidate subscription cache for a school.
 * Call after subscription changes.
 */
export async function invalidateSubscriptionCache(schoolId) {
  try {
    await redis.del(`subscription:${schoolId}`);
    logger.info({ schoolId }, 'Subscription cache invalidated');
  } catch {
    // Non-critical
  }
}
