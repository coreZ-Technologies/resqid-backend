// src/modules/school-admin/card/card.routes.js
import { Router } from 'express';
import { CardController } from './card.controller.js';
import {
  createCardSchema,
  updateCardSchema,
  renewCardSchema,
  blockCardSchema,
  listCardsQuerySchema,
} from './card.validation.js';
import { validate } from '../../../middleware/validate.middleware.js';
import { authenticate } from '../../../middleware/auth/authenticate.middleware.js';
import { authorize } from '../../../middleware/auth/authorize.middleware.js';
import { restrictionOwnSchool } from '../../../middleware/restrictionOwnSchool.middleware.js';

const router = Router();

// All routes require authentication and school-admin role
router.use(authenticate);
router.use(authorize('SCHOOL_ADMIN'));
router.use(restrictionOwnSchool); // ensures schoolId matches

router.post(
  '/',
  validate(createCardSchema),
  CardController.createCard
);

router.get(
  '/',
  validate(listCardsQuerySchema, 'query'),
  CardController.listCards
);

router.get(
  '/:cardId',
  CardController.getCard
);

router.patch(
  '/:cardId',
  validate(updateCardSchema),
  CardController.updateCard
);

router.post(
  '/:cardId/renew',
  validate(renewCardSchema),
  CardController.renewCard
);

router.post(
  '/:cardId/block',
  validate(blockCardSchema),
  CardController.blockCard
);

router.post(
  '/:cardId/unblock',
  CardController.unblockCard
);

router.delete(
  '/:cardId',
  CardController.deleteCard
);

export default router;