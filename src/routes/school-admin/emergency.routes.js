import { Router } from 'express';
import * as emergencyCtrl from '#modules/m2-emergency/emergency.controller.js';
import { validate } from '#middleware/validate.middleware.js';
import { emergencyDrillSchema } from '#modules/m2-emergency/emergency.validation.js';

const router = Router();

router.get('/profiles', emergencyCtrl.listProfiles);
router.get('/profiles/:studentId', emergencyCtrl.getProfile);
router.get('/incidents', emergencyCtrl.getIncidents);
router.get('/incidents/:incidentId', emergencyCtrl.getIncident);
router.put('/incidents/:incidentId/resolve', emergencyCtrl.resolveIncident);
router.get('/drills', emergencyCtrl.getDrills);
router.post('/drills', validate(emergencyDrillSchema), emergencyCtrl.logDrill);
router.get('/access-logs/:studentId', emergencyCtrl.getAccessLogs);

export default router;
