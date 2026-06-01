// crisis/crisis.routes.js
import { Router } from 'express';
import * as ctrl from './crisis.controller.js';
import { requireSchoolAuth } from '#middleware/auth/authenticate.middleware.js';

const router = Router();
router.use(requireSchoolAuth);

router.post('/', ctrl.triggerCrisis);
router.get('/job/:jobId', ctrl.getCrisisJobStatus);

export default router;