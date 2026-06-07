import { Router } from 'express';
import * as userCtrl from '#modules/users/user.controller.js';
import { validate } from '#middleware/validate.middleware.js';
import { createUserSchema, updateUserSchema } from '#modules/users/user.validation.js';

const router = Router();

router.get('/', userCtrl.list);
router.get('/:id', userCtrl.getOne);
router.post('/', validate(createUserSchema), userCtrl.create);
router.put('/:id', validate(updateUserSchema), userCtrl.update);
router.delete('/:id', userCtrl.remove);

export default router;
