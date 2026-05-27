// src/shared/constants/plans.js
import { MODULES, ALL_MODULES } from './modules.js';

/**
 * RESQID Plan Registry
 *
 * Structure (no prices) — prices live in DB Plan table.
 * This file only defines what each plan UNLOCKS.
 *
 * Used by:
 *   - subscription.service (resolve modules from planId)
 *   - SuperAdmin dashboard (plan picker UI)
 *   - Invoice generation (plan label)
 */

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
  RESQID_COMPLETE: 'resqid_complete', // all 4
});

export const ALL_PLAN_IDS = Object.values(PLAN_IDS);

// Plan → modules mapping (source of truth)
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

// Human-readable plan labels — for UI, invoices, emails
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

// Helper — get modules for a planId, throws if invalid
export const getModulesForPlan = (planId) => {
  const modules = PLAN_MODULES[planId];
  if (!modules) throw new Error(`Unknown planId: '${planId}'`);
  return modules;
};

// Helper — check if a planId is valid
export const isValidPlanId = (planId) => Boolean(PLAN_MODULES[planId]);
