// src/modules/school-admin/tokens/token.routes.js
import { Router } from 'express';
import { TokenController } from './token.controller.js';
import {
  createTokenSchema,
  assignTokenSchema,
  unassignTokenSchema,
  updateTokenSchema,
  renewTokenSchema,
  revokeTokenSchema,
  regenerateQrSchema,
  listTokensQuerySchema,
} from './token.validation.js';
import { validate } from '#middleware/validate.middleware.js';
import { authenticate } from '#middleware/auth/authenticate.middleware.js';
import { authorize } from '#middleware/auth/authorize.middleware.js';
import { ownTokenOnly } from '#middleware/restrictionOwnSchool.middleware.js';
import { tenantScope } from '#middleware/auth/tenantScope.middleware.js';

const router = Router();

// All routes require authentication and school-admin role
router.use(authenticate);
router.use(authorize('SCHOOL_ADMIN'));
router.use(tenantScope); // sets req.schoolId from user

router.post(
  '/',
  validate(createTokenSchema),
  TokenController.createToken
);

router.get(
  '/',
  validate(listTokensQuerySchema, 'query'),
  TokenController.listTokens
);

router.get(
  '/:tokenId',
  ownTokenOnly,
  TokenController.getToken
);

router.patch(
  '/:tokenId',
  ownTokenOnly,
  validate(updateTokenSchema),
  TokenController.updateToken
);

router.post(
  '/:tokenId/assign',
  ownTokenOnly,
  validate(assignTokenSchema),
  TokenController.assignToken
);

router.post(
  '/:tokenId/unassign',
  ownTokenOnly,
  validate(unassignTokenSchema),
  TokenController.unassignToken
);

router.post(
  '/:tokenId/renew',
  ownTokenOnly,
  validate(renewTokenSchema),
  TokenController.renewToken
);

router.post(
  '/:tokenId/revoke',
  ownTokenOnly,
  validate(revokeTokenSchema),
  TokenController.revokeToken
);

router.post(
  '/:tokenId/regenerate-qr',
  ownTokenOnly,
  validate(regenerateQrSchema),
  TokenController.regenerateQr
);

router.delete(
  '/:tokenId',
  ownTokenOnly,
  TokenController.deleteToken
);

export default router;