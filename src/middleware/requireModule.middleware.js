// =============================================================================
// requireModule.middleware.js — RESQID
// Subscription module access gate
// Ensures the school's active subscription includes the requested module.
// Used on all module-specific route groups (m1, m2, m3, m4).
//
// Usage:
//   import { requireModule } from '../middleware/requireModule.middleware.js';
//   router.use(requireModule('m2-emergency'));
// =============================================================================

import { prisma } from '#config/prisma.js';
import { redis } from '#config/redis.js';
import { ApiError } from '../shared/response/ApiError.js';   // adjust path if using aliases
import { asyncHandler } from '../shared/response/asyncHandler.js';

// ------------------------------------------------------------------
//  Cache helper – fetch subscription from Redis or DB
// ------------------------------------------------------------------
const SUBSCRIPTION_CACHE_TTL = 600; // 10 minutes

async function getSubscription(schoolId) {
  const cacheKey = `subscription:${schoolId}`;

  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const subscription = await prisma.subscription.findUnique({
    where: { schoolId },
    select: {
      modules: true,        // e.g. ['m1-timetable', 'm2-emergency', ...]
      validUntil: true,
      isActive: true,       // optional: direct flag
    },
  });

  if (subscription) {
    await redis.set(cacheKey, JSON.stringify(subscription), 'EX', SUBSCRIPTION_CACHE_TTL);
  }

  return subscription;
}

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