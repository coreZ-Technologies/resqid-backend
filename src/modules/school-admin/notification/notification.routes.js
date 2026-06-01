// TODO: Add implementation
// =============================================================================
// notification.routes.js — RESQID School Admin
//
// All notification routes for school admins.
// Mounted at: /api/school/notifications
//
// Middleware stack per request:
//   authenticate  → tenantScope  → requireSchoolStaff  → validate  → controller
//
// Route map:
//   GET    /                      → list (paginated, filterable)
//   GET    /unread-count          → unread badge count
//   GET    /preferences           → get per-event preferences
//   PUT    /preferences           → upsert per-event preferences
//   PATCH  /bulk-read             → bulk mark read
//   DELETE /bulk                  → bulk delete
//   GET    /:notificationId       → get single
//   PATCH  /:notificationId/read  → mark single read/unread
//   DELETE /:notificationId       → delete single
// =============================================================================

import { Router } from 'express';
import { authenticate }     from '#middlewares/authenticate.middleware.js';
import { tenantScope }      from '#middlewares/tenantScope.middleware.js';
import { requireSchoolStaff } from '#middlewares/rbac.middleware.js';
import { validate }         from '#middlewares/validate.middleware.js';
import { asyncHandler }     from '#shared/response/asyncHandler.js';

import * as controller from './notification.controller.js';
import {
  listNotificationsSchema,
  getNotificationSchema,
  markReadSchema,
  bulkMarkReadSchema,
  deleteNotificationSchema,
  bulkDeleteSchema,
  upsertPreferencesSchema,
} from './notification.validation.js';

const router = Router();

// ─── Apply auth + tenant scope to all routes ──────────────────────────────────
router.use(authenticate, tenantScope, requireSchoolStaff);

// ─── Static / collection routes (must be before /:notificationId) ────────────

// Unread badge count
router.get(
  '/unread-count',
  asyncHandler(controller.unreadCount)
);

// Preferences
router.get(
  '/preferences',
  asyncHandler(controller.getPreferences)
);

router.put(
  '/preferences',
  validate(upsertPreferencesSchema),
  asyncHandler(controller.upsertPreferences)
);

// Bulk mark read
router.patch(
  '/bulk-read',
  validate(bulkMarkReadSchema),
  asyncHandler(controller.bulkMarkRead)
);

// Bulk delete
router.delete(
  '/bulk',
  validate(bulkDeleteSchema),
  asyncHandler(controller.bulkDelete)
);

// ─── List ─────────────────────────────────────────────────────────────────────

router.get(
  '/',
  validate(listNotificationsSchema),
  asyncHandler(controller.list)
);

// ─── Single-resource routes ───────────────────────────────────────────────────

router.get(
  '/:notificationId',
  validate(getNotificationSchema),
  asyncHandler(controller.getOne)
);

router.patch(
  '/:notificationId/read',
  validate(markReadSchema),
  asyncHandler(controller.markRead)
);

router.delete(
  '/:notificationId',
  validate(deleteNotificationSchema),
  asyncHandler(controller.remove)
);

export default router;