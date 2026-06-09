// src/routes/school-admin/classes.routes.js
import { Router } from 'express';
import * as ctrl from '#modules/classes/class.controller.js';
import { validate } from '#middleware/validate.middleware.js';
import { createClassSchema, updateClassSchema } from '#modules/classes/class.validation.js';
import multer from 'multer';

const upload = multer({ dest: '/tmp/uploads/' });

const router = Router();

// Stats & filters
router.get('/stats', ctrl.getStats);
router.get('/filter-options', ctrl.getFilterOptions);
router.get('/export', ctrl.exportClasses);

// Bulk upload
router.post('/bulk', upload.single('file'), ctrl.bulkUpload);
router.get('/bulk/:jobId', ctrl.getBulkUploadStatus);

// CRUD
router.get('/', ctrl.list);
router.get('/:id', ctrl.getOne);
router.post('/', validate(createClassSchema), ctrl.create);
router.put('/:id', validate(updateClassSchema), ctrl.update);
router.delete('/:id', ctrl.remove);

export default router;
