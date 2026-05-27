// src/shared/constants/modules.js

/**
 * RESQID Module Registry
 * Single source of truth for all module IDs across the system.
 *
 * Used by:
 *   - requireModule() middleware
 *   - Subscription model (modules[] field)
 *   - plans.js (plan → module mapping)
 *   - Frontend feature flags
 */

export const MODULES = Object.freeze({
  EMERGENCY: 'emergency',
  ATTENDANCE: 'attendance',
  TIMETABLE: 'timetable',
  PARENT_COMMUNICATION: 'parent_communication',
});

// All valid module IDs — use for validation
export const ALL_MODULES = Object.values(MODULES);

// Human-readable labels — use in UI, emails, invoices
export const MODULE_LABELS = Object.freeze({
  [MODULES.EMERGENCY]: 'Emergency ID',
  [MODULES.ATTENDANCE]: 'Smart Attendance',
  [MODULES.TIMETABLE]: 'Timetable & Substitution',
  [MODULES.PARENT_COMMUNICATION]: 'Parent Communication',
});

// Which modules require hardware (ESP32 device)
export const HARDWARE_MODULES = Object.freeze([MODULES.ATTENDANCE]);

// Module base API paths — used in route loader
export const MODULE_BASE_PATHS = Object.freeze({
  [MODULES.EMERGENCY]: '/api/emergency',
  [MODULES.ATTENDANCE]: '/api/attendance',
  [MODULES.TIMETABLE]: '/api/timetable',
  [MODULES.PARENT_COMMUNICATION]: '/api/communication',
});
