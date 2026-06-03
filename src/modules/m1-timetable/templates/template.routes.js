import { Router } from 'express';
import * as ctrl from './template.controller.js';
import { requireSchoolAuth } from '#middleware/auth/index.js';

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
