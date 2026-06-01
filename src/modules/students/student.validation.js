// modules/students/student.validation.js
import { z } from 'zod';

// ─── Constants ────────────────────────────────────────────────────────────────

const CLASSES = [
  'Nursery',
  'LKG',
  'UKG',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  '11',
  '12',
];

const SECTIONS = ['A', 'B', 'C', 'D'];

const GENDERS = ['MALE', 'FEMALE', 'OTHER'];

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

const RELATIONSHIPS = ['FATHER', 'MOTHER', 'GUARDIAN', 'GRANDPARENT', 'SIBLING', 'OTHER'];

const STUDENT_STATUSES = [
  'ACTIVE',
  'INACTIVE',
  'GRADUATED',
  'TRANSFERRED',
  'SUSPENDED',
  'WITHDRAWN',
];

// ─── Schemas ──────────────────────────────────────────────────────────────────

/**
 * Create Student Schema
 */
export const createStudentSchema = z.object({
  // Personal Information (Required)
  firstName: z
    .string()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must be less than 50 characters')
    .trim(),

  lastName: z
    .string()
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must be less than 50 characters')
    .trim(),

  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
    .refine((date) => {
      const dob = new Date(date);
      const now = new Date();
      const age = now.getFullYear() - dob.getFullYear();
      return age >= 2 && age <= 25;
    }, 'Student age must be between 2 and 25 years'),

  gender: z.enum(GENDERS, {
    errorMap: () => ({ message: 'Gender must be MALE, FEMALE, or OTHER' }),
  }),

  // Academic Information (Required)
  class: z.enum(CLASSES, {
    errorMap: () => ({ message: 'Invalid class' }),
  }),

  section: z.enum(SECTIONS, {
    errorMap: () => ({ message: 'Section must be A, B, C, or D' }),
  }),

  // Optional Personal Information
  bloodGroup: z.enum(BLOOD_GROUPS).optional(),
  photoUrl: z.string().url('Invalid photo URL').optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z
    .string()
    .regex(/^\+?[\d\s-]{10,15}$/, 'Invalid phone number')
    .optional()
    .or(z.literal('')),
  address: z.string().max(200).optional(),
  city: z.string().max(50).optional(),
  state: z.string().max(50).optional(),
  pincode: z
    .string()
    .regex(/^\d{6}$/, 'Invalid pincode')
    .optional(),

  // Academic Optional
  rollNumber: z.string().max(20).optional(),
  admissionYear: z.number().int().min(2000).max(new Date().getFullYear()).optional(),
  previousSchool: z.string().max(100).optional(),
  transferCertificate: z.boolean().optional(),

  // Medical Quick Info
  allergies: z.array(z.string()).optional(),
  conditions: z.array(z.string()).optional(),
  medications: z.array(z.string()).optional(),

  // Parents (At least one required)
  parents: z
    .array(
      z.object({
        parentId: z.string().optional(), // If existing parent
        firstName: z.string().min(2).max(50).optional(),
        lastName: z.string().min(2).max(50).optional(),
        phone: z
          .string()
          .regex(/^\+?[\d\s-]{10,15}$/, 'Invalid phone number')
          .optional(),
        email: z.string().email().optional().or(z.literal('')),
        relationship: z.enum(RELATIONSHIPS),
        isPrimary: z.boolean().optional().default(false),
        occupation: z.string().optional(),
        address: z.string().optional(),
      })
    )
    .min(1, 'At least one parent is required'),

  // Emergency Contacts
  emergencyContacts: z
    .array(
      z.object({
        name: z.string().min(2).max(100),
        phone: z.string().regex(/^\+?[\d\s-]{10,15}$/, 'Invalid phone number'),
        relation: z.string().max(50),
        isPrimary: z.boolean().optional().default(false),
        priority: z.number().int().min(0).max(10).optional().default(0),
      })
    )
    .optional()
    .default([]),

  // Card Visibility
  cardVisibility: z.enum(['PUBLIC', 'MINIMAL', 'HIDDEN']).optional().default('PUBLIC'),

  // Metadata
  metadata: z.record(z.any()).optional(),
});

/**
 * Update Student Schema (All fields optional)
 */
export const updateStudentSchema = createStudentSchema.partial();

/**
 * Bulk Import Schema
 */
export const bulkImportSchema = z.object({
  students: z
    .array(createStudentSchema)
    .min(1, 'At least one student is required')
    .max(5000, 'Maximum 5000 students per batch'),
});

/**
 * Student Query Schema (For filtering/searching)
 */
export const studentQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(15),
  search: z.string().optional(),
  class: z.enum(CLASSES).optional(),
  section: z.enum(SECTIONS).optional(),
  status: z.enum(STUDENT_STATUSES).optional(),
  gender: z.enum(GENDERS).optional(),
  bloodGroup: z.enum(BLOOD_GROUPS).optional(),
  sortBy: z
    .enum(['firstName', 'lastName', 'class', 'createdAt', 'status'])
    .optional()
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  parentPhone: z.string().optional(),
  admissionYear: z.coerce.number().int().optional(),
});

/**
 * Student ID Param Schema
 */
export const studentIdSchema = z.object({
  studentId: z.string().min(1, 'Student ID is required'),
});

/**
 * Add Parent to Student Schema
 */
export const addParentSchema = z.object({
  parentId: z.string().optional(),
  firstName: z.string().min(2).max(50).optional(),
  lastName: z.string().min(2).max(50).optional(),
  phone: z.string().regex(/^\+?[\d\s-]{10,15}$/, 'Invalid phone number'),
  email: z.string().email().optional(),
  relationship: z.enum(RELATIONSHIPS),
  isPrimary: z.boolean().optional().default(false),
  occupation: z.string().optional(),
});

/**
 * Update Medical Info Schema
 */
export const medicalInfoSchema = z.object({
  bloodGroup: z.enum(BLOOD_GROUPS).optional(),
  allergies: z.array(z.string()).optional(),
  conditions: z.array(z.string()).optional(),
  medications: z.array(z.string()).optional(),
  doctorName: z.string().optional(),
  doctorPhone: z.string().optional(),
  doctorSpecialization: z.string().optional(),
  doctorClinic: z.string().optional(),
  doctorAddress: z.string().optional(),
  hospitalName: z.string().optional(),
  hospitalPhone: z.string().optional(),
  hospitalAddress: z.string().optional(),
  insuranceProvider: z.string().optional(),
  insurancePolicyNumber: z.string().optional(),
  insuranceValidUntil: z.string().optional(),
  notes: z.string().optional(),
  emergencyInstructions: z.string().optional(),
});

/**
 * Document Upload Schema
 */
export const documentSchema = z.object({
  name: z.string().min(2).max(100),
  type: z.enum([
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
  ]),
  file: z.any(), // Will be validated by multer
});

// ─── Exports ──────────────────────────────────────────────────────────────────

export const studentValidation = {
  createStudent: createStudentSchema,
  updateStudent: updateStudentSchema,
  bulkImport: bulkImportSchema,
  queryStudents: studentQuerySchema,
  studentId: studentIdSchema,
  addParent: addParentSchema,
  medicalInfo: medicalInfoSchema,
  document: documentSchema,
};

export default studentValidation;
