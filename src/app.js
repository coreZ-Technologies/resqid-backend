// =============================================================================
// app.js — RESQID
// Express application setup with complete middleware pipeline.
// =============================================================================

import express from 'express';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { ENV } from '#config/env.js';

// ─── Middleware pipeline ──────────────────────────────────────────────────────
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

// ─── Route groups ─────────────────────────────────────────────────────────────
import authRoutes from '#modules/auth/auth.routes.js';
import schoolAdminRoutes from '#routes/schoolAdmin.routes.js';
import superAdminRoutes from '#routes/superAdmin.routes.js';
import parentRoutes from '#modules/parents/parent.routes.js';
import scanRoutes from '#modules/scan/scan.routes.js';
import emergencyRoutes from '#modules/m2-emergency/emergency.routes.js';
import attendanceRoutes from '#modules/m3-attendance/attendance.routes.js';
import timetableRoutes from '#modules/m1-timetable/timetable.routes.js';
import communicationRoutes from '#modules/m4-communication/communication.routes.js';
import healthRoutes from '#monitoring/health.js';
import bullRoutes from '#routes/bullMQ.routes.js';
import tokenRoutes from '#modules/token/token.routes.js';

const app = express();

// =============================================================================
// 1. TRUST PROXY
// =============================================================================
app.set('trust proxy', ENV.TRUST_PROXY || 1);

// =============================================================================
// 2. BASIC PARSING + COMPRESSION
// =============================================================================
app.use(compression());
app.use(express.json({ limit: ENV.MAX_REQUEST_SIZE || '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// =============================================================================
// 3. GLOBAL MIDDLEWARE PIPELINE (ALL routes)
//    Order: maintenance → cloudflare → helmet → cors → requestId → httpLogger
//           → requestSize → contentType → hpp → xss → sanitizeNoSql
//           → sanitizeDeep → ipBlock → ipReputation → geoBlock → attackLogger
// =============================================================================
app.use(buildGlobalPipeline());

// =============================================================================
// 4. CORS ERROR HANDLER
// =============================================================================
app.use(handleCorsError);

// =============================================================================
// 5. HEALTH CHECKS (no auth)
// =============================================================================
app.use('/health', healthRoutes);

// =============================================================================
// 6. PUBLIC SCAN ROUTES (rate limited, no JWT)
//    /s/:code → QR scan redirect
//    /api/emergency/profile/:id → public emergency view
// =============================================================================
app.use('/s', publicCors, buildPublicScanPipeline(), scanRoutes);
app.use('/api/emergency', publicCors, buildPublicScanPipeline(), emergencyRoutes);

// =============================================================================
// 7. AUTH ROUTES (pre-authentication, strict rate limiting)
//    /api/auth/login, /api/auth/send-otp, /api/auth/verify-otp, etc.
// =============================================================================
app.use('/api/auth', buildAuthRoutesPipeline(), authRoutes);

// =============================================================================
// 8. DASHBOARD ROUTES (JWT + CSRF + tenant scope + geo-block)
// =============================================================================
app.use('/api/super-admin', buildDashboardPipeline(), superAdminRoutes);
app.use('/api/school-admin', buildDashboardPipeline(), schoolAdminRoutes);
app.use('/api/admin/queues', buildDashboardPipeline(), bullRoutes);

// =============================================================================
// 9. PROTECTED API ROUTES (JWT + tenant scope)
// =============================================================================
app.use('/api/parents', buildAuthPipeline(), parentRoutes);
app.use('/api/attendance', buildAuthPipeline(), attendanceRoutes);
app.use('/api/timetable', buildAuthPipeline(), timetableRoutes);
app.use('/api/communication', buildAuthPipeline(), communicationRoutes);
app.use('/api/tokens', buildAuthPipeline(), tokenRoutes);

// =============================================================================
// 10. 404 HANDLER (catch unmatched routes)
// =============================================================================
app.use(notFoundHandler);

// =============================================================================
// 11. GLOBAL ERROR HANDLER (must be last)
// =============================================================================
app.use(errorHandler);

export default app;
