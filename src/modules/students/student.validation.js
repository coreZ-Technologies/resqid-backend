<<<<<<< HEAD
<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> a989dfa23342d0ba3fdc249932bb5a39fd301af6
// src/modules/m6-students/student.validation.js
import { z } from 'zod';

// Enums matching Prisma
const GenderEnum = z.enum(['MALE', 'FEMALE', 'OTHER']);
<<<<<<< HEAD
const BloodGroupEnum = z.enum([
=======
=======
const BloodGroupEnum = z.enum(['A_POSITIVE', 'A_NEGATIVE', 'B_POSITIVE', 'B_NEGATIVE', 'O_POSITIVE', 'O_NEGATIVE', 'AB_POSITIVE', 'AB_NEGATIVE', 'UNKNOWN']);
const StudentStatusEnum = z.enum(['ACTIVE', 'INACTIVE', 'GRADUATED', 'TRANSFERRED', 'SUSPENDED']);
const VisibilityLevelEnum = z.enum(['PUBLIC', 'MINIMAL', 'HIDDEN']);
const DocumentTypeEnum = z.enum(['BIRTH_CERTIFICATE', 'TRANSFER_CERTIFICATE', 'MEDICAL_REPORT', 'IMMUNIZATION_RECORD', 'ID_PROOF', 'PASSPORT', 'AADHAR_CARD', 'PARENT_ID', 'PHOTO', 'OTHER']);

// ─── Create Student ──────────────────────────────────────────────
export const createStudentSchema = z.object({
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  dateOfBirth: z.string().date().optional(),
  gender: GenderEnum.optional(),
  bloodGroup: BloodGroupEnum.optional(),
  grade: z.string().optional(),
  section: z.string().optional(),
  rollNumber: z.string().optional(),
  studentId: z.string().optional(),
  allergies: z.array(z.string()).optional(),
  conditions: z.array(z.string()).optional(),
  medications: z.array(z.string()).optional(),
  medicalNotes: z.string().optional(),
  transportRoute: z.string().optional(),
  transportStop: z.string().optional(),
  rfidTagNumber: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  // Parent linking
  parentIds: z.array(z.string()).optional(),
  // Emergency visibility
  cardVisibility: z.object({
    visibility: VisibilityLevelEnum.default('PUBLIC'),
    showName: z.boolean().default(true),
    showBloodGroup: z.boolean().default(true),
    showAllergies: z.boolean().default(false),
    showConditions: z.boolean().default(false),
    showMedications: z.boolean().default(false),
    showEmergencyContacts: z.boolean().default(true),
    showParentInfo: z.boolean().default(false),
    showTransportInfo: z.boolean().default(false),
    showPhoto: z.boolean().default(true),
    showGrade: z.boolean().default(true),
  }).optional(),
});

// ─── Update Student ──────────────────────────────────────────────
export const updateStudentSchema = createStudentSchema.partial();

// ─── List Students Query ─────────────────────────────────────────
export const listStudentsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(15),
  search: z.string().optional(),
  class: z.string().optional(),
  section: z.string().optional(),
  status: StudentStatusEnum.optional(),
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
});

// ─── Link Parents ────────────────────────────────────────────────
export const linkParentsSchema = z.object({
  parentIds: z.array(z.string()).min(1),
});

// ─── Unlink Parent ───────────────────────────────────────────────
export const unlinkParentSchema = z.object({
  parentId: z.string().min(1),
});

// ─── Update Emergency Visibility ─────────────────────────────────
export const updateEmergencyVisibilitySchema = z.object({
  visibility: VisibilityLevelEnum,
});

// ─── Send Message to Parents ────────────────────────────────────
export const sendMessageSchema = z.object({
  subject: z.string().max(200).optional(),
  body: z.string().min(1).max(5000),
  type: z.enum(['GENERAL', 'EMERGENCY', 'ATTENDANCE', 'ANNOUNCEMENT']).default('GENERAL'),
});

// ─── Export Query ────────────────────────────────────────────────
export const exportStudentsQuerySchema = z.object({
  format: z.enum(['csv', 'json']).default('csv'),
  class: z.string().optional(),
  section: z.string().optional(),
  status: StudentStatusEnum.optional(),
  fields: z.array(z.string()).optional(),
  emailDelivery: z.boolean().default(false),
});

// ─── Bulk Upload (multipart) ─────────────────────────────────────
export const bulkUploadSchema = z.object({
  file: z.any(), // Will be validated in service
});
=======
=======
>>>>>>> fc2f457f3fe5f95777ea9ced16e959883f9d995e
>>>>>>> a989dfa23342d0ba3fdc249932bb5a39fd301af6
// =============================================================================
// modules/students/student.validation.js — RESQID
// =============================================================================

import { z } from 'zod';

const cuid = z.string().min(1, 'Invalid ID format');

// ─── Enums (matching Prisma) ─────────────────────────────────────────────────

const bloodGroupEnum = z.enum([
>>>>>>> c52277545acdf32472792738285dea3300df0ace
  'A_POSITIVE',
  'A_NEGATIVE',
  'B_POSITIVE',
  'B_NEGATIVE',
<<<<<<< HEAD
  'O_POSITIVE',
  'O_NEGATIVE',
  'AB_POSITIVE',
  'AB_NEGATIVE',
  'UNKNOWN',
]);
const StudentStatusEnum = z.enum(['ACTIVE', 'INACTIVE', 'GRADUATED', 'TRANSFERRED', 'SUSPENDED']);
const VisibilityLevelEnum = z.enum(['PUBLIC', 'MINIMAL', 'HIDDEN']);
const DocumentTypeEnum = z.enum([
=======
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

const documentTypeEnum = z.enum([
>>>>>>> c52277545acdf32472792738285dea3300df0ace
  'BIRTH_CERTIFICATE',
  'TRANSFER_CERTIFICATE',
  'MEDICAL_REPORT',
  'IMMUNIZATION_RECORD',
  'ID_PROOF',
  'PASSPORT',
  'AADHAR_CARD',
  'PARENT_ID',
  'PHOTO',
  'OTHER',
]);

<<<<<<< HEAD
// ─── Create Student ──────────────────────────────────────────────
export const createStudentSchema = z.object({
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  dateOfBirth: z.string().date().optional(),
  gender: GenderEnum.optional(),
  bloodGroup: BloodGroupEnum.optional(),
  grade: z.string().optional(),
  section: z.string().optional(),
  rollNumber: z.string().optional(),
  studentId: z.string().optional(),
  allergies: z.array(z.string()).optional(),
  conditions: z.array(z.string()).optional(),
  medications: z.array(z.string()).optional(),
  medicalNotes: z.string().optional(),
  transportRoute: z.string().optional(),
  transportStop: z.string().optional(),
  rfidTagNumber: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  // Parent linking
  parentIds: z.array(z.string()).optional(),
  // Emergency visibility
  cardVisibility: z
    .object({
      visibility: VisibilityLevelEnum.default('PUBLIC'),
      showName: z.boolean().default(true),
      showBloodGroup: z.boolean().default(true),
      showAllergies: z.boolean().default(false),
      showConditions: z.boolean().default(false),
      showMedications: z.boolean().default(false),
      showEmergencyContacts: z.boolean().default(true),
      showParentInfo: z.boolean().default(false),
      showTransportInfo: z.boolean().default(false),
      showPhoto: z.boolean().default(true),
      showGrade: z.boolean().default(true),
    })
    .optional(),
});

// ─── Update Student ──────────────────────────────────────────────
export const updateStudentSchema = createStudentSchema.partial();

// ─── List Students Query ─────────────────────────────────────────
export const listStudentsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(15),
  search: z.string().optional(),
  class: z.string().optional(),
  section: z.string().optional(),
  status: StudentStatusEnum.optional(),
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
});

// ─── Link Parents ────────────────────────────────────────────────
=======
// ─── Parent Contact (for create/update) ──────────────────────────────────────

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

// ─── Emergency Contact ───────────────────────────────────────────────────────

const emergencyContactSchema = z.object({
  name: z.string().min(1).max(200),
  relationship: z.string().max(50).optional(),
  phone: z.string().min(10).max(20),
  priority: z.number().int().min(1).max(10).default(1),
});

// ─── Medical Info ────────────────────────────────────────────────────────────

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

// ─── Card Visibility (granular controls) ─────────────────────────────────────

const cardVisibilitySchema = z.object({
  visibility: visibilityEnum.default('PUBLIC'),
  showName: z.boolean().default(true),
  showBloodGroup: z.boolean().default(true),
  showAllergies: z.boolean().default(false),
  showConditions: z.boolean().default(false),
  showMedications: z.boolean().default(false),
  showEmergencyContacts: z.boolean().default(true),
  showParentInfo: z.boolean().default(false),
  showTransportInfo: z.boolean().default(false),
  showPhoto: z.boolean().default(true),
  showGrade: z.boolean().default(true),
}).optional();

// ─── Create Student Schema ───────────────────────────────────────────────────

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
  parents: z.array(parentSchema).min(1).max(4).optional().default([]),
  emergencyContacts: z.array(emergencyContactSchema).max(10).optional().default([]),
  medicalInfo: medicalInfoSchema.optional().default({}),
  previousSchool: z.string().max(200).optional().nullable(),
  cardVisibility: cardVisibilitySchema,
  metadata: z.record(z.any()).optional(),
  // Backward compatibility: parentIds array (for simple linking)
  parentIds: z.array(z.string()).optional(),
});

// ─── Update Student Schema ───────────────────────────────────────────────────

export const updateStudentSchema = createStudentSchema.partial();

// ─── Bulk Create Schema ─────────────────────────────────────────────────────

export const bulkCreateStudentSchema = z.object({
  students: z.array(createStudentSchema).min(1).max(500),
});

// ─── List Query Schema ──────────────────────────────────────────────────────

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

// Legacy alias for routes that use `listStudentsQuerySchema` (old name)
export const listStudentsQuerySchema = studentListQuerySchema;

<<<<<<< HEAD
export const studentIdParamsSchema = z.object({ id: cuid });
>>>>>>> 2306bae69da370bc7bfb048c15cfd0f99e474bff
=======
// ─── Link Parents Schema ────────────────────────────────────────────────────

>>>>>>> c52277545acdf32472792738285dea3300df0ace
export const linkParentsSchema = z.object({
  parentIds: z.array(z.string()).min(1),
});

<<<<<<< HEAD
// ─── Unlink Parent ───────────────────────────────────────────────
=======
// ─── Unlink Parent Schema ───────────────────────────────────────────────────

>>>>>>> c52277545acdf32472792738285dea3300df0ace
export const unlinkParentSchema = z.object({
  parentId: z.string().min(1),
});

<<<<<<< HEAD
// ─── Update Emergency Visibility ─────────────────────────────────
export const updateEmergencyVisibilitySchema = z.object({
  visibility: VisibilityLevelEnum,
});

// ─── Send Message to Parents ────────────────────────────────────
=======
// ─── Update Emergency Visibility Schema ─────────────────────────────────────

export const updateEmergencyVisibilitySchema = z.object({
  visibility: visibilityEnum,
});

// ─── Send Message Schema ────────────────────────────────────────────────────

>>>>>>> c52277545acdf32472792738285dea3300df0ace
export const sendMessageSchema = z.object({
  subject: z.string().max(200).optional(),
  body: z.string().min(1).max(5000),
  type: z.enum(['GENERAL', 'EMERGENCY', 'ATTENDANCE', 'ANNOUNCEMENT']).default('GENERAL'),
});

<<<<<<< HEAD
// ─── Export Query ────────────────────────────────────────────────
=======
// ─── Export Query Schema ────────────────────────────────────────────────────

>>>>>>> c52277545acdf32472792738285dea3300df0ace
export const exportStudentsQuerySchema = z.object({
  format: z.enum(['csv', 'json']).default('csv'),
  class: z.string().optional(),
  section: z.string().optional(),
<<<<<<< HEAD
  status: StudentStatusEnum.optional(),
=======
  status: statusEnum.optional(),
>>>>>>> c52277545acdf32472792738285dea3300df0ace
  fields: z.array(z.string()).optional(),
  emailDelivery: z.boolean().default(false),
});

<<<<<<< HEAD
// ─── Bulk Upload (multipart) ─────────────────────────────────────
export const bulkUploadSchema = z.object({
  file: z.any(), // Will be validated in service
});
=======
// ─── Bulk Upload (multipart) ────────────────────────────────────────────────

export const bulkUploadSchema = z.object({
  file: z.any(), // validated in service
});

// ─── Params Schema ──────────────────────────────────────────────────────────

export const studentIdParamsSchema = z.object({
  id: cuid,
});
<<<<<<< HEAD
>>>>>>> c52277545acdf32472792738285dea3300df0ace
=======
>>>>>>> fc2f457f3fe5f95777ea9ced16e959883f9d995e
>>>>>>> a989dfa23342d0ba3fdc249932bb5a39fd301af6
