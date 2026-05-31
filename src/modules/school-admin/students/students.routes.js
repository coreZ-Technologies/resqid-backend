// TODO: Add implementation
// =============================================================================
// students.routes.js — RESQID
//
// Base path: /api/school/students (mounted by school-admin router)
//
// Middleware chain per request:
//   authenticate → tenantScope → [rbac] → validate → asyncHandler(controller)
//
// Auth: SCHOOL_ADMIN can do everything; TEACHER gets read-only access.
// =============================================================================

import { Router } from 'express';
import { asyncHandler } from '#shared/response/asyncHandler.js';
import { validate } from '#shared/middleware/validate.middleware.js';
import { can, canAny } from '#shared/middleware/rbac.middleware.js';

import {
  createStudentSchema,
  updateStudentSchema,
  listStudentsSchema,
  studentIdParamSchema,
  bulkImportSchema,
  linkParentSchema,
  transferStudentSchema,
} from './students.validation.js';

import * as controller from './students.controller.js';

const router = Router();

// =============================================================================
// COLLECTION ROUTES — /students
// =============================================================================

// GET /students — list with filters + pagination
// Query params are coerced + validated inside the service via listStudentsSchema.parse(req.query)
router.get(
  '/',
  can('student:read'),
  asyncHandler(controller.list)
);

// GET /students/stats — class breakdown, counts (must be before /:studentId)
router.get(
  '/stats',
  can('student:read'),
  asyncHandler(controller.stats)
);

// POST /students — create single student
router.post(
  '/',
  can('student:create'),
  validate(createStudentSchema),
  asyncHandler(controller.create)
);

// POST /students/bulk-import — CSV/JSON bulk import (Premium)
router.post(
  '/bulk-import',
  can('student:create'),
  validate(bulkImportSchema),
  asyncHandler(controller.bulkImport)
);

// =============================================================================
// MEMBER ROUTES — /students/:studentId
// =============================================================================

// GET /students/:studentId — fetch single student (with card + emergency summary)
router.get(
  '/:studentId',
  can('student:read'),
  validate({ params: studentIdParamSchema }),
  asyncHandler(controller.getOne)
);

// PATCH /students/:studentId — update student profile
router.patch(
  '/:studentId',
  can('student:update'),
  validate({ params: studentIdParamSchema, body: updateStudentSchema }),
  asyncHandler(controller.update)
);

// DELETE /students/:studentId — soft delete
router.delete(
  '/:studentId',
  can('student:delete'),
  validate({ params: studentIdParamSchema }),
  asyncHandler(controller.remove)
);

// =============================================================================
// PARENT LINKAGE — /students/:studentId/parent
// =============================================================================

// POST /students/:studentId/parent — link parent
router.post(
  '/:studentId/parent',
  can('student:update'),
  validate({ params: studentIdParamSchema, body: linkParentSchema }),
  asyncHandler(controller.linkParent)
);

// DELETE /students/:studentId/parent — unlink parent
router.delete(
  '/:studentId/parent',
  can('student:update'),
  validate({ params: studentIdParamSchema }),
  asyncHandler(controller.unlinkParent)
);

// =============================================================================
// CLASS TRANSFER — /students/:studentId/transfer
// =============================================================================

// POST /students/:studentId/transfer
router.post(
  '/:studentId/transfer',
  can('student:update'),
  validate({ params: studentIdParamSchema, body: transferStudentSchema }),
  asyncHandler(controller.transfer)
);

// =============================================================================
// STATUS TOGGLES — /students/:studentId/activate|deactivate
// =============================================================================

// PATCH /students/:studentId/activate
router.patch(
  '/:studentId/activate',
  can('student:update'),
  validate({ params: studentIdParamSchema }),
  asyncHandler(controller.activate)
);

// PATCH /students/:studentId/deactivate
router.patch(
  '/:studentId/deactivate',
  can('student:update'),
  validate({ params: studentIdParamSchema }),
  asyncHandler(controller.deactivate)
);

export default router;