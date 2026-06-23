// =============================================================================
// src/routes/school-admin/emergency.routes.js — RESQID
// Emergency Management Routes — School Admin & Super Admin
// =============================================================================

import { Router } from 'express';
import { authenticate } from '#middleware/auth/authenticate.middleware.js';
import { authorize } from '#middleware/auth/authorize.middleware.js';
import { ROLES } from '#shared/constants/roles.js';
import { validate } from '#middleware/validate.middleware.js';

// ─── Controllers ──────────────────────────────────────────────────────────────
import * as emergencyCtrl from '#modules/m2-emergency/emergency.controller.js';

// ─── Validation Schemas ──────────────────────────────────────────────────────
import {
  emergencyProfileSchema,
  emergencyContactSchema,
  emergencyIncidentSchema,
  resolveIncidentSchema,
  emergencyDrillSchema,
  studentIdParamsSchema,
  contactIdParamsSchema,
  incidentIdParamsSchema,
  emergencyQuerySchema,
  studentListQuerySchema,
  emergencyAlertSchema,
  emergencySmsSchema,
} from '#modules/m2-emergency/emergency.validation.js';

// ─── Router ──────────────────────────────────────────────────────────────────

const router = Router();

// All routes require authentication and Admin rights
router.use(authenticate, authorize([ROLES.SCHOOL_ADMIN, ROLES.SUPER_ADMIN]));

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 DASHBOARD & STATS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /emergency/dashboard/stats
 * Returns KPI metrics: total students, high risk, incidents today, resolved, open
 */
router.get('/dashboard/stats', emergencyCtrl.getDashboardStats);

/**
 * GET /emergency/students
 * Paginated list of students with emergency profiles
 * Query: page, limit, search, class, risk
 */
router.get(
  '/students',
  validate(studentListQuerySchema, 'query'),
  emergencyCtrl.listStudents
);

// ═══════════════════════════════════════════════════════════════════════════════
// 👤 PROFILE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /emergency/profiles/:studentId
 * Get full emergency profile for a student
 */
router.get(
  '/profiles/:studentId',
  validate(studentIdParamsSchema, 'params'),
  emergencyCtrl.getProfile
);

/**
 * PUT /emergency/profiles/:studentId
 * Update emergency profile for a student
 */
router.put(
  '/profiles/:studentId',
  validate(studentIdParamsSchema, 'params'),
  validate(emergencyProfileSchema, 'body'),
  emergencyCtrl.updateProfile
);

// ═══════════════════════════════════════════════════════════════════════════════
// 📞 CONTACTS MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /emergency/contacts/:studentId
 * Get all emergency contacts for a student
 */
router.get(
  '/contacts/:studentId',
  validate(studentIdParamsSchema, 'params'),
  emergencyCtrl.getContacts
);

/**
 * POST /emergency/contacts/:studentId
 * Add a new emergency contact
 */
router.post(
  '/contacts/:studentId',
  validate(studentIdParamsSchema, 'params'),
  validate(emergencyContactSchema, 'body'),
  emergencyCtrl.addContact
);

/**
 * PUT /emergency/contacts/:contactId
 * Update an existing emergency contact
 */
router.put(
  '/contacts/:contactId',
  validate(contactIdParamsSchema, 'params'),
  validate(emergencyContactSchema, 'body'),
  emergencyCtrl.updateContact
);

/**
 * DELETE /emergency/contacts/:contactId
 * Remove an emergency contact
 */
router.delete(
  '/contacts/:contactId',
  validate(contactIdParamsSchema, 'params'),
  emergencyCtrl.deleteContact
);

/**
 * POST /emergency/contacts/:contactId/sms
 * Send emergency SMS to a specific contact
 */
router.post(
  '/contacts/:contactId/sms',
  validate(contactIdParamsSchema, 'params'),
  validate(emergencySmsSchema, 'body'),
  emergencyCtrl.sendEmergencySMS
);

// ═══════════════════════════════════════════════════════════════════════════════
// 🚨 INCIDENTS MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /emergency/incidents (global)
 * Get all incidents across the school (dashboard view)
 * Query: page, limit, type, severity, status
 */
router.get(
  '/incidents',
  validate(emergencyQuerySchema, 'query'),
  emergencyCtrl.getSchoolIncidents
);

/**
 * GET /emergency/incidents/:studentId
 * Get incidents for a specific student
 */
router.get(
  '/incidents/:studentId',
  validate(studentIdParamsSchema, 'params'),
  validate(emergencyQuerySchema, 'query'),
  emergencyCtrl.getIncidents
);

/**
 * GET /emergency/incidents/detail/:incidentId
 * Get detailed incident information
 */
router.get(
  '/incidents/detail/:incidentId',
  validate(incidentIdParamsSchema, 'params'),
  emergencyCtrl.getIncident
);

/**
 * POST /emergency/incidents
 * Log a new incident
 */
router.post(
  '/incidents',
  validate(emergencyIncidentSchema, 'body'),
  emergencyCtrl.logIncident
);

/**
 * PUT /emergency/incidents/:incidentId/resolve
 * Resolve an incident
 */
router.put(
  '/incidents/:incidentId/resolve',
  validate(incidentIdParamsSchema, 'params'),
  validate(resolveIncidentSchema, 'body'),
  emergencyCtrl.resolveIncident
);

// ═══════════════════════════════════════════════════════════════════════════════
// 🔊 EMERGENCY ALERTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /emergency/alert
 * Broadcast emergency alert to all contacts
 * Body: { studentId, message, contacts (optional) }
 */
router.post(
  '/alert',
  validate(emergencyAlertSchema, 'body'),
  emergencyCtrl.broadcastAlert
);

// ═══════════════════════════════════════════════════════════════════════════════
// 🏥 DRILLS MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /emergency/drills
 * Get all drills for the school
 */
router.get('/drills', emergencyCtrl.getDrills);

/**
 * POST /emergency/drills
 * Log a new drill
 */
router.post(
  '/drills',
  validate(emergencyDrillSchema, 'body'),
  emergencyCtrl.logDrill
);

// ═══════════════════════════════════════════════════════════════════════════════
// 🔍 ACCESS LOGS (Admin Only — Sensitive)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /emergency/access-logs/:studentId
 * Get access logs for a student
 */
router.get(
  '/access-logs/:studentId',
  validate(studentIdParamsSchema, 'params'),
  validate(emergencyQuerySchema, 'query'),
  emergencyCtrl.getAccessLogs
);

export default router;