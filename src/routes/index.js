<<<<<<< HEAD
import { Router } from 'express';
import notificationRoutes from '../modules/share/notification/notification.router.js';

const router = Router();

// Mount notification module under /api/notifications
router.use('/notifications', notificationRoutes);

// If you have other module routes, mount them here:
// router.use('/auth', authRoutes);
// router.use('/schools', schoolRoutes);
// router.use('/students', studentRoutes);
// router.use('/communication', communicationRoutes);
// etc.

export default router;
=======
// SCHOOLADMIN
>>>>>>> 2306bae69da370bc7bfb048c15cfd0f99e474bff
