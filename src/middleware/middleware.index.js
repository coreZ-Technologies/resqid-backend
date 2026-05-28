// =============================================================================
// middleware.index.js — RESQID
// Barrel file that re‑exports all middleware in one place.
// app.js imports everything from here to keep the main file clean.
// =============================================================================

// Logging (traditional file‑based access logs via Morgan)
import morgan from 'morgan';
import { createStream } from 'rotating-file-stream';
import path from 'path';
import { fileURLToPath } from 'url';
import { ENV } from '../config/env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const accessStream = createStream('access.log', {
  interval: '1d',
  path: path.resolve(__dirname, '../../logs/access'),
  maxFiles: 14,
});

const skipHealth = req => req.path === '/health' || req.path === '/api/health';

export const accessLogger = morgan(ENV.NODE_ENV === 'production' ? 'tiny' : 'dev', {
  stream: accessStream,
  skip: skipHealth,
});

// ── Security & Utility Middleware ────────────────────────────────────────────
export { apiVersion } from './apiVersion.middleware.js';
export { enforceContentType } from './contentType.middleware.js';
export { verifyDevice, invalidateDeviceCache } from './deviceFingerprint.middleware.js';
export { globalErrorHandler, notFoundHandler, setupProcessErrorHandlers } from './error.middleware.js';
export { maintenanceMode, flushMaintenanceCache } from './maintenanceMode.middleware.js';

// ── Auth Middleware (when you generate them) ─────────────────────────────────
// export { authenticate } from './auth/authenticate.middleware.js';
// export { rbac } from './auth/rbac.middleware.js';
// export { tenantScope } from './auth/tenantScope.middleware.js';

// ── HTTP Structured Logger (if you have httpLogger.middleware.js) ────────────
// export { httpLogger } from './httpLogger.middleware.js';

// ── Other Middleware ─────────────────────────────────────────────────────────
// export { sanitize } from './sanitize.middleware.js';
// export { validate } from './validate.middleware.js';