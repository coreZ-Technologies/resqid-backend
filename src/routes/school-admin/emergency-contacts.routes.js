import { Router } from 'express';
import * as emergencyCtrl from '#modules/m2-emergency/emergency.controller.js';

const router = Router();

router.get('/:studentId', emergencyCtrl.getContacts);
router.post('/:studentId', emergencyCtrl.addContact);
router.put('/:contactId', emergencyCtrl.updateContact);
router.delete('/:contactId', emergencyCtrl.deleteContact);

export default router;
