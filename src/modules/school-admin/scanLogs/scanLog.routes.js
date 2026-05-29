// TODO: Add implementation
// =============================================================================
// scanLog.routes.js — RESQID
//
// Routes for QR card scan log access.
//
// Mount points (in app.js / module index):
//   School Admin:   /api/v1/school-admin/scan-logs
//   Super Admin:    /api/v1/super-admin/scan-logs
//   Parent App:     /api/v1/parent/scan-logs   (read-only, own children only)
//
// Middleware stack per route:
//   authenticate → tenantScope → can/authorize → validate → controller
//
// Access model:
//   SCHOOL_ADMIN  → full read access for their school
//   TEACHER       → read access for their school (same as admin)
//   PARENT        → read own children's SUCCESS scans only (enforced in service)
//   SUPER_ADMIN   → global stats only; individual logs require schoolId filter
// =============================================================================

import { Router } from 'express';

import { authenticate }  from '#middleware/authenticate.middleware.js';
import { tenantScope }   from '#middleware/tenantScope.middleware.js';
import { can }           from '#middleware/rbac.middleware.js';
import { authorize }     from '#middleware/authorize.middleware.js';
import { validate }      from '#middleware/validate.middleware.js';
import { ROLES }         from '#shared/constants/roles.js';

import * as ctrl         from './scanLog.controller.js';
import * as v            from './scanLog.validation.js';

// ─── School Admin / Teacher Router ───────────────────────────────────────────
// tenantScope injects req.schoolId from the JWT's schoolId claim.
// Teachers have scan_log:read permission — they share these routes with admins.

export const schoolAdminRouter = Router();

schoolAdminRouter.use(authenticate, tenantScope);

// Stats (before /:id to prevent "stats" being parsed as a log ID)
schoolAdminRouter.get(
  '/stats',
  can('scan_log:read'),
  validate(v.statsQuerySchema),
  ctrl.getStats
);

// Student scan history (before /:id for same reason)
schoolAdminRouter.get(
  '/student/:studentId',
  can('scan_log:read'),
  validate(v.studentIdParamSchema),
  ctrl.getStudentScanHistory
);

// List
schoolAdminRouter.get(
  '/',
  can('scan_log:read'),
  validate(v.listScanLogsSchema),
  ctrl.listScanLogs
);

// Detail
schoolAdminRouter.get(
  '/:id',
  can('scan_log:read'),
  validate(v.scanLogIdSchema),
  ctrl.getScanLog
);

// ─── Parent Router ────────────────────────────────────────────────────────────
// Parents can view scan history for their own children only.
// Service layer enforces the parent-child relationship check.

export const parentRouter = Router();

parentRouter.use(authenticate, tenantScope);

// Student scan history — parent sees their child's SUCCESS scans
parentRouter.get(
  '/student/:studentId',
  authorize(ROLES.PARENT),
  validate(v.studentIdParamSchema),
  ctrl.getStudentScanHistory
);

// List — parent filtered (service applies child-scope automatically)
parentRouter.get(
  '/',
  authorize(ROLES.PARENT),
  validate(v.listScanLogsSchema),
  ctrl.listScanLogs
);

// ─── Super Admin Router ───────────────────────────────────────────────────────
// Platform-wide stats. Individual log access requires schoolId filter
// and goes through the school admin router with elevated JWT.

export const superAdminRouter = Router();

superAdminRouter.use(authenticate, tenantScope);

superAdminRouter.get(
  '/stats',
  authorize(ROLES.SUPER_ADMIN),
  ctrl.getGlobalStats
);

// Super admin can query individual school logs with ?schoolId= filter
superAdminRouter.get(
  '/',
  authorize(ROLES.SUPER_ADMIN),
  validate(v.listScanLogsSchema),
  ctrl.listScanLogs
);

// ─── Default export (school admin router) ────────────────────────────────────
export default schoolAdminRouter;