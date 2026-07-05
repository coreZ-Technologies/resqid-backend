import { Router } from 'express';
// import notificationRoutes from '../modules/share/notification/notification.router.js';
import authRoutes from '../modules/auth/auth.routes.js';

const router = Router();

// Mount auth module under /api/auth
router.use('/auth', authRoutes);

// Mount notification module under /api/notifications
// router.use('/notifications', notificationRoutes);

// If you have other module routes, mount them here:
// router.use('/schools', schoolRoutes);
// router.use('/students', studentRoutes);
// router.use('/communication', communicationRoutes);
// etc.

export default router;
