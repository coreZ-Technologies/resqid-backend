// TODO: Add implementation
// #file: src/middleware/logging/httpLogger.middleware.js

/**
 * httpLogger.middleware.js
 *
 * Structured HTTP request/response logger.
 * Runs EARLY in the middleware stack (after requestId).
 * Logs after the response is sent, so status & duration are accurate.
 *
 * Uses:
 *   - createRequestLogger from config/logger.js  → child logger with requestId
 *   - extractIp from shared/network/extractIp.js  → real client IP
 *   - parseUserAgent from shared/network/userAgent.js → device/browser/os
 *
 * Logged object:
 *   {
 *     requestId, method, url, statusCode, responseTimeMs,
 *     contentLength, ip, userAgent, userId, schoolId,
 *     requestBodySize    // ← NEW
 *   }
 */

import { createRequestLogger } from '../../config/logger.js';
import { extractIp } from '../../shared/network/extractIp.js';
import { parseUserAgent } from '../../shared/network/userAgent.js';

export function httpLoggerMiddleware(req, res, next) {
  const startTime = Date.now();

  const requestLogger = createRequestLogger({
    requestId: req.requestId || req.id || 'unknown',
  });

  res.on('finish', () => {
    const durationMs = Date.now() - startTime;

    const userId = req.user?.id || null;
    const userRole = req.user?.role || null;
    const schoolId = req.user?.schoolId || req.schoolId || null;
    const ua = parseUserAgent(req);

    const logEntry = {
      requestId: req.requestId || req.id || 'unknown',

      method: req.method,
      url: req.originalUrl || req.url,
      statusCode: res.statusCode,
      responseTimeMs: durationMs,

      // Response size (from Content‑Length header set by Express / your code)
      responseSize: res.getHeader('content-length')
        ? Number(res.getHeader('content-length'))
        : undefined,

      // Request body size (from the client’s Content‑Length header)
      requestBodySize: req.headers['content-length']
        ? Number(req.headers['content-length'])
        : undefined,

      ip: extractIp(req),
      userAgent: {
        browser: ua.browser,
        os: ua.os,
        device: ua.device,
        app: ua.app?.name || null,
        isBot: ua.isBot,
      },

      userId,
      role: userRole,
      schoolId,
    };

    requestLogger.info(logEntry, 'request completed');
  });

  next();
}