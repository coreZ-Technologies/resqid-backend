// TODO: Add implementation
/**
 * app.js
 *
 * Express application setup.
 * Configures global middleware, mounts route groups,
 * and attaches the final error handler.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import hpp from 'hpp';
import cookieParser from 'cookie-parser';
import compression from 'compression';

// --- Configuration ---
import { env } from './config/env.js';
import { logger } from './config/logger.js';

// --- Middleware bundles ---
import { requestIdMiddleware } from './middleware/requestId.middleware.js';
import { httpLoggerMiddleware } from './middleware/httpLogger.middleware.js';
import { securityMiddleware } from './middleware/security/cloudflare.middleware.js'; // or a combined index
import { rateLimiter } from './middleware/security/rateLimit.middleware.js';
import { slowDownMiddleware } from './middleware/security/slowDown.middleware.js';
import { corsMiddleware } from './middleware/security/cors.middleware.js';
import { csrfMiddleware } from './middleware/security/csrf.middleware.js';
import { deviceFingerprintMiddleware } from './middleware/deviceFingerprint.middleware.js';
import { behavioralSecurityMiddleware } from './middleware/security/behavioralSecurity.middleware.js';
import { apiVersionMiddleware } from './middleware/apiVersion.middleware.js';
import { contentTypeMiddleware } from './middleware/contentType.middleware.js';
import { sanitizeMiddleware } from './middleware/sanitize.middleware.js';
import { maintenanceModeMiddleware } from './middleware/maintenanceMode.middleware.js';

// --- Route groups ---
import { authRouter } from './modules/auth/auth.routes.js';
import { schoolAdminRouter } from './routes/schoolAdmin.routes.js';
import { superAdminRouter } from './routes/superAdmin.routes.js';
import { parentRouter } from './modules/parents/parent.routes.js';
import { scanRouter } from './modules/scan/scan.routes.js';
import { attendanceRouter } from './modules/m3-attendance/attendance.routes.js';
import { timetableRouter } from './modules/m1-timetable/timetable.routes.js';
import { emergencyRouter } from './modules/m2-emergency/emergency.routes.js';
import { communicationRouter } from './modules/m4-communication/communication.routes.js';

// --- Special routes (public, health, etc.) ---
import { healthRouter } from './monitoring/health.js';
import { metricsRouter } from './monitoring/metrics.js';

// --- Error handling ---
import { errorMiddleware } from './middleware/error.middleware.js';
import { notFoundMiddleware } from './middleware/notFound.middleware.js'; // (you may have it)

const app = express();

// =====================================================
// 1. TRUST PROXY & BASIC PARSING
// =====================================================
app.set('trust proxy', true);          // Required for rate limiting & geo
app.use(compression());                // Compress responses
app.use(express.json({ limit: '1mb' })); // Parse JSON bodies
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// =====================================================
// 2. REQUEST ID & LOGGING (must be early)
// =====================================================
app.use(requestIdMiddleware);          // Assign X-Request-ID
app.use(httpLoggerMiddleware);         // Structured request logging

// =====================================================
// 3. GLOBAL SECURITY MIDDLEWARE
// =====================================================
app.use(helmet());                     // Secure HTTP headers
app.use(corsMiddleware);               // CORS (configured per env)
app.use(hpp());                        // HTTP Parameter Pollution
app.use(csrfMiddleware);               // CSRF token validation
app.use(rateLimiter);                  // Global rate limit
app.use(slowDownMiddleware);           // Dynamic slow down
app.use(securityMiddleware);           // Cloudflare / IP reputation / geo block
app.use(deviceFingerprintMiddleware);  // Device fingerprinting
app.use(behavioralSecurityMiddleware); // User behavior anomaly detection
app.use(apiVersionMiddleware);         // API version header check
app.use(contentTypeMiddleware);        // Enforce Content-Type
app.use(sanitizeMiddleware);           // Deep sanitise req.body / query / params

// =====================================================
// 4. MAINTENANCE MODE (before auth, but after security)
// =====================================================
app.use(maintenanceModeMiddleware);

// =====================================================
// 5. PUBLIC / NON‑AUTH ROUTES
// =====================================================
app.use('/health', healthRouter);       // Health check
app.use('/metrics', metricsRouter);     // Prometheus metrics (optional)

// =====================================================
// 6. AUTHENTICATION & TENANT SETUP (on route groups)
// =====================================================
// These are usually applied inside route files, not globally.
// But we could mount a global authenticate for all /api routes if we want.
// Here we keep them modular.

// =====================================================
// 7. MOUNT MODULE ROUTES
// =====================================================
app.use('/api/auth', authRouter);                   // Login, refresh, logout
app.use('/api/school-admin', schoolAdminRouter);    // School admin dashboard & features
app.use('/api/super-admin', superAdminRouter);      // Super admin cross‑school management
app.use('/api/parents', parentRouter);              // Parent app
app.use('/api/scan', scanRouter);                   // Scan & emergency initiation
app.use('/api/emergency', emergencyRouter);         // Emergency module (may be part of scan)
app.use('/api/attendance', attendanceRouter);       // Attendance taps & records
app.use('/api/timetable', timetableRouter);         // Timetable generation & viewing
app.use('/api/communication', communicationRouter); // School ↔ parent messaging

// =====================================================
// 8. 404 HANDLER
// =====================================================
app.use(notFoundMiddleware);          // Catch‑all for unmatched routes

// =====================================================
// 9. GLOBAL ERROR HANDLER
// =====================================================
app.use(errorMiddleware);             // Centralised error response

// =====================================================
// 10. EXPORT APP (server.js will start listening)
// =====================================================
export default app;