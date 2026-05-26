// src/middleware/authorize.js
import { ApiError } from '#shared/response/ApiError.js';

export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  TEACHER: 'TEACHER',
  PARENT: 'PARENT',
};

// Role hierarchy — higher index = more access
const ROLE_HIERARCHY = [ROLES.PARENT, ROLES.TEACHER, ROLES.ADMIN, ROLES.SUPER_ADMIN];

const getRoleLevel = (role) => ROLE_HIERARCHY.indexOf(role);

/**
 * Allow only specific roles
 *
 * Usage: authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN)
 */
export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Not authenticated'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        ApiError.forbidden(
          `Access denied. Required: ${allowedRoles.join(' or ')}, You are: ${req.user.role}`
        )
      );
    }

    next();
  };
};

/**
 * Allow role and everything above it in hierarchy
 *
 * authorizeMin(ROLES.TEACHER) → allows TEACHER, ADMIN, SUPER_ADMIN
 * authorizeMin(ROLES.ADMIN)   → allows ADMIN, SUPER_ADMIN
 */
export const authorizeMin = (minRole) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Not authenticated'));
    }

    const userLevel = getRoleLevel(req.user.role);
    const requiredLevel = getRoleLevel(minRole);

    if (userLevel < requiredLevel) {
      return next(ApiError.forbidden(`Access denied. Minimum role required: ${minRole}`));
    }

    next();
  };
};

/**
 * Enforce school scope — user can only access their own school's data
 * SUPER_ADMIN bypasses this check
 *
 * Expects schoolId in req.params.schoolId or req.body.schoolId
 */
export const authorizeSchool = () => {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Not authenticated'));
    }

    // Super admin can access any school
    if (req.user.role === ROLES.SUPER_ADMIN) return next();

    const requestedSchoolId = req.params.schoolId || req.body.schoolId || req.query.schoolId;

    if (!requestedSchoolId) return next();

    if (req.user.schoolId !== requestedSchoolId) {
      return next(ApiError.forbidden('You can only access your own school data'));
    }

    next();
  };
};

/**
 * Parent can only access their own children's data
 * Expects studentId in req.params.studentId
 */
export const authorizeParent = () => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return next(ApiError.unauthorized('Not authenticated'));
      }

      // Non-parents skip this check
      if (req.user.role !== ROLES.PARENT) return next();

      const { studentId } = req.params;
      if (!studentId) return next();

      const { prisma } = await import('../lib/prisma.js');

      const link = await prisma.parentStudent.findFirst({
        where: {
          parentId: req.user.id,
          studentId: studentId,
        },
      });

      if (!link) {
        return next(ApiError.forbidden('You can only access your own children'));
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};
