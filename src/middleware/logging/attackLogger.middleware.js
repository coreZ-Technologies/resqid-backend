// #file: src/middleware/logging/attackLogger.middleware.js

/**
 * attackLogger.middleware.js
 *
 * Runs AFTER the security middleware stack.
 * Reads a unified attack flag (`req.attack`) set by security middlewares
 * (rateLimit, xss, csrf, ipReputation, behavioralSecurity, etc.) and logs
 * a detailed, structured attack event enriched with network and user context.
 *
 * All security middlewares set:
 *   req.attack = {
 *     type: string,        // e.g. 'XSS', 'CSRF', 'RATE_LIMIT', 'IP_REPUTATION'
 *     severity: string,    // 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
 *     description: string,
 *     blocked: boolean,
 *     payload?: any,       // sanitised snippet of the malicious input
 *     metadata?: object    // any extra context (e.g. geo, user id)
 *   };
 */

import { logger } from '../../config/logger.js';
import { extractIp } from '../../shared/network/extractIp.js';
import { extractLocation } from '../../shared/network/extractLocation.js';
import { parseUserAgent } from '../../shared/network/userAgent.js';
// import { prisma } from '../../config/prisma.js';   // uncomment if DB storage is needed

export const attackLoggerMiddleware = async (req, res, next) => {
  // ---------------------------------------------------------------
  // 1. Only log when a security middleware has flagged the request
  // ---------------------------------------------------------------
  if (!req.attack) {
    return next();
  }

  const { type, severity = 'MEDIUM', description, blocked, payload, metadata } = req.attack;

  try {
    // ---------------------------------------------------------------
    // 2. Enrich the attack event with network & device context
    // ---------------------------------------------------------------
    const clientIp = extractIp(req);
    const ua = parseUserAgent(req);            // synchronous, always returns an object
    const location = await extractLocation(req); // async, but never throws (returns fallback)

    const attackEvent = {
      // Unique request identifier (set by requestId.middleware)
      requestId: req.requestId || 'unknown',

      // Attack classification
      attackType: type,
      severity,
      description,
      blocked: !!blocked,

      // Network context
      ip: clientIp,
      location: {
        city: location.city,
        region: location.region,
        country: location.country,
        countryCode: location.countryCode,
        source: location.source,
      },
      userAgent: {
        browser: ua.browser,
        os: ua.os,
        device: ua.device,
        app: ua.app,
        isBot: ua.isBot,
        raw: ua.raw,
      },

      // Request details
      method: req.method,
      url: req.originalUrl || req.url,
      headers: {
        'content-type': req.headers['content-type'],
        'accept-language': req.headers['accept-language'],
        // NEVER log authorisation or cookie headers
      },

      // Sanitised malicious payload (if captured by the flagging middleware)
      payload: payload || undefined,

      // Additional context (user identity, school, custom metadata)
      metadata: {
        ...(req.user?.id && { userId: req.user.id }),
        ...(req.user?.role && { role: req.user.role }),
        ...(req.schoolId && { schoolId: req.schoolId }),
        ...metadata,
      },

      timestamp: new Date().toISOString(),
    };

    // ---------------------------------------------------------------
    // 3. Output the attack event (structured log + optional DB)
    // ---------------------------------------------------------------
    logger.warn({ attack: attackEvent }, `Attack detected: ${type}`);

    // Uncomment the block below to persist attack logs to the database
    // setImmediate(() => {
    //   prisma.attackLog
    //     .create({
    //       data: {
    //         requestId: attackEvent.requestId,
    //         attackType: type,
    //         severity,
    //         description,
    //         blocked,
    //         ip: clientIp,
    //         location: JSON.stringify(location),
    //         userAgent: JSON.stringify(ua),
    //         method: req.method,
    //         url: req.originalUrl || req.url,
    //         payload: payload ? (typeof payload === 'string' ? payload : JSON.stringify(payload)) : null,
    //         metadata: JSON.stringify(attackEvent.metadata),
    //       },
    //     })
    //     .catch((dbErr) => logger.error({ err: dbErr }, 'Failed to persist attack log'));
    // });

  } catch (unexpectedError) {
    // Ensure the request pipeline is never broken by a logging error
    logger.error({ err: unexpectedError }, 'Attack logger middleware failed');
  }

  // ---------------------------------------------------------------
  // 4. Always continue to the next middleware
  // ---------------------------------------------------------------
  next();
};