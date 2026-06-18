// src/modules/users/user.validation.js
import { z } from 'zod';

const cuid = z.string().min(1, 'Invalid ID format');
const roleEnum = z.enum(['SCHOOL_ADMIN', 'TEACHER']);

// ─── Params ────────────────────────────────────────────────────────────────
export const userIdParamsSchema = z.object({
  id: cuid,
});

// ─── Create User ───────────────────────────────────────────────────────────
export const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email format').toLowerCase(),
  phone: z.string().min(10, 'Phone must be at least 10 digits').max(15).optional().nullable(),
  role: roleEnum.default('TEACHER'),
  isActive: z.boolean().optional().default(true),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

// ─── Update User ───────────────────────────────────────────────────────────
export const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().toLowerCase().optional(),
  phone: z.string().min(10).max(15).optional().nullable(),
  role: roleEnum.optional(),
  isActive: z.boolean().optional(),
});

// ─── Change Password ───────────────────────────────────────────────────────
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

// ─── Reset Password (admin initiated) ──────────────────────────────────────
export const resetPasswordSchema = z.object({
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

// ─── List Query ────────────────────────────────────────────────────────────
export const userListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(200).optional(),
  role: roleEnum.optional(),
  status: z.enum(['Active', 'Inactive', 'All']).default('All'),
  sortBy: z.enum(['name', 'email', 'role', 'createdAt']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

// ─── Export Query ──────────────────────────────────────────────────────────
export const exportQuerySchema = z.object({
  search: z.string().max(200).optional(),
  role: roleEnum.optional(),
  status: z.enum(['Active', 'Inactive', 'All']).default('All'),
});