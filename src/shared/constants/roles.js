// src/shared/constants/roles.js

/**
 * RESQID Role Registry
 * Single source of truth for all roles and permissions.
 *
 * Used by:
 *   - authenticate.middleware (attach req.user.role)
 *   - rbac.middleware (PERMISSIONS map)
 *   - tenantScope.middleware (scope logic)
 *   - JWT payload (role field)
 */

export const ROLES = Object.freeze({
  SUPER_ADMIN: 'SUPER_ADMIN',
  SCHOOL_ADMIN: 'SCHOOL_ADMIN',
  TEACHER: 'TEACHER',
  PARENT: 'PARENT',
});

export const ALL_ROLES = Object.values(ROLES);

// Role hierarchy — higher index = more access
// Used by authorizeMin() to check minimum role level
export const ROLE_HIERARCHY = [ROLES.PARENT, ROLES.TEACHER, ROLES.SCHOOL_ADMIN, ROLES.SUPER_ADMIN];

export const getRoleLevel = (role) => ROLE_HIERARCHY.indexOf(role);

// Which roles are school-scoped (have a schoolId)
export const SCHOOL_SCOPED_ROLES = Object.freeze([ROLES.SCHOOL_ADMIN, ROLES.TEACHER]);

// Which roles are globally scoped (no schoolId)
export const GLOBAL_ROLES = Object.freeze([ROLES.SUPER_ADMIN]);

// Which roles are parent-scoped (child-level access)
export const PARENT_SCOPED_ROLES = Object.freeze([ROLES.PARENT]);

/**
 * Full permission map
 * Format: 'resource:action'
 * _own suffix = scoped to user's own data only
 */
export const PERMISSIONS = Object.freeze({
  [ROLES.SUPER_ADMIN]: new Set([
    // Schools
    'school:create',
    'school:read',
    'school:update',
    'school:delete',
    'school:activate',
    'school:deactivate',

    // Students (platform-wide)
    'student:read',
    'student:update',
    'student:delete',

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

    // Users
    'parent:read',
    'parent:suspend',
    'parent:delete',
    'school_user:create',
    'school_user:read',
    'school_user:update',

    // Billing
    'subscription:read',
    'subscription:update',
    'subscription:cancel',
    'payment:read',
    'invoice:create',
    'invoice:read',
    'invoice:send',

    // Safety
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

  [ROLES.SCHOOL_ADMIN]: new Set([
    'student:read',
    'student:create',
    'student:update',
    'student:delete',
    'token:read',
    'order:create',
    'order:read',
    'card_template:read',
    'card_template:update',
    'school_settings:read',
    'school_settings:update',
    'school_user:read',
    'school_user:create',
    'school_user:update',
    'scan_log:read',
    'anomaly:read',

    // Module-specific
    'attendance:read',
    'attendance:mark',
    'attendance:update',
    'attendance:delete',
    'timetable:read',
    'timetable:create',
    'timetable:update',
    'timetable:delete',
    'teacher:read',
    'teacher:create',
    'teacher:update',
    'teacher:delete',
    'emergency:read',
    'emergency:update',
    'communication:read',
    'communication:send',
  ]),

  [ROLES.TEACHER]: new Set([
    'student:read',
    'attendance:read',
    'attendance:mark',
    'attendance:update',
    'timetable:read',
    'scan_log:read',
  ]),

  [ROLES.PARENT]: new Set([
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
});
