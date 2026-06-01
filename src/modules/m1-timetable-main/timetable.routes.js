import { Router } from 'express';
import * as ctrl from './timetable.controller';
import { requireSchoolAuth } from '../middleware/auth';

// Sub-module routers
import templateRouter from './templates/template.routes';
import wellnessRouter from './wellness/wellness.routes';
import crisisRouter from './crisis/crisis.routes';
import reportRouter from './report/report.routes';

const router = Router();
router.use(requireSchoolAuth);

// Sub-modules
router.use('/templates', templateRouter);
router.use('/wellness', wellnessRouter);
router.use('/crisis', crisisRouter);
router.use('/reports', reportRouter);

// Core timetable operations
router.post('/generate', ctrl.generate);
router.post('/:id/validate', ctrl.validate);
router.get('/job/:jobId', ctrl.jobStatus);
router.get('/job/:jobId/stream', ctrl.streamJob);
router.get('/', ctrl.list);
router.get('/:id', ctrl.getOne);
router.delete('/:id', ctrl.remove);

export default router;
