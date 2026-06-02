import { Router } from 'express';
import * as ctrl from './report.controller.js';
import { requireSchoolAuth } from '#middleware/auth/index.js';

const router = Router();
router.use(requireSchoolAuth);

router.get('/:timetableId/teachers', ctrl.teachers);
router.get('/:timetableId/classes', ctrl.classes);
router.get('/:timetableId/rooms', ctrl.rooms);
router.get('/:timetableId/validation', ctrl.validation);
router.get('/:timetableId/improvements', ctrl.improvements);
router.get('/:timetableId/daily/:day', ctrl.dailySummary);

export default router;
