// =============================================================================
// modules/m1-timetable/timetable.routes.js — RESQID
// Mounted at /api/timetable
// =============================================================================

import { Router } from 'express';
import { validate, validateAll } from '#middleware/validate.middleware.js';
import { authenticate } from '#middleware/auth/authenticate.middleware.js';
import { authorize } from '#middleware/auth/rbac.middleware.js';
import { ROLES } from '#shared/constants/roles.js';
import * as controller from './timetable.controller.js';
import {
  updateTimetableConfigSchema,
  createTeacherSchema,
  updateTeacherSchema,
  createSubjectSchema,
  createClassSchema,
  createPeriodSchema,
  bulkCreatePeriodsSchema,
  generateTimetableSchema,
  createSubstitutionSchema,
  approveSubstitutionSchema,
  classTimetableSchema,
  teacherTimetableSchema,
} from './timetable.validation.js';

const router = Router();

const STAFF = [ROLES.TEACHER, ROLES.SCHOOL_ADMIN, ROLES.SUPER_ADMIN];
const ADMIN = [ROLES.SCHOOL_ADMIN, ROLES.SUPER_ADMIN];

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/config', authenticate, authorize(STAFF), controller.getConfig);
router.put(
  '/config',
  authenticate,
  authorize(ADMIN),
  validate(updateTimetableConfigSchema),
  controller.updateConfig
);

// ═══════════════════════════════════════════════════════════════════════════════
// TEACHERS
// ═══════════════════════════════════════════════════════════════════════════════router.post('/teachers', authenticate, authorize(ADMIN), validate(createTeacherSchema), controller.createTeacher);
router.get('/teachers', authenticate, authorize(STAFF), controller.listTeachers);
router.get('/teachers/:teacherId', authenticate, authorize(STAFF), controller.getTeacher);
router.put(
  '/teachers/:teacherId',
  authenticate,
  authorize(ADMIN),
  validateAll(updateTeacherSchema),
  controller.updateTeacher
);
router.delete('/teachers/:teacherId', authenticate, authorize(ADMIN), controller.removeTeacher);

// ═══════════════════════════════════════════════════════════════════════════════
// SUBJECTS
// ═══════════════════════════════════════════════════════════════════════════════

router.post(
  '/subjects',
  authenticate,
  authorize(ADMIN),
  validate(createSubjectSchema),
  controller.createSubject
);
router.get('/subjects', authenticate, authorize(STAFF), controller.listSubjects);

// ═══════════════════════════════════════════════════════════════════════════════
// CLASSES
// ═══════════════════════════════════════════════════════════════════════════════

router.post(
  '/classes',
  authenticate,
  authorize(ADMIN),
  validate(createClassSchema),
  controller.createClass
);
router.get('/classes', authenticate, authorize(STAFF), controller.listClasses);

// ═══════════════════════════════════════════════════════════════════════════════
// PERIODS
// ═══════════════════════════════════════════════════════════════════════════════

router.post(
  '/periods',
  authenticate,
  authorize(ADMIN),
  validate(createPeriodSchema),
  controller.addPeriod
);
router.post(
  '/periods/bulk',
  authenticate,
  authorize(ADMIN),
  validate(bulkCreatePeriodsSchema),
  controller.addBulkPeriods
);
router.delete('/periods/:periodId', authenticate, authorize(ADMIN), controller.removePeriod);

// ═══════════════════════════════════════════════════════════════════════════════
// VIEW TIMETABLE
// ═══════════════════════════════════════════════════════════════════════════════

router.get(
  '/class/:classId',
  authenticate,
  authorize(STAFF),
  validateAll(classTimetableSchema),
  controller.getClassTimetable
);
router.get(
  '/teacher/:teacherId',
  authenticate,
  authorize(STAFF),
  validateAll(teacherTimetableSchema),
  controller.getTeacherTimetable
);

// ═══════════════════════════════════════════════════════════════════════════════
// AUTO-GENERATE
// ═══════════════════════════════════════════════════════════════════════════════

router.post(
  '/generate',
  authenticate,
  authorize(ADMIN),
  validate(generateTimetableSchema),
  controller.generateTimetable
);

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATE IMPORT
// ═══════════════════════════════════════════════════════════════════════════════

router.post('/validate', authenticate, authorize(ADMIN), controller.validateImported);

// ═══════════════════════════════════════════════════════════════════════════════
// SUBSTITUTIONS
// ═══════════════════════════════════════════════════════════════════════════════

router.post(
  '/substitutions',
  authenticate,
  authorize(ADMIN),
  validate(createSubstitutionSchema),
  controller.createSubstitution
);
router.get('/substitutions', authenticate, authorize(STAFF), controller.listSubstitutions);
router.patch(
  '/substitutions/:substitutionId',
  authenticate,
  authorize(ADMIN),
  validateAll(approveSubstitutionSchema),
  controller.approveSubstitution
);
router.get(
  '/substitutions/find/:periodId',
  authenticate,
  authorize(ADMIN),
  controller.findSubstitute
);

// ═══════════════════════════════════════════════════════════════════════════════
// CRISIS + REPORT (sub-routers)
// ═══════════════════════════════════════════════════════════════════════════════

import crisisRoutes from './crisis/crisis.routes.js';
import reportRoutes from './report/report.routes.js';

router.use('/crisis', crisisRoutes);
router.use('/report', reportRoutes);

export default router;
