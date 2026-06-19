// =============================================================================
// modules/scan/scan.middleware.js — RESQID
//
// Security middleware for the public QR scan endpoint.
// Every check runs BEFORE crypto verification or DB query.
// =============================================================================

import path from 'path';
import { fileURLToPath } from 'url';
import { middlewareRedis as redis } from '#config/redis.js';
import { extractIp } from '#shared/network/extractIp.js';
import { logger } from '#config/logger.js';
import { ENV } from '#config/env.js';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

<<<<<<< HEAD
=======
// ─── Rate Limit Defaults (can be overridden by env) ──────────────────────────

const PUBLIC_SCAN_LIMIT = ENV.PUBLIC_SCAN_LIMIT_PER_MINUTE || 30;
const TOKEN_SCAN_LIMIT_PER_HOUR = ENV.TOKEN_SCAN_LIMIT_PER_HOUR || 20;
const RAPID_SCAN_WINDOW_SEC = 10;
const RAPID_SCAN_THRESHOLD = 5;
const BLOCK_IP_AFTER_RAPID = 10;
const BLOCK_DURATION_SEC = 300;

>>>>>>> fc2f457f3fe5f95777ea9ced16e959883f9d995e
// ─── Trusted IPs ──────────────────────────────────────────────────────────────

const trustedIps = new Set([
  '127.0.0.1',
  '::1',
  '::ffff:127.0.0.1',
  ...(ENV.MAINTENANCE_WHITELIST_IPS || []),
  ...(ENV.SCHOOL_GATEWAY_IPS || '')
    .split(',')
    .filter(Boolean)
    .map((s) => s.trim()),
]);

// ─── Serve Emergency HTML for browser requests ───────────────────────────────

<<<<<<< HEAD
/**
 * Serves the emergency.html page for browser requests to the scan endpoint.
 * This allows users who scan a QR code with a browser to see a proper HTML page
 * instead of raw JSON.
 */
export const serveEmergencyHtml = (req, res, next) => {
  const accept = req.headers.accept || '';
  
  // Check if client accepts HTML
  if (accept.includes('text/html')) {
    const emergencyHtmlPath = path.join(__dirname, '../../../public/emergency.html');
=======
export const serveEmergencyHtml = (req, res, next) => {
  const accept = req.headers.accept || '';
  
  if (accept.includes('text/html')) {
    // Use absolute path for reliability
    const emergencyHtmlPath = path.resolve(__dirname, '../../../public/emergency.html');
>>>>>>> fc2f457f3fe5f95777ea9ced16e959883f9d995e
    
    return res.sendFile(emergencyHtmlPath, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, private',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
      },
    }, (err) => {
      if (err) {
        logger.error({ err: err.message }, 'Failed to serve emergency.html');
        res.status(500).json({ error: 'Unable to load emergency page' });
      }
    });
  }
  
  next();
};

// ─── IP Block Check ───────────────────────────────────────────────────────────

<<<<<<< HEAD
/**
 * Check if IP is blocked in Redis before allowing scan
 */
=======
>>>>>>> fc2f457f3fe5f95777ea9ced16e959883f9d995e
export const checkIpBlockedRedis = async (req, res, next) => {
  const ip = extractIp(req);

  if (trustedIps.has(ip)) return next();

  try {
    const blocked = await redis.get(`ipblock:${ip}`);
    if (blocked) {
      logger.info({ ip }, 'Blocked IP rejected from scan');
<<<<<<< HEAD
      return res
        .status(403)
        .json({ success: false, message: 'Access restricted', errorCode: 'IP_BLOCKED' });
=======
      return res.status(403).json({
        success: false,
        message: 'Access restricted',
        errorCode: 'IP_BLOCKED',
      });
>>>>>>> fc2f457f3fe5f95777ea9ced16e959883f9d995e
    }
  } catch (err) {
    logger.error({ err: err.message, ip }, 'IP block check error — passing');
  }

  next();
};

// ─── Public Scan Rate Limiter (IP-based) ─────────────────────────────────────

<<<<<<< HEAD
/**
 * Rate limit public scan requests by IP (30 requests per minute)
 */
export const publicScanLimiter = async (req, res, next) => {
  const ip = extractIp(req);

=======
export const publicScanLimiter = async (req, res, next) => {
  const ip = extractIp(req);
>>>>>>> fc2f457f3fe5f95777ea9ced16e959883f9d995e
  if (trustedIps.has(ip)) return next();

  const key = `rl:scan:${ip}`;

  try {
    const current = await redis.incr(key);
<<<<<<< HEAD
    if (current === 1) await redis.expire(key, 60); // 1-minute window

    const remaining = Math.max(0, 30 - current);
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    res.setHeader('X-RateLimit-Limit', '30');

    if (current > 30) {
=======
    if (current === 1) await redis.expire(key, 60);

    const remaining = Math.max(0, PUBLIC_SCAN_LIMIT - current);
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    res.setHeader('X-RateLimit-Limit', String(PUBLIC_SCAN_LIMIT));

    if (current > PUBLIC_SCAN_LIMIT) {
>>>>>>> fc2f457f3fe5f95777ea9ced16e959883f9d995e
      logger.info({ ip, count: current }, 'Scan IP rate limit exceeded');
      const ttl = await redis.ttl(key);
      return res.status(429).json({
        success: false,
        message: 'Too many scans. Please try again later.',
        errorCode: 'SCAN_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(ttl || 60),
      });
    }
  } catch (err) {
    logger.error({ err: err.message, ip }, 'Rate limit error — passing');
  }

  next();
};

// ─── Per-Token Scan Limit ─────────────────────────────────────────────────────

<<<<<<< HEAD
/**
 * Rate limit scans per specific token (20 scans per hour)
 */
=======
>>>>>>> fc2f457f3fe5f95777ea9ced16e959883f9d995e
export const perTokenScanLimit = async (req, res, next) => {
  const { code } = req.params;
  if (!code) return next();

  try {
    const hashedCode = crypto.createHash('sha256').update(code).digest('hex');
    const key = `rl:token:${hashedCode}`;

    const current = await redis.incr(key);
<<<<<<< HEAD
    if (current === 1) await redis.expire(key, 3600); // 1-hour window

    req.scanCount = current;

    if (current > 20) {
=======
    if (current === 1) await redis.expire(key, 3600);

    req.scanCount = current;

    if (current > TOKEN_SCAN_LIMIT_PER_HOUR) {
>>>>>>> fc2f457f3fe5f95777ea9ced16e959883f9d995e
      logger.info({ codePrefix: code.slice(0, 8), count: current }, 'Token scan limit exceeded');
      return res.status(429).json({
        success: false,
        message: 'This QR code has been scanned too many times',
        errorCode: 'SCAN_LIMIT_EXCEEDED',
      });
    }
  } catch (err) {
    logger.error({ err: err.message }, 'Per-token limit error — passing');
    req.scanCount = 1;
  }

  next();
};

// ─── Scan Request Logging ─────────────────────────────────────────────────────

<<<<<<< HEAD
/**
 * Log scan request details for audit and analytics
 */
=======
>>>>>>> fc2f457f3fe5f95777ea9ced16e959883f9d995e
export const logScanRequest = async (req, res, next) => {
  const startTime = Date.now();
  const ip = extractIp(req);
  
<<<<<<< HEAD
  // Store start time for response time calculation
  req.scanStartTime = startTime;
  req.scanIp = ip;
  
  // Log incoming scan
=======
  req.scanStartTime = startTime;
  req.scanIp = ip;
  
>>>>>>> fc2f457f3fe5f95777ea9ced16e959883f9d995e
  logger.debug({
    type: 'scan_request',
    ip,
    codePrefix: req.params.code?.slice(0, 8),
    userAgent: req.headers['user-agent'],
  }, 'Scan request received');
  
  next();
};

<<<<<<< HEAD
// ─── Check Suspicious Activity ───────────────────────────────────────────────

/**
 * Detect suspicious scanning patterns (rapid scans from same IP)
 */
=======
// ─── Detect Suspicious Activity ───────────────────────────────────────────────

>>>>>>> fc2f457f3fe5f95777ea9ced16e959883f9d995e
export const detectSuspiciousActivity = async (req, res, next) => {
  const ip = extractIp(req);
  const key = `suspicious:${ip}`;
  
  try {
    const count = await redis.incr(key);
<<<<<<< HEAD
    if (count === 1) await redis.expire(key, 10); // 10-second window
    
    if (count > 5) {
      logger.warn({ ip, count }, 'Suspicious rapid scanning detected');
      
      // Block IP for 5 minutes if too many rapid scans
      if (count > 10) {
        await redis.setex(`ipblock:${ip}`, 300, 'Rapid scanning');
=======
    if (count === 1) await redis.expire(key, RAPID_SCAN_WINDOW_SEC);
    
    if (count > RAPID_SCAN_THRESHOLD) {
      logger.warn({ ip, count }, 'Suspicious rapid scanning detected');
      
      if (count > BLOCK_IP_AFTER_RAPID) {
        await redis.setex(`ipblock:${ip}`, BLOCK_DURATION_SEC, 'Rapid scanning');
>>>>>>> fc2f457f3fe5f95777ea9ced16e959883f9d995e
        return res.status(429).json({
          success: false,
          message: 'Too many requests. Please try again later.',
          errorCode: 'RATE_LIMITED',
        });
      }
    }
  } catch (err) {
    logger.error({ err: err.message }, 'Suspicious activity check failed');
  }
  
  next();
};

// ─── Validate Scan Code Format ───────────────────────────────────────────────

<<<<<<< HEAD
/**
 * Basic format validation before heavy crypto operations
 */
=======
>>>>>>> fc2f457f3fe5f95777ea9ced16e959883f9d995e
export const validateScanCodeFormat = (req, res, next) => {
  const { code } = req.params;
  
  if (!code) {
    return res.status(400).json({
      success: false,
      message: 'Scan code is required',
      errorCode: 'INVALID_SCAN_CODE',
    });
  }
  
<<<<<<< HEAD
  // Basic format check: alphanumeric, dash, underscore, or encrypted format
=======
>>>>>>> fc2f457f3fe5f95777ea9ced16e959883f9d995e
  const isValidFormat = /^[A-Za-z0-9\-_]+$/.test(code);
  if (!isValidFormat && code.length !== 43) {
    logger.warn({ codePrefix: code.slice(0, 10) }, 'Invalid scan code format');
    return res.status(400).json({
      success: false,
      message: 'Invalid scan code format',
      errorCode: 'INVALID_SCAN_CODE',
    });
  }
  
  next();
};

// ─── Security Headers for Scan Responses ─────────────────────────────────────

<<<<<<< HEAD
/**
 * Add security headers to scan responses
 */
export const addScanSecurityHeaders = (req, res, next) => {
  // Add security headers for all scan responses
=======
export const addScanSecurityHeaders = (req, res, next) => {
>>>>>>> fc2f457f3fe5f95777ea9ced16e959883f9d995e
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
<<<<<<< HEAD
  
=======
>>>>>>> fc2f457f3fe5f95777ea9ced16e959883f9d995e
  next();
};