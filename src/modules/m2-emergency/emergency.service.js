// =============================================================================
// modules/m2-emergency/emergency.service.js — RESQID
// Profile management ONLY. Scan logic is in scan/ module.
// =============================================================================

import { ApiError } from '#shared/response/ApiError.js';
import * as repo from './emergency.repository.js';
import { prisma } from '#config/prisma.js';
import { logger } from '#config/logger.js';

// ─── Profile (Parent Only) ────────────────────────────────────────────────────

export const getProfile = async (studentId, parentId) => {
  const link = await repo.verifyParentAccess(parentId, studentId);
  if (!link) throw ApiError.forbidden('Student not linked to your account');

  const profile = await repo.findProfileByStudent(studentId);
  if (!profile) throw ApiError.notFound('Emergency profile not set up yet');
  return profile;
};

// 🔧 CALLED BY SCAN MODULE — no auth, returns full profile with visibility flags
export const getProfileForScan = async (studentId) => {
  const profile = await repo.findProfileForScan(studentId);
  if (!profile) throw ApiError.notFound('Emergency profile not found');
  return profile;
};

export const updateProfile = async (studentId, parentId, data) => {
  const link = await repo.verifyParentAccess(parentId, studentId);
  if (!link) throw ApiError.forbidden('Student not linked to your account');

  const student = await repo.findStudentById(studentId);
  if (!student) throw ApiError.studentNotFound();

  const { contacts, ...profileData } = data;
  await repo.upsertProfile(studentId, student.schoolId, profileData);
  if (contacts !== undefined) await repo.replaceContacts(studentId, contacts);

  logger.info({ studentId, parentId }, 'Emergency profile updated');
  return { success: true };
};

// ─── Contacts ─────────────────────────────────────────────────────────────────

export const getContacts = async (studentId, userId) => {
  return repo.findContactsByStudent(studentId);
};

export const addContact = async (studentId, parentId, data) => {
  const link = await repo.verifyParentAccess(parentId, studentId);
  if (!link) throw ApiError.forbidden('Student not linked');

  const profile = await repo.findProfileByStudent(studentId);
  if (!profile) throw ApiError.notFound('Profile not set up');

  return repo.createContact(profile.id, data);
};

export const updateContact = async (contactId, parentId, data) => {
  const contact = await repo.findContactById(contactId);
  if (!contact) throw ApiError.notFound('Contact not found');

  const profile = await prisma.emergencyProfile.findUnique({
    where: { id: contact.profileId },
    select: { studentId: true },
  });
  const link = await repo.verifyParentAccess(parentId, profile.studentId);
  if (!link) throw ApiError.forbidden('Not authorized');

  return repo.updateContact(contactId, data);
};

export const deleteContact = async (contactId, parentId) => {
  const contact = await repo.findContactById(contactId);
  if (!contact) throw ApiError.notFound('Contact not found');

  const profile = await prisma.emergencyProfile.findUnique({
    where: { id: contact.profileId },
    select: { studentId: true },
  });
  const link = await repo.verifyParentAccess(parentId, profile.studentId);
  if (!link) throw ApiError.forbidden('Not authorized');

  await repo.deleteContact(contactId);
  return { success: true };
};

// ─── Incidents ────────────────────────────────────────────────────────────────

// 🔧 CALLED BY SCAN MODULE when QR is scanned
export const logIncident = async (data, userId, ip) => {
  const student = await repo.findStudentById(data.studentId);
  if (!student) throw ApiError.studentNotFound();

  const incident = await repo.createIncident({
    studentId: data.studentId,
    schoolId: student.schoolId,
    type: data.type || 'OTHER',
    severity: data.severity || 'MEDIUM',
    description: data.description || 'QR code scanned',
    location: data.location || null,
    occurredAt: data.occurredAt ? new Date(data.occurredAt) : new Date(),
    reportedById: userId || null,
    status: 'OPEN',
  });

  // Also log access
  await repo.logAccess({
    studentId: data.studentId,
    schoolId: student.schoolId,
    accessedById: userId || null,
    method: data.method || 'QR_SCAN',
    ipAddress: ip || null,
    reason: 'Emergency scan',
    accessedAt: new Date(),
  });

  logger.info({ studentId: data.studentId, incidentId: incident.id }, 'Incident logged');
  return incident;
};

export const getIncidents = async (studentId, userId, query = {}) => {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 20;
  const [data, total] = await Promise.all([
    repo.findIncidentsByStudent(studentId, { page, limit }),
    repo.countIncidentsByStudent(studentId),
  ]);
  return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
};

export const getIncident = async (incidentId, userId) => {
  const incident = await repo.findIncidentById(incidentId);
  if (!incident) throw ApiError.notFound('Incident not found');
  return incident;
};

export const resolveIncident = async (incidentId, userId, data) => {
  const incident = await repo.findIncidentById(incidentId);
  if (!incident) throw ApiError.notFound('Incident not found');
  if (incident.status === 'RESOLVED' || incident.status === 'CLOSED')
    throw ApiError.badRequest('Already resolved');

  return repo.updateIncident(incidentId, {
    status: data.status || 'RESOLVED',
    resolvedAt: new Date(),
    handledById: userId,
    actionTaken: data.actionTaken || null,
    resolution: data.resolution || null,
  });
};

// ─── Access Logs ──────────────────────────────────────────────────────────────

export const getAccessLogs = async (studentId, userId, query = {}) => {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 20;
  const [data, total] = await Promise.all([
    repo.findAccessLogsByStudent(studentId, { page, limit }),
    repo.countAccessLogsByStudent(studentId),
  ]);
  return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
};

// ─── Drills ───────────────────────────────────────────────────────────────────

export const logDrill = async (schoolId, userId, data) => {
  return repo.createDrill({
    schoolId,
    type: data.type || 'FIRE',
    description: data.description || null,
    scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : null,
    conductedAt: data.conductedAt ? new Date(data.conductedAt) : new Date(),
    totalStudents: data.totalStudents || 0,
    totalStaff: data.totalStaff || 0,
    evacuationTime: data.evacuationTime || null,
    successRate: data.successRate || null,
    conductedById: userId,
    observations: data.observations || null,
    improvements: data.improvements || null,
    status: data.status || 'CONDUCTED',
  });
};

export const getDrills = async (schoolId) => repo.findDrillsBySchool(schoolId);
