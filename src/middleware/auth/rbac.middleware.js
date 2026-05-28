// =============================================================================
// rbac.middleware.js — RESQID
// Role-Based Access Control — strict, deny by default
//
// Every action must be explicitly allowed in the permission map.
// Single source of truth: #shared/constants/roles.js
//
// Usage:
//   can('student:create')           → Single permission
//   canAny('student:read', 'student:read_own') → Any of these
//   canAll('order:create', 'student:read')     → All of these
//   authorize(ROLES.SUPER_ADMIN)    → Specific roles only
//   requireSuperAdmin               → Super admin only
//   requireSchoolStaff              → School admin or teacher
// =============================================================================

import { ApiError } from '#shared/response/ApiError.js';
import { asyncHandler } from '#shared/response/asyncHandler.js';
import { ROLES, PERMISSIONS, hasPermission, ROLE_INHERITANCE } from '#shared/constants/roles.js';

// Re-export ROLES for convenience
export { ROLES };

// ─── Permission Resolution ───────────────────────────────────────────────────

/**
 * Get effective permissions for a role (including inherited).
 */
const resolvePermissions = (role) => {
  // Check direct permissions
  if (PERMISSIONS[role]) return PERMISSIONS[role];

  throw ApiError.forbidden(`Unknown role: '${role}'`);
};

// ─── Core Permission Checks ──────────────────────────────────────────────────

/**
 * Check single permission.
 *
 * Usage:
 *   router.post('/students', can('student:create'), controller.create);
 */
export const can = (permission) =>
  asyncHandler(async (req, _res, next) => {
    if (!req.user?.role) throw ApiError.unauthorized('Authentication required');

    const allowed = hasPermission(req.user.role, permission);

    if (!allowed) {
      throw ApiError.forbidden(
        `Permission denied: '${permission}' not allowed for role '${req.user.role}'`,
        'PERMISSION_DENIED'
      );
    }

    next();
  });

/**
 * Pass if user has AT LEAST ONE of the permissions.
 *
 * Usage:
 *   router.get('/students', canAny('student:read', 'student:read_own'), controller.list);
 */
export const canAny = (...permissions) =>
  asyncHandler(async (req, _res, next) => {
    if (!req.user?.role) throw ApiError.unauthorized('Authentication required');

    const hasAny = permissions.some((p) => hasPermission(req.user.role, p));

    if (!hasAny) {
      throw ApiError.forbidden(
        `Permission denied: none of [${permissions.join(', ')}] allowed for '${req.user.role}'`,
        'PERMISSION_DENIED'
      );
    }

    next();
  });

/**
 * Pass only if user has ALL permissions.
 *
 * Usage:
 *   router.delete('/students/:id', canAll('student:delete', 'school:update'), controller.delete);
 */
export const canAll = (...permissions) =>
  asyncHandler(async (req, _res, next) => {
    if (!req.user?.role) throw ApiError.unauthorized('Authentication required');

    const missing = permissions.filter((p) => !hasPermission(req.user.role, p));

    if (missing.length > 0) {
      throw ApiError.forbidden(
        `Permission denied: missing [${missing.join(', ')}] for role '${req.user.role}'`,
        'PERMISSION_DENIED'
      );
    }

    next();
  });

// ─── Role Gates ──────────────────────────────────────────────────────────────

/**
 * Allow only specific roles.
 *
 * Usage:
 *   router.delete('/school/:id', authorize(ROLES.SUPER_ADMIN), controller.delete);
 */
export const authorize = (...allowedRoles) =>
  asyncHandler(async (req, _res, next) => {
    if (!req.user?.role) throw ApiError.unauthorized('Authentication required');

    if (!allowedRoles.includes(req.user.role)) {
      throw ApiError.forbidden(
        `Access denied. Required role: ${allowedRoles.join(' or ')}. Your role: ${req.user.role}`,
        'ROLE_REQUIRED'
      );
    }

    next();
  });

// ─── Convenience Gates ───────────────────────────────────────────────────────

/**
 * Super admin only gate.
 *
 * Usage:
 *   router.use('/admin', requireSuperAdmin, adminRoutes);
 */
export const requireSuperAdmin = asyncHandler(async (req, _res, next) => {
  if (!req.user?.role) throw ApiError.unauthorized('Authentication required');
  if (req.user.role !== ROLES.SUPER_ADMIN) {
    throw ApiError.forbidden('Super admin privileges required', 'ROLE_REQUIRED');
  }
  next();
});

/**
 * School staff gate (SCHOOL_ADMIN or TEACHER).
 *
 * Usage:
 *   router.use('/school', requireSchoolStaff, schoolRoutes);
 */
export const requireSchoolStaff = asyncHandler(async (req, _res, next) => {
  if (!req.user?.role) throw ApiError.unauthorized('Authentication required');

  const schoolRoles = [ROLES.SCHOOL_ADMIN, ROLES.TEACHER];

  if (!schoolRoles.includes(req.user.role)) {
    throw ApiError.forbidden('School staff access required', 'ROLE_REQUIRED');
  }

  next();
});

/**
 * Authenticated user gate (any role with valid JWT).
 *
 * Usage:
 *   router.use('/profile', requireAuth, profileRoutes);
 */
export const requireAuth = asyncHandler(async (req, _res, next) => {
  if (!req.user?.role) throw ApiError.unauthorized('Authentication required');
  next();
});

/**
 * Module-specific permission checker.
 * Combines role check with module subscription check.
 *
 * Usage:
 *   router.use('/attendance', requireModule('attendance'), attendanceRoutes);
 */
export const requireModule = (moduleId, permission = 'read') =>
  asyncHandler(async (req, _res, next) => {
    if (!req.user?.role) throw ApiError.unauthorized('Authentication required');

    // Build permission string from module
    const permString = `${moduleId}:${permission}`;
    const allowed = hasPermission(req.user.role, permString);

    if (!allowed) {
      throw ApiError.moduleAccessDenied(moduleId);
    }

    next();
  });
