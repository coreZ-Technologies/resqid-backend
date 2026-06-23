// src/modules/m6-students/student.routes.js
import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '#middleware/auth/authenticate.middleware.js';
import { authorize, ROLES } from '#middleware/auth/authorize.middleware.js';
import { validate } from '#middleware/validate.middleware.js';
import { rateLimit } from 'express-rate-limit';
import {
  createStudentSchema,
  updateStudentSchema,
  listStudentsQuerySchema,
  linkParentsSchema,
  unlinkParentSchema,
  updateEmergencyVisibilitySchema,
  sendMessageSchema,
  exportStudentsQuerySchema,
  bulkUploadSchema,           // ✅ Added import
} from './student.validation.js';
import * as controller from './student.controller.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// All routes require authentication and school admin role
router.use(authenticate);
router.use(authorize(ROLES.SCHOOL_ADMIN));

// Rate limiting
const createLimiter = rateLimit({ windowMs: 60 * 1000, max: 20 });
const exportLimiter = rateLimit({ windowMs: 60 * 1000, max: 5 });
const uploadLimiter = rateLimit({ windowMs: 60 * 1000, max: 10 });

// ─── Student CRUD ────────────────────────────────────────────────
router.get('/', validate(listStudentsQuerySchema, 'query'), controller.listStudents);
router.get('/stats', controller.getStats);
router.post('/', createLimiter, upload.single('photo'), validate(createStudentSchema), controller.createStudent);
router.get('/:id', controller.getStudent);
router.put('/:id', upload.single('photo'), validate(updateStudentSchema), controller.updateStudent);
router.delete('/:id', controller.deleteStudent);

// ─── Parent Linking ──────────────────────────────────────────────
router.post('/:id/parents', validate(linkParentsSchema), controller.linkParents);
router.delete('/:studentId/parents/:parentId', validate(unlinkParentSchema, 'params'), controller.unlinkParent);

// ─── Emergency Visibility ────────────────────────────────────────
router.patch('/:id/emergency-visibility', validate(updateEmergencyVisibilitySchema), controller.updateEmergencyVisibility);

// ─── Messaging ───────────────────────────────────────────────────
router.post('/:id/message', validate(sendMessageSchema), controller.sendMessageToParents);

// ─── Export ──────────────────────────────────────────────────────
router.get('/export', exportLimiter, validate(exportStudentsQuerySchema, 'query'), controller.exportStudents);

// ─── Documents ───────────────────────────────────────────────────
router.post('/:id/documents', uploadLimiter, upload.single('file'), controller.uploadDocument);
router.delete('/:studentId/documents/:documentId', controller.deleteDocument);

// ─── Bulk Upload (CSV/Excel) ─────────────────────────────────────
router.post('/bulk-upload', upload.single('file'), validate(bulkUploadSchema), controller.bulkUploadStudents);

export default router;