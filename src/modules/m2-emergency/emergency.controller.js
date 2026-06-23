// =============================================================================
// modules/m2-emergency/emergency.controller.js — RESQID
// Profile management ONLY. Scan logic is in scan/ module.
// =============================================================================

import * as service from './emergency.service.js';
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
  // 🆕 New schemas
  studentListQuerySchema,
  emergencyAlertSchema,
  emergencySmsSchema,
  dashboardStatsQuerySchema,
} from './emergency.validation.js';
import { ApiResponse } from '#shared/response/ApiResponse.js';
import { asyncHandler } from '#shared/response/asyncHandler.js';

// ─── Profile ──────────────────────────────────────────────────────────────────

export const getProfile = asyncHandler(async (req, res) => {
  const { studentId } = studentIdParamsSchema.parse(req.params);
  const profile = await service.getProfile(
    studentId,
    req.user.id,
    req.user.role,
    req.user.schoolId
  );
  ApiResponse.ok(res, profile);
});

export const updateProfile = asyncHandler(async (req, res) => {
  const { studentId } = studentIdParamsSchema.parse(req.params);
  const parsed = emergencyProfileSchema.parse(req.body);
  const result = await service.updateProfile(
    studentId,
    req.user.id,
    req.user.role,
    req.user.schoolId,
    parsed
  );
  ApiResponse.ok(res, result, 'Emergency profile updated');
});

// ─── Contacts ─────────────────────────────────────────────────────────────────

export const getContacts = asyncHandler(async (req, res) => {
  const { studentId } = studentIdParamsSchema.parse(req.params);
  const contacts = await service.getContacts(
    studentId,
    req.user.id,
    req.user.role,
    req.user.schoolId
  );
  ApiResponse.ok(res, contacts);
});

export const addContact = asyncHandler(async (req, res) => {
  const { studentId } = studentIdParamsSchema.parse(req.params);
  const parsed = emergencyContactSchema.parse(req.body);
  const contact = await service.addContact(
    studentId,
    req.user.id,
    req.user.role,
    req.user.schoolId,
    parsed
  );
  ApiResponse.created(res, contact, 'Contact added');
});

export const updateContact = asyncHandler(async (req, res) => {
  const { contactId } = contactIdParamsSchema.parse(req.params);
  const parsed = emergencyContactSchema.parse(req.body);
  const contact = await service.updateContact(
    contactId,
    req.user.id,
    req.user.role,
    req.user.schoolId,
    parsed
  );
  ApiResponse.ok(res, contact, 'Contact updated');
});

export const deleteContact = asyncHandler(async (req, res) => {
  const { contactId } = contactIdParamsSchema.parse(req.params);
  await service.deleteContact(
    contactId,
    req.user.id,
    req.user.role,
    req.user.schoolId
  );
  ApiResponse.ok(res, null, 'Contact removed');
});

// ─── Incidents ────────────────────────────────────────────────────────────────

export const getIncidents = asyncHandler(async (req, res) => {
  const { studentId } = studentIdParamsSchema.parse(req.params);
  const query = emergencyQuerySchema.parse(req.query);
  const incidents = await service.getIncidents(
    studentId,
    req.user.id,
    req.user.role,
    req.user.schoolId,
    query
  );
  ApiResponse.ok(res, incidents.data, null, incidents.meta);
});

export const logIncident = asyncHandler(async (req, res) => {
  const parsed = emergencyIncidentSchema.parse(req.body);
  const incident = await service.logIncident(parsed, req.user?.id, req.ip);
  ApiResponse.created(res, incident, 'Incident logged');
});

export const getIncident = asyncHandler(async (req, res) => {
  const { incidentId } = incidentIdParamsSchema.parse(req.params);
  const incident = await service.getIncident(
    incidentId,
    req.user.id,
    req.user.role,
    req.user.schoolId
  );
  ApiResponse.ok(res, incident);
});

export const resolveIncident = asyncHandler(async (req, res) => {
  const { incidentId } = incidentIdParamsSchema.parse(req.params);
  const parsed = resolveIncidentSchema.parse(req.body);
  const incident = await service.resolveIncident(
    incidentId,
    req.user.id,
    req.user.role,
    req.user.schoolId,
    parsed
  );
  ApiResponse.ok(res, incident, 'Incident resolved');
});

// ─── Access Logs ──────────────────────────────────────────────────────────────

export const getAccessLogs = asyncHandler(async (req, res) => {
  const { studentId } = studentIdParamsSchema.parse(req.params);
  const query = emergencyQuerySchema.parse(req.query);
  const logs = await service.getAccessLogs(
    studentId,
    req.user.id,
    req.user.role,
    req.user.schoolId,
    query
  );
  ApiResponse.ok(res, logs.data, null, logs.meta);
});

// ─── Drills ───────────────────────────────────────────────────────────────────

export const logDrill = asyncHandler(async (req, res) => {
  const parsed = emergencyDrillSchema.parse(req.body);
  const drill = await service.logDrill(
    req.user.schoolId,
    req.user.id,
    req.user.role,
    parsed
  );
  ApiResponse.created(res, drill, 'Drill logged');
});

export const getDrills = asyncHandler(async (req, res) => {
  const drills = await service.getDrills(
    req.user.schoolId,
    req.user.role,
    req.query.schoolId
  );
  ApiResponse.ok(res, drills);
});

// ═══════════════════════════════════════════════════════════════════════════════
// 🆕 NEW CONTROLLER FUNCTIONS FOR FRONTEND PRD
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Student List (with Emergency Profiles) ──────────────────────────────────

/**
 * GET /emergency/students
 * Query params: page, limit, search, class, risk
 */
export const listStudents = asyncHandler(async (req, res) => {
  const query = studentListQuerySchema.parse(req.query);
  const result = await service.listStudentsWithEmergencyProfiles(
    req.user.schoolId,
    req.user.role,
    query
  );
  ApiResponse.ok(res, result.data, null, result.meta);
});

// ─── Global Incidents (School-wide Dashboard) ────────────────────────────────

/**
 * GET /emergency/incidents (without studentId)
 * Query params: page, limit, type, severity, status
 */
export const getSchoolIncidents = asyncHandler(async (req, res) => {
  const query = emergencyQuerySchema.parse(req.query);
  const result = await service.getSchoolIncidents(
    req.user.schoolId,
    req.user.role,
    query
  );
  ApiResponse.ok(res, result.data, null, result.meta);
});

// ─── Dashboard Statistics ─────────────────────────────────────────────────────

/**
 * GET /emergency/dashboard/stats
 * Returns KPI metrics: total students, high risk, incidents today, resolved, open
 */
export const getDashboardStats = asyncHandler(async (req, res) => {
  const query = dashboardStatsQuerySchema.parse(req.query);
  const stats = await service.getDashboardStats(
    req.user.schoolId,
    req.user.role
  );
  ApiResponse.ok(res, stats);
});

// ─── Broadcast Emergency Alert ────────────────────────────────────────────────

/**
 * POST /emergency/alert
 * Body: { studentId, message, contacts (optional array) }
 * Broadcasts alert to all contacts of a student via orchestrator
 */
export const broadcastAlert = asyncHandler(async (req, res) => {
  const parsed = emergencyAlertSchema.parse(req.body);
  const result = await service.broadcastEmergencyAlert(
    parsed.studentId,
    req.user.id,
    req.user.role,
    req.user.schoolId,
    parsed
  );
  ApiResponse.ok(res, result, 'Emergency alert broadcast successfully');
});

// ─── Send SMS to Specific Contact ────────────────────────────────────────────

/**
 * POST /emergency/contacts/:contactId/sms
 * Body: { message }
 * Sends an emergency SMS to a specific contact via orchestrator
 */
export const sendEmergencySMS = asyncHandler(async (req, res) => {
  const { contactId } = contactIdParamsSchema.parse(req.params);
  const { studentId } = studentIdParamsSchema.parse(req.params);
  const parsed = emergencySmsSchema.parse(req.body);
  const result = await service.sendEmergencySMS(
    studentId,
    contactId,
    req.user.id,
    req.user.role,
    req.user.schoolId,
    parsed
  );
  ApiResponse.ok(res, result, 'SMS sent successfully');
});