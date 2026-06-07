// src/routes/school-admin/subjects.routes.js
import { Router } from 'express';
import * as ctrl from '#modules/subjects/subject.controller.js';
import { validate } from '#middleware/validate.middleware.js';
import { createSubjectSchema, updateSubjectSchema } from '#modules/subjects/subject.validation.js';
import multer from 'multer';

const upload = multer({ dest: '/tmp/uploads/' });

const router = Router();

router.get('/stats', ctrl.getStats);
router.get('/filter-options', ctrl.getFilterOptions);
router.get('/export', ctrl.exportSubjects);

router.post('/bulk', upload.single('file'), ctrl.bulkUpload);
router.get('/bulk/:jobId', ctrl.getBulkUploadStatus);

router.get('/', ctrl.list);
router.get('/:id', ctrl.getOne);
router.post('/', validate(createSubjectSchema), ctrl.create);
router.put('/:id', validate(updateSubjectSchema), ctrl.update);
router.delete('/:id', ctrl.remove);

export default router;
