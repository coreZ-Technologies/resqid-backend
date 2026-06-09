// src/routes/school-admin/teachers.routes.js
import { Router } from 'express';
import multer from 'multer';
import * as ctrl from '#modules/teachers/teacher.controller.js';
import { validate } from '#middleware/validate.middleware.js';
import { authenticate } from '#middleware/auth/authenticate.middleware.js';
import { authorize, ROLES } from '#middleware/auth/authorize.middleware.js';
import { ownSchoolOnly } from '#middleware/auth/restrictionOwnSchool.middleware.js';
import { createTeacherSchema, updateTeacherSchema } from '#modules/teachers/teacher.validation.js';

const upload = multer({ dest: '/tmp/uploads/' });

const router = Router();

// 🔐 Apply authentication, school admin role, and school scope to ALL routes
router.use(authenticate);
router.use(authorize(ROLES.SCHOOL_ADMIN));
router.use(ownSchoolOnly);

// ─── Dropdowns & availability checks ──────────────────────────────────────
router.get('/dropdowns', ctrl.getDropdownOptions);
router.get('/check-email', ctrl.checkEmailAvailability);
router.get('/check-phone', ctrl.checkPhoneAvailability);

// ─── Export & bulk upload ─────────────────────────────────────────────────
router.get('/export', ctrl.exportTeachers);
router.post('/bulk', upload.single('file'), ctrl.bulkUpload);
router.get('/bulk/:jobId', ctrl.getBulkUploadStatus);

// ─── CRUD ─────────────────────────────────────────────────────────────────
router.get('/', ctrl.list);
router.post('/', validate(createTeacherSchema), ctrl.create);
router.get('/:id', ctrl.getOne);
router.put('/:id', validate(updateTeacherSchema), ctrl.update);
router.delete('/:id', ctrl.remove);

export default router;