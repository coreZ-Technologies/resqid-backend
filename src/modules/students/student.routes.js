// =============================================================================
// modules/students/student.routes.js — RESQID
// Student Routes — CRUD operations for student management
// Access: Super Admin, School Admin, Teacher, Parent (limited)
// =============================================================================

import { Router } from 'express';
import studentController from './students.controller.js';

// Middleware imports
import { authenticate } from '#middleware/auth/authenticate.middleware.js';
import { authorize } from '#middleware/auth/authorize.middleware.js';
import { rbac } from '#middleware/auth/rbac.middleware.js';
import { tenantScope } from '#middleware/auth/tenantScope.middleware.js';
import { validate } from '#middleware/validate.middleware.js';
import { auditLog } from '#middleware/logging/auditLog.middleware.js';
import { requireModule } from '#middleware/requireModule.middleware.js';
import { restrictionOwnSchool } from '#middleware/restrictionOwnSchool.middleware.js';

// Validation schemas
import { studentValidation } from './student.validation.js';

// Upload middleware (for documents)
import { upload } from '#config/multer.js';

// ─── Router Setup ─────────────────────────────────────────────────────────────

const router = Router();

// All routes require authentication
router.use(authenticate);

// All routes require tenant (school) context
router.use(tenantScope);

// All routes require 'students' module to be enabled in plan
router.use(requireModule('students'));

// ─── PUBLIC ROUTES (No role restriction - handled in controller) ──────────────

/**
 * GET /api/students/qr/:qrCodeId
 * Get student by QR code (public access for emergency scanning)
 * This route doesn't require authentication
 */
const publicRouter = Router();
publicRouter.get('/qr/:qrCodeId', studentController.getByQrCode);

// ─── PARENT ROUTES ───────────────────────────────────────────────────────────

/**
 * GET /api/parents/:parentId/students
 * Get students by parent ID
 * Access: Parent (own children), Admin
 */
router.get(
  '/parents/:parentId',
  authorize(['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'PARENT']),
  restrictionOwnSchool,
  studentController.getByParent
);

// ─── ADMIN ROUTES ────────────────────────────────────────────────────────────

/**
 * GET /api/students
 * List all students with filtering, search, and pagination
 * Access: Super Admin, School Admin, Teacher
 */
router.get(
  '/',
  authorize(['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER']),
  validate(studentValidation.queryStudents, 'query'),
  studentController.list
);

/**
 * GET /api/students/search
 * Quick search students (autocomplete)
 * Access: Super Admin, School Admin, Teacher
 */
router.get(
  '/search',
  authorize(['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER']),
  studentController.search
);

/**
 * GET /api/students/stats
 * Get student statistics for dashboard
 * Access: Super Admin, School Admin
 */
router.get('/stats', authorize(['SUPER_ADMIN', 'SCHOOL_ADMIN']), studentController.stats);

/**
 * GET /api/students/export
 * Export students data as CSV
 * Access: Super Admin, School Admin
 */
router.get('/export', authorize(['SUPER_ADMIN', 'SCHOOL_ADMIN']), studentController.exportStudents);

/**
 * GET /api/students/:studentId
 * Get single student by ID
 * Access: Super Admin, School Admin, Teacher, Parent (own children)
 */
router.get(
  '/:studentId',
  authorize(['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'PARENT']),
  restrictionOwnSchool,
  auditLog('student.view'),
  studentController.getById
);

/**
 * POST /api/students
 * Create a single student
 * Access: Super Admin, School Admin
 */
router.post(
  '/',
  authorize(['SUPER_ADMIN', 'SCHOOL_ADMIN']),
  validate(studentValidation.createStudent),
  auditLog('student.create'),
  studentController.create
);

/**
 * POST /api/students/bulk
 * Bulk import students
 * Access: Super Admin, School Admin
 */
router.post(
  '/bulk',
  authorize(['SUPER_ADMIN', 'SCHOOL_ADMIN']),
  validate(studentValidation.bulkImport),
  auditLog('student.bulkCreate'),
  studentController.bulkCreate
);

/**
 * POST /api/students/bulk/class
 * Bulk assign class/section
 * Access: Super Admin, School Admin
 */
router.post(
  '/bulk/class',
  authorize(['SUPER_ADMIN', 'SCHOOL_ADMIN']),
  auditLog('student.bulkClassAssign'),
  studentController.bulkAssignClass
);

/**
 * PATCH /api/students/bulk/status
 * Bulk update student status
 * Access: Super Admin, School Admin
 */
router.patch(
  '/bulk/status',
  authorize(['SUPER_ADMIN', 'SCHOOL_ADMIN']),
  auditLog('student.bulkStatusUpdate'),
  studentController.bulkUpdateStatus
);

/**
 * POST /api/students/bulk/delete
 * Bulk delete students
 * Access: Super Admin, School Admin
 */
router.post(
  '/bulk/delete',
  authorize(['SUPER_ADMIN', 'SCHOOL_ADMIN']),
  auditLog('student.bulkDelete'),
  studentController.bulkDelete
);

/**
 * PUT /api/students/:studentId
 * Update student (full update)
 * Access: Super Admin, School Admin
 */
router.put(
  '/:studentId',
  authorize(['SUPER_ADMIN', 'SCHOOL_ADMIN']),
  validate(studentValidation.updateStudent),
  auditLog('student.update'),
  studentController.update
);

/**
 * PATCH /api/students/:studentId/status
 * Update student status
 * Access: Super Admin, School Admin
 */
router.patch(
  '/:studentId/status',
  authorize(['SUPER_ADMIN', 'SCHOOL_ADMIN']),
  auditLog('student.statusUpdate'),
  studentController.updateStatus
);

/**
 * PATCH /api/students/:studentId/class
 * Update student class/section (promote/demote)
 * Access: Super Admin, School Admin
 */
router.patch(
  '/:studentId/class',
  authorize(['SUPER_ADMIN', 'SCHOOL_ADMIN']),
  auditLog('student.classUpdate'),
  studentController.updateClass
);

/**
 * PATCH /api/students/:studentId/medical
 * Update student medical information
 * Access: Super Admin, School Admin
 */
router.patch(
  '/:studentId/medical',
  authorize(['SUPER_ADMIN', 'SCHOOL_ADMIN']),
  validate(studentValidation.medicalInfo),
  auditLog('student.medicalUpdate'),
  studentController.updateMedicalInfo
);

/**
 * POST /api/students/:studentId/parents
 * Add parent to student
 * Access: Super Admin, School Admin
 */
router.post(
  '/:studentId/parents',
  authorize(['SUPER_ADMIN', 'SCHOOL_ADMIN']),
  validate(studentValidation.addParent),
  auditLog('student.addParent'),
  studentController.addParent
);

/**
 * DELETE /api/students/:studentId/parents/:parentId
 * Remove parent from student
 * Access: Super Admin, School Admin
 */
router.delete(
  '/:studentId/parents/:parentId',
  authorize(['SUPER_ADMIN', 'SCHOOL_ADMIN']),
  auditLog('student.removeParent'),
  studentController.removeParent
);

/**
 * POST /api/students/:studentId/documents
 * Upload student document
 * Access: Super Admin, School Admin
 */
router.post(
  '/:studentId/documents',
  authorize(['SUPER_ADMIN', 'SCHOOL_ADMIN']),
  upload.single('document'),
  auditLog('student.documentUpload'),
  studentController.uploadDocument
);

/**
 * DELETE /api/students/:studentId/documents/:documentId
 * Delete student document
 * Access: Super Admin, School Admin
 */
router.delete(
  '/:studentId/documents/:documentId',
  authorize(['SUPER_ADMIN', 'SCHOOL_ADMIN']),
  auditLog('student.documentDelete'),
  studentController.deleteDocument
);

/**
 * DELETE /api/students/:studentId
 * Delete student (soft delete by default)
 * Access: Super Admin, School Admin
 */
router.delete(
  '/:studentId',
  authorize(['SUPER_ADMIN', 'SCHOOL_ADMIN']),
  auditLog('student.delete'),
  studentController.deleteStudent
);

// ─── Export Routes ────────────────────────────────────────────────────────────

// Mount public routes (no auth required)
const studentRoutes = Router();
studentRoutes.use('/students', publicRouter);
studentRoutes.use('/students', router);

export default studentRoutes;
