// =============================================================================
// RESQID Module Registry — Single source of truth for all module IDs
// =============================================================================

export const MODULES = Object.freeze({
  // Main modules (subscription-gated)
  EMERGENCY: 'm2-emergency',
  ATTENDANCE: 'm3-attendance',
  TIMETABLE: 'm1-timetable',
  COMMUNICATION: 'm4-communication',

  // Add-on modules
  CARDS: 'cards',
  REPORTS: 'reports',
  BULK_UPLOAD: 'bulk_upload',
});

export const ALL_MODULES = Object.values(MODULES);

// ─── Human-Readable Labels ───────────────────────────────────────────────────

export const MODULE_LABELS = Object.freeze({
  [MODULES.EMERGENCY]: 'Emergency ID',
  [MODULES.ATTENDANCE]: 'Smart Attendance',
  [MODULES.TIMETABLE]: 'Timetable & Substitution',
  [MODULES.COMMUNICATION]: 'Communication',
  [MODULES.CARDS]: 'ID Cards',
  [MODULES.REPORTS]: 'Advanced Reports',
  [MODULES.BULK_UPLOAD]: 'Bulk Upload',
});

// ─── Module Descriptions ─────────────────────────────────────────────────────

export const MODULE_DESCRIPTIONS = Object.freeze({
  [MODULES.EMERGENCY]: 'QR-based emergency profiles with instant parent alerts',
  [MODULES.ATTENDANCE]: 'RFID attendance tracking with real-time reports',
  [MODULES.TIMETABLE]: 'Auto-generate conflict-free timetables with substitution',
  [MODULES.COMMUNICATION]: 'Announcements, messages & campaigns to parents',
  [MODULES.CARDS]: 'Physical ID card ordering & delivery tracking',
  [MODULES.REPORTS]: 'Advanced analytics & exportable reports',
  [MODULES.BULK_UPLOAD]: 'Excel/CSV bulk data import',
});

// ─── Module Icons (for UI) ───────────────────────────────────────────────────

export const MODULE_ICONS = Object.freeze({
  [MODULES.EMERGENCY]: 'AlertCircle',
  [MODULES.ATTENDANCE]: 'CheckCircle',
  [MODULES.TIMETABLE]: 'Calendar',
  [MODULES.COMMUNICATION]: 'MessageCircle',
  [MODULES.CARDS]: 'CreditCard',
  [MODULES.REPORTS]: 'BarChart',
  [MODULES.BULK_UPLOAD]: 'Upload',
});

// ─── Hardware Requirements ───────────────────────────────────────────────────

export const HARDWARE_MODULES = Object.freeze([MODULES.ATTENDANCE]);

// ─── Module Base API Paths ───────────────────────────────────────────────────

export const MODULE_BASE_PATHS = Object.freeze({
  [MODULES.EMERGENCY]: '/api/emergency',
  [MODULES.ATTENDANCE]: '/api/attendance',
  [MODULES.TIMETABLE]: '/api/timetable',
  [MODULES.COMMUNICATION]: '/api/communication',
  [MODULES.CARDS]: '/api/school-admin/cards',
  [MODULES.REPORTS]: '/api/reports',
  [MODULES.BULK_UPLOAD]: '/api/school-admin/upload',
});

// ─── Module Access Types ─────────────────────────────────────────────────────

export const MODULE_ACCESS_TYPES = Object.freeze({
  [MODULES.EMERGENCY]: 'mixed', // Public QR scan + authenticated dashboard
  [MODULES.ATTENDANCE]: 'device', // RFID devices + authenticated dashboard
  [MODULES.TIMETABLE]: 'authenticated',
  [MODULES.COMMUNICATION]: 'authenticated',
  [MODULES.CARDS]: 'authenticated',
  [MODULES.REPORTS]: 'authenticated',
  [MODULES.BULK_UPLOAD]: 'authenticated',
});

// ─── Module Permissions ──────────────────────────────────────────────────────

export const MODULE_PERMISSIONS = Object.freeze({
  [MODULES.EMERGENCY]: {
    scan: 'emergency:scan_qr',
    read: 'emergency:read',
    write: 'emergency:update',
    contacts: 'emergency:manage_contacts',
    incidents: 'emergency:view_incidents',
    drills: 'emergency:manage_drills',
  },
  [MODULES.ATTENDANCE]: {
    read: 'attendance:read',
    mark: 'attendance:mark',
    write: 'attendance:update',
    session: 'attendance:session_manage',
    device: 'attendance:device_register',
    reports: 'attendance:view_reports',
  },
  [MODULES.TIMETABLE]: {
    read: 'timetable:read',
    write: 'timetable:update',
    generate: 'timetable:generate',
    substitute: 'timetable:create_substitution',
    admin: 'timetable:manage_substitutions',
    templates: 'timetable:manage_templates',
  },
  [MODULES.COMMUNICATION]: {
    read: 'communication:read',
    send: 'communication:send',
    templates: 'communication:manage_templates',
    campaigns: 'communication:manage_campaigns',
  },
  [MODULES.CARDS]: {
    read: 'cards:read',
    order: 'cards:order',
    track: 'cards:track',
  },
});

// ─── Module Rate Limits ──────────────────────────────────────────────────────

export const MODULE_RATE_LIMITS = Object.freeze({
  [MODULES.EMERGENCY]: {
    scan: { window: 60, max: 30 },
    profile: { window: 60, max: 20 },
  },
  [MODULES.ATTENDANCE]: {
    tap: { window: 1, max: 10 },
    api: { window: 60, max: 100 },
  },
  [MODULES.TIMETABLE]: {
    standard: { window: 60, max: 100 },
    bulk: { window: 300, max: 10 },
  },
  [MODULES.COMMUNICATION]: {
    send: { window: 60, max: 20 },
    broadcast: { window: 300, max: 5 },
  },
});

// ─── Module Dependencies ─────────────────────────────────────────────────────

export const MODULE_DEPENDENCIES = Object.freeze({
  [MODULES.EMERGENCY]: [],
  [MODULES.ATTENDANCE]: [],
  [MODULES.TIMETABLE]: [],
  [MODULES.COMMUNICATION]: [],
  [MODULES.CARDS]: [MODULES.EMERGENCY], // Cards need student emergency data
  [MODULES.REPORTS]: [MODULES.ATTENDANCE], // Reports need attendance data
  [MODULES.BULK_UPLOAD]: [],
});

// ─── Helper Functions ────────────────────────────────────────────────────────

export const isValidModule = (moduleId) => ALL_MODULES.includes(moduleId);

export const getModuleLabel = (moduleId) => MODULE_LABELS[moduleId] || moduleId;

export const getModuleDescription = (moduleId) => MODULE_DESCRIPTIONS[moduleId] || '';

export const getModuleIcon = (moduleId) => MODULE_ICONS[moduleId] || 'Package';

export const getModuleRateLimit = (moduleId, action = 'standard') => {
  const limits = MODULE_RATE_LIMITS[moduleId];
  if (!limits) return null;
  return limits[action] || limits.standard || null;
};

export const getModuleDependencies = (moduleId) => MODULE_DEPENDENCIES[moduleId] || [];

export const getModulePermission = (moduleId, accessLevel = 'read') => {
  const permissions = MODULE_PERMISSIONS[moduleId];
  if (!permissions) return null;
  return permissions[accessLevel] || permissions.read || null;
};

/**
 * Check if a school has access to a module based on subscription
 */
export const schoolHasModule = (subscription, moduleId) => {
  if (!subscription?.modules) return false;
  return subscription.modules.includes(moduleId);
};

/**
 * Get all modules a school has access to
 */
export const getSchoolModules = (subscription) => {
  return subscription?.modules || [];
};
