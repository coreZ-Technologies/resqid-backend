import { Router } from 'express';
import * as ctrl from './crisis.controller';
import { requireSchoolAuth } from '../../middleware/auth';

const router = Router();
router.use(requireSchoolAuth);

router.post('/', ctrl.triggerCrisis);
router.get('/job/:jobId', ctrl.getCrisisJobStatus);

export default router;
