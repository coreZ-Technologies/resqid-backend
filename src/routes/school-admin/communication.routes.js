import { Router } from 'express';
import * as commCtrl from '#modules/m4-communication/communication.controller.js';
import { validate } from '#middleware/validate.middleware.js';
import {
  createAnnouncementSchema,
  sendMessageSchema,
  createCampaignSchema,
} from '#modules/m4-communication/communication.validation.js';

const router = Router();

router.get('/announcements', commCtrl.listAnnouncements);
router.post('/announcements', validate(createAnnouncementSchema), commCtrl.createAnnouncement);
router.get('/announcements/:id', commCtrl.getAnnouncement);
router.delete('/announcements/:id', commCtrl.deleteAnnouncement);
router.get('/messages', commCtrl.listMessages);
router.post('/messages', validate(sendMessageSchema), commCtrl.sendMessage);
router.get('/templates', commCtrl.listTemplates);
router.post('/templates', commCtrl.createTemplate);
router.delete('/templates/:id', commCtrl.deleteTemplate);
router.get('/campaigns', commCtrl.listCampaigns);
router.post('/campaigns', validate(createCampaignSchema), commCtrl.createCampaign);
router.get('/campaigns/:id', commCtrl.getCampaign);

export default router;
