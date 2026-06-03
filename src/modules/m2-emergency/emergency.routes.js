// =============================================================================
// modules/m2-emergency/emergency.routes.js — RESQID
// Profile management routes. Public scan is handled by scan/ module.
// =============================================================================

import { Router } from 'express';
import * as controller from './emergency.controller.js';
import { authenticate } from '#middleware/auth/authenticate.middleware.js';
import { authorize, authorizeMin } from '#middleware/auth/authorize.middleware.js';
import { ROLES } from '#shared/constants/roles.js';
import { validate } from '#middleware/validate.middleware.js';
import {
  studentIdParamsSchema,
  contactIdParamsSchema,
  incidentIdParamsSchema,
} from './emergency.validation.js';

const router = Router();

// ─── Profile (Parent only) ────────────────────────────────────────────────────
router.get(
  '/profile/:studentId',
  authenticate,
  authorize(ROLES.PARENT),
  validate(studentIdParamsSchema),
  controller.getProfile
);
router.put(
  '/profile/:studentId',
  authenticate,
  authorize(ROLES.PARENT),
  validate(studentIdParamsSchema),
  controller.updateProfile
);

// ─── Contacts ─────────────────────────────────────────────────────────────────
router.get(
  '/contacts/:studentId',
  authenticate,
  authorize(ROLES.PARENT, ROLES.SCHOOL_ADMIN),
  validate(studentIdParamsSchema),
  controller.getContacts
);
router.post(
  '/contacts/:studentId',
  authenticate,
  authorize(ROLES.PARENT),
  validate(studentIdParamsSchema),
  controller.addContact
);
router.put(
  '/contacts/:contactId',
  authenticate,
  authorize(ROLES.PARENT),
  validate(contactIdParamsSchema),
  controller.updateContact
);
router.delete(
  '/contacts/:contactId',
  authenticate,
  authorize(ROLES.PARENT),
  validate(contactIdParamsSchema),
  controller.deleteContact
);

// ─── Incidents ────────────────────────────────────────────────────────────────
router.get(
  '/incidents/:studentId',
  authenticate,
  authorize(ROLES.PARENT, ROLES.SCHOOL_ADMIN, ROLES.TEACHER),
  validate(studentIdParamsSchema),
  controller.getIncidents
);
router.post('/incidents', authenticate, controller.logIncident);
router.get(
  '/incidents/detail/:incidentId',
  authenticate,
  authorize(ROLES.SCHOOL_ADMIN, ROLES.TEACHER, ROLES.PARENT),
  validate(incidentIdParamsSchema),
  controller.getIncident
);
router.put(
  '/incidents/:incidentId/resolve',
  authenticate,
  authorize(ROLES.SCHOOL_ADMIN, ROLES.TEACHER),
  validate(incidentIdParamsSchema),
  controller.resolveIncident
);

// ─── Access Logs ──────────────────────────────────────────────────────────────
router.get(
  '/access-logs/:studentId',
  authenticate,
  authorize(ROLES.SCHOOL_ADMIN),
  validate(studentIdParamsSchema),
  controller.getAccessLogs
);

// ─── Drills ───────────────────────────────────────────────────────────────────
router.post('/drills', authenticate, authorizeMin(ROLES.SCHOOL_ADMIN), controller.logDrill);
router.get('/drills', authenticate, authorizeMin(ROLES.SCHOOL_ADMIN), controller.getDrills);

export default router;
