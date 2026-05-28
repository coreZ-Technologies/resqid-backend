// =============================================================================
// helmet.middleware.js — RESQID
//
// Security headers — different policies per route type.
// Dashboard: strict CSP. Public: relaxed CSP. API: CSP disabled (JSON only).
// =============================================================================

import helmet from 'helmet';
import { ENV } from '#config/env.js';

const IS_PROD = ENV.IS_PROD;
const CDN_URL = ENV.AWS_CDN_DOMAIN || '';

// ─── Shared Base ──────────────────────────────────────────────────────────────

const baseConfig = {
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: IS_PROD ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
  noSniff: true,
  ieNoOpen: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: false,
  permittedCrossDomainPolicies: { permittedPolicies: 'none' },
};

// ─── Dashboard (Super Admin + School Admin) ───────────────────────────────────

export const dashboardHelmet = helmet({
  ...baseConfig,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:', CDN_URL].filter(Boolean),
      fontSrc: ["'self'", 'data:'],
      connectSrc: ["'self'", ENV.API_URL].filter(Boolean),
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: IS_PROD ? [] : null,
    },
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'same-origin' },
});

// ─── Public Emergency Page ────────────────────────────────────────────────────

export const publicHelmet = helmet({
  ...baseConfig,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', CDN_URL].filter(Boolean),
      fontSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'none'"],
      upgradeInsecureRequests: IS_PROD ? [] : null,
    },
  },
  crossOriginOpenerPolicy: { policy: 'unsafe-none' },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginEmbedderPolicy: false,
});

// ─── API Routes (JSON only) ───────────────────────────────────────────────────

export const apiHelmet = helmet({
  ...baseConfig,
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'same-origin' },
});

export const helmetMiddleware = apiHelmet;
