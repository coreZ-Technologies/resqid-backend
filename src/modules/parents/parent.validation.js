// =============================================================================
// parent.validation.js — RESQID
//
// Validation schemas for the Parent module.
// Covers: profile update, student linking, notification preferences,
//         device management, session management, card visibility.
//
// Used by: validate.middleware.js → parent.routes.js
// =============================================================================

import Joi from 'joi';

// ─── Reusable Field Schemas ───────────────────────────────────────────────────

const phoneSchema = Joi.string()
  .pattern(/^\+?[1-9]\d{7,14}$/)
  .messages({
    'string.pattern.base': 'Phone number must be a valid international format (e.g. +919876543210)',
  });

const paginationSchema = {
  page:  Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
};

// =============================================================================
// PROFILE
// =============================================================================

/**
 * GET /parents/me — no body needed
 */
export const getProfileSchema = Joi.object({});

/**
 * PATCH /parents/me
 */
export const updateProfileSchema = Joi.object({
  name:  Joi.string().min(2).max(100).trim().optional(),
  email: Joi.string().email().lowercase().trim().optional(),
  phone: phoneSchema.optional(),
}).min(1).messages({
  'object.min': 'At least one field must be provided to update',
});

/**
 * DELETE /parents/me — account self-deletion
 */
export const deleteAccountSchema = Joi.object({
  confirmPhrase: Joi.string()
    .valid('DELETE MY ACCOUNT')
    .required()
    .messages({
      'any.only': 'You must type "DELETE MY ACCOUNT" to confirm',
    }),
});

// =============================================================================
// CHILDREN (ParentStudent links)
// =============================================================================

/**
 * GET /parents/me/children — list linked children
 */
export const listChildrenSchema = Joi.object({
  ...paginationSchema,
});

/**
 * POST /parents/me/children — link a child via invite/token
 */
export const linkChildSchema = Joi.object({
  linkToken: Joi.string().trim().required().messages({
    'any.required': 'A link token is required to connect a student',
  }),
  relation: Joi.string()
    .valid('PARENT', 'GUARDIAN', 'GRANDPARENT', 'SIBLING', 'OTHER')
    .default('PARENT'),
  isPrimary: Joi.boolean().default(false),
});

/**
 * PATCH /parents/me/children/:studentId — update relation metadata
 */
export const updateChildLinkSchema = Joi.object({
  relation: Joi.string()
    .valid('PARENT', 'GUARDIAN', 'GRANDPARENT', 'SIBLING', 'OTHER')
    .optional(),
  isPrimary: Joi.boolean().optional(),
}).min(1);

/**
 * DELETE /parents/me/children/:studentId — unlink a child
 */
export const unlinkChildSchema = Joi.object({
  studentId: Joi.string().required(),
}).options({ allowUnknown: true }); // params schema

// =============================================================================
// CARD VISIBILITY
// =============================================================================

/**
 * PATCH /parents/me/children/:studentId/visibility
 * Controls what emergency responders see when they scan the child's QR
 */
export const updateCardVisibilitySchema = Joi.object({
  visibility: Joi.string()
    .valid('PUBLIC', 'MINIMAL', 'HIDDEN')
    .required()
    .messages({
      'any.only': 'Visibility must be PUBLIC, MINIMAL, or HIDDEN',
      'any.required': 'Visibility level is required',
    }),
});

// =============================================================================
// NOTIFICATION PREFERENCES
// =============================================================================

/**
 * PATCH /parents/me/notification-preferences
 */
export const updateNotificationPreferencesSchema = Joi.object({
  scanAlerts:           Joi.boolean().optional(),
  attendanceAlerts:     Joi.boolean().optional(),
  emergencyAlerts:      Joi.boolean().optional(),
  communicationAlerts:  Joi.boolean().optional(),
  channels: Joi.object({
    push:  Joi.boolean().optional(),
    sms:   Joi.boolean().optional(),
    email: Joi.boolean().optional(),
    inApp: Joi.boolean().optional(),
  }).optional(),
}).min(1).messages({
  'object.min': 'At least one preference must be provided',
});

// =============================================================================
// DEVICES
// =============================================================================

/**
 * GET /parents/me/devices — list registered devices
 */
export const listDevicesSchema = Joi.object({
  ...paginationSchema,
});

/**
 * DELETE /parents/me/devices/:deviceId — remove a device
 */
export const removeDeviceSchema = Joi.object({
  deviceId: Joi.string().required(),
}).options({ allowUnknown: true });

// =============================================================================
// SESSIONS
// =============================================================================

/**
 * GET /parents/me/sessions
 */
export const listSessionsSchema = Joi.object({
  ...paginationSchema,
});

/**
 * DELETE /parents/me/sessions/:sessionId — revoke a specific session
 */
export const revokeSessionSchema = Joi.object({
  sessionId: Joi.string().required(),
}).options({ allowUnknown: true });

/**
 * DELETE /parents/me/sessions — revoke all sessions except current
 */
export const revokeAllSessionsSchema = Joi.object({});

// =============================================================================
// SCAN HISTORY (for parent's children)
// =============================================================================

/**
 * GET /parents/me/children/:studentId/scans
 */
export const listChildScansSchema = Joi.object({
  ...paginationSchema,
  from:   Joi.date().iso().optional(),
  to:     Joi.date().iso().min(Joi.ref('from')).optional(),
  result: Joi.string()
    .valid('ACTIVE', 'INACTIVE', 'REVOKED', 'INVALID', 'SUSPICIOUS')
    .optional(),
}).options({ allowUnknown: true }); // allow params

// =============================================================================
// EXPORT MAP (used by validate middleware)
// =============================================================================

export const parentValidation = {
  getProfile:                    getProfileSchema,
  updateProfile:                 updateProfileSchema,
  deleteAccount:                 deleteAccountSchema,
  listChildren:                  listChildrenSchema,
  linkChild:                     linkChildSchema,
  updateChildLink:               updateChildLinkSchema,
  unlinkChild:                   unlinkChildSchema,
  updateCardVisibility:          updateCardVisibilitySchema,
  updateNotificationPreferences: updateNotificationPreferencesSchema,
  listDevices:                   listDevicesSchema,
  removeDevice:                  removeDeviceSchema,
  listSessions:                  listSessionsSchema,
  revokeSession:                 revokeSessionSchema,
  revokeAllSessions:             revokeAllSessionsSchema,
  listChildScans:                listChildScansSchema,
};