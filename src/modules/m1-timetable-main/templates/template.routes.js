import { Router } from 'express';
import * as ctrl from './template.controller';
import { requireSchoolAuth } from '#middleware/auth';

const router = Router();

router.use(requireSchoolAuth);

router.post('/', ctrl.create);
router.get('/', ctrl.list);
router.get('/:id', ctrl.getOne);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

export default router;
