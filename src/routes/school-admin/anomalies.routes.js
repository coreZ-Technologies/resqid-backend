// src/modules/school-admin/anomalies.routes.js
import { Router } from 'express';
import * as anomalyCtrl from '#modules/anomalies/anomaly.controller.js';
import { validate } from '#middleware/validate.middleware.js';
import { updateStatusSchema } from '#modules/anomalies/anomaly.validation.js';

const router = Router();

router.get('/stats', anomalyCtrl.getStats);
router.get('/filter-options', anomalyCtrl.getFilterOptions);
router.get('/export', anomalyCtrl.exportCsv);
router.get('/', anomalyCtrl.list);
router.get('/:id', anomalyCtrl.getOne);
router.patch('/:id/status', validate(updateStatusSchema), anomalyCtrl.updateStatus);

export default router;
