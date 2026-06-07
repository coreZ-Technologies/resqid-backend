import { Router } from 'express';
import * as studentCtrl from '#modules/students/student.controller.js';
import { validate } from '#middleware/validate.middleware.js';
import {
  createStudentSchema,
  updateStudentSchema,
  bulkCreateStudentSchema,
} from '#modules/students/student.validation.js';

const router = Router();

router.get('/', studentCtrl.list);
router.get('/stats', studentCtrl.stats);
router.get('/:id', studentCtrl.getOne);
router.post('/', validate(createStudentSchema), studentCtrl.create);
router.post('/bulk', validate(bulkCreateStudentSchema), studentCtrl.bulkCreate);
router.put('/:id', validate(updateStudentSchema), studentCtrl.update);
router.delete('/:id', studentCtrl.remove);

export default router;
