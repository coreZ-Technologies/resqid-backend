import { Router } from 'express';
import schoolAuthRoutes from './school_auth/schoolauth.routes.js';
import superAdminAuthRoutes from './super_admin_auth/superadmin.routes.js';
import schoolUserAuthRoutes from './school_user_auth/schooluser.routes.js';

const router = Router();

router.use('/school', schoolAuthRoutes);
router.use('/super-admin', superAdminAuthRoutes);
router.use('/user', schoolUserAuthRoutes);

export default router;
