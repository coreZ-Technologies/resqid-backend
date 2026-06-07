import { Router } from 'express';
import * as notifCtrl from '#modules/notifications/notification.controller.js';

const router = Router();

router.get('/', notifCtrl.list);
router.post('/send', notifCtrl.send);
router.get('/templates', notifCtrl.listTemplates);

export default router;
