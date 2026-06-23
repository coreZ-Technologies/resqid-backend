// =============================================================================
// modules/m2-emergency/emergency.service.js — RESQID
// Profile management ONLY. Scan logic is in scan/ module.
// =============================================================================

import { ApiError } from '#shared/response/ApiError.js';
import * as repo from './emergency.repository.js';
import { prisma } from '#config/prisma.js';
import { logger } from '#config/logger.js';
import { ROLES } from '#shared/constants/roles.js';
import { sendEmergencyNotification, sendEmergencySMS } from './emergency.notification.js';

// ═══════════════════════════════════════════════════════════════════════════════
// 🆕 INCIDENT TYPE / STATUS MAPPING HELPERS (Frontend ↔ Backend)
// ═══════════════════════════════════════════════════════════════════════════════

// Map frontend high-level types → backend granular types
const INCIDENT_TYPE_MAP = {
  // Frontend: 'Medical' → backend granular types
  Medical: [
    'ALLERGIC_REACTION',
    'ASTHMA_ATTACK',
    'BREATHING_DIFFICULTY',
    'DIABETIC_EMERGENCY',
    'ILLNESS',
    'POISONING',
    'SEIZURE',
    'FAINTING',
  ],
  // Frontend: 'Injury' → backend granular types
  Injury: ['INJURY', 'BLEEDING', 'FRACTURE', 'BURN', 'HEAD_INJURY'],
  // Frontend: 'Behavioral' → fallback to OTHER
  Behavioral: [],
  // Frontend: 'Mental Health' → fallback to OTHER
  'Mental Health': [],
  // Frontend: 'Other' → backend OTHER
  Other: ['OTHER', 'ACCIDENT'],
};

// Map frontend high-level → backend granular (for creation)
export const mapFrontendIncidentType = (frontendType) => {
  // If frontend sends granular directly, use it
  const knownGranular = [
    'INJURY',
    'ILLNESS',
    'ALLERGIC_REACTION',
    'ASTHMA_ATTACK',
    'ACCIDENT',
    'SEIZURE',
    'FAINTING',
    'BLEEDING',
    'FRACTURE',
    'BURN',
    'POISONING',
    'HEAD_INJURY',
    'BREATHING_DIFFICULTY',
    'DIABETIC_EMERGENCY',
    'OTHER',
  ];
  if (knownGranular.includes(frontendType)) return frontendType;

  // Otherwise map from high-level categories
  const mapping = {
    Medical: 'ILLNESS',
    Injury: 'INJURY',
    Behavioral: 'OTHER',
    'Mental Health': 'OTHER',
    Other: 'OTHER',
  };
  return mapping[frontendType] || 'OTHER';
};

// Map backend granular → frontend high-level (for display)
export const mapBackendIncidentType = (backendType) => {
  if (
    [
      'ALLERGIC_REACTION',
      'ASTHMA_ATTACK',
      'BREATHING_DIFFICULTY',
      'DIABETIC_EMERGENCY',
      'ILLNESS',
      'POISONING',
      'SEIZURE',
      'FAINTING',
    ].includes(backendType)
  ) {
    return 'Medical';
  }
  if (['INJURY', 'BLEEDING', 'FRACTURE', 'BURN', 'HEAD_INJURY'].includes(backendType)) {
    return 'Injury';
  }
  if (backendType === 'ACCIDENT') return 'Other';
  return 'Other';
};

// Map backend status → frontend status
export const mapBackendIncidentStatus = (backendStatus) => {
  const map = {
    OPEN: 'Open',
    IN_PROGRESS: 'In Progress',
    RESOLVED: 'Resolved',
    CLOSED: 'Closed',
    FOLLOW_UP_NEEDED: 'Follow-up Needed',
  };
  return map[backendStatus] || backendStatus;
};

// ═══════════════════════════════════════════════════════════════════════════════

// ─── Helper: Role-based access verification ──────────────────────────────────

/**
 * Verify if a user can access a student's emergency data.
 * Returns the student object if authorized, throws otherwise.
 */
const verifyStudentAccess = async (studentId, userId, userRole, userSchoolId) => {
  const student = await repo.findStudentById(studentId);
  if (!student) throw ApiError.notFound('Student not found');

  // SUPER_ADMIN: Can access ANY student (platform-wide)
  if (userRole === ROLES.SUPER_ADMIN) {
    return student;
  }

  // SCHOOL_ADMIN & TEACHER: Must belong to the same school
  if (userRole === ROLES.SCHOOL_ADMIN || userRole === ROLES.TEACHER) {
    if (student.schoolId !== userSchoolId) {
      throw ApiError.forbidden('Student does not belong to your school');
    }
    return student;
  }

  // PARENT: Must have an active link to the student
  if (userRole === ROLES.PARENT) {
    const link = await repo.verifyParentAccess(userId, studentId);
    if (!link) {
      throw ApiError.forbidden('Student not linked to your account');
    }
    return student;
  }

  // Any other role (EMERGENCY_RESPONDER, etc.) is not allowed
  throw ApiError.forbidden('Insufficient permissions to access this profile');
};

/**
 * Verify if a user can MODIFY a student's emergency data.
 * Only PARENT and SCHOOL_ADMIN can modify (TEACHER is read-only).
 */
const verifyModifyAccess = async (studentId, userId, userRole, userSchoolId) => {
  const student = await repo.findStudentById(studentId);
  if (!student) throw ApiError.notFound('Student not found');

  // SUPER_ADMIN can modify anything
  if (userRole === ROLES.SUPER_ADMIN) {
    return student;
  }

  // SCHOOL_ADMIN can modify students in their school
  if (userRole === ROLES.SCHOOL_ADMIN) {
    if (student.schoolId !== userSchoolId) {
      throw ApiError.forbidden('Student does not belong to your school');
    }
    return student;
  }

  // PARENT can modify their own children
  if (userRole === ROLES.PARENT) {
    const link = await repo.verifyParentAccess(userId, studentId);
    if (!link) {
      throw ApiError.forbidden('Student not linked to your account');
    }
    return student;
  }

  // TEACHER is read-only — cannot modify
  throw ApiError.forbidden('You do not have permission to modify this profile');
};

// ─── Profile ──────────────────────────────────────────────────────────────────

export const getProfile = async (studentId, userId, userRole, userSchoolId) => {
  // Verify access using the helper
  await verifyStudentAccess(studentId, userId, userRole, userSchoolId);

  const profile = await repo.findProfileByStudent(studentId);
  if (!profile) {
    throw ApiError.notFound('Emergency profile not set up yet');
  }
  return profile;
};

// 🔧 CALLED BY SCAN MODULE — no auth, returns full profile with visibility flags
export const getProfileForScan = async (studentId) => {
  const profile = await repo.findProfileForScan(studentId);
  if (!profile) throw ApiError.notFound('Emergency profile not found');
  return profile;
};

export const updateProfile = async (studentId, userId, userRole, userSchoolId, data) => {
  // Verify MODIFY access (only PARENT, SCHOOL_ADMIN, SUPER_ADMIN)
  await verifyModifyAccess(studentId, userId, userRole, userSchoolId);

  const student = await repo.findStudentById(studentId);
  if (!student) throw ApiError.notFound('Student not found');

  const { contacts, ...profileData } = data;
  await repo.upsertProfile(studentId, student.schoolId, profileData);
  if (contacts !== undefined) await repo.replaceContacts(studentId, contacts);

  logger.info({ studentId, userId, role: userRole }, 'Emergency profile updated');
  return { success: true };
};

// ─── Contacts ─────────────────────────────────────────────────────────────────

export const getContacts = async (studentId, userId, userRole, userSchoolId) => {
  // Verify access (read-only)
  await verifyStudentAccess(studentId, userId, userRole, userSchoolId);
  return repo.findContactsByStudent(studentId);
};

export const addContact = async (studentId, userId, userRole, userSchoolId, data) => {
  // Verify MODIFY access
  await verifyModifyAccess(studentId, userId, userRole, userSchoolId);

  const profile = await repo.findProfileByStudent(studentId);
  if (!profile) throw ApiError.notFound('Profile not set up. Please create a profile first.');

  return repo.createContact(profile.id, data);
};

export const updateContact = async (contactId, userId, userRole, userSchoolId, data) => {
  const contact = await repo.findContactById(contactId);
  if (!contact) throw ApiError.notFound('Contact not found');

  // Get the studentId from the profile
  const profile = await prisma.emergencyProfile.findUnique({
    where: { id: contact.profileId },
    select: { studentId: true },
  });
  if (!profile) throw ApiError.notFound('Associated profile not found');

  // Verify MODIFY access using the studentId
  await verifyModifyAccess(profile.studentId, userId, userRole, userSchoolId);

  return repo.updateContact(contactId, data);
};

export const deleteContact = async (contactId, userId, userRole, userSchoolId) => {
  const contact = await repo.findContactById(contactId);
  if (!contact) throw ApiError.notFound('Contact not found');

  const profile = await prisma.emergencyProfile.findUnique({
    where: { id: contact.profileId },
    select: { studentId: true },
  });
  if (!profile) throw ApiError.notFound('Associated profile not found');

  // Verify MODIFY access using the studentId
  await verifyModifyAccess(profile.studentId, userId, userRole, userSchoolId);

  await repo.deleteContact(contactId);
  return { success: true };
};

// ─── Incidents ────────────────────────────────────────────────────────────────

// 🔧 CALLED BY SCAN MODULE when QR is scanned (public, limited data)
export const logIncident = async (data, userId, ip) => {
  const student = await repo.findStudentById(data.studentId);
  if (!student) throw ApiError.notFound('Student not found');

  // ✅ Map frontend type → backend type
  const backendType = mapFrontendIncidentType(data.type);

  const incident = await repo.createIncident({
    studentId: data.studentId,
    schoolId: student.schoolId,
    type: backendType,
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

export const getIncidents = async (studentId, userId, userRole, userSchoolId, query = {}) => {
  // Verify read access
  await verifyStudentAccess(studentId, userId, userRole, userSchoolId);

  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 20;
  const [data, total] = await Promise.all([
    repo.findIncidentsByStudent(studentId, { page, limit }),
    repo.countIncidentsByStudent(studentId),
  ]);
  return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
};

export const getIncident = async (incidentId, userId, userRole, userSchoolId) => {
  const incident = await repo.findIncidentById(incidentId);
  if (!incident) throw ApiError.notFound('Incident not found');

  // Verify the user has access to the student linked to this incident
  await verifyStudentAccess(incident.studentId, userId, userRole, userSchoolId);

  return incident;
};

export const resolveIncident = async (incidentId, userId, userRole, userSchoolId, data) => {
  const incident = await repo.findIncidentById(incidentId);
  if (!incident) throw ApiError.notFound('Incident not found');

  // Only SCHOOL_ADMIN, SUPER_ADMIN, or the TEACHER who reported it can resolve
  // For simplicity, we check if they have access to the student AND are not a parent.
  if (userRole === ROLES.PARENT) {
    throw ApiError.forbidden('Parents cannot resolve incidents');
  }

  await verifyStudentAccess(incident.studentId, userId, userRole, userSchoolId);

  if (incident.status === 'RESOLVED' || incident.status === 'CLOSED') {
    throw ApiError.badRequest('This incident is already resolved');
  }

  return repo.updateIncident(incidentId, {
    status: data.status || 'RESOLVED',
    resolvedAt: new Date(),
    handledById: userId,
    actionTaken: data.actionTaken || null,
    resolution: data.resolution || null,
  });
};

// ─── Access Logs ──────────────────────────────────────────────────────────────

export const getAccessLogs = async (studentId, userId, userRole, userSchoolId, query = {}) => {
  // Only SCHOOL_ADMIN and SUPER_ADMIN can view access logs (sensitive)
  if (userRole !== ROLES.SCHOOL_ADMIN && userRole !== ROLES.SUPER_ADMIN) {
    throw ApiError.forbidden('Only administrators can view access logs');
  }

  // Verify they have access to the student
  await verifyStudentAccess(studentId, userId, userRole, userSchoolId);

  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 20;
  const [data, total] = await Promise.all([
    repo.findAccessLogsByStudent(studentId, { page, limit }),
    repo.countAccessLogsByStudent(studentId),
  ]);
  return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
};

// ─── Drills ───────────────────────────────────────────────────────────────────

export const logDrill = async (schoolId, userId, userRole, data) => {
  // Only SCHOOL_ADMIN and SUPER_ADMIN can create drills
  if (userRole !== ROLES.SCHOOL_ADMIN && userRole !== ROLES.SUPER_ADMIN) {
    throw ApiError.forbidden('Only administrators can log drills');
  }

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

export const getDrills = async (schoolId, userRole, querySchoolId = null) => {
  // SUPER_ADMIN can pass ?schoolId=xxx to view any school's drills
  let targetSchoolId = schoolId;
  if (userRole === ROLES.SUPER_ADMIN && querySchoolId) {
    targetSchoolId = querySchoolId;
  }
  return repo.findDrillsBySchool(targetSchoolId);
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🆕 NEW FUNCTIONS FOR FRONTEND PRD
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Student List (with Emergency Profiles) ──────────────────────────────────

export const listStudentsWithEmergencyProfiles = async (schoolId, userRole, query = {}) => {
  const { page = 1, limit = 20, search = '', class: classFilter, risk = 'all' } = query;
  const skip = (page - 1) * limit;

  // Build where clause for students
  const where = {
    schoolId,
    isActive: true,
    ...(classFilter && { grade: classFilter }),
    ...(search && {
      OR: [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { studentId: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  // Fetch students with their emergency profiles
  const [students, total] = await Promise.all([
    prisma.student.findMany({
      where,
      skip,
      take: limit,
      include: {
        emergencyProfile: {
          include: {
            contacts: {
              where: { isActive: true },
              orderBy: { priority: 'asc' },
            },
          },
        },
      },
      orderBy: { firstName: 'asc' },
    }),
    prisma.student.count({ where }),
  ]);

  // Transform and compute additional fields
  const data = await Promise.all(
    students.map(async (student) => {
      const profile = student.emergencyProfile;

      // Get last scan time
      const lastScan = await prisma.emergencyAccessLog.findFirst({
        where: { studentId: student.id },
        orderBy: { accessedAt: 'desc' },
        select: { accessedAt: true },
      });

      // Compute high risk (based on critical conditions)
      const criticalConditions = ['EPILEPSY', 'DIABETES', 'SEVERE_ASTHMA', 'ANAPHYLAXIS'];
      const hasHighRisk =
        profile?.conditions?.some((c) =>
          criticalConditions.some((keyword) => c.toUpperCase().includes(keyword))
        ) ?? false;

      // Filter risk if requested
      if (risk === 'high' && !hasHighRisk) return null;
      if (risk === 'low' && hasHighRisk) return null;

      // Extract parents (FATHER, MOTHER, GUARDIAN) from contacts
      const parents = (profile?.contacts || [])
        .filter((c) => ['FATHER', 'MOTHER', 'GUARDIAN'].includes(c.relation))
        .map((c) => ({
          relation: c.relation,
          name: c.name,
          phone: c.phone,
          alternatePhone: c.alternatePhone || null,
          isReachable: c.isReachable ?? true,
        }));

      // Emergency contacts (all other relations)
      const emergencyContacts = (profile?.contacts || [])
        .filter((c) => !['FATHER', 'MOTHER', 'GUARDIAN'].includes(c.relation))
        .map((c) => ({
          relation: c.relation,
          name: c.name,
          phone: c.phone,
        }));

      return {
        id: student.id,
        studentId: student.studentId || student.id,
        name: `${student.firstName} ${student.lastName}`,
        class: `${student.grade || ''}${student.section ? ` ${student.section}` : ''}`,
        rollNo: student.rollNumber || '',
        dob: student.dateOfBirth,
        bloodGroup: profile?.bloodGroup || 'UNKNOWN',
        photo: student.photoUrl,
        medicalConditions: profile?.conditions || [],
        allergies: profile?.allergies || [],
        medications: profile?.medications || [],
        doctorName: profile?.doctorName,
        doctorPhone: profile?.doctorPhone,
        parents,
        emergencyContacts,
        address: student.address || profile?.hospitalAddress || null,
        insuranceNo: profile?.insurancePolicyNumber || null,
        notes: profile?.medicalNotes || null,
        hasHighRisk,
        lastScanned: lastScan?.accessedAt || null,
      };
    })
  );

  // Filter out nulls from risk filtering
  const filteredData = data.filter((item) => item !== null);

  return {
    data: filteredData,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

// ─── Global Incidents (School-wide) ──────────────────────────────────────────

export const getSchoolIncidents = async (schoolId, userRole, query = {}) => {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 20;

  const [data, total] = await Promise.all([
    repo.findIncidentsBySchool(schoolId, {
      page,
      limit,
      type: query.type,
      severity: query.severity,
      status: query.status,
    }),
    repo.countIncidentsBySchool(schoolId, {
      type: query.type,
      severity: query.severity,
      status: query.status,
    }),
  ]);

  // Transform for frontend (map types and statuses)
  const transformed = data.map((incident) => ({
    id: incident.id,
    studentName: `${incident.student.firstName} ${incident.student.lastName}`,
    studentId: incident.student.id,
    class: `${incident.student.grade || ''}${incident.student.section ? ` ${incident.student.section}` : ''}`,
    type: mapBackendIncidentType(incident.type),
    severity: incident.severity,
    time: incident.occurredAt,
    status: mapBackendIncidentStatus(incident.status),
    description: incident.description,
    reportedBy: incident.reportedBy?.name || null,
    handledBy: incident.handledBy?.name || null,
  }));

  return {
    data: transformed,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

// ─── Broadcast Emergency Alert ──────────────────────────────────────────────

export const broadcastEmergencyAlert = async (
  studentId,
  userId,
  userRole,
  userSchoolId,
  data = {}
) => {
  // Verify access to the student
  await verifyStudentAccess(studentId, userId, userRole, userSchoolId);

  const profile = await repo.findProfileForScan(studentId);
  if (!profile) throw ApiError.notFound('Emergency profile not found');

  const contacts = profile.contacts.filter((c) => c.isActive);
  if (!contacts.length) {
    throw ApiError.badRequest('No active contacts found for this student');
  }

  // Build the alert message
  const message =
    data.message ||
    `🚨 EMERGENCY ALERT: ${profile.student.firstName} ${profile.student.lastName} (${profile.student.grade}) requires immediate attention. Please check your phone.`;

  // Trigger notifications via orchestrator
  const notificationPromises = contacts.map((contact) =>
    sendEmergencyNotification({
      contact,
      studentName: `${profile.student.firstName} ${profile.student.lastName}`,
      message,
      schoolId: userSchoolId,
    })
  );

  await Promise.allSettled(notificationPromises);

  // Log the alert
  await repo.logAccess({
    studentId,
    schoolId: userSchoolId,
    accessedById: userId,
    method: 'EMERGENCY_ALERT',
    reason: 'Broadcast emergency alert',
    accessedAt: new Date(),
  });

  logger.info(
    { studentId, userId, contactsCount: contacts.length },
    'Emergency alert broadcast'
  );

  return {
    success: true,
    contactsNotified: contacts.length,
    message,
  };
};

// ─── Send SMS to Specific Contact ────────────────────────────────────────────

export const sendEmergencySMS = async (
  studentId,
  contactId,
  userId,
  userRole,
  userSchoolId,
  data = {}
) => {
  // Verify access to the student
  await verifyStudentAccess(studentId, userId, userRole, userSchoolId);

  // Fetch the contact
  const contact = await prisma.emergencyContact.findFirst({
    where: { id: contactId, profile: { studentId } },
  });
  if (!contact) throw ApiError.notFound('Contact not found');

  const profile = await repo.findProfileForScan(studentId);
  if (!profile) throw ApiError.notFound('Emergency profile not found');

  const message =
    data.message ||
    `🚨 EMERGENCY: ${profile.student.firstName} ${profile.student.lastName} needs your attention. Please contact the school immediately.`;

  // Send SMS via orchestrator
  await sendEmergencySMS({
    phone: contact.phone,
    message,
    contactName: contact.name,
  });

  // Log the communication (optional - you might want a communication log table)
  logger.info(
    { studentId, contactId, contactName: contact.name },
    'Emergency SMS sent to contact'
  );

  return {
    success: true,
    contact: contact.name,
    phone: contact.phone,
    message,
  };
};

// ─── Dashboard Statistics ─────────────────────────────────────────────────────

export const getDashboardStats = async (schoolId, userRole) => {
  // Total students with emergency profiles
  const totalStudents = await prisma.student.count({
    where: { schoolId, isActive: true },
  });

  // High risk students (via emergency profile conditions)
  // We use a raw query or filter in code. For simplicity, we count profiles with critical conditions.
  // We'll fetch all profiles and count manually (or use a more efficient approach).
  const profiles = await prisma.emergencyProfile.findMany({
    where: { schoolId },
    select: { conditions: true },
  });
  const criticalKeywords = ['EPILEPSY', 'DIABETES', 'SEVERE_ASTHMA', 'ANAPHYLAXIS'];
  const highRiskStudents = profiles.filter((p) =>
    p.conditions.some((c) => criticalKeywords.some((kw) => c.toUpperCase().includes(kw)))
  ).length;

  // Incidents today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const incidentsToday = await prisma.emergencyIncident.count({
    where: {
      schoolId,
      occurredAt: { gte: today },
    },
  });

  // Resolved incidents (count)
  const resolvedIncidents = await prisma.emergencyIncident.count({
    where: {
      schoolId,
      status: { in: ['RESOLVED', 'CLOSED'] },
    },
  });

  // Open incidents
  const openIncidents = await prisma.emergencyIncident.count({
    where: {
      schoolId,
      status: { in: ['OPEN', 'IN_PROGRESS', 'FOLLOW_UP_NEEDED'] },
    },
  });

  return {
    totalStudents,
    highRiskStudents,
    incidentsToday,
    resolvedIncidents,
    openIncidents,
    systemStatus: 'ACTIVE',
  };
};