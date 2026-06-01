// TODO: Add implementation
// =============================================================================
// notification.validation.js — RESQID School Admin
//
// Zod schemas for all notification endpoints.
// Covers: list/filter, mark-read, bulk-read, delete, preferences CRUD.
// =============================================================================

import { z } from 'zod';

// ─── Shared primitives ────────────────────────────────────────────────────────

const notificationId = z.string().cuid({ message: 'Invalid notification ID' });

// Allowed event types scoped to school-admin safety/emergency surface
export const NOTIFICATION_TYPES = [
  'EMERGENCY_ALERT_TRIGGERED',
  'EMERGENCY_ALERT_ESCALATED',
  'ANOMALY_DETECTED',
  'STUDENT_QR_SCANNED',
  'STUDENT_CARD_EXPIRING',
  'PARENT_CARD_LOCKED',
  'PARENT_CARD_REPLACE_REQUESTED',
  'PARENT_CARD_RENEWAL_REQUESTED',
] ;

export const NOTIFICATION_SEVERITY = ['INFO', 'WARNING', 'CRITICAL'];

// ─── List / Filter ────────────────────────────────────────────────────────────

export const listNotificationsSchema = z.object({
  query: z.object({
    page:     z.coerce.number().int().min(1).default(1),
    limit:    z.coerce.number().int().min(1).max(100).default(20),
    isRead:   z.enum(['true', 'false']).optional().transform((v) => (v === undefined ? undefined : v === 'true')),
    type:     z.enum(NOTIFICATION_TYPES).optional(),
    severity: z.enum(NOTIFICATION_SEVERITY).optional(),
    // ISO date range
    from:     z.string().datetime({ offset: true }).optional(),
    to:       z.string().datetime({ offset: true }).optional(),
  }),
});

// ─── Get single ───────────────────────────────────────────────────────────────

export const getNotificationSchema = z.object({
  params: z.object({
    notificationId,
  }),
});

// ─── Mark single read / unread ────────────────────────────────────────────────

export const markReadSchema = z.object({
  params: z.object({
    notificationId,
  }),
  body: z.object({
    isRead: z.boolean({ required_error: 'isRead is required' }),
  }),
});

// ─── Bulk mark read ───────────────────────────────────────────────────────────

export const bulkMarkReadSchema = z.object({
  body: z.object({
    // Either explicit IDs, or markAll flag (marks entire school's notifications)
    ids:     z.array(notificationId).min(1).max(200).optional(),
    markAll: z.boolean().optional(),
  }).refine(
    (data) => data.ids?.length || data.markAll === true,
    { message: 'Provide either ids[] or markAll: true' }
  ),
});

// ─── Delete single ────────────────────────────────────────────────────────────

export const deleteNotificationSchema = z.object({
  params: z.object({
    notificationId,
  }),
});

// ─── Bulk delete ──────────────────────────────────────────────────────────────

export const bulkDeleteSchema = z.object({
  body: z.object({
    ids:       z.array(notificationId).min(1).max(200).optional(),
    deleteAll: z.boolean().optional(),
    // Optional filter: delete all read ones
    onlyRead:  z.boolean().optional(),
  }).refine(
    (data) => data.ids?.length || data.deleteAll === true,
    { message: 'Provide either ids[] or deleteAll: true' }
  ),
});

// ─── Unread count ─────────────────────────────────────────────────────────────
// No body/params — schoolId comes from tenantScope

// ─── Preferences ─────────────────────────────────────────────────────────────

// Per-event preference entry
const preferenceEntrySchema = z.object({
  type:        z.enum(NOTIFICATION_TYPES),
  inApp:       z.boolean(),
  email:       z.boolean(),
  // Future channels
  sms:         z.boolean().default(false),
  pushEnabled: z.boolean().default(true),
});

export const upsertPreferencesSchema = z.object({
  body: z.object({
    preferences: z
      .array(preferenceEntrySchema)
      .min(1, 'At least one preference entry required')
      .max(NOTIFICATION_TYPES.length, `Max ${NOTIFICATION_TYPES.length} entries`),
  }),
});