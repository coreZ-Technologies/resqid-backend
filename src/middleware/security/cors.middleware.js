// =============================================================================
// cors.middleware.js — RESQID
//
// Strict origin allowlist — unknown origin = hard block.
// Public emergency endpoint has its own permissive CORS policy.
// =============================================================================

import cors from 'cors';
import { ENV } from '#config/env.js';

// ─── Allowed Origins ──────────────────────────────────────────────────────────

const DASHBOARD_ORIGINS = new Set(
  [
    ENV.SUPER_ADMIN_URL,
    ENV.SCHOOL_ADMIN_URL,
    ...(ENV.IS_DEV ? ['http://localhost:3000', 'http://localhost:5173'] : []),
  ].filter(Boolean)
);

const MOBILE_APP_ORIGINS = new Set(
  ['capacitor://localhost', 'http://localhost', ENV.MOBILE_APP_SCHEME].filter(Boolean)
);

// ─── CORS Factory ─────────────────────────────────────────────────────────────

function buildCors(allowedOrigins, { credentials = true } = {}) {
  return cors({
    origin(origin, callback) {
      // Allow requests with no origin (server-to-server, mobile apps, curl)
      if (!origin) return callback(null, true);

      if (allowedOrigins.has(origin)) return callback(null, true);

      // Unknown origin — hard block
      return callback(new Error(`CORS: origin '${origin}' not allowed`));
    },
    credentials,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Request-ID',
      'X-CSRF-Token',
      'X-Device-ID',
      'X-Device-Signature',
      'X-API-Key',
      'X-API-Version',
    ],
    exposedHeaders: [
      'X-Request-ID',
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
      'Retry-After',
      'X-Behavioral-Score',
    ],
    maxAge: 600,
    optionsSuccessStatus: 204,
  });
}

// ─── Exported Policies ────────────────────────────────────────────────────────

/** Dashboard CORS — /api/super-admin, /api/school-admin */
export const dashboardCors = buildCors(DASHBOARD_ORIGINS, { credentials: true });

/** Mobile CORS — /api/auth, /api/parents */
export const mobileCors = buildCors(new Set([...DASHBOARD_ORIGINS, ...MOBILE_APP_ORIGINS]), {
  credentials: true,
});

/** Public CORS — /api/emergency, /s/:scanCode (QR scans from any phone) */
export const publicCors = cors({
  origin: '*',
  credentials: false,
  methods: ['GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-Request-ID'],
  maxAge: 300,
  optionsSuccessStatus: 204,
});

/** Default global policy */
export const corsMiddleware = mobileCors;

/** CORS error handler — registered after cors() */
export function handleCorsError(err, req, res, next) {
  if (err.message?.startsWith('CORS:')) {
    return res.status(403).json({
      success: false,
      message: 'CORS policy violation',
      errorCode: 'CORS_BLOCKED',
      requestId: req.requestId || 'unknown',
    });
  }
  next(err);
}
