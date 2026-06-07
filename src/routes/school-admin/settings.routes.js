import { Router } from 'express';
import * as settingsCtrl from '#modules/settings/settings.controller.js';
import { validate } from '#middleware/validate.middleware.js';
import {
  updateSchoolProfileSchema,
  updateTimetableConfigSchema,
} from '#modules/settings/settings.validation.js';

const router = Router();

router.get('/school-profile', settingsCtrl.getSchoolProfile);
router.put(
  '/school-profile',
  validate(updateSchoolProfileSchema),
  settingsCtrl.updateSchoolProfile
);
router.get('/timetable-config', settingsCtrl.getTimetableConfig);
router.put(
  '/timetable-config',
  validate(updateTimetableConfigSchema),
  settingsCtrl.updateTimetableConfig
);
router.get('/staff', settingsCtrl.listStaff);
router.post('/staff', settingsCtrl.addStaff);
router.delete('/staff/:id', settingsCtrl.removeStaff);
router.get('/billing', settingsCtrl.getBilling);
router.get('/subscription', settingsCtrl.getSubscription);

export default router;
