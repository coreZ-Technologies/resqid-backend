import { Router } from 'express';
import * as ctrl from './report.controller';
import { requireSchoolAuth } from '../../middleware/auth';

const router = Router();
router.use(requireSchoolAuth);

router.get('/:timetableId/teachers', ctrl.teachers);
router.get('/:timetableId/classes', ctrl.classes);
router.get('/:timetableId/rooms', ctrl.rooms);
router.get('/:timetableId/validation', ctrl.validation);
router.get('/:timetableId/improvements', ctrl.improvements);

export default router;
