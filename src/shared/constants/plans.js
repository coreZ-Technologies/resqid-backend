// =============================================================================
// RESQID Plan Registry — What each plan unlocks
//
// Structure (no prices) — prices live in DB Plan table.
// This file only defines what each plan UNLOCKS.
//
// Used by:
//   - subscription.service        → resolve modules from planId
//   - requireModule.middleware    → check module access
//   - rateLimit.middleware        → plan-based rate limits
//   - SuperAdmin dashboard        → plan picker UI
//   - Invoice generation          → plan label
// =============================================================================

import { MODULES, ALL_MODULES } from './modules.js';

// ─── Plan IDs ────────────────────────────────────────────────────────────────

export const PLAN_IDS = Object.freeze({
  // Single modules
  MODULE_EMERGENCY: 'module_emergency',
  MODULE_ATTENDANCE: 'module_attendance',
  MODULE_TIMETABLE: 'module_timetable',
  MODULE_PARENT_COMMUNICATION: 'module_parent_communication',

  // Bundles
  BUNDLE_SAFETY: 'bundle_safety', // emergency + attendance
  BUNDLE_OPS: 'bundle_ops', // attendance + timetable
  BUNDLE_CONNECT: 'bundle_connect', // attendance + communication

  // Full product
  RESQID_COMPLETE: 'resqid_complete', // all 4 modules
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
  [PLAN_IDS.MODULE_PARENT_COMMUNICATION]: [MODULES.PARENT_COMMUNICATION],
  [PLAN_IDS.BUNDLE_SAFETY]: [MODULES.EMERGENCY, MODULES.ATTENDANCE],
  [PLAN_IDS.BUNDLE_OPS]: [MODULES.ATTENDANCE, MODULES.TIMETABLE],
  [PLAN_IDS.BUNDLE_CONNECT]: [MODULES.ATTENDANCE, MODULES.PARENT_COMMUNICATION],
  [PLAN_IDS.RESQID_COMPLETE]: ALL_MODULES,
});

// ─── Plan → Tier Mapping ─────────────────────────────────────────────────────

export const PLAN_TIER_MAP = Object.freeze({
  [PLAN_IDS.MODULE_EMERGENCY]: PLAN_TIERS.SINGLE_MODULE,
  [PLAN_IDS.MODULE_ATTENDANCE]: PLAN_TIERS.SINGLE_MODULE,
  [PLAN_IDS.MODULE_TIMETABLE]: PLAN_TIERS.SINGLE_MODULE,
  [PLAN_IDS.MODULE_PARENT_COMMUNICATION]: PLAN_TIERS.SINGLE_MODULE,
  [PLAN_IDS.BUNDLE_SAFETY]: PLAN_TIERS.BUNDLE,
  [PLAN_IDS.BUNDLE_OPS]: PLAN_TIERS.BUNDLE,
  [PLAN_IDS.BUNDLE_CONNECT]: PLAN_TIERS.BUNDLE,
  [PLAN_IDS.RESQID_COMPLETE]: PLAN_TIERS.COMPLETE,
});

// ─── Human-Readable Labels ───────────────────────────────────────────────────

export const PLAN_LABELS = Object.freeze({
  [PLAN_IDS.MODULE_EMERGENCY]: 'Emergency ID Module',
  [PLAN_IDS.MODULE_ATTENDANCE]: 'Smart Attendance Module',
  [PLAN_IDS.MODULE_TIMETABLE]: 'Timetable & Substitution Module',
  [PLAN_IDS.MODULE_PARENT_COMMUNICATION]: 'Parent Communication Module',
  [PLAN_IDS.BUNDLE_SAFETY]: 'Safety Bundle',
  [PLAN_IDS.BUNDLE_OPS]: 'Operations Bundle',
  [PLAN_IDS.BUNDLE_CONNECT]: 'Connect Bundle',
  [PLAN_IDS.RESQID_COMPLETE]: 'RESQID Complete',
});

// ─── Plan Tier Labels ────────────────────────────────────────────────────────

export const PLAN_TIER_LABELS = Object.freeze({
  [PLAN_TIERS.SINGLE_MODULE]: 'Single Module',
  [PLAN_TIERS.BUNDLE]: 'Bundle',
  [PLAN_TIERS.COMPLETE]: 'Complete',
});

// ─── Rate Limit Multipliers (Higher tier = more requests allowed) ────────────
// Base rate limit × multiplier = actual limit for the plan

export const PLAN_RATE_LIMIT_MULTIPLIERS = Object.freeze({
  [PLAN_TIERS.SINGLE_MODULE]: 1,
  [PLAN_TIERS.BUNDLE]: 2,
  [PLAN_TIERS.COMPLETE]: 5,
});

// ─── Device Limits (RFID Machines Per School) ────────────────────────────────
// Maximum number of attendance devices based on plan

export const PLAN_DEVICE_LIMITS = Object.freeze({
  [PLAN_IDS.MODULE_ATTENDANCE]: 2,
  [PLAN_IDS.BUNDLE_SAFETY]: 3,
  [PLAN_IDS.BUNDLE_OPS]: 5,
  [PLAN_IDS.BUNDLE_CONNECT]: 3,
  [PLAN_IDS.RESQID_COMPLETE]: 20,
});

// ─── Student Limits (Maximum Students Per School) ────────────────────────────

export const PLAN_STUDENT_LIMITS = Object.freeze({
  [PLAN_IDS.MODULE_EMERGENCY]: 500,
  [PLAN_IDS.MODULE_ATTENDANCE]: 500,
  [PLAN_IDS.MODULE_TIMETABLE]: 500,
  [PLAN_IDS.MODULE_PARENT_COMMUNICATION]: 500,
  [PLAN_IDS.BUNDLE_SAFETY]: 1000,
  [PLAN_IDS.BUNDLE_OPS]: 1000,
  [PLAN_IDS.BUNDLE_CONNECT]: 1000,
  [PLAN_IDS.RESQID_COMPLETE]: 5000,
});

// ─── QR Scans Per Day Limits ─────────────────────────────────────────────────
// Maximum emergency QR scans per student per day

export const PLAN_QR_SCAN_LIMITS = Object.freeze({
  [PLAN_IDS.MODULE_EMERGENCY]: 50,
  [PLAN_IDS.BUNDLE_SAFETY]: 100,
  [PLAN_IDS.RESQID_COMPLETE]: 500,
});

// ─── Notification Limits (Per Day) ───────────────────────────────────────────

export const PLAN_NOTIFICATION_LIMITS = Object.freeze({
  [PLAN_IDS.MODULE_PARENT_COMMUNICATION]: 100,
  [PLAN_IDS.BUNDLE_CONNECT]: 500,
  [PLAN_IDS.RESQID_COMPLETE]: 5000,
});

// ─── Feature Flags Per Plan ──────────────────────────────────────────────────
// Additional features unlocked by each plan

export const PLAN_FEATURES = Object.freeze({
  [PLAN_IDS.MODULE_EMERGENCY]: ['basic_emergency_profile', 'qr_code_generation'],
  [PLAN_IDS.MODULE_ATTENDANCE]: ['basic_attendance', 'single_device_support'],
  [PLAN_IDS.MODULE_TIMETABLE]: ['basic_timetable', 'manual_substitution'],
  [PLAN_IDS.MODULE_PARENT_COMMUNICATION]: ['basic_messaging', 'sms_notifications'],
  [PLAN_IDS.BUNDLE_SAFETY]: [
    'advanced_emergency_profile',
    'qr_code_generation',
    'basic_attendance',
    'scan_analytics',
    'multi_device_support',
  ],
  [PLAN_IDS.BUNDLE_OPS]: [
    'advanced_attendance',
    'attendance_reports',
    'basic_timetable',
    'auto_substitution',
  ],
  [PLAN_IDS.BUNDLE_CONNECT]: [
    'advanced_attendance',
    'advanced_messaging',
    'multi_channel_notifications',
    'message_templates',
  ],
  [PLAN_IDS.RESQID_COMPLETE]: [
    'all_features',
    'priority_support',
    'custom_branding',
    'api_access',
    'advanced_analytics',
    'unlimited_scans',
  ],
});

// ─── Helper Functions ────────────────────────────────────────────────────────

/**
 * Get modules unlocked by a plan
 */
export const getModulesForPlan = (planId) => {
  const modules = PLAN_MODULES[planId];
  if (!modules) throw new Error(`Unknown planId: '${planId}'`);
  return modules;
};

/**
 * Check if a planId is valid
 */
export const isValidPlanId = (planId) => Boolean(PLAN_MODULES[planId]);

/**
 * Get the tier of a plan
 */
export const getPlanTier = (planId) => {
  return PLAN_TIER_MAP[planId] || PLAN_TIERS.SINGLE_MODULE;
};

/**
 * Get rate limit multiplier for a plan
 */
export const getRateLimitMultiplier = (planId) => {
  const tier = getPlanTier(planId);
  return PLAN_RATE_LIMIT_MULTIPLIERS[tier] || 1;
};

/**
 * Calculate rate limit for a plan based on base limit
 */
export const getRateLimitForPlan = (planId, baseLimit) => {
  const multiplier = getRateLimitMultiplier(planId);
  return Math.floor(baseLimit * multiplier);
};

/**
 * Get student limit for a plan
 */
export const getStudentLimit = (planId) => {
  return PLAN_STUDENT_LIMITS[planId] || 0;
};

/**
 * Get device limit for a plan
 */
export const getDeviceLimit = (planId) => {
  return PLAN_DEVICE_LIMITS[planId] || 0;
};

/**
 * Get QR scan limit for a plan
 */
export const getQRScanLimit = (planId) => {
  return PLAN_QR_SCAN_LIMITS[planId] || 0;
};

/**
 * Get notification limit for a plan
 */
export const getNotificationLimit = (planId) => {
  return PLAN_NOTIFICATION_LIMITS[planId] || 0;
};

/**
 * Check if a plan includes a specific feature
 */
export const planHasFeature = (planId, feature) => {
  const features = PLAN_FEATURES[planId] || [];
  return features.includes(feature) || features.includes('all_features');
};

/**
 * Check if a plan includes a specific module
 */
export const planHasModule = (planId, moduleId) => {
  const modules = PLAN_MODULES[planId] || [];
  return modules.includes(moduleId);
};

/**
 * Get the plan label
 */
export const getPlanLabel = (planId) => {
  return PLAN_LABELS[planId] || 'Unknown Plan';
};

/**
 * Get all plans that include a specific module
 */
export const getPlansForModule = (moduleId) => {
  return Object.entries(PLAN_MODULES)
    .filter(([, modules]) => modules.includes(moduleId))
    .map(([planId]) => planId);
};
