// =============================================================================
// modules/parents/parent.validation.js — RESQID
// =============================================================================

import { z } from 'zod';

const cuid = z.string().min(1, 'Invalid ID format');
const phoneRegex = /^[6-9]\d{9}$/;

// ─── Create Parent ───────────────────────────────────────────────────────────

export const createParentSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  phone: z.string().regex(phoneRegex, 'Invalid Indian phone number'),
  email: z.string().email().max(254).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  pincode: z.string().max(10).optional().nullable(),
  occupation: z.string().max(200).optional().nullable(),
  photoUrl: z.string().url().optional().nullable(),
  canCall: z.boolean().default(true),
  canWhatsapp: z.boolean().default(true),
  canEmail: z.boolean().default(true),
  canSMS: z.boolean().default(true),
  childIds: z.array(z.string()).optional().default([]), // Student IDs to link
});

// ─── Update Parent (School Admin) ────────────────────────────────────────────

export const updateParentSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  email: z.string().email().max(254).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  pincode: z.string().max(10).optional().nullable(),
  occupation: z.string().max(200).optional().nullable(),
  canCall: z.boolean().optional(),
  canWhatsapp: z.boolean().optional(),
  canEmail: z.boolean().optional(),
  canSMS: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

// ─── Update Own Profile (Parent self) ────────────────────────────────────────

export const updateOwnProfileSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  email: z.string().email().max(254).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  pincode: z.string().max(10).optional().nullable(),
  occupation: z.string().max(200).optional().nullable(),
  photoUrl: z.string().url().optional().nullable(),
  canCall: z.boolean().optional(),
  canWhatsapp: z.boolean().optional(),
  canEmail: z.boolean().optional(),
  canSMS: z.boolean().optional(),
});

// ─── List Query ───────────────────────────────────────────────────────────────

export const parentListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  sortBy: z.enum(['name', 'phone', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ─── Params ───────────────────────────────────────────────────────────────────

export const parentIdParamsSchema = z.object({ id: cuid });

// ─── Export Query ─────────────────────────────────────────────────────────────

export const parentExportQuerySchema = z.object({
  grade: z.string().optional(),
  section: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  format: z.enum(['csv', 'xlsx']).default('csv'),
});
