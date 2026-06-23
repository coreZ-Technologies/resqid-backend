import { Router } from 'express';
import * as attendanceCtrl from '#modules/m3-attendance/attendance.controller.js';
import { validate } from '#middleware/validate.middleware.js';
import { registerDeviceSchema } from '#modules/m3-attendance/attendance.validation.js';

const router = Router();

router.get('/', attendanceCtrl.listDevices);
router.post('/', validate(registerDeviceSchema), attendanceCtrl.registerDevice);

export default router;