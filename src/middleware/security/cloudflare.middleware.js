// =============================================================================
// cloudflare.middleware.js — RESQID
//
// Enforces all traffic through Cloudflare in production.
// Verified by CF-Ray header — injected by Cloudflare, cannot be spoofed.
//
// Also sets req.realIp from CF-Connecting-IP for accurate IP tracking.
// =============================================================================

import { ENV } from '#config/env.js';
import { logger } from '#config/logger.js';

const CF_RAY_REGEX = /^[0-9a-f]{16}-[A-Z]{3}$/i;

export function cloudflareOnly(req, res, next) {
  // Bypass if not behind Cloudflare
  if (!ENV.BEHIND_CLOUDFLARE) return next();

  const cfRay = req.headers['cf-ray'];

  if (!cfRay || !CF_RAY_REGEX.test(cfRay)) {
    logger.warn(
      {
        ip: req.ip,
        requestId: req.requestId,
        cfRay: cfRay || 'missing',
        path: req.path,
      },
      'Blocked: request did not originate from Cloudflare'
    );

    return res.status(403).json({
      success: false,
      statusCode: 403,
      message: 'Direct access not allowed',
      errorCode: 'DIRECT_ACCESS_FORBIDDEN',
    });
  }

  // Store CF-Ray for tracing
  res.locals.cfRay = cfRay;

  // Set real IP from Cloudflare header
  const cfIp = req.headers[ENV.CLOUDFLARE_IP_HEADER || 'cf-connecting-ip'];
  if (cfIp) {
    req.realIp = cfIp;
  }

  // Set country from Cloudflare header
  const cfCountry = req.headers[ENV.CLOUDFLARE_COUNTRY_HEADER || 'cf-ipcountry'];
  if (cfCountry) {
    req.cfCountry = cfCountry;
  }

  next();
}
