// =============================================================================
// modules/parents/parent.validation.js — RESQID
// Zod schemas for parent module endpoints.
// =============================================================================

import { z } from 'zod';

const cuid = z.string().min(1, 'Invalid ID format');
const phoneRegex = /^[6-9]\d{9}$/;

// ─── Profile ──────────────────────────────────────────────────────────────────

export const parentProfileSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100).transform(v => v.trim()),
    email: z.string().email().toLowerCase().optional(),
  }),
});

// ─── Card Visibility ──────────────────────────────────────────────────────────

export const updateVisibilitySchema = z.object({
  params: z.object({ studentId: cuid }),
  body: z.object({
    visibility: z.enum(['PUBLIC', 'MINIMAL', 'HIDDEN']),
  }),
});

// ─── Notification Preferences ─────────────────────────────────────────────────

export const updateNotificationsSchema = z.object({
  body: z.object({
    pushEnabled: z.boolean().optional(),
    smsEnabled: z.boolean().optional(),
    emailEnabled: z.boolean().optional(),
    onScan: z.boolean().optional(),
    onAttendance: z.boolean().optional(),
    onEmergency: z.boolean().optional(),
    onAnnouncement: z.boolean().optional(),
  }),
});

// ─── Lock Card ────────────────────────────────────────────────────────────────

export const lockCardSchema = z.object({
  params: z.object({ studentId: cuid }),
  body: z.object({
    confirmation: z.literal('LOCK'),
  }),
});

// ─── Device Token ─────────────────────────────────────────────────────────────

export const registerDeviceTokenSchema = z.object({
  body: z.object({
    token: z.string().min(10, 'Token is required'),
    platform: z.enum(['IOS', 'ANDROID', 'WEB']),
    deviceName: z.string().max(100).optional(),
    deviceModel: z.string().max(100).optional(),
    osVersion: z.string().max(50).optional(),
  }),
});

// ─── Link Card (Add Child) ───────────────────────────────────────────────────

export const linkCardSchema = z.object({
  body: z.object({
    cardNumber: z.string().trim().min(5).max(20)
      .transform(v => v.toUpperCase().replace(/[^A-Z0-9-]/g, '')),
  }),
});

// ─── Set Active Student ──────────────────────────────────────────────────────

export const setActiveStudentSchema = z.object({
  body: z.object({
    studentId: cuid,
  }),
});

// ─── Scan History ────────────────────────────────────────────────────────────

export const scanHistorySchema = z.object({
  params: z.object({ studentId: cuid }),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    filter: z.enum(['all', 'emergency', 'success']).default('all'),
  }),
});

// ─── Photo Upload ────────────────────────────────────────────────────────────

export const generateUploadUrlSchema = z.object({
  body: z.object({
    contentType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
    fileSize: z.number().int().positive().max(5 * 1024 * 1024, 'Max 5MB'),
  }),
});

export const confirmUploadSchema = z.object({
  body: z.object({
    key: z.string().min(10),
    nonce: z.string().min(10),
  }),
});