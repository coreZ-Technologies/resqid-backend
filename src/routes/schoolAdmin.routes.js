// =============================================================================
// routes/schoolAdmin.routes.js — RESQID
// Master School Admin Router
// Mounted at /api/school-admin
// =============================================================================

import { Router } from 'express';
import { authenticate } from '#middleware/auth/authenticate.middleware.js';
import { authorize } from '#middleware/auth/authorize.middleware.js';
import { ROLES } from '#shared/constants/roles.js';

// ─── Sub-Routers ──────────────────────────────────────────────────────────────
import studentRoutes from '#modules/school-admin/students.routes.js';
import teacherRoutes from '#modules/school-admin/teachers.routes.js';
import classRoutes from '#modules/school-admin/classes.routes.js';
import subjectRoutes from '#modules/school-admin/subjects.routes.js';
import parentRoutes from '#modules/school-admin/parents.routes.js';
import scanRoutes from '#modules/school-admin/scans.routes.js';
import anomalyRoutes from '#modules/school-admin/anomalies.routes.js';
import attendanceRoutes from '#modules/school-admin/attendance.routes.js';
import deviceRoutes from '#modules/school-admin/attendance-devices.routes.js';
import emergencyRoutes from '#modules/school-admin/emergency.routes.js';
import emergencyContactRoutes from '#modules/school-admin/emergency-contacts.routes.js';
import communicationRoutes from '#modules/school-admin/communication.routes.js';
import timetableRoutes from '#modules/school-admin/timetable.routes.js';
import substitutionRoutes from '#modules/school-admin/timetable-substitutions.routes.js';
import reportRoutes from '#modules/school-admin/reports.routes.js';
import settingsRoutes from '#modules/school-admin/settings.routes.js';
import dashboardRoutes from '#modules/school-admin/dashboard.routes.js';
import cardRoutes from '#modules/school-admin/cards.routes.js';
import userRoutes from '#modules/school-admin/users.routes.js';
import notificationRoutes from '#modules/school-admin/notifications.routes.js';

const router = Router();

const ADMIN = [ROLES.SCHOOL_ADMIN, ROLES.SUPER_ADMIN];
const STAFF = [ROLES.TEACHER, ROLES.SCHOOL_ADMIN, ROLES.SUPER_ADMIN];

// All routes require authentication
router.use(authenticate);

// =============================================================================
// Mount sub-routers with role-based authorization
// =============================================================================

router.use('/dashboard', authorize(...STAFF), dashboardRoutes);
router.use('/students', authorize(...STAFF), studentRoutes);
router.use('/teachers', authorize(...ADMIN), teacherRoutes);
router.use('/classes', authorize(...ADMIN), classRoutes);
router.use('/subjects', authorize(...ADMIN), subjectRoutes);
router.use('/parents', authorize(...ADMIN), parentRoutes);
router.use('/scans', authorize(...ADMIN), scanRoutes);
router.use('/anomalies', authorize(...ADMIN), anomalyRoutes);
router.use('/attendance', authorize(...STAFF), attendanceRoutes);
router.use('/attendance/devices', authorize(...ADMIN), deviceRoutes);
router.use('/emergency', authorize(...STAFF), emergencyRoutes);
router.use('/emergency/contacts', authorize(...ADMIN), emergencyContactRoutes);
router.use('/communication', authorize(...ADMIN), communicationRoutes);
router.use('/timetable', authorize(...ADMIN), timetableRoutes);
router.use('/timetable/substitutions', authorize(...ADMIN), substitutionRoutes);
router.use('/reports', authorize(...STAFF), reportRoutes);
router.use('/settings', authorize(...ADMIN), settingsRoutes);
router.use('/cards', authorize(...ADMIN), cardRoutes);
router.use('/users', authorize(...ADMIN), userRoutes);
router.use('/notifications', authorize(...ADMIN), notificationRoutes);

export default router;
