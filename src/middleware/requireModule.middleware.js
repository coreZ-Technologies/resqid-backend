// =============================================================================
// requireModule.middleware.js — RESQID
<<<<<<< HEAD
=======
<<<<<<< HEAD
// Subscription module access gate
// Ensures the school's active subscription includes the requested module.
// Used on all module-specific route groups (m1, m2, m3, m4).
//
// Usage:
//   import { requireModule } from '../middleware/requireModule.middleware.js';
//   router.use(requireModule('m2-emergency'));
=======
>>>>>>> e674064afecbcf65dfae0ef363dfc4b63404f201
//
// Module access gate — verifies the school's subscription includes
// the required module before allowing access.
//
// Usage:
//   router.use('/api/attendance', requireModule('attendance'), attendanceRoutes);
//   router.use('/api/emergency', requireModule('emergency'), emergencyRoutes);
//   router.use('/api/timetable', requireModule('timetable'), timetableRoutes);
//   router.get('/dashboard', requireModule('attendance', 'read'), controller.dashboard);
<<<<<<< HEAD
=======
>>>>>>> f12b34193109594a272a9511d4ea4c7b1fbd8b5f
>>>>>>> e674064afecbcf65dfae0ef363dfc4b63404f201
// =============================================================================

import { prisma } from '#config/prisma.js';
import { redis } from '#config/redis.js';
<<<<<<< HEAD
=======
<<<<<<< HEAD
import { ApiError } from '../shared/response/ApiError.js';   // adjust path if using aliases
import { asyncHandler } from '../shared/response/asyncHandler.js';

// ------------------------------------------------------------------
//  Cache helper – fetch subscription from Redis or DB
// ------------------------------------------------------------------
const SUBSCRIPTION_CACHE_TTL = 600; // 10 minutes
=======
>>>>>>> e674064afecbcf65dfae0ef363dfc4b63404f201
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
<<<<<<< HEAD
=======
>>>>>>> f12b34193109594a272a9511d4ea4c7b1fbd8b5f
>>>>>>> e674064afecbcf65dfae0ef363dfc4b63404f201

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
<<<<<<< HEAD
      plan: true,
      status: true,
=======
<<<<<<< HEAD
      isActive: true,       // optional: direct flag
=======
      plan: true,
      status: true,
>>>>>>> f12b34193109594a272a9511d4ea4c7b1fbd8b5f
>>>>>>> e674064afecbcf65dfae0ef363dfc4b63404f201
    },
    orderBy: { createdAt: 'desc' },
  });

<<<<<<< HEAD
=======
<<<<<<< HEAD
  if (subscription) {
    await redis.set(cacheKey, JSON.stringify(subscription), 'EX', SUBSCRIPTION_CACHE_TTL);
=======
>>>>>>> e674064afecbcf65dfae0ef363dfc4b63404f201
  // Cache result
  if (subscription) {
    try {
      await redis.set(cacheKey, JSON.stringify(subscription), 'EX', CACHE_TTL);
    } catch {
      // Non-critical
    }
<<<<<<< HEAD
=======
>>>>>>> f12b34193109594a272a9511d4ea4c7b1fbd8b5f
>>>>>>> e674064afecbcf65dfae0ef363dfc4b63404f201
  }

  return subscription;
}

<<<<<<< HEAD
=======
<<<<<<< HEAD
// ------------------------------------------------------------------
//  Middleware factory
// ------------------------------------------------------------------

/**
 * requireModule
 * @param {string} module - the module identifier, e.g. 'm2-emergency'
 * @returns {Function} Express middleware
 */
export const requireModule = (module) =>
  asyncHandler(async (req, res, next) => {
    // 1. Ensure we have a schoolId (tenant)
    const schoolId = req.user?.schoolId || req.schoolId;   // depends on where you attach it
    if (!schoolId) {
      throw new ApiError(401, 'School context required');
    }

    // 2. Load subscription
    const subscription = await getSubscription(schoolId);

    // 3. No subscription at all
    if (!subscription) {
      throw new ApiError(402, 'No active subscription found. Please upgrade your plan.');
    }

    // 4. Check if subscription is active (optional – can be combined with validUntil)
    // if (subscription.isActive === false) { ... }

    // 5. Check expiration
    if (subscription.validUntil && new Date(subscription.validUntil) < new Date()) {
      // Clear cache so renewal is picked up immediately
      await redis.del(`subscription:${schoolId}`);
      throw new ApiError(402, 'Your subscription has expired. Please renew to continue.');
    }

    // 6. Check if the requested module is included
    const allowedModules = subscription.modules || [];
    if (!allowedModules.includes(module)) {
      throw new ApiError(403, `Your current plan does not include the "${module}" module. Please upgrade.`);
    }

    // Module access granted
    next();
  });
=======
>>>>>>> e674064afecbcf65dfae0ef363dfc4b63404f201
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
<<<<<<< HEAD
=======
>>>>>>> f12b34193109594a272a9511d4ea4c7b1fbd8b5f
>>>>>>> e674064afecbcf65dfae0ef363dfc4b63404f201
