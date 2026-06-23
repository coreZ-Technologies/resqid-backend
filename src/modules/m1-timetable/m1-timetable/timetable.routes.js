import { Router } from 'express';
import * as ctrl from './timetable.controller.js';
import { requireSchoolAuth } from '#middleware/auth/authenticate.middleware.js';

const router = Router();

// All timetable routes require school authentication
router.use(requireSchoolAuth);

// Generation & upload
router.post('/generate', ctrl.generate);
router.post('/upload', ctrl.upload);

// Job status (must be before :id routes)
router.get('/job/:jobId', ctrl.jobStatus);
router.get('/job/:jobId/stream', ctrl.streamJob);

// List all timetables
router.get('/', ctrl.list);

// Single timetable operations
router.get('/:id', ctrl.getOne);
router.post('/:id/validate', ctrl.validate);
router.patch('/:id/status', ctrl.updateStatus);
router.delete('/:id', ctrl.remove);

export default router;
