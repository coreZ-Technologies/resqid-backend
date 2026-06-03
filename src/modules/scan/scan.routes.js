// =============================================================================
// modules/scan/scan.routes.js — RESQID
// Public QR scan routes — NO authentication.
// Mounted at /s in app.js
// =============================================================================

import { Router } from 'express';
import { scanQr } from './scan.controller.js';
import {
  callContact,
  whatsappContact,
  callSchool,
  callDoctor,
} from './scan.redirect.controller.js';
import { validate } from '#middleware/validate.middleware.js';
import { perTokenScanLimit } from '#middleware/security/rateLimit.middleware.js';
import {
  scanCodeParamsSchema,
  contactRedirectParamsSchema,
  tokenOnlyParamsSchema,
} from './scan.validation.js';

const router = Router();

// =============================================================================
// REDIRECT ROUTES — BEFORE /:code wildcard
// These handle "Call Contact" and "WhatsApp" links from emergency profile page
// =============================================================================

/**
 * GET /s/call/:contactId/:token
 * Opens phone dialer to call an emergency contact.
 */
router.get('/call/:contactId/:token', validate(contactRedirectParamsSchema), callContact);

/**
 * GET /s/wa/:contactId/:token
 * Opens WhatsApp chat with emergency contact.
 */
router.get('/wa/:contactId/:token', validate(contactRedirectParamsSchema), whatsappContact);

/**
 * GET /s/school-call/:token
 * Opens phone dialer to call the school.
 */
router.get('/school-call/:token', validate(tokenOnlyParamsSchema), callSchool);

/**
 * GET /s/doctor-call/:token
 * Opens phone dialer to call student's doctor.
 */
router.get('/doctor-call/:token', validate(tokenOnlyParamsSchema), callDoctor);

// =============================================================================
// MAIN QR SCAN — AFTER redirect routes (/:code wildcard must be LAST)
// =============================================================================

/**
 * GET /s/:code
 * Main QR code scan endpoint.
 * Decrypts code, fetches emergency profile, returns to responder.
 */
router.get('/:code', validate(scanCodeParamsSchema), perTokenScanLimit, scanQr);

export default router;
