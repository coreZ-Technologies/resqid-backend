// =============================================================================
// parent.routes.js — RESQID
//
// All routes are PARENT-role only.
// Every route goes through: authenticate → authorize(PARENT) → validate → handler
//
// Base path (mounted in routes/index.js):
//   /api/v1/parents
//
// Route tree:
//   GET    /me                                          → getProfile
//   PATCH  /me                                          → updateProfile
//   DELETE /me                                          → deleteAccount
//
//   GET    /me/children                                 → listChildren
//   POST   /me/children                                 → linkChild
//   GET    /me/children/:studentId                      → getChild
//   PATCH  /me/children/:studentId                      → updateChildLink
//   DELETE /me/children/:studentId                      → unlinkChild
//
//   PATCH  /me/children/:studentId/visibility           → updateCardVisibility
//
//   GET    /me/children/:studentId/scans                → listChildScans
//
//   GET    /me/notification-preferences                 → getNotificationPreferences
//   PATCH  /me/notification-preferences                 → updateNotificationPreferences
//
//   GET    /me/devices                                  → listDevices
//   DELETE /me/devices/:deviceId                        → removeDevice
//
//   GET    /me/sessions                                 → listSessions
//   DELETE /me/sessions                                 → revokeAllSessions
//   DELETE /me/sessions/:sessionId                      → revokeSession
// =============================================================================

import { Router } from 'express';
import { parentController as ctrl } from './parent.controller.js';
import { parentValidation as v }    from './parent.validation.js';
import { authenticate }             from '#middleware/auth/authenticate.middleware.js';
import { authorize }                from '#middleware/auth/authorize.middleware.js';
import { asyncHandler }             from '#shared/response/asyncHandler.js';
import { validate }                 from '#middleware/validate.middleware.js';
import { ROLES }                    from '#shared/constants/roles.js';

const router = Router();

// ─── All parent routes require JWT authentication + PARENT role ───────────────
router.use(authenticate);
router.use(authorize(ROLES.PARENT));

// =============================================================================
// PROFILE
// =============================================================================

router.get(
  '/me',
  validate(v.getProfile, 'query'),
  asyncHandler(ctrl.getProfile)
);

router.patch(
  '/me',
  validate(v.updateProfile),
  asyncHandler(ctrl.updateProfile)
);

router.delete(
  '/me',
  validate(v.deleteAccount),
  asyncHandler(ctrl.deleteAccount)
);

// =============================================================================
// NOTIFICATION PREFERENCES
// =============================================================================
// Defined before /me/children to avoid route shadowing

router.get(
  '/me/notification-preferences',
  asyncHandler(ctrl.getNotificationPreferences)
);

router.patch(
  '/me/notification-preferences',
  validate(v.updateNotificationPreferences),
  asyncHandler(ctrl.updateNotificationPreferences)
);

// =============================================================================
// DEVICES
// =============================================================================

router.get(
  '/me/devices',
  validate(v.listDevices, 'query'),
  asyncHandler(ctrl.listDevices)
);

router.delete(
  '/me/devices/:deviceId',
  validate(v.removeDevice, 'params'),
  asyncHandler(ctrl.removeDevice)
);

// =============================================================================
// SESSIONS
// =============================================================================

router.get(
  '/me/sessions',
  validate(v.listSessions, 'query'),
  asyncHandler(ctrl.listSessions)
);

// DELETE /me/sessions — revoke ALL (no param) — must come before /:sessionId
router.delete(
  '/me/sessions',
  validate(v.revokeAllSessions),
  asyncHandler(ctrl.revokeAllSessions)
);

router.delete(
  '/me/sessions/:sessionId',
  validate(v.revokeSession, 'params'),
  asyncHandler(ctrl.revokeSession)
);

// =============================================================================
// CHILDREN
// =============================================================================

router.get(
  '/me/children',
  validate(v.listChildren, 'query'),
  asyncHandler(ctrl.listChildren)
);

router.post(
  '/me/children',
  validate(v.linkChild),
  asyncHandler(ctrl.linkChild)
);

// ─── Child-scoped sub-routes ──────────────────────────────────────────────────

router.get(
  '/me/children/:studentId',
  asyncHandler(ctrl.getChild)
);

router.patch(
  '/me/children/:studentId',
  validate(v.updateChildLink),
  asyncHandler(ctrl.updateChildLink)
);

router.delete(
  '/me/children/:studentId',
  asyncHandler(ctrl.unlinkChild)
);

// Card visibility for a specific child
router.patch(
  '/me/children/:studentId/visibility',
  validate(v.updateCardVisibility),
  asyncHandler(ctrl.updateCardVisibility)
);

// Scan history for a specific child
router.get(
  '/me/children/:studentId/scans',
  validate(v.listChildScans, 'query'),
  asyncHandler(ctrl.listChildScans)
);

export default router;