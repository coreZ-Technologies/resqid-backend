// =============================================================================
// auditLog.middleware.js — RESQID
//
// Automatic audit trail for every mutating authenticated request.
// Writes to AuditLog model AFTER response is sent — never blocks.
//
// Critical for:
//   - DPDP Act 2023 compliance (children's data protection)
//   - Incident investigation (who viewed emergency profile, when)
//   - Forensic trail for all data mutations
//
// Strategy:
//   - Runs on POST, PUT, PATCH, DELETE
//   - Infers entity/action from URL path + HTTP method
//   - Writes AFTER response (res.on('finish')) — non-blocking
//   - Never fails the request
// =============================================================================

import { prisma } from '#config/prisma.js';
import { extractIp } from '#shared/network/extractIp.js';
import { parseUserAgent } from '#shared/network/userAgent.js';
import { logger } from '#config/logger.js';
import { AUDIT_ACTION, AUDIT_SEVERITY, getAuditSeverity } from '#shared/constants/audit.js';

// ─── Configuration ────────────────────────────────────────────────────────────

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// Routes handled by dedicated audit logic (login/logout write their own logs)
const SKIP_PREFIXES = [
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/refresh',
  '/api/auth/send-otp',
  '/api/auth/verify-otp',
  '/health',
];

// ─── Entity Inference Map ─────────────────────────────────────────────────────

const ENTITY_MAP = {
  students: 'Student',
  parents: 'Parent',
  schools: 'School',
  tokens: 'Token',
  orders: 'Order',
  users: 'User',
  teachers: 'Teacher',
  admins: 'Admin',
  settings: 'SchoolSettings',
  template: 'CardTemplate',
  subscriptions: 'Subscription',
  payments: 'Payment',
  invoices: 'Invoice',
  anomalies: 'ScanAnomaly',
  devices: 'Device',
  sessions: 'Session',
  webhooks: 'Webhook',
  flags: 'FeatureFlag',
  emergency: 'EmergencyProfile',
  contacts: 'EmergencyContact',
  attendance: 'Attendance',
  timetable: 'Timetable',
  communication: 'Communication',
  card: 'Card',
  qr: 'QRCode',
  scan: 'ScanLog',
};

// ─── Action Mapping ───────────────────────────────────────────────────────────

const METHOD_ACTION_MAP = {
  POST: 'CREATE',
  PUT: 'UPDATE',
  PATCH: 'UPDATE',
  DELETE: 'DELETE',
};

// ─── Sensitive Fields to Redact ───────────────────────────────────────────────

const AUDIT_SENSITIVE_KEYS = new Set([
  'password',
  'password_hash',
  'otp',
  'otp_hash',
  'token',
  'token_hash',
  'refresh_token',
  'dob_encrypted',
  'phone_encrypted',
  'doctor_phone_encrypted',
  'secret',
  'private_key',
  'encryption_key',
  'medicalInfo',
  'medical_info',
]);

// ─── Core Middleware ──────────────────────────────────────────────────────────

export function auditLog(req, res, next) {
  // Only log mutating methods
  if (!MUTATING_METHODS.has(req.method)) return next();

  // Skip certain routes
  if (SKIP_PREFIXES.some((p) => req.path.startsWith(p))) return next();

  // Only log authenticated requests
  if (!req.user?.id || !req.user?.role) return next();

  // Capture body snapshot BEFORE response
  const requestBodySnapshot = req.body ? { ...req.body } : null;

  res.on('finish', () => {
    // Only log successful mutations (2xx)
    if (res.statusCode < 200 || res.statusCode >= 300) return;

    writeAuditLog(req, requestBodySnapshot).catch((err) => {
      logger.error(
        { err: err.message, path: req.path, userId: req.user?.id },
        'auditLog: failed to write audit entry'
      );
    });
  });

  next();
}

// ─── Audit Writer ─────────────────────────────────────────────────────────────

async function writeAuditLog(req, requestBody) {
  const { entity, entityId } = inferEntity(req);
  const methodAction = METHOD_ACTION_MAP[req.method] || req.method;
  const action = `${methodAction}_${(entity || 'UNKNOWN').toUpperCase()}`;
  const ip = extractIp(req);
  const ua = parseUserAgent(req);

  // Sanitize body
  const sanitizedBody = sanitizeForAudit(requestBody);

  await prisma.auditLog.create({
    data: {
      actor_id: req.user.id,
      actor_type: req.user.role,
      action,
      entity: entity || 'UNKNOWN',
      entity_id: entityId || 'UNKNOWN',
      new_value: sanitizedBody || undefined,
      metadata: {
        method: req.method,
        path: req.path,
        requestId: req.requestId,
        statusCode: res.statusCode,
        deviceId: req.deviceId || null,
        sessionId: req.user.sessionId || null,
        schoolId: req.schoolId || req.user.schoolId || null,
      },
      ip_address: ip,
      user_agent: ua.raw || 'unknown',
    },
  });
}

// ─── Entity Inference ─────────────────────────────────────────────────────────

/**
 * Parse URL path to determine entity name and ID.
 *
 * Examples:
 *   /api/school-admin/students/abc123 → { entity: "Student", entityId: "abc123" }
 *   /api/attendance/mark              → { entity: "Attendance", entityId: null }
 */
function inferEntity(req) {
  const segments = req.path
    .toLowerCase()
    .split('/')
    .filter(Boolean)
    .filter((s) => !['api', 'v1', 'v2', 'super-admin', 'school-admin', 'parents'].includes(s));

  let entity = null;
  let entityId = null;

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (ENTITY_MAP[seg]) {
      entity = ENTITY_MAP[seg];
      // Next segment might be the ID
      const next = segments[i + 1];
      if (next && isUuidLike(next)) {
        entityId = next;
      }
    }
  }

  // Fallback: check req.params
  if (!entityId) {
    entityId =
      req.params?.id ||
      req.params?.studentId ||
      req.params?.tokenId ||
      req.params?.schoolId ||
      req.params?.orderId ||
      req.params?.deviceId ||
      null;
  }

  return { entity, entityId };
}

// ─── Sanitization ─────────────────────────────────────────────────────────────

function sanitizeForAudit(obj) {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(sanitizeForAudit);
  }

  const clean = {};
  for (const [key, value] of Object.entries(obj)) {
    if (AUDIT_SENSITIVE_KEYS.has(key.toLowerCase())) {
      clean[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
      clean[key] = sanitizeForAudit(value);
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

// ─── UUID Detection ───────────────────────────────────────────────────────────

function isUuidLike(str) {
  return /^[0-9a-f-]{36}$/i.test(str) || /^[0-9a-f]{24}$/i.test(str);
}

// ─── Manual Audit Logger (for use in services) ────────────────────────────────

/**
 * Write a manual audit entry from anywhere in the codebase.
 * Use for actions that can't be inferred from URL alone.
 *
 * Usage:
 *   await manualAudit(req, 'EMERGENCY_PROFILE_VIEWED', 'Student', studentId, { triggeredBy: 'QR_SCAN' });
 */
export async function manualAudit(req, action, entity, entityId, metadata = {}) {
  try {
    const ip = extractIp(req);
    const ua = parseUserAgent(req);

    await prisma.auditLog.create({
      data: {
        actor_id: req.user?.id || 'SYSTEM',
        actor_type: req.user?.role || 'SYSTEM',
        action,
        entity,
        entity_id: entityId,
        metadata: {
          ...metadata,
          requestId: req.requestId,
          method: req.method,
          path: req.path,
        },
        ip_address: ip,
        user_agent: ua.raw || 'unknown',
      },
    });
  } catch (err) {
    logger.error({ err: err.message, action }, 'Manual audit log failed');
  }
}
