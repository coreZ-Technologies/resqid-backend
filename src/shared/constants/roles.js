// =============================================================================
// RESQID Role Registry — Single source of truth for roles and permissions
//
// Used by:
//   - authenticate.middleware  → attach req.user.role
//   - authorize.middleware     → check minimum role level
//   - rbac.middleware          → PERMISSIONS map lookup
//   - tenantScope.middleware   → SCHOOL_SCOPED_ROLES / GLOBAL_ROLES
//   - deviceFingerprint        → DEVICE_SCOPED_ROLES
//   - JWT payload              → role field
// =============================================================================

export const ROLES = Object.freeze({
  SUPER_ADMIN: 'SUPER_ADMIN',
  SCHOOL_ADMIN: 'SCHOOL_ADMIN',
  TEACHER: 'TEACHER',
  PARENT: 'PARENT',
  EMERGENCY_RESPONDER: 'EMERGENCY_RESPONDER', // Anyone scanning QR codes
  ATTENDANCE_DEVICE: 'ATTENDANCE_DEVICE', // RFID hardware devices
  SYSTEM: 'SYSTEM', // Background workers / cron jobs
});

export const ALL_ROLES = Object.values(ROLES);

// ─── Role Hierarchy ──────────────────────────────────────────────────────────
// Higher index = more access. Used by authorizeMin() middleware.
export const ROLE_HIERARCHY = [
  ROLES.EMERGENCY_RESPONDER, // 0 — lowest (public QR scan)
  ROLES.PARENT, // 1 — child-specific data
  ROLES.TEACHER, // 2 — class-level access
  ROLES.SCHOOL_ADMIN, // 3 — school-wide access
  ROLES.SUPER_ADMIN, // 4 — platform-wide access
  ROLES.ATTENDANCE_DEVICE, // 5 — IoT device (bypasses user auth)
  ROLES.SYSTEM, // 6 — internal operations
];

export const getRoleLevel = (role) => {
  const level = ROLE_HIERARCHY.indexOf(role);
  return level === -1 ? -1 : level;
};

// ─── Role Scoping ────────────────────────────────────────────────────────────

// School-scoped — must have schoolId in JWT, restricted to their school's data
export const SCHOOL_SCOPED_ROLES = Object.freeze([ROLES.SCHOOL_ADMIN, ROLES.TEACHER]);

// Globally scoped — no schoolId required, platform-wide access
export const GLOBAL_ROLES = Object.freeze([ROLES.SUPER_ADMIN, ROLES.SYSTEM]);

// Parent-scoped — linked to specific children, not a school
export const PARENT_SCOPED_ROLES = Object.freeze([ROLES.PARENT]);

// Device-scoped — authenticated via API key or hardware fingerprint, not JWT
export const DEVICE_SCOPED_ROLES = Object.freeze([ROLES.ATTENDANCE_DEVICE]);

// Public roles — no authentication required at all
export const PUBLIC_ROLES = Object.freeze([ROLES.EMERGENCY_RESPONDER]);

// ─── Role Inheritance ────────────────────────────────────────────────────────
// Higher roles automatically inherit permissions from lower roles in this map
export const ROLE_INHERITANCE = Object.freeze({
  [ROLES.SUPER_ADMIN]: [ROLES.SCHOOL_ADMIN, ROLES.TEACHER],
  [ROLES.SCHOOL_ADMIN]: [ROLES.TEACHER],
  [ROLES.SYSTEM]: [ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN],
  [ROLES.TEACHER]: [],
  [ROLES.PARENT]: [],
  [ROLES.EMERGENCY_RESPONDER]: [],
  [ROLES.ATTENDANCE_DEVICE]: [],
});

// ─── Full Permission Map ─────────────────────────────────────────────────────
// Format: 'resource:action'
// _own suffix = scoped to user's own data only

export const PERMISSIONS = Object.freeze({
  // ── SUPER_ADMIN — Platform Owner ──────────────────────────────────────────
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

    // Tokens & QR Cards
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
    'super_admin:create',
    'super_admin:read',

    // Billing
    'subscription:read',
    'subscription:update',
    'subscription:cancel',
    'payment:read',
    'invoice:create',
    'invoice:read',
    'invoice:send',

    // Safety & Security
    'anomaly:read',
    'anomaly:resolve',
    'scan_log:read',
    'security:ip_block',
    'security:ip_unblock',
    'security:device_block',
    'security:device_unblock',
    'security:geo_manage',
    'security:audit_read',

    // Rate Limiting
    'ratelimit:whitelist',
    'ratelimit:blacklist',
    'ratelimit:configure',

    // System
    'feature_flag:read',
    'feature_flag:update',
    'audit_log:read',
    'system:health',
    'system:maintenance_mode',
    'system:config_update',
    'system:metrics_read',
  ]),

  // ── SCHOOL_ADMIN — School Manager ─────────────────────────────────────────
  [ROLES.SCHOOL_ADMIN]: new Set([
    // Students (school-scoped)
    'student:read',
    'student:create',
    'student:update',
    'student:delete',

    // Tokens & QR
    'token:read',
    'qr:read',

    // Orders
    'order:create',
    'order:read',

    // Card Templates
    'card_template:read',
    'card_template:update',

    // School Settings
    'school_settings:read',
    'school_settings:update',

    // Users
    'school_user:read',
    'school_user:create',
    'school_user:update',
    'teacher:read',
    'teacher:create',
    'teacher:update',
    'teacher:delete',

    // Safety
    'scan_log:read',
    'anomaly:read',

    // Module: Emergency
    'emergency:read',
    'emergency:update',
    'emergency:manage_contacts',
    'emergency:view_scans',

    // Module: Attendance
    'attendance:read',
    'attendance:mark',
    'attendance:update',
    'attendance:delete',
    'attendance:device_register',
    'attendance:device_remove',
    'attendance:session_manage',

    // Module: Timetable
    'timetable:read',
    'timetable:create',
    'timetable:update',
    'timetable:delete',
    'timetable:manage_substitutions',

    // Module: Communication
    'communication:read',
    'communication:send',
    'communication:manage_templates',
  ]),

  // ── TEACHER — Classroom Staff ─────────────────────────────────────────────
  [ROLES.TEACHER]: new Set([
    // Students (class-scoped)
    'student:read',

    // Attendance
    'attendance:read',
    'attendance:mark',
    'attendance:update',
    'attendance:session_open',
    'attendance:session_close',

    // Timetable
    'timetable:read',
    'timetable:create_substitution',
    'timetable:update_substitution',

    // Safety
    'scan_log:read',
  ]),

  // ── PARENT — Child's Guardian ─────────────────────────────────────────────
  [ROLES.PARENT]: new Set([
    // Own child data only
    'student:read_own',
    'student:update_own',

    // Emergency profile
    'emergency_profile:read_own',
    'emergency_profile:update_own',
    'emergency_contact:create_own',
    'emergency_contact:update_own',
    'emergency_contact:delete_own',

    // Card & QR
    'card_visibility:read_own',
    'card_visibility:update_own',
    'qr:read_own',

    // Notifications
    'notification_pref:read_own',
    'notification_pref:update_own',

    // Own account
    'parent:read_own',
    'parent:update_own',
    'parent:delete_own',

    // Sessions & Devices
    'device:read_own',
    'device:delete_own',
    'session:read_own',
    'session:revoke_own',
  ]),

  // ── EMERGENCY_RESPONDER — Anyone Scanning QR ──────────────────────────────
  [ROLES.EMERGENCY_RESPONDER]: new Set([
    'emergency:scan_qr',
    'emergency:view_profile',
    'emergency:notify_contacts',
  ]),

  // ── ATTENDANCE_DEVICE — RFID Hardware ─────────────────────────────────────
  [ROLES.ATTENDANCE_DEVICE]: new Set([
    'attendance:mark',
    'attendance:read',
    'device:heartbeat',
    'device:sync_time',
  ]),

  // ── SYSTEM — Internal Processes ───────────────────────────────────────────
  [ROLES.SYSTEM]: new Set(['system:all', 'worker:execute', 'scheduler:run', 'cleanup:perform']),
});

// ─── Module Permission Mapping ───────────────────────────────────────────────
// Maps module IDs to required permissions for different access levels

export const MODULE_PERMISSION_MAP = Object.freeze({
  emergency: {
    scan: 'emergency:scan_qr', // Public QR scan
    read: 'emergency:read', // View emergency profiles
    write: 'emergency:update', // Update emergency data
    admin: 'emergency:manage_contacts', // Full emergency management
  },
  attendance: {
    read: 'attendance:read', // View attendance records
    mark: 'attendance:mark', // Mark attendance
    write: 'attendance:update', // Modify attendance
    device: 'attendance:device_register', // Register devices
    admin: 'attendance:session_manage', // Full attendance control
  },
  timetable: {
    read: 'timetable:read', // View timetable
    write: 'timetable:update', // Edit timetable
    substitute: 'timetable:create_substitution', // Create substitutions
    admin: 'timetable:manage_substitutions', // Full timetable control
  },
  parent_communication: {
    read: 'communication:read', // View messages
    send: 'communication:send', // Send messages
    admin: 'communication:manage_templates', // Manage templates
  },
});

// ─── Public Permissions (No Auth Required) ──────────────────────────────────
export const PUBLIC_PERMISSIONS = new Set(['emergency:scan_qr', 'emergency:view_profile']);

// ─── Helper Functions ────────────────────────────────────────────────────────

/**
 * Check if a role has a specific permission
 * Includes inherited permissions from role hierarchy
 */
export const hasPermission = (role, permission) => {
  // Direct permission check
  const rolePermissions = PERMISSIONS[role];
  if (rolePermissions?.has(permission)) return true;

  // Check inherited roles
  const inheritedRoles = ROLE_INHERITANCE[role] || [];
  for (const inheritedRole of inheritedRoles) {
    const inheritedPermissions = PERMISSIONS[inheritedRole];
    if (inheritedPermissions?.has(permission)) return true;
  }

  return false;
};

/**
 * Check if role meets minimum role level requirement
 */
export const meetsRoleLevel = (role, minimumRole) => {
  const roleLevel = getRoleLevel(role);
  const minLevel = getRoleLevel(minimumRole);
  return roleLevel >= minLevel;
};

/**
 * Get all effective permissions for a role (including inherited)
 */
export const getEffectivePermissions = (role) => {
  const permissions = new Set(PERMISSIONS[role] || []);

  const inheritedRoles = ROLE_INHERITANCE[role] || [];
  for (const inheritedRole of inheritedRoles) {
    const inheritedPermissions = PERMISSIONS[inheritedRole] || [];
    for (const perm of inheritedPermissions) {
      permissions.add(perm);
    }
  }

  return permissions;
};
