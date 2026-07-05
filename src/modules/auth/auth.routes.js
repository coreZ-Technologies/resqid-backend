// =============================================================================
// modules/auth/auth.routes.js — RESQID
// Mounted at /api/auth
// =============================================================================

import { Router } from 'express';
import schoolAuthRoutes from './school_auth/schoolauth.routes.js';
import superAdminAuthRoutes from './super_admin_auth/superadmin.routes.js';

const router = Router();

// SCHOOL AUTH ROUTES
router.use('/school', schoolAuthRoutes);
// SUPER ADMIN AUTH ROUTES
router.use('/super-admin', superAdminAuthRoutes);

export default router;
