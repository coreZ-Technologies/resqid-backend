// wellness.routes.js
import { Router } from 'express';
import * as ctrl from './wellness.controller.js';

import { requireSchoolAuth, requireHRRole } from '#middleware/auth/index.js';
import { requireSchoolAuth, requireHRRole } from '#middleware/auth/index.js';


const router = Router();

// Double-guarded: must be school admin AND have HR role
router.use(requireSchoolAuth, requireHRRole);

router.put('/:teacherId', ctrl.upsert);
router.get('/burnout-risks', ctrl.getBurnoutRisks);
router.get('/accessibility-needs', ctrl.getAccessibilityNeeds);
router.get('/:teacherId', ctrl.getOne);
router.delete('/:teacherId', ctrl.remove);

export default router;