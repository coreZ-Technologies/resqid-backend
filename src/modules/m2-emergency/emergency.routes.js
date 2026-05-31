// =============================================================================
// modules/emergency/emergency.routes.js — RESQID
// =============================================================================
import { Router } from 'express';
import emergencyController from './emergency.controller.js';
import { authenticate } from '#middleware/auth/authenticate.middleware.js';
import { authorize } from '#middleware/auth/authorize.middleware.js';
import { tenantScope } from '#middleware/auth/tenantScope.middleware.js';
import { validate } from '#middleware/validate.middleware.js';
import { auditLog } from '#middleware/logging/auditLog.middleware.js';
import { requireModule } from '#middleware/requireModule.middleware.js';
import emergencyValidation from './emergency.validation.js';

const router = Router();

router.use(authenticate);
router.use(tenantScope);
router.use(requireModule('emergency'));

// All emergency endpoints require at least teacher access (to view profiles)
router.use(authorize(['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER']));

router.get(
  '/students',
  validate(emergencyValidation.studentQuery, 'query'),
  emergencyController.listStudents
);

router.get(
  '/students/:studentId',
  validate(emergencyValidation.studentIdParam, 'params'),
  emergencyController.getStudentProfile
);

router.get(
  '/incidents',
  validate(emergencyValidation.incidentQuery, 'query'),
  emergencyController.listIncidents
);

router.post(
  '/incidents',
  validate(emergencyValidation.createIncident),
  auditLog('emergency.incident.create'),
  emergencyController.createIncident
);

router.get(
  '/stats',
  emergencyController.getStats
);

const emergencyRoutes = Router();
emergencyRoutes.use('/emergency', router);

export default emergencyRoutes;