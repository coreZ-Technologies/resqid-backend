// TODO: Add implementation
// =============================================================================
// dashboard.route.js — RESQID School Admin / Overview
//
// Mounted at: /api/school/dashboard
//
// Middleware stack:
//   authenticate → tenantScope → can('student:read') → validate → controller
//
// Using can('student:read') as the permission gate because:
//   - Both SCHOOL_ADMIN and TEACHER have this permission (roles.js)
//   - Dashboard is a read-only overview — no write operations here
//   - More specific than requireSchoolStaff alone — ties to the RBAC map
//
// Route map:
//   GET  /           → all 7 stat cards   (?range=7d|30d|90d)
//   GET  /activity   → recent activity feed
// =============================================================================

import { Router } from 'express';
import { authenticate }  from '#middlewares/authenticate.middleware.js';
import { tenantScope }   from '#middlewares/tenantScope.middleware.js';
import { can }           from '#middlewares/rbac.middleware.js';
import { validate }      from '#middlewares/validate.middleware.js';
import { asyncHandler }  from '#shared/response/asyncHandler.js';

import * as controller        from './dashboard.controller.js';
import { dashboardQuerySchema } from './dashboard.validation.js';

const router = Router();

// ─── Apply auth + tenant scope to all dashboard routes ───────────────────────
router.use(authenticate, tenantScope, can('student:read'));

// ─── Stats — all 7 stat cards ────────────────────────────────────────────────
// ?range defaults to 30d via Zod schema default

router.get(
  '/',
  validate(dashboardQuerySchema),
  asyncHandler(controller.getStats)
);

// ─── Activity feed ────────────────────────────────────────────────────────────
// range param accepted for UI consistency but feed always returns latest N

router.get(
  '/activity',
  validate(dashboardQuerySchema),
  asyncHandler(controller.getActivity)
);

export default router;