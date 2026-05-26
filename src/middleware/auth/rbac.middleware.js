// =============================================================================
// rbac.middleware.js — RESQID
// Role-Based Access Control — strict, no implicit permissions
// Every action must be explicitly allowed — deny by default
// =============================================================================

import { ApiError } from '#shared/response/ApiError.js';
import { asyncHandler } from '#shared/response/asyncHandler.js';

// ─── Roles ────────────────────────────────────────────────────────────────────

export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  SCHOOL_ADMIN: 'SCHOOL_ADMIN',
  TEACHER: 'TEACHER',
  PARENT: 'PARENT',
};

// ─── Permission Map ───────────────────────────────────────────────────────────
// Explicit allow-list — if action is not listed, it is DENIED
// Format: 'resource:action'

const PERMISSIONS = {
  SUPER_ADMIN: new Set([
    // Schools
    'school:create',
    'school:read',
    'school:update',
    'school:delete',
    'school:activate',
    'school:deactivate',

    // Tokens & QR
    'token:generate',
    'token:revoke',
    'token:read',
    'token:bulk_generate',
    'qr:generate',
    'qr:read',
    'qr:delete',

    // Orders
    'order:create',
    'order:read',
    'order:update',
    'order:confirm',
    'order:process',
    'order:ship',
    'order:cancel',
    'order:refund',

    // Users (platform-wide)
    'parent:read',
    'parent:suspend',
    'parent:delete',
    'school_user:create',
    'school_user:read',
    'school_user:update',

    // Students (platform-wide)
    'student:read',
    'student:update',
    'student:delete',

    // Billing
    'subscription:read',
    'subscription:update',
    'subscription:cancel',
    'payment:read',
    'invoice:create',
    'invoice:read',
    'invoice:send',

    // Anomalies & Safety
    'anomaly:read',
    'anomaly:resolve',
    'scan_log:read',

    // System
    'feature_flag:read',
    'feature_flag:update',
    'audit_log:read',
    'system:health',
    'super_admin:create',
    'super_admin:read',
  ]),

  // ─── School Admin — full control within their school ───────────────────────
  SCHOOL_ADMIN: new Set([
    // Students
    'student:read',
    'student:create',
    'student:update',
    'student:delete',

    // Tokens
    'token:read',

    // Orders
    'order:create',
    'order:read',

    // Card
    'card_template:read',
    'card_template:update',

    // School settings
    'school_settings:read',
    'school_settings:update',

    // Monitoring
    'scan_log:read',
    'anomaly:read',

    // User management within school
    'school_user:read',
    'school_user:create',
    'school_user:update',

    // Attendance (admin can do everything teacher can)
    'attendance:read',
    'attendance:mark',
    'attendance:update',
    'attendance:delete',

    // Timetable
    'timetable:read',
    'timetable:create',
    'timetable:update',
    'timetable:delete',
  ]),

  // ─── Teacher — attendance + timetable, read-only students ──────────────────
  TEACHER: new Set([
    // Students — read only
    'student:read',

    // Attendance — full
    'attendance:read',
    'attendance:mark',
    'attendance:update',

    // Timetable — read only
    'timetable:read',

    // Scan logs — read only
    'scan_log:read',
  ]),

  // ─── Parent — own children only ────────────────────────────────────────────
  PARENT: new Set([
    'student:read_own',
    'student:update_own',
    'emergency_profile:read_own',
    'emergency_profile:update_own',
    'emergency_contact:create_own',
    'emergency_contact:update_own',
    'emergency_contact:delete_own',
    'card_visibility:read_own',
    'card_visibility:update_own',
    'qr:read_own',
    'notification_pref:read_own',
    'notification_pref:update_own',
    'parent:read_own',
    'parent:update_own',
    'parent:delete_own',
    'device:read_own',
    'device:delete_own',
    'session:read_own',
    'session:revoke_own',
  ]),
};

// ─── Role Resolution ──────────────────────────────────────────────────────────
// Single source of truth — req.user.role is the only thing that matters

const resolvePermissions = (role) => {
  const permissions = PERMISSIONS[role];

  if (!permissions) {
    throw ApiError.forbidden(`Unknown role: '${role}'`);
  }

  return permissions;
};

// ─── Core Middleware ──────────────────────────────────────────────────────────

/**
 * Check single permission
 * Usage: can('student:create')
 */
export const can = (permission) =>
  asyncHandler(async (req, _res, next) => {
    if (!req.user?.role) throw ApiError.unauthorized('Not authenticated');

    const permissions = resolvePermissions(req.user.role);

    if (!permissions.has(permission)) {
      throw ApiError.forbidden(
        `Permission denied: '${permission}' not allowed for role '${req.user.role}'`
      );
    }

    next();
  });

/**
 * Pass if user has AT LEAST ONE of the permissions
 * Usage: canAny('student:read', 'student:read_own')
 */
export const canAny = (...permissions) =>
  asyncHandler(async (req, _res, next) => {
    if (!req.user?.role) throw ApiError.unauthorized('Not authenticated');

    const userPermissions = resolvePermissions(req.user.role);
    const hasAny = permissions.some((p) => userPermissions.has(p));

    if (!hasAny) {
      throw ApiError.forbidden(
        `Permission denied: none of [${permissions.join(', ')}] allowed for '${req.user.role}'`
      );
    }

    next();
  });

/**
 * Pass only if user has ALL permissions
 * Usage: canAll('order:create', 'student:read')
 */
export const canAll = (...permissions) =>
  asyncHandler(async (req, _res, next) => {
    if (!req.user?.role) throw ApiError.unauthorized('Not authenticated');

    const userPermissions = resolvePermissions(req.user.role);
    const missing = permissions.filter((p) => !userPermissions.has(p));

    if (missing.length > 0) {
      throw ApiError.forbidden(`Permission denied: missing [${missing.join(', ')}]`);
    }

    next();
  });

/**
 * Allow only specific roles — simple role gate
 * Usage: authorize(ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN)
 */
export const authorize = (...allowedRoles) =>
  asyncHandler(async (req, _res, next) => {
    if (!req.user?.role) throw ApiError.unauthorized('Not authenticated');

    if (!allowedRoles.includes(req.user.role)) {
      throw ApiError.forbidden(
        `Access denied. Required: [${allowedRoles.join(', ')}], you are: ${req.user.role}`
      );
    }

    next();
  });

/**
 * Super admin only gate
 * Usage: router.use(requireSuperAdmin)
 */
export const requireSuperAdmin = asyncHandler(async (req, _res, next) => {
  if (!req.user?.role) throw ApiError.unauthorized('Not authenticated');
  if (req.user.role !== ROLES.SUPER_ADMIN)
    throw ApiError.forbidden('Super admin privileges required');
  next();
});

/**
 * School staff only gate (SCHOOL_ADMIN or TEACHER)
 * Usage: router.use(requireSchoolStaff)
 */
export const requireSchoolStaff = asyncHandler(async (req, _res, next) => {
  if (!req.user?.role) throw ApiError.unauthorized('Not authenticated');

  const schoolRoles = [ROLES.SCHOOL_ADMIN, ROLES.TEACHER];

  if (!schoolRoles.includes(req.user.role)) {
    throw ApiError.forbidden('School staff access required');
  }

  next();
});
