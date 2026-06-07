// =============================================================================
// modules/students/student.validation.js — RESQID
// =============================================================================

import { z } from 'zod';

const cuid = z.string().min(1, 'Invalid ID format');

// ─── Enums ────────────────────────────────────────────────────────────────────

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
const genderEnum = z.enum(['MALE', 'FEMALE', 'OTHER']);
const statusEnum = z.enum(['ACTIVE', 'INACTIVE', 'GRADUATED', 'TRANSFERRED', 'SUSPENDED']);
const visibilityEnum = z.enum(['PUBLIC', 'MINIMAL', 'HIDDEN']);
const relationshipEnum = z.enum([
  'FATHER',
  'MOTHER',
  'GUARDIAN',
  'GRANDPARENT',
  'SIBLING',
  'OTHER',
]);

// ─── Parent Contact ───────────────────────────────────────────────────────────

const parentSchema = z.object({
  name: z.string().min(1).max(200),
  relationship: relationshipEnum.default('GUARDIAN'),
  phone: z.string().min(10).max(20),
  email: z.string().email().max(254).optional().nullable(),
  occupation: z.string().max(200).optional().nullable(),
  isPrimary: z.boolean().default(false),
  canCall: z.boolean().default(true),
  canWhatsapp: z.boolean().default(true),
});

// ─── Emergency Contact ────────────────────────────────────────────────────────

const emergencyContactSchema = z.object({
  name: z.string().min(1).max(200),
  relationship: z.string().max(50).optional(),
  phone: z.string().min(10).max(20),
  priority: z.number().int().min(1).max(10).default(1),
});

// ─── Medical Info ─────────────────────────────────────────────────────────────

const medicalInfoSchema = z.object({
  allergies: z.array(z.string().max(200)).max(20).optional().default([]),
  conditions: z.array(z.string().max(200)).max(20).optional().default([]),
  medications: z.array(z.string().max(200)).max(20).optional().default([]),
  doctorName: z.string().max(200).optional().nullable(),
  doctorSpecialization: z.string().max(200).optional().nullable(),
  doctorPhone: z.string().max(20).optional().nullable(),
  doctorClinic: z.string().max(500).optional().nullable(),
  doctorAddress: z.string().max(500).optional().nullable(),
  hospitalName: z.string().max(200).optional().nullable(),
  hospitalPhone: z.string().max(20).optional().nullable(),
  hospitalAddress: z.string().max(500).optional().nullable(),
  insuranceProvider: z.string().max(200).optional().nullable(),
  insurancePolicyNumber: z.string().max(100).optional().nullable(),
  insuranceValidUntil: z.string().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  lastCheckup: z.string().optional().nullable(),
  emergencyInstructions: z.string().max(2000).optional().nullable(),
});

// ─── Create Student ───────────────────────────────────────────────────────────

export const createStudentSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  gender: genderEnum.optional(),
  dateOfBirth: z.string().optional(),
  bloodGroup: bloodGroupEnum.optional(),
  grade: z.string().min(1, 'Class is required').max(10),
  section: z.string().min(1, 'Section is required').max(5),
  rollNumber: z.string().max(50).optional(),
  email: z.string().email().max(254).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  pincode: z.string().max(10).optional().nullable(),
  status: statusEnum.optional().default('ACTIVE'),
  emergencyVisibility: visibilityEnum.optional().default('PUBLIC'),
  rfidTagNumber: z.string().max(100).optional(),
  classGroupId: z.string().optional(),
  parents: z
    .array(parentSchema)
    .min(1, 'At least one parent is required')
    .max(4)
    .optional()
    .default([]),
  emergencyContacts: z.array(emergencyContactSchema).max(10).optional().default([]),
  medicalInfo: medicalInfoSchema.optional().default({}),
  previousSchool: z.string().max(200).optional().nullable(),
});

// ─── Update Student ───────────────────────────────────────────────────────────

export const updateStudentSchema = createStudentSchema.partial();

// ─── Bulk Create ──────────────────────────────────────────────────────────────

export const bulkCreateStudentSchema = z.object({
  students: z.array(createStudentSchema).min(1).max(500),
});

// ─── List Query ───────────────────────────────────────────────────────────────

export const studentListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  grade: z.string().optional(),
  section: z.string().optional(),
  status: statusEnum.optional(),
  sortBy: z
    .enum(['firstName', 'lastName', 'grade', 'createdAt', 'rollNumber'])
    .default('firstName'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

// ─── Params ───────────────────────────────────────────────────────────────────

export const studentIdParamsSchema = z.object({ id: cuid });
