// =============================================================================
// modules/scan/scan.controller.js — RESQID
// Handles GET /s/:code — public QR scan endpoint. NO AUTH.
// =============================================================================

import crypto from 'crypto';
import { resolveScan } from './scan.service.js';
import { asyncHandler } from '#shared/response/asyncHandler.js';
import { extractIp } from '#shared/network/extractIp.js';
import { logger } from '#config/logger.js';

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

  logger.info({ code: code?.slice(0, 8), ip }, '[scan] Incoming QR scan');

  // Security headers
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
  });

  // Resolve the scan
  const result = await resolveScan({
    code,
    ip,
    userAgent,
    deviceHash,
    scanCount,
    latitude: lat,
    longitude: lng,
  });

  // Map result state to HTTP status
  const statusMap = {
    ACTIVE: 200,
    ISSUED: 200,
    INACTIVE: 200,
    UNREGISTERED: 200,
    EXPIRED: 200,
    REVOKED: 200,
    VALID: 200,
    INVALID: 400,
    ERROR: 500,
  };

  const statusCode = statusMap[result.state] || 200;

  // Log successful scans
  if (statusCode === 200) {
    logger.info(
      {
        studentId: result.data?.student?.id,
        studentName: result.data?.student
          ? `${result.data.student.firstName} ${result.data.student.lastName}`
          : null,
        ip,
        scanCount,
      },
      '[scan] QR scan successful'
    );
  }

  return res.status(statusCode).json(result);
});
