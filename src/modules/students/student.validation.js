// src/modules/m6-students/student.validation.js
import { z } from 'zod';

// Enums matching Prisma
const GenderEnum = z.enum(['MALE', 'FEMALE', 'OTHER']);
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