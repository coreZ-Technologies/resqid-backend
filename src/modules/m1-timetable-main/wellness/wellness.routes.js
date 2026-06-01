// wellness.routes.js
import { Router } from 'express';
import * as ctrl from './wellness.controller.js';
import { requireSchoolAuth } from '#middleware/auth/authenticate.middleware.js';
import { requireHRRole } from '#middleware/auth/rbac.middleware.js';

const router = Router();

// Double-guarded: must be school admin AND have HR role
router.use(requireSchoolAuth, requireHRRole);

router.put('/:teacherId', ctrl.upsert);
router.get('/:teacherId', ctrl.getOne);
router.delete('/:teacherId', ctrl.remove);

export default router;