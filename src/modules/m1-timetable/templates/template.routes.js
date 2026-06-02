// template.routes.js
import { Router } from 'express';
import * as ctrl from './template.controller.js';
<<<<<<< HEAD:src/modules/m1-timetable-main/templates/template.routes.js
import { requireSchoolAuth } from '#middleware/auth/authenticate.middleware.js';
=======
import { requireSchoolAuth } from '#middleware/auth/index.js';
>>>>>>> fabab30814b5de0a43a81ff99096e81e66add097:src/modules/m1-timetable/templates/template.routes.js

const router = Router();
router.use(requireSchoolAuth);

router.post('/', ctrl.create);
router.get('/', ctrl.list);
router.get('/:id', ctrl.getOne);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);
router.post('/:id/activate', ctrl.activate);
router.post('/:id/duplicate', ctrl.duplicate);
router.post('/:id/archive', ctrl.archive);

export default router;