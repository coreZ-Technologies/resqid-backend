// =============================================================================
// authorize.middleware.js — RESQID
//
// Authorization middleware — checks if authenticated user has required role.
//
// Uses:
//   - authorize(...roles)      → Only specified roles allowed
//   - authorizeMin(minRole)    → Minimum role level (includes higher roles)
//   - authorizeSchool()        → School scope enforcement
//   - authorizeParent()        → Parent-child relationship check
// =============================================================================

import { ApiError } from '#shared/response/ApiError.js';
import { asyncHandler } from '#shared/response/asyncHandler.js';
import {
  ROLES,
  ROLE_HIERARCHY,
  getRoleLevel,
  SCHOOL_SCOPED_ROLES,
  GLOBAL_ROLES,
  PARENT_SCOPED_ROLES,
} from '#shared/constants/roles.js';
import { prisma } from '#config/prisma.js';

// Re-export ROLES for backward compatibility
export { ROLES };

// =============================================================================
// ROLE-BASED AUTHORIZATION
// =============================================================================

/**
 * Allow only specific roles.
 *
 * Usage:
 *   router.delete('/school/:id', authorize(ROLES.SUPER_ADMIN), controller.delete);
 *   router.get('/students', authorize(ROLES.SCHOOL_ADMIN, ROLES.TEACHER), controller.list);
 */
export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        ApiError.forbidden(
          `Access denied. Required role: ${allowedRoles.join(' or ')}. Your role: ${req.user.role}`,
          'PERMISSION_DENIED'
        )
      );
    }

    next();
  };
};

/**
 * Allow role and everything above it in hierarchy.
 *
 * Usage:
 *   authorizeMin(ROLES.TEACHER)   → TEACHER, SCHOOL_ADMIN, SUPER_ADMIN
 *   authorizeMin(ROLES.SCHOOL_ADMIN) → SCHOOL_ADMIN, SUPER_ADMIN
 *   authorizeMin(ROLES.SUPER_ADMIN)  → SUPER_ADMIN only
 */
export const authorizeMin = (minRole) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }

    const userLevel = getRoleLevel(req.user.role);
    const requiredLevel = getRoleLevel(minRole);

    if (userLevel === -1) {
      return next(ApiError.forbidden(`Unknown role: ${req.user.role}`));
    }

    if (userLevel < requiredLevel) {
      return next(
        ApiError.forbidden(
          `Access denied. Minimum role: ${minRole}. Your role: ${req.user.role}`,
          'ROLE_REQUIRED'
        )
      );
    }

    next();
  };
};

// =============================================================================
// SCHOOL SCOPE AUTHORIZATION
// =============================================================================

/**
 * Enforce school scope — user can only access their own school's data.
 *
 * SUPER_ADMIN and SYSTEM bypass this check.
 * SCHOOL_ADMIN and TEACHER must have matching schoolId.
 *
 * Extracts schoolId from: req.params → req.body → req.query
 *
 * Usage:
 *   router.get('/school/:schoolId/students', authorizeSchool(), controller.list);
 */
export const authorizeSchool = () => {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }

    // Global roles bypass school check
    if (GLOBAL_ROLES.includes(req.user.role)) {
      return next();
    }

    // Device roles — schoolId is set during device auth
    if (req.user.role === ROLES.ATTENDANCE_DEVICE) {
      return next();
    }

    // Extract requested schoolId
    const requestedSchoolId =
      req.params.schoolId || req.body?.schoolId || req.query?.schoolId || null;

    // If no schoolId in request, allow through (will be filtered by tenantScope)
    if (!requestedSchoolId) {
      return next();
    }

    // School-scoped roles must match
    if (req.user.schoolId !== requestedSchoolId) {
      return next(ApiError.schoolAccessDenied());
    }

    next();
  };
};

// =============================================================================
// PARENT SCOPE AUTHORIZATION
// =============================================================================

/**
 * Enforce parent-child relationship.
 * Parent can only access their own children's data.
 *
 * Non-parent roles bypass this check.
 *
 * Usage:
 *   router.get('/student/:studentId', authorizeParent(), controller.get);
 */
export const authorizeParent = () => {
  return asyncHandler(async (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }

    // Non-parents skip this check
    if (req.user.role !== ROLES.PARENT) {
      return next();
    }

    const studentId = req.params.studentId || req.body?.studentId || req.query?.studentId;

    if (!studentId) {
      return next();
    }

    // Verify parent-child relationship
    const link = await prisma.parentStudent.findFirst({
      where: {
        parentId: req.user.id,
        studentId: studentId,
      },
      select: { id: true },
    });

    if (!link) {
      return next(
        ApiError.forbidden('You can only access your own children', 'SCHOOL_ACCESS_DENIED')
      );
    }

    next();
  });
};

// =============================================================================
// MODULE ACCESS AUTHORIZATION
// =============================================================================

/**
 * Enforce that the user's school has access to a specific module.
 *
 * Usage:
 *   router.use('/api/attendance', authorizeModule('attendance'), attendanceRoutes);
 */
export const authorizeModule = (moduleId) => {
  return asyncHandler(async (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }

    // Global roles bypass module check
    if (GLOBAL_ROLES.includes(req.user.role)) {
      return next();
    }

    const schoolId = req.user.schoolId;
    if (!schoolId) {
      return next(ApiError.tenantRequired());
    }

    // Check subscription includes this module
    const subscription = await prisma.subscription.findFirst({
      where: {
        schoolId,
        status: 'ACTIVE',
        modules: { has: moduleId },
      },
      select: { id: true },
    });

    if (!subscription) {
      return next(ApiError.moduleNotAllowed(moduleId));
    }

    next();
  });
};

// =============================================================================
// COMBINED AUTHORIZATION
// =============================================================================

/**
 * Combine multiple authorization checks.
 *
 * Usage:
 *   router.post('/students',
 *     authorizeAll(
 *       authorizeMin(ROLES.SCHOOL_ADMIN),
 *       authorizeSchool(),
 *       authorizeModule('emergency')
 *     ),
 *     controller.create
 *   );
 */
export const authorizeAll = (...middlewares) => {
  return (req, res, next) => {
    const run = (index) => {
      if (index >= middlewares.length) return next();
      middlewares[index](req, res, (err) => {
        if (err) return next(err);
        run(index + 1);
      });
    };
    run(0);
  };
};
