// =============================================================================
// src/routes/school-admin/emergency.contacts.routes.js — RESQID
// Emergency Contacts Management — School Admin & Super Admin
// =============================================================================

import { Router } from 'express';
import { authenticate } from '#middleware/auth/authenticate.middleware.js';
import { authorize } from '#middleware/auth/authorize.middleware.js';
import { ROLES } from '#shared/constants/roles.js';
import { validate } from '#middleware/validate.middleware.js';

// ─── Controllers ──────────────────────────────────────────────────────────────
import * as emergencyCtrl from '#modules/m2-emergency/emergency.controller.js';

// ─── Validation Schemas ──────────────────────────────────────────────────────
import {
  studentIdParamsSchema,
  contactIdParamsSchema,
  emergencyContactSchema,
} from '#modules/m2-emergency/emergency.validation.js';

// ─── Router ──────────────────────────────────────────────────────────────────

const router = Router();

// All routes require authentication and Admin rights
router.use(authenticate, authorize([ROLES.SCHOOL_ADMIN, ROLES.SUPER_ADMIN]));

/**
 * GET /emergency/contacts/:studentId
 * Get all emergency contacts for a student
 */
router.get(
  '/:studentId',
  validate(studentIdParamsSchema, 'params'),
  emergencyCtrl.getContacts
);

/**
 * POST /emergency/contacts/:studentId
 * Add a new emergency contact for a student
 */
router.post(
  '/:studentId',
  validate(studentIdParamsSchema, 'params'),
  validate(emergencyContactSchema, 'body'),
  emergencyCtrl.addContact
);

/**
 * PUT /emergency/contacts/:contactId
 * Update an existing emergency contact
 */
router.put(
  '/:contactId',
  validate(contactIdParamsSchema, 'params'),
  validate(emergencyContactSchema, 'body'),
  emergencyCtrl.updateContact
);

/**
 * DELETE /emergency/contacts/:contactId
 * Remove an emergency contact
 */
router.delete(
  '/:contactId',
  validate(contactIdParamsSchema, 'params'),
  emergencyCtrl.deleteContact
);

export default router;