// src/routes/school-admin/teachers.routes.js
import { Router } from 'express';
import * as ctrl from '#modules/teachers/teacher.controller.js';
import { validate } from '#middleware/validate.middleware.js';
import { createTeacherSchema, updateTeacherSchema } from '#modules/teachers/teacher.validation.js';
import multer from 'multer';

const upload = multer({ dest: '/tmp/uploads/' });

const router = Router();

// Dropdowns & availability checks
router.get('/dropdowns', ctrl.getDropdownOptions);
router.get('/check-email', ctrl.checkEmailAvailability);
router.get('/check-phone', ctrl.checkPhoneAvailability);

// Export & bulk
router.get('/export', ctrl.exportTeachers);
router.post('/bulk', upload.single('file'), ctrl.bulkUpload);
router.get('/bulk/:jobId', ctrl.getBulkUploadStatus);

// CRUD
router.get('/', ctrl.list);
router.post('/', validate(createTeacherSchema), ctrl.create);
router.get('/:id', ctrl.getOne);
router.put('/:id', validate(updateTeacherSchema), ctrl.update);
router.delete('/:id', ctrl.remove);

export default router;
