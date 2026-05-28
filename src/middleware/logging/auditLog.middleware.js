// TODO: Add implementation
// #file: src/shared/helpers/auditLogger.js

import { prisma } from '#config/prisma.js';
import { extractIp } from '../network/extractIp.js';
import { parseUserAgent } from '../network/userAgent.js';

/**
 * Log an audit event to the database.
 *
 * This function ALWAYS returns a Promise (the prisma create call).
 * The calling code can await it or chain .catch() if needed.
 * It also catches and logs errors internally so that a failed audit
 * never crashes the application.
 */
export const auditLog = async (req, action, options = {}) => {
  const {
    actorId = req.user?.id || null,
    actorType = req.user?.role || 'system',
    targetId = null,
    targetType = null,
    schoolId = req.user?.schoolId || null,
    metadata = {},
  } = options;

  const ip = extractIp(req);
  const agent = parseUserAgent(req);

  // Return the promise (so the caller can .catch or await)
  return prisma.auditLog
    .create({
      data: {
        action,
        actorId,
        actorType,
        targetId,
        targetType,
        schoolId,
        ip,
        device: agent.device,
        os: agent.os,
        browser: agent.browser,
        metadata: metadata,
      },
    })
    .catch((err) => {
      // Log to console / logger in case the DB write fails
      console.error('[AuditLog] Failed to write:', err.message);
      // Still return undefined – no re‑throw
    });
};