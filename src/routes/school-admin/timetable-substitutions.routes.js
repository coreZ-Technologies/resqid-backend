import { Router } from 'express';
import * as crisisCtrl from '#modules/m1-timetable/crisis/crisis.controller.js';

const router = Router();

router.get('/', crisisCtrl.getActiveCrises);
router.post('/', crisisCtrl.triggerCrisis);
router.get('/job/:jobId', crisisCtrl.getCrisisJobStatus);
router.get('/history', crisisCtrl.getCrisisHistory);
router.get('/:crisisId', crisisCtrl.getCrisisDetails);
router.post('/:crisisId/resolve', crisisCtrl.resolveCrisis);

export default router;
