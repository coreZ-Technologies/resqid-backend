// =============================================================================
// app.js — RESQID
// =============================================================================

import express from 'express';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { ENV } from '#config/env.js';

import {
  buildGlobalPipeline,
  buildAuthPipeline,
  buildPublicScanPipeline,
  buildDashboardPipeline,
  buildAuthRoutesPipeline,
  errorHandler,
  notFoundHandler,
  handleCorsError,
  publicCors,
} from '#middleware/middleware.index.js';

import authRoutes from '#modules/auth/auth.routes.js';
import schoolAdminRoutes from '#routes/schoolAdmin.routes.js';
import superAdminRoutes from '#routes/superAdmin.routes.js';
import parentRoutes from '#modules/parents/parent.routes.js';
import scanRoutes from '#modules/scan/scan.routes.js';
import emergencyRoutes from '#modules/m2-emergency/emergency.routes.js';
import attendanceRoutes from '#modules/m3-attendance/attendance.routes.js';
import timetableRoutes from '#modules/m1-timetable/timetable.routes.js';
import crisisRoutes from '#modules/m1-timetable/crisis/crisis.routes.js';
import reportRoutes from '#modules/m1-timetable/report/report.routes.js';
import wellnessRoutes from '#modules/m1-timetable/wellness/wellness.routes.js';
import templateRoutes from '#modules/m1-timetable/templates/template.routes.js';
import communicationRoutes from '#modules/m4-communication/communication.routes.js';
import healthRoutes from '#monitoring/health.js';
import bullRoutes from '#routes/bullMQ.routes.js';
import tokenRoutes from '#modules/token/token.routes.js';

const app = express();

app.set('trust proxy', ENV.TRUST_PROXY || 1);
app.use(compression());
app.use(express.json({ limit: ENV.MAX_REQUEST_SIZE || '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());
app.use(buildGlobalPipeline());
app.use(handleCorsError);
app.use('/health', healthRoutes);
app.use('/s', publicCors, buildPublicScanPipeline(), scanRoutes);
app.use('/api/emergency', publicCors, buildPublicScanPipeline(), emergencyRoutes);
app.use('/api/auth', buildAuthRoutesPipeline(), authRoutes);
app.use('/api/super-admin', buildDashboardPipeline(), superAdminRoutes);
app.use('/api/school-admin', buildDashboardPipeline(), schoolAdminRoutes);
app.use('/api/admin/queues', buildDashboardPipeline(), bullRoutes);
app.use('/api/wellness', buildDashboardPipeline(), wellnessRoutes);
app.use('/api/parents', buildAuthPipeline(), parentRoutes);
app.use('/api/attendance', buildAuthPipeline(), attendanceRoutes);
app.use('/api/timetable', buildAuthPipeline(), timetableRoutes);
app.use('/api/crisis', buildAuthPipeline(), crisisRoutes);
app.use('/api/reports', buildAuthPipeline(), reportRoutes);
app.use('/api/templates', buildAuthPipeline(), templateRoutes);
app.use('/api/communication', buildAuthPipeline(), communicationRoutes);
app.use('/api/tokens', buildAuthPipeline(), tokenRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
