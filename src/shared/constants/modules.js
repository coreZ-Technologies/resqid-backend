// =============================================================================
// RESQID Module Registry — Single source of truth for all module IDs
//
// Used by:
//   - requireModule.middleware  → check if school subscription includes module
//   - Subscription model        → modules[] field
//   - plans.js                  → plan → module mapping
//   - Frontend feature flags    → module availability
//   - rateLimit.middleware      → module-specific rate limits
// =============================================================================

export const MODULES = Object.freeze({
  EMERGENCY: 'emergency',
  ATTENDANCE: 'attendance',
  TIMETABLE: 'timetable',
  PARENT_COMMUNICATION: 'parent_communication',
});

// All valid module IDs — use for validation
export const ALL_MODULES = Object.values(MODULES);

// ─── Human-Readable Labels ───────────────────────────────────────────────────
export const MODULE_LABELS = Object.freeze({
  [MODULES.EMERGENCY]: 'Emergency ID',
  [MODULES.ATTENDANCE]: 'Smart Attendance',
  [MODULES.TIMETABLE]: 'Timetable & Substitution',
  [MODULES.PARENT_COMMUNICATION]: 'Parent Communication',
});

// ─── Hardware Requirements ───────────────────────────────────────────────────
export const HARDWARE_MODULES = Object.freeze([MODULES.ATTENDANCE]);

// ─── Module Base API Paths ───────────────────────────────────────────────────
export const MODULE_BASE_PATHS = Object.freeze({
  [MODULES.EMERGENCY]: '/api/emergency',
  [MODULES.ATTENDANCE]: '/api/attendance',
  [MODULES.TIMETABLE]: '/api/timetable',
  [MODULES.PARENT_COMMUNICATION]: '/api/communication',
});

// ─── Module Access Types ─────────────────────────────────────────────────────
// Public    = No authentication required
// Device    = Authenticated via device API key / fingerprint
// Mixed     = Some endpoints public, some authenticated
// Authenticated = Standard JWT auth required

export const MODULE_ACCESS_TYPES = Object.freeze({
  [MODULES.EMERGENCY]: 'mixed', // Public QR scan + authenticated dashboard
  [MODULES.ATTENDANCE]: 'device', // RFID devices + authenticated dashboard
  [MODULES.TIMETABLE]: 'authenticated',
  [MODULES.PARENT_COMMUNICATION]: 'authenticated',
});

// ─── Public Endpoints Within Modules ─────────────────────────────────────────
// Routes within each module that bypass JWT authentication
// QR scan endpoints are public, device endpoints use API key auth

export const MODULE_PUBLIC_PATHS = Object.freeze({
  [MODULES.EMERGENCY]: [
    '/scan/:code', // QR scan redirect
    '/profile/:studentId/emergency', // Public emergency profile view
  ],
  [MODULES.ATTENDANCE]: [
    '/tap/:deviceId', // RFID device tap endpoint
    '/device/heartbeat', // Device health check
  ],
  [MODULES.TIMETABLE]: [],
  [MODULES.PARENT_COMMUNICATION]: [],
});

// ─── Module Permissions ──────────────────────────────────────────────────────
// Each module has granular permissions for different access levels

export const MODULE_PERMISSIONS = Object.freeze({
  [MODULES.EMERGENCY]: {
    scan: 'emergency:scan_qr', // Public: scan QR code
    read: 'emergency:read', // View emergency profiles
    write: 'emergency:update', // Update emergency data
    contacts: 'emergency:manage_contacts', // Manage emergency contacts
    scans: 'emergency:view_scans', // View scan logs
  },
  [MODULES.ATTENDANCE]: {
    read: 'attendance:read', // View attendance records
    mark: 'attendance:mark', // Mark attendance
    write: 'attendance:update', // Modify attendance
    session: 'attendance:session_manage', // Open/close sessions
    device: 'attendance:device_register', // Register RFID devices
  },
  [MODULES.TIMETABLE]: {
    read: 'timetable:read', // View timetable
    write: 'timetable:update', // Edit timetable
    substitute: 'timetable:create_substitution', // Create substitutions
    admin: 'timetable:manage_substitutions', // Full timetable control
  },
  [MODULES.PARENT_COMMUNICATION]: {
    read: 'communication:read', // View messages
    send: 'communication:send', // Send messages
    templates: 'communication:manage_templates', // Manage templates
  },
});

// ─── Module Features (Granular Feature Flags) ────────────────────────────────

export const MODULE_FEATURES = Object.freeze({
  [MODULES.EMERGENCY]: {
    QR_SCAN: 'qr_scan',
    PROFILE_VIEW: 'profile_view',
    CONTACT_MANAGEMENT: 'contact_management',
    SCAN_LOGS: 'scan_logs',
    ANOMALY_DETECTION: 'anomaly_detection',
  },
  [MODULES.ATTENDANCE]: {
    MARK_ATTENDANCE: 'mark_attendance',
    VIEW_REPORTS: 'view_reports',
    MANAGE_SESSIONS: 'manage_sessions',
    DEVICE_MANAGEMENT: 'device_management',
    BULK_OPERATIONS: 'bulk_operations',
  },
  [MODULES.TIMETABLE]: {
    VIEW_TIMETABLE: 'view_timetable',
    EDIT_TIMETABLE: 'edit_timetable',
    CREATE_SUBSTITUTION: 'create_substitution',
    APPROVE_CHANGES: 'approve_changes',
    BULK_SCHEDULE: 'bulk_schedule',
  },
  [MODULES.PARENT_COMMUNICATION]: {
    SEND_MESSAGE: 'send_message',
    SEND_ANNOUNCEMENT: 'send_announcement',
    MANAGE_TEMPLATES: 'manage_templates',
    VIEW_DELIVERY_STATUS: 'view_delivery_status',
  },
});

// ─── Module Rate Limits ──────────────────────────────────────────────────────
// Window in seconds, max requests per window

export const MODULE_RATE_LIMITS = Object.freeze({
  [MODULES.EMERGENCY]: {
    scan: { window: 60, max: 30 }, // 30 QR scans per minute
    profile: { window: 60, max: 20 }, // 20 profile views per minute
  },
  [MODULES.ATTENDANCE]: {
    tap: { window: 1, max: 10 }, // 10 taps per second (hardware)
    api: { window: 60, max: 100 }, // 100 API calls per minute
  },
  [MODULES.TIMETABLE]: {
    standard: { window: 60, max: 100 }, // 100 requests per minute
    bulk: { window: 300, max: 10 }, // 10 bulk operations per 5 min
  },
  [MODULES.PARENT_COMMUNICATION]: {
    send: { window: 60, max: 20 }, // 20 messages per minute
    broadcast: { window: 300, max: 5 }, // 5 broadcasts per 5 min
  },
});

// ─── Module Dependencies ─────────────────────────────────────────────────────
// Some modules require other modules to function

export const MODULE_DEPENDENCIES = Object.freeze({
  [MODULES.EMERGENCY]: [], // Standalone
  [MODULES.ATTENDANCE]: [MODULES.EMERGENCY], // Needs student data
  [MODULES.TIMETABLE]: [MODULES.ATTENDANCE], // Needs attendance data
  [MODULES.PARENT_COMMUNICATION]: [MODULES.EMERGENCY], // Needs emergency contacts
});

// ─── Module Device Limits (Per School) ───────────────────────────────────────
// Maximum number of RFID devices per school based on subscription

export const MODULE_DEVICE_LIMITS = Object.freeze({
  [MODULES.ATTENDANCE]: {
    default: 2, // Single module plan
    bundle: 5, // Bundle plan
    complete: 20, // RESQID Complete
  },
});

// ─── Helper Functions ────────────────────────────────────────────────────────

/**
 * Check if a module is valid
 */
export const isValidModule = (moduleId) => ALL_MODULES.includes(moduleId);

/**
 * Get rate limit config for a module and action
 */
export const getModuleRateLimit = (moduleId, action = 'standard') => {
  const limits = MODULE_RATE_LIMITS[moduleId];
  if (!limits) return null;
  return limits[action] || limits.standard || null;
};

/**
 * Check if a module requires another module
 */
export const getModuleDependencies = (moduleId) => {
  return MODULE_DEPENDENCIES[moduleId] || [];
};

/**
 * Check if a path belongs to a public module endpoint
 */
export const isModulePublicPath = (moduleId, path) => {
  const publicPaths = MODULE_PUBLIC_PATHS[moduleId] || [];
  return publicPaths.some((pattern) => {
    // Convert :param patterns to regex
    const regex = new RegExp('^' + pattern.replace(/:[^/]+/g, '[^/]+') + '$');
    return regex.test(path);
  });
};

/**
 * Get required permission for a module and access level
 */
export const getModulePermission = (moduleId, accessLevel = 'read') => {
  const permissions = MODULE_PERMISSIONS[moduleId];
  if (!permissions) return null;
  return permissions[accessLevel] || permissions.read || null;
};
