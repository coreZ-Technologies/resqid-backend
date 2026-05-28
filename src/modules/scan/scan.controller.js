<<<<<<< HEAD
// TODO: Add implementation
// =============================================================================
// modules/scan/scan.controller.js — RESQID
//
// Handles GET /s/:code — the public QR scan endpoint.
// NO AUTH — guards are entirely in the middleware chain (scan.routes.js).
//
// startTime uses performance.now() for monotonic, drift-safe latency tracking.
// =============================================================================

import { performance } from 'perf_hooks';
=======
// =============================================================================
// modules/scan/scan.controller.js — RESQID
// Handles GET /s/:code — public QR scan endpoint. NO AUTH.
// =============================================================================

>>>>>>> d6d1c2d1f9491eb08dd3635a1ab69697f9d14590
import crypto from 'crypto';
import { resolveScan } from './scan.service.js';
import { asyncHandler } from '#shared/response/asyncHandler.js';
import { extractIp } from '#shared/network/extractIp.js';
import { logger } from '#config/logger.js';

<<<<<<< HEAD
const DEVICE_HASH_LENGTH = 16;

export const scanQr = asyncHandler(async (req, res) => {
  const startTime = performance.now();
  const { code } = req.params;
  const ip = extractIp(req);

  // Extract location from query params
  const { lat, lng, acc } = req.query;
  const latitude = lat ? parseFloat(lat) : null;
  const longitude = lng ? parseFloat(lng) : null;
  const accuracy = acc ? parseFloat(acc) : null;

  const fingerprintSource = [
    req.headers['user-agent'] ?? '',
    req.headers['accept-language'] ?? '',
    req.headers['accept-encoding'] ?? '',
    ip,
  ].join('|');

  const deviceHash = crypto
    .createHash('sha256')
    .update(fingerprintSource)
    .digest('hex')
    .slice(0, DEVICE_HASH_LENGTH);

  const rawScanCount = req.scanCount;
  const scanCount = Number.isInteger(rawScanCount) && rawScanCount > 0 ? rawScanCount : 1;

  logger.debug(
    { code: code?.slice(0, 8) + '…', ip, deviceHash, latitude, longitude, accuracy },
    '[scan.controller] incoming scan'
  );
=======
export const scanQr = asyncHandler(async (req, res) => {
  const { code } = req.params;
  const ip = extractIp(req);
  const userAgent = req.headers['user-agent'] || null;
  const scanCount = req.scanCount || 1;

  // GPS from query params (optional)
  const lat = req.query.lat ? parseFloat(req.query.lat) : null;
  const lng = req.query.lng ? parseFloat(req.query.lng) : null;

  // Device hash for tracking
  const deviceHash = crypto
    .createHash('sha256')
    .update(`${userAgent || ''}|${ip}`)
    .digest('hex')
    .slice(0, 16);

  logger.info({ code: code?.slice(0, 8), ip }, '[scan] Incoming');
>>>>>>> d6d1c2d1f9491eb08dd3635a1ab69697f9d14590

  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
<<<<<<< HEAD
    'Referrer-Policy': 'no-referrer',
=======
>>>>>>> d6d1c2d1f9491eb08dd3635a1ab69697f9d14590
  });

  const result = await resolveScan({
    code,
    ip,
<<<<<<< HEAD
    userAgent: req.headers['user-agent'] ?? null,
    deviceHash,
    startTime,
    scanCount,
    latitude,
    longitude,
    accuracy,
=======
    userAgent,
    deviceHash,
    scanCount,
    latitude: lat,
    longitude: lng,
>>>>>>> d6d1c2d1f9491eb08dd3635a1ab69697f9d14590
  });

  const statusMap = {
    ACTIVE: 200,
<<<<<<< HEAD
    INACTIVE: 200,
    UNREGISTERED: 200,
    ISSUED: 200,
    INVALID: 400,
    ERROR: 500,
  };
  const httpStatus = statusMap[result.state] ?? 200;

  return res.status(httpStatus).json(result);
=======
    ISSUED: 200,
    INACTIVE: 200,
    UNREGISTERED: 200,
    EXPIRED: 200,
    REVOKED: 200,
    INVALID: 400,
  };
  return res.status(statusMap[result.state] || 200).json(result);
>>>>>>> d6d1c2d1f9491eb08dd3635a1ab69697f9d14590
});
