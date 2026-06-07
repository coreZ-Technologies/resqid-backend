// routes/parent.routes.js

import { Router } from 'express';
import { authenticate } from '#middleware/auth/authenticate.middleware.js';
import { authorize } from '#middleware/auth/authorize.middleware.js';
import { ROLES } from '#shared/constants/roles.js';
import * as parentCtrl from '#modules/parents/parent.controller.js';
import { validate } from '#middleware/validate.middleware.js';
import { updateOwnProfileSchema } from '#modules/parents/parent.validation.js';

const router = Router();
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
