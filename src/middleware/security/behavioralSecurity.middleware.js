// =============================================================================
// behavioralSecurity.middleware.js — RESQID
// AI-driven behavioral analysis that distinguishes normal users from attackers
// Automatically blocks malicious IPs based on behavioral patterns
//
// INTEGRATION POINTS:
//   - Called after ipBlockMiddleware but before rate limiting
//   - Records failed auth attempts from auth.service.js
//   - Records successful auth for score reduction
//   - Exports admin functions for super admin dashboard
// =============================================================================

import { middlewareRedis as redis } from '#config/redis.js';
import { prisma } from '#config/prisma.js';
import { logger } from '#config/logger.js';
import { extractIp } from '#shared/network/extractIp.js';
import { asyncHandler } from '#shared/response/asyncHandler.js';
import { ApiError } from '#shared/response/ApiError.js';
import { ENV } from '#config/env.js';
import { ROLES } from '#shared/constants/roles.js';

// =============================================================================
// CONSTANTS
// =============================================================================

const BEHAVIOR_THRESHOLDS = {
  SUSPICIOUS: 50,
  BLOCK: 100,
  PERMANENT_BLOCK: 500,
};

const WINDOWS = {
  SHORT: 60,
  MEDIUM: 300,
  LONG: 3600,
  DAY: 86400,
  ESCALATED: 86400 * 7,
};

const PATTERNS = {
  PATH_SCAN: [
    '/admin',
    '/wp-admin',
    '/phpmyadmin',
    '/.env',
    '/.git',
    '/api/v1',
    '/api/v2',
    '/api/v3',
    '/graphql',
    '/graphiql',
    '/swagger',
    '/docs',
    '/apidocs',
  ],
  SQL_INJECTION: [
    "' OR '1'='1",
    '" OR "1"="1"',
    "' UNION SELECT",
    "'; DROP TABLE",
    "' WAITFOR DELAY",
    '1=1--',
    "admin'--",
    "' OR 1=1#",
  ],
  PATH_TRAVERSAL: ['../', '..\\', '....//', '....\\\\', '%2e%2e%2f', '%252e%252e%252f'],
  SUSPICIOUS_UA: [
    'python-requests',
    'curl',
    'wget',
    'Go-http-client',
    'Nikto',
    'sqlmap',
    'nmap',
    'masscan',
    'BurpSuite',
    'Zgrab',
  ],
};

const NORMAL_PATTERNS = {
  MOBILE_UA: ['ResqidAndroid', 'ResqidiOS', 'Capacitor', 'Mobile'],
  NORMAL_ENDPOINTS: {
    [ROLES.PARENT]: [
      '/api/parents/students',
      '/api/parents/emergency',
      '/api/parents/profile',
      '/api/parents/notifications',
      '/api/parents/devices',
    ],
    [ROLES.SCHOOL_ADMIN]: [
      '/api/school-admin/students',
      '/api/school-admin/dashboard',
      '/api/school-admin/tokens',
      '/api/school-admin/scans',
    ],
    [ROLES.TEACHER]: ['/api/attendance', '/api/timetable', '/api/students'],
    [ROLES.SUPER_ADMIN]: [
      '/api/super-admin/schools',
      '/api/super-admin/users',
      '/api/super-admin/orders',
    ],
  },
};

const TRUSTED_IPS = new Set([
  '127.0.0.1',
  '::1',
  '::ffff:127.0.0.1',
  ...(ENV.MAINTENANCE_WHITELIST_IPS || []),
]);

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function calculateBehavioralScore(ip, requestData) {
  let score = 0;
  const reasons = [];

  // [1] Request rate anomaly (sliding window using sorted set)
  const rateKey = `behavior:rate:${ip}`;
  const now = Date.now();
  const windowStart = now - WINDOWS.SHORT * 1000;

  try {
    await redis.zremrangebyscore(rateKey, 0, windowStart);
    const requestCount = await redis.zcard(rateKey);
    await redis.zadd(rateKey, now, `${now}:${Math.random().toString(36).slice(2, 8)}`);
    await redis.expire(rateKey, WINDOWS.SHORT);

    if (requestCount > 60) {
      score += Math.min((requestCount - 60) * 2, 40);
      reasons.push(`High request rate: ${requestCount}/min`);
    }
  } catch (err) {
    logger.debug({ ip, err: err.message }, 'Rate check failed');
  }

  // [2] Path scanning detection (sliding window using sorted set)
  const pathKey = `behavior:paths:${ip}`;
  try {
    await redis.zremrangebyscore(pathKey, 0, windowStart);
    const uniquePaths = new Set();
    const pathEntries = await redis.zrange(pathKey, 0, -1);
    pathEntries.forEach((entry) => uniquePaths.add(entry.split(':')[0]));
    await redis.zadd(pathKey, now, `${requestData.path}:${now}`);
    await redis.expire(pathKey, WINDOWS.MEDIUM);

    if (uniquePaths.size > 20) {
      score += Math.min((uniquePaths.size - 20) * 2, 30);
      reasons.push(`Path scanning: ${uniquePaths.size} unique endpoints`);
    }
  } catch (err) {
    logger.debug({ ip, err: err.message }, 'Path scan check failed');
  }

  // [3] Suspicious endpoint access
  for (const pattern of PATTERNS.PATH_SCAN) {
    if (requestData.path.includes(pattern)) {
      score += 15;
      reasons.push(`Suspicious endpoint: ${pattern}`);
      break;
    }
  }

  // [4] SQL injection attempts in query or body
  if (requestData.query || requestData.body) {
    const combinedInput =
      JSON.stringify(requestData.query || {}) + JSON.stringify(requestData.body || {});
    for (const pattern of PATTERNS.SQL_INJECTION) {
      if (combinedInput.toLowerCase().includes(pattern.toLowerCase())) {
        score += 25;
        reasons.push(`SQL injection pattern: ${pattern}`);
        break;
      }
    }
  }

  // [5] Path traversal attempts
  for (const pattern of PATTERNS.PATH_TRAVERSAL) {
    if (requestData.path.includes(pattern)) {
      score += 20;
      reasons.push(`Path traversal: ${pattern}`);
      break;
    }
  }

  // [6] Suspicious user agent
  if (requestData.userAgent) {
    const ua = requestData.userAgent.toLowerCase();
    for (const pattern of PATTERNS.SUSPICIOUS_UA) {
      if (ua.includes(pattern.toLowerCase())) {
        score += 10;
        reasons.push(`Suspicious user agent: ${pattern}`);
        break;
      }
    }

    const isNormalMobile = NORMAL_PATTERNS.MOBILE_UA.some((p) => ua.includes(p.toLowerCase()));
    if (!isNormalMobile && !ua.includes('mozilla') && !ua.includes('chrome')) {
      score += 5;
      reasons.push('Non-browser user agent');
    }
  }

  // [7] Failed auth attempts
  const authKey = `behavior:auth:${ip}`;
  try {
    const authFails = parseInt((await redis.get(authKey)) || '0', 10);
    if (authFails > 0) {
      score += Math.min(authFails * 5, 40);
      reasons.push(`${authFails} failed auth attempts`);
    }
  } catch (err) {
    logger.debug({ ip, err: err.message }, 'Auth fail check failed');
  }

  // [8] Time-based anomaly for authenticated roles
  if (requestData.role) {
    const hour = new Date().getHours();
    const isSchoolHour = hour >= 8 && hour <= 18;
    const isParentHour = hour >= 6 && hour <= 22;

    if ([ROLES.SCHOOL_ADMIN, ROLES.TEACHER].includes(requestData.role) && !isSchoolHour) {
      score += 5;
      reasons.push('School staff outside school hours');
    }
    if (requestData.role === ROLES.PARENT && !isParentHour) {
      score += 3;
      reasons.push('Parent access outside normal hours');
    }
  }

  // [9] Endpoint mismatch for role
  if (requestData.role && NORMAL_PATTERNS.NORMAL_ENDPOINTS[requestData.role]) {
    const normalEndpoints = NORMAL_PATTERNS.NORMAL_ENDPOINTS[requestData.role];
    const isNormalEndpoint = normalEndpoints.some((e) => requestData.path.startsWith(e));
    if (!isNormalEndpoint && !requestData.path.startsWith('/api/auth')) {
      score += 10;
      reasons.push(`Unusual endpoint for role ${requestData.role}: ${requestData.path}`);
    }
  }

  // Store score in Redis (fire-and-forget)
  redis
    .set(
      `behavior:score:${ip}`,
      JSON.stringify({ score, reasons, updatedAt: new Date().toISOString() }),
      'EX',
      WINDOWS.LONG
    )
    .catch((err) => logger.debug({ ip, err: err.message }, 'Score store failed'));

  return { score, reasons };
}

async function getBehavioralScore(ip) {
  try {
    const cached = await redis.get(`behavior:score:${ip}`);
    if (cached) return JSON.parse(cached);
  } catch {
    /* ignore */
  }
  return { score: 0, reasons: [] };
}

async function blockIpBehavioral(ip, score, reasons, previousBlockCount = 0) {
  const blockDuration = previousBlockCount >= 3 ? WINDOWS.ESCALATED : WINDOWS.LONG;
  const blockUntil = new Date(Date.now() + blockDuration * 1000);
  const isPermanent = score >= BEHAVIOR_THRESHOLDS.PERMANENT_BLOCK;
  const offenseCount = previousBlockCount + 1;

  await redis.set(
    `blocked:behavioral:${ip}`,
    JSON.stringify({
      reason: 'Behavioral detection',
      score,
      reasons,
      blockedAt: new Date().toISOString(),
      blockUntil: blockUntil.toISOString(),
      isPermanent,
      offenseCount,
    }),
    'EX',
    isPermanent ? WINDOWS.DAY : blockDuration
  );

  // Try to update ScanRateLimit if table exists
  try {
    await prisma.scanRateLimit.upsert({
      where: {
        identifier_identifier_type: {
          identifier: ip,
          identifier_type: 'IP',
        },
      },
      update: {
        block_count: { increment: 1 },
        blocked_until: blockUntil,
        blocked_reason: `BEHAVIORAL_BLOCK_${score}`,
        last_hit: new Date(),
        metadata: { behavioralScore: score, reasons, offenseCount },
      },
      create: {
        identifier: ip,
        identifier_type: 'IP',
        count: 1,
        block_count: 1,
        blocked_until: blockUntil,
        blocked_reason: `BEHAVIORAL_BLOCK_${score}`,
        window_start: new Date(),
        last_hit: new Date(),
        metadata: { behavioralScore: score, reasons, offenseCount },
      },
    });
  } catch {
    // Table may not exist — non-critical
  }

  logger.warn(
    { ip, score, reasons, isPermanent, offenseCount },
    `IP ${ip} behaviorally blocked (score: ${score})`
  );
}

// =============================================================================
// EXPORTED FUNCTIONS (Used by auth.service.js)
// =============================================================================

export async function recordFailedAuth(ip, identifier, reason) {
  if (TRUSTED_IPS.has(ip)) return;

  const authKey = `behavior:auth:${ip}`;
  try {
    const attempts = await redis.incr(authKey);
    if (attempts === 1) await redis.expire(authKey, WINDOWS.LONG);

    const { score, reasons } = await getBehavioralScore(ip);
    const newScore = score + 15;

    const existingBlock = await redis.get(`blocked:behavioral:${ip}`);
    const offenseCount = existingBlock ? JSON.parse(existingBlock).offenseCount || 0 : 0;

    if (newScore >= BEHAVIOR_THRESHOLDS.BLOCK) {
      reasons.push(`${attempts} failed auth attempts`);
      await blockIpBehavioral(ip, newScore, reasons, offenseCount);
    }
  } catch (err) {
    logger.debug({ ip, err: err.message }, 'recordFailedAuth failed');
  }
}

export async function recordSuccessfulAuth(ip, userId, role) {
  if (TRUSTED_IPS.has(ip)) return;

  try {
    await redis.del(`behavior:auth:${ip}`);

    const { score, reasons } = await getBehavioralScore(ip);
    if (score > 0) {
      const newScore = Math.max(0, score - 20);
      await redis.set(
        `behavior:score:${ip}`,
        JSON.stringify({ score: newScore, reasons, lastSuccess: new Date().toISOString() }),
        'EX',
        WINDOWS.LONG
      );

      const isBlocked = await redis.get(`blocked:behavioral:${ip}`);
      if (isBlocked && newScore < BEHAVIOR_THRESHOLDS.SUSPICIOUS) {
        await redis.del(`blocked:behavioral:${ip}`);
        logger.info({ ip, userId, role }, `IP ${ip} unblocked after successful auth`);
      }
    }
  } catch (err) {
    logger.debug({ ip, err: err.message }, 'recordSuccessfulAuth failed');
  }
}

// =============================================================================
// MAIN MIDDLEWARE
// =============================================================================

export const behavioralSecurity = asyncHandler(async (req, res, next) => {
  const ip = extractIp(req);

  if (TRUSTED_IPS.has(ip)) return next();

  // Check if already blocked behaviorally
  const isBlocked = await redis.get(`blocked:behavioral:${ip}`);
  if (isBlocked) {
    const blockData = JSON.parse(isBlocked);
    logger.warn({ ip, score: blockData.score }, 'Behaviorally blocked IP attempted access');
    throw ApiError.forbidden('Access denied due to suspicious activity', 'BEHAVIOR_ANOMALY');
  }

  const requestData = {
    path: req.path,
    method: req.method,
    userAgent: req.headers['user-agent'] || '',
    role: req.user?.role || null,
    query: req.query,
    body: req.body ? Object.keys(req.body) : null,
  };

  const { score, reasons } = await calculateBehavioralScore(ip, requestData);

  if (score > 0) res.setHeader('X-Behavioral-Score', String(score));

  if (score >= BEHAVIOR_THRESHOLDS.SUSPICIOUS && score < BEHAVIOR_THRESHOLDS.BLOCK) {
    logger.warn({ ip, score, reasons, path: req.path }, `Suspicious activity (score: ${score})`);
  }

  if (score >= BEHAVIOR_THRESHOLDS.BLOCK) {
    const existingBlock = await redis.get(`blocked:behavioral:${ip}`);
    const offenseCount = existingBlock ? JSON.parse(existingBlock).offenseCount || 0 : 0;
    await blockIpBehavioral(ip, score, reasons, offenseCount);
    throw ApiError.forbidden('Access denied due to suspicious activity', 'BEHAVIOR_ANOMALY');
  }

  next();
});

// =============================================================================
// ADMIN FUNCTIONS (For Super Admin Dashboard)
// =============================================================================

export async function getBehavioralReport() {
  const reports = [];
  let cursor = '0';

  do {
    const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', 'behavior:score:*', 'COUNT', 100);
    cursor = nextCursor;

    for (const key of keys) {
      const ip = key.replace('behavior:score:', '');
      const data = await redis.get(key);
      if (data) {
        const parsed = JSON.parse(data);
        reports.push({ ip, ...parsed });
      }
    }
  } while (cursor !== '0');

  reports.sort((a, b) => b.score - a.score);

  return {
    totalSuspicious: reports.filter((r) => r.score >= BEHAVIOR_THRESHOLDS.SUSPICIOUS).length,
    totalBlocked: reports.filter((r) => r.score >= BEHAVIOR_THRESHOLDS.BLOCK).length,
    topOffenders: reports.slice(0, 20),
  };
}

export async function whitelistIp(ip, reason, adminId) {
  await redis.del(`behavior:score:${ip}`);
  await redis.del(`blocked:behavioral:${ip}`);
  await redis.del(`behavior:rate:${ip}`);
  await redis.del(`behavior:auth:${ip}`);
  await redis.del(`behavior:paths:${ip}`);

  await redis.set(`whitelist:${ip}`, JSON.stringify({ reason, adminId }), 'EX', WINDOWS.DAY * 30);

  logger.info({ ip, reason, adminId }, 'IP whitelisted');
}

export async function blacklistIp(ip, reason, adminId) {
  const existingBlock = await redis.get(`blocked:behavioral:${ip}`);
  const offenseCount = existingBlock ? JSON.parse(existingBlock).offenseCount || 0 : 0;
  await blockIpBehavioral(ip, BEHAVIOR_THRESHOLDS.PERMANENT_BLOCK, [reason], offenseCount);
  logger.warn({ ip, reason, adminId }, 'IP manually blacklisted');
}

export async function behavioralCleanup() {
  let deleted = 0;
  let total = 0;
  let cursor = '0';

  do {
    const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', 'behavior:*', 'COUNT', 100);
    cursor = nextCursor;
    total += keys.length;

    for (const key of keys) {
      const ttl = await redis.ttl(key);
      if (ttl <= 0) {
        await redis.del(key);
        deleted++;
      }
    }
  } while (cursor !== '0');

  logger.info({ deleted, total }, 'Behavioral cleanup completed');
  return { deleted, total };
}
