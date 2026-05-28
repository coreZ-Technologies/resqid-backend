// =============================================================================
// attackLogger.middleware.js — RESQID
//
// Detects attack patterns in requests and logs them.
// DETECTION ONLY — always calls next(). Blocking is handled upstream.
//
// Logs to:
//   - Pino logger (immediate, structured)
//   - AuditLog (persistent DB record)
//   - Redis (IP reputation tracking for ipReputation middleware)
//
// Position in stack: BEFORE sanitize middleware (to catch raw attacks)
// =============================================================================

import { prisma } from '#config/prisma.js';
import { logger, securityLog } from '#config/logger.js';
import { middlewareRedis } from '#config/redis.js';
import { AUDIT_ACTION } from '#shared/constants/audit.js';
import { EVENTS } from '#shared/constants/events.js';
import { extractIp } from '#shared/network/extractIp.js';

// ─── Attack Signatures ────────────────────────────────────────────────────────

const ATTACK_PATTERNS = [
  // XSS
  { pattern: /<script[\s\S]*?>[\s\S]*?<\/script>/gi, type: 'XSS_SCRIPT_TAG' },
  { pattern: /javascript\s*:/gi, type: 'XSS_JS_PROTOCOL' },
  { pattern: /on\w+\s*=\s*["'`]/gi, type: 'XSS_EVENT_HANDLER' },
  { pattern: /data\s*:\s*text\/html/gi, type: 'XSS_DATA_URI' },
  { pattern: /<iframe/gi, type: 'XSS_IFRAME' },
  { pattern: /<embed/gi, type: 'XSS_EMBED' },
  { pattern: /<object/gi, type: 'XSS_OBJECT' },

  // NoSQL Injection
  {
    pattern: /\$(where|gt|lt|ne|in|nin|eq|regex|exists|type|set|unset|inc|push|pull)\b/gi,
    type: 'NOSQL_INJECTION',
  },

  // SQL Injection
  { pattern: /union\s+select/gi, type: 'SQL_INJECTION_UNION' },
  { pattern: /drop\s+table/gi, type: 'SQL_INJECTION_DROP' },
  { pattern: /insert\s+into/gi, type: 'SQL_INJECTION_INSERT' },
  { pattern: /delete\s+from/gi, type: 'SQL_INJECTION_DELETE' },
  { pattern: /update\s+\w+\s+set/gi, type: 'SQL_INJECTION_UPDATE' },
  { pattern: /--\s*$/gm, type: 'SQL_INJECTION_COMMENT' },
  { pattern: /;\s*$/gm, type: 'SQL_INJECTION_SEMICOLON' },

  // Prototype Pollution
  { pattern: /__proto__|constructor\s*\[|prototype\s*\[/gi, type: 'PROTOTYPE_POLLUTION' },

  // Path Traversal
  { pattern: /\.\.(\/|\\)/g, type: 'PATH_TRAVERSAL' },

  // Code Injection
  { pattern: /eval\s*\(/gi, type: 'CODE_INJECTION_EVAL' },
  { pattern: /Function\s*\(/gi, type: 'CODE_INJECTION_FUNCTION' },
  { pattern: /setTimeout\s*\(\s*["'`]/gi, type: 'CODE_INJECTION_TIMEOUT' },
  { pattern: /setInterval\s*\(\s*["'`]/gi, type: 'CODE_INJECTION_INTERVAL' },

  // Command Injection
  { pattern: /\bexec\s*\(/gi, type: 'COMMAND_INJECTION' },
  { pattern: /child_process/gi, type: 'COMMAND_INJECTION' },

  // SSRF Attempts
  { pattern: /169\.254\.169\.254/gi, type: 'SSRF_METADATA' },
  { pattern: /localhost:\d+/gi, type: 'SSRF_LOCALHOST' },
  { pattern: /127\.0\.0\.1/gi, type: 'SSRF_LOOPBACK' },

  // HTTP Parameter Pollution
  { pattern: /%26/g, type: 'HPP_ENCODED' },
];

// ─── Scanner ──────────────────────────────────────────────────────────────────

/**
 * Recursively scan an object for attack patterns.
 * Returns the first attack type found, or null if clean.
 */
function scanForAttacks(obj, depth = 0) {
  if (depth > 10) return null;

  if (typeof obj === 'string') {
    for (const { pattern, type } of ATTACK_PATTERNS) {
      pattern.lastIndex = 0;
      if (pattern.test(obj)) return type;
    }
    return null;
  }

  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = scanForAttacks(item, depth + 1);
      if (found) return found;
    }
    return null;
  }

  if (obj !== null && typeof obj === 'object' && !(obj instanceof Date) && !Buffer.isBuffer(obj)) {
    // Scan both keys and values
    for (const key of Object.keys(obj)) {
      const keyAttack = scanForAttacks(key, depth + 1);
      if (keyAttack) return keyAttack;
    }
    for (const val of Object.values(obj)) {
      const found = scanForAttacks(val, depth + 1);
      if (found) return found;
    }
  }

  return null;
}

// ─── Middleware ───────────────────────────────────────────────────────────────

export const attackLogger = (req, _res, next) => {
  let attackType = null;

  // Scan request body (raw, before sanitization)
  if (req.body && Object.keys(req.body).length > 0) {
    attackType = scanForAttacks(req.body);
  }

  // Scan query parameters
  if (!attackType && req.query && Object.keys(req.query).length > 0) {
    attackType = scanForAttacks(req.query);
  }

  // Scan URL params
  if (!attackType && req.params && Object.keys(req.params).length > 0) {
    attackType = scanForAttacks(req.params);
  }

  // Scan headers (selective — only common injection vectors)
  if (!attackType) {
    const suspiciousHeaders = {
      'user-agent': req.headers['user-agent'],
      referer: req.headers['referer'],
      'x-forwarded-for': req.headers['x-forwarded-for'],
      'content-type': req.headers['content-type'],
    };
    attackType = scanForAttacks(suspiciousHeaders);
  }

  if (attackType) {
    const ip = extractIp(req);
    const ua = req.headers['user-agent'] || 'unknown';
    const requestId = req.requestId || 'unknown';

    // 1. Structured log — immediate visibility
    securityLog(EVENTS.ATTACK_DETECTED, 'HIGH', {
      attackType,
      ip,
      path: req.path,
      method: req.method,
      requestId,
      ua,
    });

    // 2. Persist to AuditLog — fire-and-forget
    prisma.auditLog
      .create({
        data: {
          actor_id: 'SYSTEM',
          actor_type: 'SYSTEM',
          action: AUDIT_ACTION.ATTACK_DETECTED,
          entity: 'Request',
          entity_id: requestId,
          metadata: {
            attackType,
            ip,
            ua,
            path: req.path,
            method: req.method,
            bodySnippet: JSON.stringify(req.body).slice(0, 500),
          },
          ip_address: ip,
          user_agent: ua,
        },
      })
      .catch((err) => logger.error({ err: err.message }, 'Failed to write attack audit log'));

    // 3. Update IP reputation in Redis
    updateIpReputation(ip, attackType).catch((err) =>
      logger.error({ err: err.message }, 'Failed to update IP reputation')
    );

    // 4. Track attack count for rate limiting
    incrementAttackCount(ip).catch((err) =>
      logger.error({ err: err.message }, 'Failed to increment attack count')
    );
  }

  // Always continue — detection only, never blocks
  next();
};

// ─── Redis Helpers ────────────────────────────────────────────────────────────

/**
 * Decrease IP reputation score when attack detected.
 */
async function updateIpReputation(ip, attackType) {
  const key = `iprep:${ip}`;
  const penalty = getPenaltyForAttack(attackType);

  try {
    await middlewareRedis.decrby(key, penalty);
    await middlewareRedis.expire(key, 7 * 24 * 60 * 60); // 7 days TTL
  } catch {
    // Non-critical
  }
}

/**
 * Increment attack counter for this IP.
 * If threshold exceeded, ipBlock middleware will auto-block.
 */
async function incrementAttackCount(ip) {
  const key = `attack:count:${ip}`;

  try {
    const count = await middlewareRedis.incr(key);
    await middlewareRedis.expire(key, 5 * 60); // 5 minute window

    if (count >= 5) {
      // Auto-block after 5 attacks in 5 minutes
      await middlewareRedis.set(
        `ipblock:${ip}`,
        'auto-blocked-by-attack-detector',
        'EX',
        24 * 60 * 60
      );
      logger.warn({ ip, attackCount: count }, 'IP auto-blocked after repeated attacks');
    }
  } catch {
    // Non-critical
  }
}

/**
 * Get penalty score based on attack severity.
 */
function getPenaltyForAttack(attackType) {
  if (attackType.includes('SQL_INJECTION')) return 30;
  if (attackType.includes('COMMAND_INJECTION')) return 30;
  if (attackType.includes('XSS')) return 20;
  if (attackType.includes('SSRF')) return 25;
  if (attackType.includes('PROTOTYPE')) return 25;
  return 10; // Default penalty
}

export { ATTACK_PATTERNS };
