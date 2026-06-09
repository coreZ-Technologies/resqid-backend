import { Router } from 'express';
import * as timetableCtrl from '#modules/m1-timetable/timetable.controller.js';
import * as templateCtrl from '#modules/m1-timetable/templates/template.controller.js';
import { validate } from '#middleware/validate.middleware.js';
import {
  generateSchema,
  uploadTimetableSchema,
} from '#modules/m1-timetable/timetable.validation.js';

const router = Router();

router.post('/generate', validate(generateSchema), timetableCtrl.generate);
router.post('/upload', validate(uploadTimetableSchema), timetableCtrl.upload);
router.get('/job/:jobId', timetableCtrl.jobStatus);
router.get('/job/:jobId/stream', timetableCtrl.streamJob);
router.get('/', timetableCtrl.list);
router.get('/:id', timetableCtrl.getOne);
router.patch('/:id/status', timetableCtrl.updateStatus);
router.delete('/:id', timetableCtrl.remove);

export default router;
