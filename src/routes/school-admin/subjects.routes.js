// src/routes/school-admin/subjects.routes.js
import { Router } from 'express';
import multer from 'multer';
import * as ctrl from '#modules/subjects/subject.controller.js';
import { validate } from '#middleware/validate.middleware.js';
import { authenticate } from '#middleware/auth/authenticate.middleware.js';
import { authorize, ROLES } from '#middleware/auth/authorize.middleware.js';
import { ownSchoolOnly } from '#middleware/auth/restrictionOwnSchool.middleware.js';
import { createSubjectSchema, updateSubjectSchema } from '#modules/subjects/subject.validation.js';

const upload = multer({ dest: '/tmp/uploads/' });

const router = Router();

// 🔐 Apply authentication, school admin role, and school scope to ALL routes
router.use(authenticate);
router.use(authorize(ROLES.SCHOOL_ADMIN));
router.use(ownSchoolOnly);

// ─── Stats & Options ──────────────────────────────────────────────────────
router.get('/stats', ctrl.getStats);
router.get('/filter-options', ctrl.getFilterOptions);

// ─── Export & Bulk Upload ─────────────────────────────────────────────────
router.get('/export', ctrl.exportSubjects);
router.post('/bulk', upload.single('file'), ctrl.bulkUpload);
router.get('/bulk/:jobId', ctrl.getBulkUploadStatus);

// ─── CRUD ─────────────────────────────────────────────────────────────────
router.get('/', ctrl.list);
router.get('/:id', ctrl.getOne);
router.post('/', validate(createSubjectSchema), ctrl.create);
router.put('/:id', validate(updateSubjectSchema), ctrl.update);
router.delete('/:id', ctrl.remove);

export default router;