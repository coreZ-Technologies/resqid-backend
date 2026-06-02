// wellness.routes.js
import { Router } from 'express';
import * as ctrl from './wellness.controller.js';
<<<<<<< HEAD:src/modules/m1-timetable-main/wellness/wellness.routes.js
import { requireSchoolAuth } from '#middleware/auth/authenticate.middleware.js';
import { requireHRRole } from '#middleware/auth/rbac.middleware.js';
=======
import { requireSchoolAuth, requireHRRole } from '#middleware/auth/index.js';
>>>>>>> fabab30814b5de0a43a81ff99096e81e66add097:src/modules/m1-timetable/wellness/wellness.routes.js

const router = Router();

// Double-guarded: must be school admin AND have HR role
router.use(requireSchoolAuth, requireHRRole);

router.put('/:teacherId', ctrl.upsert);
router.get('/burnout-risks', ctrl.getBurnoutRisks);
router.get('/accessibility-needs', ctrl.getAccessibilityNeeds);
router.get('/:teacherId', ctrl.getOne);
router.delete('/:teacherId', ctrl.remove);

export default router;