// routes/parent.routes.js

import { Router } from 'express';
import { authenticate } from '#middleware/auth/authenticate.middleware.js';
import { authorize } from '#middleware/auth/authorize.middleware.js';
import { ROLES } from '#shared/constants/roles.js';
import * as parentCtrl from '#modules/parents/parent.controller.js';
import { validate } from '#middleware/validate.middleware.js';
import { updateOwnProfileSchema } from '#modules/parents/parent.validation.js';
import { authSlowDown } from '#middleware/security/slowDown.middleware.js';
import { authLimiter, otpLimiter } from '#middleware/security/rateLimit.middleware.js';
import {
  registerInitSchema,
  registerParentSchema,
  sendOtpSchema,
  verifyOtpSchema,
} from '#modules/auth/auth.validation.js';
import { registerInit, registerParent, sendOtp, verifyOtp } from '#modules/auth/auth.controller.js';

const router = Router();

// parent login routes for Mobile Auth
router.post('/send-otp', authSlowDown, otpLimiter, validate(sendOtpSchema), sendOtp);
router.post('/verify-otp', authSlowDown, authLimiter, validate(verifyOtpSchema), verifyOtp);
router.post('/register/init', authSlowDown, otpLimiter, validate(registerInitSchema), registerInit);
router.post(
  '/register/verify',
  authSlowDown,
  authLimiter,
  validate(registerParentSchema),
  registerParent
);

router.use(authenticate, authorize(ROLES.PARENT));
// =============================================================================
// SELF-SERVICE
// =============================================================================

// Get own profile with children
router.get('/me', parentCtrl.getMe);

// Update own profile (restricted fields only)
router.put('/me', validate(updateOwnProfileSchema), parentCtrl.updateOwnProfile);

// =============================================================================
// CHILDREN
// =============================================================================

// View own children
router.get('/children', parentCtrl.listChildren);

// View child's emergency profile
router.get('/children/:studentId/emergency', parentCtrl.getChildEmergency);

// Update child's card visibility
router.put('/children/:studentId/visibility', parentCtrl.updateVisibility);

// Lock child's card
router.post('/children/:studentId/lock', parentCtrl.lockCard);

// =============================================================================
// NOTIFICATIONS
// =============================================================================

// Update notification preferences
router.put('/notifications', parentCtrl.updateNotifications);

// Register device for push
router.post('/device', parentCtrl.registerDevice);

export default router;
