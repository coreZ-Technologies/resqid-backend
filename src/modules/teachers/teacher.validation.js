// src/modules/teachers/teacher.validation.js
import { z } from 'zod';

const salutationEnum = z.enum(['Mr.', 'Ms.', 'Mrs.', 'Dr.']);
const genderEnum = z.enum(['Male', 'Female', 'Other']);
const teacherRoleEnum = z.enum(['Teacher', 'Class Teacher']);
const qualificationEnum = z.enum([
  'B.Ed',
  'M.Ed',
  'B.Sc + B.Ed',
  'M.Sc',
  'M.A',
  'B.Tech',
  'M.Tech',
  'B.P.Ed',
  'B.F.A',
  'Other',
]);

export const teacherIdParamsSchema = z.object({
  id: z.string().min(1, 'Invalid ID format'),
});

export const checkEmailQuerySchema = z.object({
  email: z.string().email('Invalid email format'),
});

export const checkPhoneQuerySchema = z.object({
  phone: z.string().min(10, 'Phone must be at least 10 digits').max(15),
});

export const createTeacherSchema = z.object({
  salutation: salutationEnum.optional().default('Mr.'),
  firstName: z.string().min(1, 'First name is required').max(50).trim(),
  lastName: z.string().min(1, 'Last name is required').max(50).trim(),
  email: z
    .string()
    .email('Invalid email format')
    .transform((v) => v.toLowerCase()),
  phone: z.string().min(10, 'Phone must be at least 10 digits').max(15),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  gender: genderEnum.optional(),
  address: z.string().max(500).nullable().optional(),
  subject: z.string().min(1, 'Subject is required').max(100),
  qualification: qualificationEnum,
  experience: z.string().max(200).nullable().optional(),
  joiningDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  assignedClasses: z.array(z.string().min(1)).min(1, 'At least one class is required').max(20),
  employeeId: z.string().max(50).nullable().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  role: teacherRoleEnum.optional().default('Teacher'),
});

export const teacherQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  search: z.string().max(200).optional(),
  subject: z.string().optional(),
  status: z.enum(['Active', 'Inactive', 'All']).optional().default('All'),
  sortBy: z.enum(['Name', 'JoiningDate', 'Subject']).optional().default('Name'),
});

export const updateTeacherSchema = z.object({
  salutation: salutationEnum.optional(),
  firstName: z.string().min(1).max(50).trim().optional(),
  lastName: z.string().min(1).max(50).trim().optional(),
  email: z
    .string()
    .email()
    .transform((v) => v.toLowerCase())
    .optional(),
  phone: z.string().min(10).max(15).optional(),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  gender: genderEnum.optional(),
  address: z.string().max(500).nullable().optional(),
  subject: z.string().min(1).max(100).optional(),
  qualification: qualificationEnum.optional(),
  experience: z.string().max(200).nullable().optional(),
  joiningDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  assignedClasses: z.array(z.string().min(1)).min(1).max(20).optional(),
  employeeId: z.string().max(50).nullable().optional(),
  role: teacherRoleEnum.optional(),
});

export const exportQuerySchema = z.object({
  search: z.string().max(200).optional(),
  subject: z.string().optional(),
  status: z.enum(['Active', 'Inactive', 'All']).optional().default('All'),
});
