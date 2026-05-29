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
import { validateAll } from '#middleware/validate.middleware.js';
import { perTokenScanLimit } from '#middleware/security/rateLimit.middleware.js';
import { serveEmergencyHtml } from './scan.middleware.js';
import {
  scanCodeParamsSchema,
  contactRedirectParamsSchema,
  tokenOnlyParamsSchema,
} from './scan.validation.js';

const router = Router();

// Redirect routes — BEFORE /:code wildcard
router.get(
  '/call/:contactId/:token',
  validateAll({ params: contactRedirectParamsSchema }),
  callContact
);
router.get(
  '/wa/:contactId/:token',
  validateAll({ params: contactRedirectParamsSchema }),
  whatsappContact
);
router.get('/school-call/:token', validateAll({ params: tokenOnlyParamsSchema }), callSchool);
router.get('/doctor-call/:token', validateAll({ params: tokenOnlyParamsSchema }), callDoctor);

// Main QR scan — AFTER redirect routes
router.get(
  '/:code',
  serveEmergencyHtml,
  validateAll({ params: scanCodeParamsSchema }),
  perTokenScanLimit,
  scanQr
);

export default router;
