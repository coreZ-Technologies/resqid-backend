// TODO: Add implementation
// =============================================================================
// scanAnomaly.routes.js — RESQID
//
// Routes for scan anomaly management.
//
// Mount points (in app.js / module index):
//   School Admin:   /api/v1/school-admin/scan-anomalies
//   Super Admin:    /api/v1/super-admin/scan-anomalies
//
// Middleware stack per route:
//   authenticate → tenantScope → authorize/can → validate → controller
// =============================================================================

import { Router } from 'express';

import { authenticate }  from '#middleware/authenticate.middleware.js';
import { tenantScope }   from '#middleware/tenantScope.middleware.js';
import { can }           from '#middleware/rbac.middleware.js';
import { authorize }     from '#middleware/authorize.middleware.js';
import { validate }      from '#middleware/validate.middleware.js';
import { ROLES }         from '#shared/constants/roles.js';

import * as ctrl         from './scanAnomaly.controller.js';
import * as v            from './scanAnomaly.validation.js';

// ─── School Admin Router ──────────────────────────────────────────────────────
// All routes here are school-scoped.
// tenantScope injects req.schoolId from the JWT's schoolId claim.

export const schoolAdminRouter = Router();

schoolAdminRouter.use(authenticate, tenantScope);

// Stats (must be before /:id to avoid "stats" being treated as an anomaly ID)
schoolAdminRouter.get(
  '/stats',
  can('anomaly:read'),
  validate(v.statsQuerySchema),
  ctrl.getStats
);

// List
schoolAdminRouter.get(
  '/',
  can('anomaly:read'),
  validate(v.listAnomaliesSchema),
  ctrl.listAnomalies
);

// Detail
schoolAdminRouter.get(
  '/:id',
  can('anomaly:read'),
  validate(v.anomalyIdSchema),
  ctrl.getAnomaly
);

// Resolve single
schoolAdminRouter.patch(
  '/:id/resolve',
  can('anomaly:resolve'),
  validate(v.resolveSchema),
  ctrl.resolveAnomaly
);

// Ignore single
schoolAdminRouter.patch(
  '/:id/ignore',
  can('anomaly:resolve'),
  validate(v.ignoreSchema),
  ctrl.ignoreAnomaly
);

// Bulk resolve for a student
schoolAdminRouter.patch(
  '/student/:studentId/resolve-all',
  can('anomaly:resolve'),
  validate(v.resolveAllSchema),
  ctrl.resolveAllForStudent
);

// ─── Super Admin Router ───────────────────────────────────────────────────────
// Platform-wide stats only — super admin does not manage individual school anomalies
// through this router (they use the school admin router with elevated access).

export const superAdminRouter = Router();

superAdminRouter.use(authenticate, tenantScope);

superAdminRouter.get(
  '/stats',
  authorize(ROLES.SUPER_ADMIN),
  ctrl.getGlobalStats
);

// ─── Default export (school admin router) ────────────────────────────────────
export default schoolAdminRouter;