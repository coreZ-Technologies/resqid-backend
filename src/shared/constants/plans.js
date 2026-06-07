// =============================================================================
// RESQID Plan Registry — What each plan unlocks
// =============================================================================

import { MODULES, ALL_MODULES } from './modules.js';

// ─── Plan IDs ────────────────────────────────────────────────────────────────

export const PLAN_IDS = Object.freeze({
  // Single modules
  MODULE_EMERGENCY: 'module_emergency',
  MODULE_ATTENDANCE: 'module_attendance',
  MODULE_TIMETABLE: 'module_timetable',
  MODULE_COMMUNICATION: 'module_communication',

  // Bundles
  BUNDLE_SAFETY: 'bundle_safety', // emergency + attendance
  BUNDLE_OPS: 'bundle_ops', // safety + timetable + communication
  BUNDLE_CONNECT: 'bundle_connect', // ops + parent app + cards

  // Full product
  RESQID_COMPLETE: 'resqid_complete', // everything + priority support
});

export const ALL_PLAN_IDS = Object.values(PLAN_IDS);

// ─── Plan Tiers ──────────────────────────────────────────────────────────────

export const PLAN_TIERS = Object.freeze({
  SINGLE_MODULE: 'single_module',
  BUNDLE: 'bundle',
  COMPLETE: 'complete',
});

// ─── Plan → Modules Mapping (Source of Truth) ────────────────────────────────

export const PLAN_MODULES = Object.freeze({
  [PLAN_IDS.MODULE_EMERGENCY]: [MODULES.EMERGENCY],
  [PLAN_IDS.MODULE_ATTENDANCE]: [MODULES.ATTENDANCE],
  [PLAN_IDS.MODULE_TIMETABLE]: [MODULES.TIMETABLE],
  [PLAN_IDS.MODULE_COMMUNICATION]: [MODULES.COMMUNICATION],
  [PLAN_IDS.BUNDLE_SAFETY]: [MODULES.EMERGENCY, MODULES.ATTENDANCE],
  [PLAN_IDS.BUNDLE_OPS]: [
    MODULES.EMERGENCY,
    MODULES.ATTENDANCE,
    MODULES.TIMETABLE,
    MODULES.COMMUNICATION,
  ],
  [PLAN_IDS.BUNDLE_CONNECT]: [
    MODULES.EMERGENCY,
    MODULES.ATTENDANCE,
    MODULES.TIMETABLE,
    MODULES.COMMUNICATION,
    MODULES.CARDS,
  ],
  [PLAN_IDS.RESQID_COMPLETE]: ALL_MODULES,
});

// ─── Plan → Tier Mapping ─────────────────────────────────────────────────────

export const PLAN_TIER_MAP = Object.freeze({
  [PLAN_IDS.MODULE_EMERGENCY]: PLAN_TIERS.SINGLE_MODULE,
  [PLAN_IDS.MODULE_ATTENDANCE]: PLAN_TIERS.SINGLE_MODULE,
  [PLAN_IDS.MODULE_TIMETABLE]: PLAN_TIERS.SINGLE_MODULE,
  [PLAN_IDS.MODULE_COMMUNICATION]: PLAN_TIERS.SINGLE_MODULE,
  [PLAN_IDS.BUNDLE_SAFETY]: PLAN_TIERS.BUNDLE,
  [PLAN_IDS.BUNDLE_OPS]: PLAN_TIERS.BUNDLE,
  [PLAN_IDS.BUNDLE_CONNECT]: PLAN_TIERS.BUNDLE,
  [PLAN_IDS.RESQID_COMPLETE]: PLAN_TIERS.COMPLETE,
});

// ─── Human-Readable Labels ───────────────────────────────────────────────────

export const PLAN_LABELS = Object.freeze({
  [PLAN_IDS.MODULE_EMERGENCY]: 'Emergency ID',
  [PLAN_IDS.MODULE_ATTENDANCE]: 'Smart Attendance',
  [PLAN_IDS.MODULE_TIMETABLE]: 'Timetable & Substitution',
  [PLAN_IDS.MODULE_COMMUNICATION]: 'Parent Communication',
  [PLAN_IDS.BUNDLE_SAFETY]: 'Safety Bundle',
  [PLAN_IDS.BUNDLE_OPS]: 'Operations Bundle',
  [PLAN_IDS.BUNDLE_CONNECT]: 'Connect Bundle',
  [PLAN_IDS.RESQID_COMPLETE]: 'RESQID Complete',
});

// ─── Plan Descriptions (for Super Admin UI) ──────────────────────────────────

export const PLAN_DESCRIPTIONS = Object.freeze({
  [PLAN_IDS.MODULE_EMERGENCY]: 'QR-based emergency ID cards with parent alerts',
  [PLAN_IDS.MODULE_ATTENDANCE]: 'RFID-based attendance tracking with reports',
  [PLAN_IDS.MODULE_TIMETABLE]: 'Auto-generate conflict-free timetables with substitution',
  [PLAN_IDS.MODULE_COMMUNICATION]: 'Send announcements & messages to parents',
  [PLAN_IDS.BUNDLE_SAFETY]: 'Emergency ID + Attendance tracking — complete safety solution',
  [PLAN_IDS.BUNDLE_OPS]:
    'Full school operations — timetable, attendance, emergency & communication',
  [PLAN_IDS.BUNDLE_CONNECT]: 'Operations + Parent app + ID cards — connect everyone',
  [PLAN_IDS.RESQID_COMPLETE]: 'Everything unlimited + priority support + API access',
});

// ─── Plan Tier Labels ────────────────────────────────────────────────────────

export const PLAN_TIER_LABELS = Object.freeze({
  [PLAN_TIERS.SINGLE_MODULE]: 'Single Module',
  [PLAN_TIERS.BUNDLE]: 'Bundle',
  [PLAN_TIERS.COMPLETE]: 'Complete',
});

// ─── Rate Limit Multipliers ──────────────────────────────────────────────────

export const PLAN_RATE_LIMIT_MULTIPLIERS = Object.freeze({
  [PLAN_TIERS.SINGLE_MODULE]: 1,
  [PLAN_TIERS.BUNDLE]: 2,
  [PLAN_TIERS.COMPLETE]: 5,
});

// ─── Device Limits (RFID Machines Per School) ────────────────────────────────

export const PLAN_DEVICE_LIMITS = Object.freeze({
  [PLAN_IDS.MODULE_ATTENDANCE]: 2,
  [PLAN_IDS.BUNDLE_SAFETY]: 3,
  [PLAN_IDS.BUNDLE_OPS]: 5,
  [PLAN_IDS.BUNDLE_CONNECT]: 5,
  [PLAN_IDS.RESQID_COMPLETE]: 20,
});

// ─── Student Limits ──────────────────────────────────────────────────────────

export const PLAN_STUDENT_LIMITS = Object.freeze({
  [PLAN_IDS.MODULE_EMERGENCY]: 500,
  [PLAN_IDS.MODULE_ATTENDANCE]: 500,
  [PLAN_IDS.MODULE_TIMETABLE]: 500,
  [PLAN_IDS.MODULE_COMMUNICATION]: 500,
  [PLAN_IDS.BUNDLE_SAFETY]: 1000,
  [PLAN_IDS.BUNDLE_OPS]: 2000,
  [PLAN_IDS.BUNDLE_CONNECT]: 3000,
  [PLAN_IDS.RESQID_COMPLETE]: 10000,
});

// ─── Teacher Limits ──────────────────────────────────────────────────────────

export const PLAN_TEACHER_LIMITS = Object.freeze({
  [PLAN_IDS.MODULE_TIMETABLE]: 20,
  [PLAN_IDS.BUNDLE_OPS]: 50,
  [PLAN_IDS.BUNDLE_CONNECT]: 100,
  [PLAN_IDS.RESQID_COMPLETE]: 500,
});

// ─── Timetable Generation Limits (per month) ─────────────────────────────────

export const PLAN_TIMETABLE_LIMITS = Object.freeze({
  [PLAN_IDS.MODULE_TIMETABLE]: 5,
  [PLAN_IDS.BUNDLE_OPS]: 20,
  [PLAN_IDS.BUNDLE_CONNECT]: 50,
  [PLAN_IDS.RESQID_COMPLETE]: 999999,
});

// ─── Notification Limits (Per Day) ───────────────────────────────────────────

export const PLAN_NOTIFICATION_LIMITS = Object.freeze({
  [PLAN_IDS.MODULE_COMMUNICATION]: 100,
  [PLAN_IDS.BUNDLE_OPS]: 500,
  [PLAN_IDS.BUNDLE_CONNECT]: 2000,
  [PLAN_IDS.RESQID_COMPLETE]: 10000,
});

// ─── Feature Flags Per Plan ──────────────────────────────────────────────────

export const PLAN_FEATURES = Object.freeze({
  [PLAN_IDS.MODULE_EMERGENCY]: ['basic_emergency_profile', 'qr_code_generation', 'parent_alerts'],
  [PLAN_IDS.MODULE_ATTENDANCE]: ['basic_attendance', 'single_device_support', 'attendance_reports'],
  [PLAN_IDS.MODULE_TIMETABLE]: ['basic_timetable', 'manual_substitution', 'timetable_reports'],
  [PLAN_IDS.MODULE_COMMUNICATION]: ['basic_messaging', 'sms_notifications', 'announcements'],
  [PLAN_IDS.BUNDLE_SAFETY]: [
    'advanced_emergency_profile',
    'qr_code_generation',
    'parent_alerts',
    'basic_attendance',
    'scan_analytics',
    'multi_device_support',
  ],
  [PLAN_IDS.BUNDLE_OPS]: [
    'advanced_emergency',
    'advanced_attendance',
    'attendance_reports',
    'basic_timetable',
    'auto_substitution',
    'timetable_reports',
    'basic_messaging',
    'announcements',
    'wellness_aware_scheduling',
  ],
  [PLAN_IDS.BUNDLE_CONNECT]: [
    'all_emergency_features',
    'all_attendance_features',
    'all_timetable_features',
    'advanced_messaging',
    'multi_channel_notifications',
    'message_templates',
    'parent_app_access',
    'card_ordering',
    'qr_management',
  ],
  [PLAN_IDS.RESQID_COMPLETE]: [
    'all_features',
    'priority_support',
    'custom_branding',
    'api_access',
    'advanced_analytics',
    'unlimited_everything',
    'dedicated_account_manager',
    'sla_guarantee',
  ],
});

// ─── Helper Functions ────────────────────────────────────────────────────────

export const getModulesForPlan = (planId) => PLAN_MODULES[planId] || [];

export const isValidPlanId = (planId) => Boolean(PLAN_MODULES[planId]);

export const getPlanTier = (planId) => PLAN_TIER_MAP[planId] || PLAN_TIERS.SINGLE_MODULE;

export const getRateLimitMultiplier = (planId) => {
  const tier = getPlanTier(planId);
  return PLAN_RATE_LIMIT_MULTIPLIERS[tier] || 1;
};

export const getRateLimitForPlan = (planId, baseLimit) => {
  const multiplier = getRateLimitMultiplier(planId);
  return Math.floor(baseLimit * multiplier);
};

export const getStudentLimit = (planId) => PLAN_STUDENT_LIMITS[planId] || 500;

export const getTeacherLimit = (planId) => PLAN_TEACHER_LIMITS[planId] || 20;

export const getDeviceLimit = (planId) => PLAN_DEVICE_LIMITS[planId] || 0;

export const getTimetableLimit = (planId) => PLAN_TIMETABLE_LIMITS[planId] || 5;

export const getNotificationLimit = (planId) => PLAN_NOTIFICATION_LIMITS[planId] || 100;

export const planHasFeature = (planId, feature) => {
  const features = PLAN_FEATURES[planId] || [];
  return features.includes(feature) || features.includes('all_features');
};

export const planHasModule = (planId, moduleId) => {
  const modules = PLAN_MODULES[planId] || [];
  return modules.includes(moduleId);
};

export const getPlanLabel = (planId) => PLAN_LABELS[planId] || 'Unknown Plan';

export const getPlanDescription = (planId) => PLAN_DESCRIPTIONS[planId] || '';

export const getPlansForModule = (moduleId) => {
  return Object.entries(PLAN_MODULES)
    .filter(([, modules]) => modules.includes(moduleId))
    .map(([planId]) => planId);
};

/**
 * Get all limits for a plan (for dashboard display)
 */
export const getPlanLimits = (planId) => ({
  students: getStudentLimit(planId),
  teachers: getTeacherLimit(planId),
  devices: getDeviceLimit(planId),
  timetableGenerations: getTimetableLimit(planId),
  notificationsPerDay: getNotificationLimit(planId),
});

/**
 * Check if a limit is exceeded
 */
export const isLimitExceeded = (planId, limitType, currentCount) => {
  const limits = {
    students: getStudentLimit(planId),
    teachers: getTeacherLimit(planId),
    devices: getDeviceLimit(planId),
  };
  const max = limits[limitType] || 0;
  return max > 0 && currentCount >= max;
};
