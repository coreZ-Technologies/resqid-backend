// =============================================================================
// geoBlock.middleware.js — RESQID
//
// Blocks non-Indian IPs from dashboard routes.
// India-only product — reduces attack surface significantly.
//
// Public routes (/api/emergency, /api/auth, /api/parents) are EXEMPT —
// parents abroad must access the app, and emergency QR scans work globally.
// =============================================================================

import { ApiError } from '#shared/response/ApiError.js';
import { asyncHandler } from '#shared/response/asyncHandler.js';
import { extractIp } from '#shared/network/extractIp.js';
import { ENV } from '#config/env.js';
import { logger } from '#config/logger.js';

// ─── Config ───────────────────────────────────────────────────────────────────

const COUNTRY_HEADERS = ['cf-ipcountry', 'x-country-code', 'cloudfront-viewer-country'];

const GEO_BLOCKED_PREFIXES = ['/api/super-admin', '/api/school-admin'];

const GEO_EXEMPT_PREFIXES = [
  '/api/emergency',
  '/api/auth',
  '/api/parents',
  '/api/webhooks',
  '/health',
  '/api/health',
];

// Known Indian IP prefixes — lightweight fallback
const INDIAN_IP_PREFIXES = [
  '1.6.',
  '1.7.',
  '1.22.',
  '1.23.',
  '14.96.',
  '14.97.',
  '14.98.',
  '14.99.',
  '27.0.',
  '27.4.',
  '27.56.',
  '27.57.',
  '43.224.',
  '43.225.',
  '43.226.',
  '43.227.',
  '49.32.',
  '49.33.',
  '49.34.',
  '49.35.',
  '59.88.',
  '59.89.',
  '59.90.',
  '59.91.',
  '61.0.',
  '61.1.',
  '61.2.',
  '61.3.',
  '101.0.',
  '101.1.',
  '101.2.',
  '101.3.',
  '103.0.',
  '103.1.',
  '103.2.',
  '103.3.',
  '106.192.',
  '106.193.',
  '106.194.',
  '110.224.',
  '110.225.',
  '110.226.',
  '111.88.',
  '111.89.',
  '111.90.',
  '111.91.',
  '115.240.',
  '115.241.',
  '115.242.',
  '116.72.',
  '116.73.',
  '116.74.',
  '116.75.',
  '117.192.',
  '117.193.',
  '117.194.',
  '120.56.',
  '120.57.',
  '120.58.',
  '120.59.',
  '122.160.',
  '122.161.',
  '122.162.',
  '125.16.',
  '125.17.',
  '125.18.',
  '125.19.',
  '157.32.',
  '157.33.',
  '157.34.',
  '157.35.',
  '182.64.',
  '182.65.',
  '182.66.',
  '182.67.',
  '192.168.',
  '10.',
  '172.16.',
  '127.',
];

// ─── Core Middleware ──────────────────────────────────────────────────────────

export const geoBlock = asyncHandler(async (req, _res, next) => {
  // Skip if geo-blocking disabled
  if (!ENV.GEO_BLOCK_ENABLED) return next();

  // Skip in development
  if (ENV.IS_DEV) return next();

  // Only block dashboard routes
  const isDashboard = GEO_BLOCKED_PREFIXES.some((p) => req.path.startsWith(p));
  if (!isDashboard) return next();

  // Skip exempt routes
  if (GEO_EXEMPT_PREFIXES.some((p) => req.path.startsWith(p))) return next();

  const country = extractCountry(req);
  const ip = extractIp(req);

  // Definitive country header — enforce strictly
  if (country) {
    if (country.toUpperCase() !== 'IN') {
      logger.warn(
        { ip, country, path: req.path, requestId: req.requestId },
        'Non-Indian IP blocked'
      );
      throw ApiError.forbidden('Access restricted to India', 'GEO_BLOCKED');
    }
    return next();
  }

  // No country header — fallback to IP prefix check
  const isIndianIp = INDIAN_IP_PREFIXES.some((prefix) => ip.startsWith(prefix));

  if (!isIndianIp) {
    logger.warn({ ip, path: req.path, requestId: req.requestId }, 'Unknown IP prefix blocked');
    throw ApiError.forbidden('Access restricted to India', 'GEO_BLOCKED');
  }

  next();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractCountry(req) {
  for (const header of COUNTRY_HEADERS) {
    const value = req.headers[header];
    if (value && value.trim().length === 2) {
      return value.trim().toUpperCase();
    }
  }
  return null;
}
