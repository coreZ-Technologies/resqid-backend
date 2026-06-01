import { Router } from 'express';
import * as ctrl from './wellness.controller';
import { requireSchoolAuth, requireHRRole } from '../../middleware/auth';

const router = Router();

// Double-guarded: must be school admin AND have HR role
router.use(requireSchoolAuth, requireHRRole);

router.put('/:teacherId', ctrl.upsert);
router.get('/:teacherId', ctrl.getOne);
router.delete('/:teacherId', ctrl.remove);

export default router;
