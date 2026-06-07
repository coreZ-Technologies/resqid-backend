import { Router } from 'express';
import * as parentCtrl from '#modules/parents/parent.controller.js';
import { validate } from '#middleware/validate.middleware.js';
import { createParentSchema, updateParentSchema } from '#modules/parents/parent.validation.js';

const router = Router();

router.get('/', parentCtrl.list);
router.get('/export', parentCtrl.exportList);
router.get('/:id', parentCtrl.getOne);
router.post('/', validate(createParentSchema), parentCtrl.create);
router.put('/:id', validate(updateParentSchema), parentCtrl.update);
router.delete('/:id', parentCtrl.remove);

export default router;
