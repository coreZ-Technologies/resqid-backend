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
} from './emergency.validation.js';
import { ApiResponse } from '#shared/response/ApiResponse.js';
import { asyncHandler } from '#shared/response/asyncHandler.js';

// ─── Profile ──────────────────────────────────────────────────────────────────

export const getProfile = asyncHandler(async (req, res) => {
  const { studentId } = studentIdParamsSchema.parse(req.params);
  const profile = await service.getProfile(studentId, req.user.id);
  ApiResponse.ok(res, profile);
});

export const updateProfile = asyncHandler(async (req, res) => {
  const { studentId } = studentIdParamsSchema.parse(req.params);
  const parsed = emergencyProfileSchema.parse(req.body);
  const result = await service.updateProfile(studentId, req.user.id, parsed);
  ApiResponse.ok(res, result, 'Emergency profile updated');
});

// ─── Contacts ─────────────────────────────────────────────────────────────────

export const getContacts = asyncHandler(async (req, res) => {
  const { studentId } = studentIdParamsSchema.parse(req.params);
  const contacts = await service.getContacts(studentId, req.user.id);
  ApiResponse.ok(res, contacts);
});

export const addContact = asyncHandler(async (req, res) => {
  const { studentId } = studentIdParamsSchema.parse(req.params);
  const parsed = emergencyContactSchema.parse(req.body);
  const contact = await service.addContact(studentId, req.user.id, parsed);
  ApiResponse.created(res, contact, 'Contact added');
});

export const updateContact = asyncHandler(async (req, res) => {
  const { contactId } = contactIdParamsSchema.parse(req.params);
  const parsed = emergencyContactSchema.parse(req.body);
  const contact = await service.updateContact(contactId, req.user.id, parsed);
  ApiResponse.ok(res, contact, 'Contact updated');
});

export const deleteContact = asyncHandler(async (req, res) => {
  const { contactId } = contactIdParamsSchema.parse(req.params);
  await service.deleteContact(contactId, req.user.id);
  ApiResponse.ok(res, null, 'Contact removed');
});

// ─── Incidents ────────────────────────────────────────────────────────────────

export const getIncidents = asyncHandler(async (req, res) => {
  const { studentId } = studentIdParamsSchema.parse(req.params);
  const query = emergencyQuerySchema.parse(req.query);
  const incidents = await service.getIncidents(studentId, req.user.id, query);
  ApiResponse.ok(res, incidents.data, null, incidents.meta);
});

export const logIncident = asyncHandler(async (req, res) => {
  const parsed = emergencyIncidentSchema.parse(req.body);
  const incident = await service.logIncident(parsed, req.user?.id, req.ip);
  ApiResponse.created(res, incident, 'Incident logged');
});

export const getIncident = asyncHandler(async (req, res) => {
  const { incidentId } = incidentIdParamsSchema.parse(req.params);
  const incident = await service.getIncident(incidentId, req.user.id);
  ApiResponse.ok(res, incident);
});

export const resolveIncident = asyncHandler(async (req, res) => {
  const { incidentId } = incidentIdParamsSchema.parse(req.params);
  const parsed = resolveIncidentSchema.parse(req.body);
  const incident = await service.resolveIncident(incidentId, req.user.id, parsed);
  ApiResponse.ok(res, incident, 'Incident resolved');
});

// ─── Access Logs ──────────────────────────────────────────────────────────────

export const getAccessLogs = asyncHandler(async (req, res) => {
  const { studentId } = studentIdParamsSchema.parse(req.params);
  const query = emergencyQuerySchema.parse(req.query);
  const logs = await service.getAccessLogs(studentId, req.user.id, query);
  ApiResponse.ok(res, logs.data, null, logs.meta);
});

// ─── Drills ───────────────────────────────────────────────────────────────────

export const logDrill = asyncHandler(async (req, res) => {
  const parsed = emergencyDrillSchema.parse(req.body);
  const drill = await service.logDrill(req.schoolId, req.user.id, parsed);
  ApiResponse.created(res, drill, 'Drill logged');
});

export const getDrills = asyncHandler(async (req, res) => {
  const drills = await service.getDrills(req.schoolId);
  ApiResponse.ok(res, drills);
});
