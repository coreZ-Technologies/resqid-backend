// =============================================================================
// modules/m2-emergency/emergency.validation.js — RESQID
// =============================================================================

import { z } from 'zod';

const cuid = z.string().min(1, 'Invalid ID format');

const bloodGroupEnum = z.enum([
  'A_POSITIVE',
  'A_NEGATIVE',
  'B_POSITIVE',
  'B_NEGATIVE',
  'AB_POSITIVE',
  'AB_NEGATIVE',
  'O_POSITIVE',
  'O_NEGATIVE',
  'UNKNOWN',
]);

const severityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
const incidentTypeEnum = z.enum([
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
]);
const incidentStatusEnum = z.enum([
  'OPEN',
  'IN_PROGRESS',
  'RESOLVED',
  'CLOSED',
  'FOLLOW_UP_NEEDED',
]);
const drillTypeEnum = z.enum(['FIRE', 'EARTHQUAKE', 'LOCKDOWN', 'MEDICAL', 'EVACUATION', 'OTHER']);
const drillStatusEnum = z.enum(['SCHEDULED', 'IN_PROGRESS', 'CONDUCTED', 'COMPLETED', 'CANCELLED']);
const contactRelationEnum = z.enum([
  'FATHER',
  'MOTHER',
  'GUARDIAN',
  'GRANDPARENT',
  'SIBLING',
  'RELATIVE',
  'FAMILY_DOCTOR',
  'NEIGHBOR',
  'OTHER',
]);

// ─── Params ───────────────────────────────────────────────────────────────────

export const studentIdParamsSchema = z.object({ studentId: cuid });
export const contactIdParamsSchema = z.object({ contactId: cuid });
export const incidentIdParamsSchema = z.object({ incidentId: cuid });

// ─── Emergency Profile ────────────────────────────────────────────────────────

export const emergencyProfileSchema = z.object({
  bloodGroup: bloodGroupEnum.optional(),
  allergies: z.array(z.string().max(200)).max(20).optional(),
  conditions: z.array(z.string().max(200)).max(20).optional(),
  medications: z.array(z.string().max(200)).max(20).optional(),
  medicalNotes: z.string().max(2000).nullable().optional(),
  doctorName: z.string().max(200).nullable().optional(),
  doctorPhone: z.string().max(20).nullable().optional(),
  doctorSpecialization: z.string().max(200).nullable().optional(),
  doctorClinic: z.string().max(500).nullable().optional(),
  hospitalName: z.string().max(200).nullable().optional(),
  hospitalPhone: z.string().max(20).nullable().optional(),
  hospitalAddress: z.string().max(500).nullable().optional(),
  insuranceProvider: z.string().max(200).nullable().optional(),
  insurancePolicyNumber: z.string().max(100).nullable().optional(),
  insuranceValidUntil: z.string().datetime().nullable().optional(),
  emergencyInstructions: z.string().max(2000).nullable().optional(),
  specialNeeds: z.string().max(1000).nullable().optional(),
  showBloodGroup: z.boolean().optional(),
  showAllergies: z.boolean().optional(),
  showMedications: z.boolean().optional(),
  showConditions: z.boolean().optional(),
  showContacts: z.boolean().optional(),
  showDoctorInfo: z.boolean().optional(),
  showInstructions: z.boolean().optional(),
  showInsurance: z.boolean().optional(),
  showSpecialNeeds: z.boolean().optional(),
  isComplete: z.boolean().optional(),
  contacts: z
    .array(
      z.object({
        name: z.string().min(1).max(200),
        phone: z.string().min(10).max(20),
        alternatePhone: z.string().max(20).nullable().optional(),
        email: z.string().email().nullable().optional(),
        relation: contactRelationEnum.optional(),
        priority: z.number().int().min(0).max(10).default(0),
        isPrimary: z.boolean().optional().default(false),
        isLegalGuardian: z.boolean().optional().default(false),
        callEnabled: z.boolean().optional().default(true),
        whatsappEnabled: z.boolean().optional().default(false),
        smsEnabled: z.boolean().optional().default(true),
        available24x7: z.boolean().optional().default(false),
        canPickup: z.boolean().optional().default(false),
        notes: z.string().max(500).nullable().optional(),
      })
    )
    .max(10)
    .optional(),
});

// ─── Emergency Contact (Individual) ───────────────────────────────────────────

export const emergencyContactSchema = z.object({
  name: z.string().min(1).max(200),
  phone: z.string().min(10).max(20),
  alternatePhone: z.string().max(20).nullable().optional(),
  email: z.string().email().nullable().optional(),
  relation: contactRelationEnum.optional(),
  priority: z.number().int().min(0).max(10).default(0),
  isPrimary: z.boolean().optional().default(false),
  isLegalGuardian: z.boolean().optional().default(false),
  callEnabled: z.boolean().optional().default(true),
  whatsappEnabled: z.boolean().optional().default(false),
  smsEnabled: z.boolean().optional().default(true),
  available24x7: z.boolean().optional().default(false),
  canPickup: z.boolean().optional().default(false),
  notes: z.string().max(500).nullable().optional(),
});

// ─── Emergency Incident ───────────────────────────────────────────────────────

export const emergencyIncidentSchema = z.object({
  studentId: cuid,
  type: incidentTypeEnum.optional().default('OTHER'),
  severity: severityEnum.optional().default('MEDIUM'),
  description: z.string().min(1).max(1000),
  location: z.string().max(500).nullable().optional(),
  occurredAt: z.string().datetime().nullable().optional(),
  actionTaken: z.string().max(1000).nullable().optional(),
  medicationGiven: z.string().max(500).nullable().optional(),
  ambulanceCalled: z.boolean().optional().default(false),
  hospitalName: z.string().max(200).nullable().optional(),
  method: z.enum(['QR_SCAN', 'APP', 'DASHBOARD', 'API']).optional().default('QR_SCAN'),
});

export const resolveIncidentSchema = z.object({
  status: incidentStatusEnum.optional().default('RESOLVED'),
  actionTaken: z.string().max(1000).nullable().optional(),
  resolution: z.string().max(1000).nullable().optional(),
});

// ─── Emergency Drill ──────────────────────────────────────────────────────────

export const emergencyDrillSchema = z.object({
  type: drillTypeEnum.optional().default('FIRE'),
  description: z.string().max(1000).nullable().optional(),
  scheduledFor: z.string().datetime().nullable().optional(),
  conductedAt: z.string().datetime().nullable().optional(),
  totalStudents: z.number().int().min(0).optional().default(0),
  totalStaff: z.number().int().min(0).optional().default(0),
  evacuationTime: z.number().int().min(0).nullable().optional(),
  successRate: z.number().min(0).max(100).nullable().optional(),
  observations: z.string().max(1000).nullable().optional(),
  improvements: z.string().max(1000).nullable().optional(),
  status: drillStatusEnum.optional().default('CONDUCTED'),
});

// ─── Query ────────────────────────────────────────────────────────────────────

export const emergencyQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  type: incidentTypeEnum.optional(),
  severity: severityEnum.optional(),
  status: incidentStatusEnum.optional(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// 🆕 NEW SCHEMAS FOR EMERGENCY MODULE (Added for Frontend PRD Alignment)
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Student List Query (for GET /emergency/students) ──────────────────────

export const studentListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  search: z.string().optional().default(''),
  class: z.string().optional(),
  risk: z.enum(['high', 'low', 'all']).optional().default('all'),
});

// ─── Emergency Alert Broadcast (for POST /emergency/alert) ──────────────────

export const emergencyAlertSchema = z.object({
  studentId: cuid.optional(), // Optional: if alerting multiple students, use contacts array
  message: z.string().max(500).optional(),
  contacts: z.array(cuid).optional(), // Specific contact IDs to alert (if not all)
});

// ─── Emergency SMS (for POST /emergency/contacts/:contactId/sms) ────────────

export const emergencySmsSchema = z.object({
  message: z.string().min(1).max(500),
});

// ─── Dashboard Stats Query (for GET /emergency/dashboard/stats) ────────────

export const dashboardStatsQuerySchema = z.object({
  // No required params — just scoped to school
});