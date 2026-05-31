// TODO: Add implementation
// =============================================================================
// students.validation.js — RESQID
// Zod schemas for student CRUD operations
// =============================================================================

import { z } from 'zod';

// ─── Reusable Field Schemas ───────────────────────────────────────────────────

const studentName = z
  .string()
  .trim()
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name must not exceed 100 characters');

const rollNumber = z
  .string()
  .trim()
  .min(1, 'Roll number is required')
  .max(20, 'Roll number must not exceed 20 characters')
  .regex(/^[a-zA-Z0-9\-_]+$/, 'Roll number must be alphanumeric');

const classSection = z
  .string()
  .trim()
  .min(1, 'Class is required')
  .max(20, 'Class must not exceed 20 characters');

const bloodGroup = z
  .enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])
  .optional()
  .nullable();

const indianPhone = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number')
  .optional()
  .nullable();

// ─── Create Student ───────────────────────────────────────────────────────────

export const createStudentSchema = z.object({
  // Identity
  name: studentName,
  rollNumber,
  class: classSection,
  section: z.string().trim().max(10).optional().nullable(),
  dateOfBirth: z
    .string()
    .date('Invalid date format. Use YYYY-MM-DD')
    .optional()
    .nullable(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional().nullable(),
  photoUrl: z.string().url('Invalid photo URL').optional().nullable(),

  // Emergency Info
  bloodGroup,
  medicalInfo: z.string().trim().max(1000, 'Medical info must not exceed 1000 characters').optional().nullable(),
  allergies: z.array(z.string().trim().max(100)).max(20).optional().default([]),

  // Parent linkage (optional at creation — can be linked later)
  parentId: z.string().cuid('Invalid parent ID').optional().nullable(),

  // Address
  address: z
    .object({
      line1: z.string().trim().max(200).optional(),
      line2: z.string().trim().max(200).optional(),
      city: z.string().trim().max(100).optional(),
      state: z.string().trim().max(100).optional(),
      pincode: z
        .string()
        .regex(/^\d{6}$/, 'Pincode must be 6 digits')
        .optional(),
    })
    .optional()
    .nullable(),
});

// ─── Update Student ───────────────────────────────────────────────────────────

export const updateStudentSchema = z
  .object({
    name: studentName.optional(),
    rollNumber: rollNumber.optional(),
    class: classSection.optional(),
    section: z.string().trim().max(10).optional().nullable(),
    dateOfBirth: z.string().date('Invalid date format. Use YYYY-MM-DD').optional().nullable(),
    gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional().nullable(),
    photoUrl: z.string().url('Invalid photo URL').optional().nullable(),
    bloodGroup,
    medicalInfo: z.string().trim().max(1000).optional().nullable(),
    allergies: z.array(z.string().trim().max(100)).max(20).optional(),
    parentId: z.string().cuid('Invalid parent ID').optional().nullable(),
    address: z
      .object({
        line1: z.string().trim().max(200).optional(),
        line2: z.string().trim().max(200).optional(),
        city: z.string().trim().max(100).optional(),
        state: z.string().trim().max(100).optional(),
        pincode: z.string().regex(/^\d{6}$/, 'Pincode must be 6 digits').optional(),
      })
      .optional()
      .nullable(),
    isActive: z.boolean().optional(),
  })
  .strict();

// ─── List / Filter Students ───────────────────────────────────────────────────

export const listStudentsSchema = z.object({
  // Pagination
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),

  // Search
  search: z.string().trim().max(100).optional(),

  // Filters
  class: z.string().trim().max(20).optional(),
  section: z.string().trim().max(10).optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  bloodGroup: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).optional(),
  isActive: z
    .string()
    .optional()
    .transform((v) => {
      if (v === 'true') return true;
      if (v === 'false') return false;
      return undefined;
    }),
  hasParent: z
    .string()
    .optional()
    .transform((v) => {
      if (v === 'true') return true;
      if (v === 'false') return false;
      return undefined;
    }),
  hasCard: z
    .string()
    .optional()
    .transform((v) => {
      if (v === 'true') return true;
      if (v === 'false') return false;
      return undefined;
    }),

  // Sort
  sortBy: z
    .enum(['name', 'rollNumber', 'class', 'createdAt', 'updatedAt'])
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ─── Student ID Param ─────────────────────────────────────────────────────────

export const studentIdParamSchema = z.object({
  studentId: z.string().cuid('Invalid student ID'),
});

// ─── Bulk Import ──────────────────────────────────────────────────────────────

const bulkStudentRow = z.object({
  name: studentName,
  rollNumber,
  class: classSection,
  section: z.string().trim().max(10).optional(),
  dateOfBirth: z.string().date().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  bloodGroup,
  medicalInfo: z.string().trim().max(1000).optional(),
});

export const bulkImportSchema = z.object({
  students: z
    .array(bulkStudentRow)
    .min(1, 'At least one student is required')
    .max(500, 'Cannot import more than 500 students at once'),
  skipDuplicates: z.boolean().default(true),
});

// ─── Link Parent ──────────────────────────────────────────────────────────────

export const linkParentSchema = z.object({
  parentId: z.string().cuid('Invalid parent ID'),
});

// ─── Transfer Student ─────────────────────────────────────────────────────────

export const transferStudentSchema = z.object({
  class: classSection.optional(),
  section: z.string().trim().max(10).optional().nullable(),
  rollNumber: rollNumber.optional(),
  reason: z.string().trim().max(500).optional(),
});