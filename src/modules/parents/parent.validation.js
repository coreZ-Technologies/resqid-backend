// src/modules/parents/parent.validation.js
import { z } from 'zod';

// ─── Reusable helpers ─────────────────────────────────────────────────────
const phoneRegex = /^\+?[1-9]\d{1,14}$/; // E.164 format
const relationEnum = ['father', 'mother', 'guardian', 'grandparent', 'other'];
const channelEnum = ['App', 'SMS', 'Email'];
const engagementEnum = ['all', 'high', 'medium', 'low'];
const dateRangeEnum = ['all', 'this_month', 'last_month', 'this_year', 'last_quarter'];
const sortByEnum = ['name', 'joinedDate', 'engagement', 'notifications'];
const exportFormatEnum = ['csv', 'xlsx', 'pdf', 'json'];
const exportFieldsEnum = [
  'name', 'email', 'phone', 'location', 'children',
  'attendance', 'engagement', 'joined', 'notifs', 'rfid'
];

// ─── Create parent (matches frontend form) ───────────────────────────────
export const createParentSchema = z.object({
  firstName: z.string().min(1).max(50).transform(s => s.trim()),
  lastName: z.string().min(1).max(50).transform(s => s.trim()),
  email: z.string().email().transform(s => s.toLowerCase().trim()),
  phone: z.string().regex(phoneRegex, 'Invalid phone number'),
  relation: z.enum(relationEnum),
  address: z.string().max(200).optional().transform(s => s?.trim()),
  password: z.string().min(8),
  confirmPassword: z.string().min(8),
  notifyAttendance: z.boolean().default(true),
  notifyAbsent: z.boolean().default(true),
  notifyLate: z.boolean().default(false),
  notifyEmergency: z.boolean().default(true),
  weeklyReport: z.boolean().default(false),
  notifChannel: z.enum(channelEnum).default('App'),
  childIds: z.array(z.string()).default([]),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

// ─── Update parent (all fields optional) ──────────────────────────────────
export const updateParentSchema = z.object({
  firstName: z.string().min(1).max(50).optional().transform(s => s?.trim()),
  lastName: z.string().min(1).max(50).optional().transform(s => s?.trim()),
  email: z.string().email().optional().transform(s => s?.toLowerCase().trim()),
  phone: z.string().regex(phoneRegex).optional(),
  relation: z.enum(relationEnum).optional(),
  address: z.string().max(200).optional().transform(s => s?.trim()),
  notifyAttendance: z.boolean().optional(),
  notifyAbsent: z.boolean().optional(),
  notifyLate: z.boolean().optional(),
  notifyEmergency: z.boolean().optional(),
  weeklyReport: z.boolean().optional(),
  notifChannel: z.enum(channelEnum).optional(),
  childIds: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be updated',
});

// ─── List query params (filters, pagination, sorting) ────────────────────
export const listParentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional().transform(s => s?.trim()),
  engagement: z.enum(engagementEnum).default('all'),
  dateRange: z.enum(dateRangeEnum).default('all'),
  sortBy: z.enum(sortByEnum).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

// ─── Export query params (matches exportpage.jsx) ─────────────────────────
export const exportParentsQuerySchema = z.object({
  format: z.enum(exportFormatEnum).default('csv'),
  dateRange: z.enum(dateRangeEnum).default('all'),
  engagement: z.enum(engagementEnum).default('all'),
  fields: z.array(z.enum(exportFieldsEnum)).default([]),
  emailDelivery: z.coerce.boolean().default(false),
});

// ─── Stats endpoint (no params) ──────────────────────────────────────────
export const statsQuerySchema = z.object({}).optional();