// src/modules/school-admin/rfid-devices.routes.js
import { Router } from 'express';
import * as ctrl from '#modules/rfid-devices/rfid-device.controller.js';
import { validate } from '#middleware/validate.middleware.js';
import { firmwareUpdateSchema } from '#modules/rfid-devices/rfid-device.validation.js';

const router = Router();

router.get('/stats', ctrl.getStats);
router.get('/filter-options', ctrl.getFilterOptions);
router.get('/recent-activity', ctrl.getRecentActivity);
router.get('/export', ctrl.exportDevices);
router.get('/', ctrl.list);
router.get('/:id', ctrl.getOne);
router.post('/:id/firmware', validate(firmwareUpdateSchema), ctrl.updateFirmware);
router.post('/:id/restart', ctrl.restartDevice);
router.delete('/:id', ctrl.removeDevice);

export default router;
