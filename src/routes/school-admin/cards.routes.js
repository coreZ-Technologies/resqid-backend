import { Router } from 'express';
import * as cardCtrl from '#modules/cards/card.controller.js';
import { validate } from '#middleware/validate.middleware.js';
import { orderCardsSchema } from '#modules/cards/card.validation.js';

const router = Router();

router.get('/', cardCtrl.list);
router.get('/:id', cardCtrl.getOne);
router.post('/order', validate(orderCardsSchema), cardCtrl.orderCards);
router.get('/order/:orderId/status', cardCtrl.getOrderStatus);

export default router;
