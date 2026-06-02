import { Router } from 'express';
import * as ctrl from './crisis.controller.js';
import { requireSchoolAuth } from '#middleware/auth/authenticate.middleware.js';

const router = Router();

// All crisis routes require school authentication
router.use(requireSchoolAuth);

// Trigger a new crisis
router.post('/', ctrl.triggerCrisis);

// List active crises (must be before :crisisId routes)
router.get('/active', ctrl.getActiveCrises);

// Crisis history with filters
router.get('/history', ctrl.getCrisisHistory);

// Poll job status
router.get('/job/:jobId', ctrl.getCrisisJobStatus);

// Get specific crisis details
router.get('/:crisisId', ctrl.getCrisisDetails);

// Resolve a crisis
router.post('/:crisisId/resolve', ctrl.resolveCrisis);

export default router;
