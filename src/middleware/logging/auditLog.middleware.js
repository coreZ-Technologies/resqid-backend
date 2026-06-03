// =============================================================================
// auditLog.middleware.js — RESQID
//
// Automatic audit trail for every mutating authenticated request.
// Writes to AuditLog model AFTER response is sent — never blocks.
// =============================================================================

import { prisma } from '#config/prisma.js';
import { extractIp } from '#shared/network/extractIp.js';
import { parseUserAgent } from '#shared/network/userAgent.js';
import { logger } from '#config/logger.js';

// ─── Configuration ────────────────────────────────────────────────────────────

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

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
  students: 'STUDENT',
  parents: 'PARENT',
  schools: 'SCHOOL',
  tokens: 'TOKEN',
  orders: 'ORDER',
  users: 'USER',
  teachers: 'TEACHER',
  settings: 'SCHOOL_SETTINGS',
  subscriptions: 'SUBSCRIPTION',
  payments: 'PAYMENT',
  devices: 'ATTENDANCE_DEVICE',
  emergency: 'EMERGENCY_PROFILE',
  attendance: 'ATTENDANCE',
  timetable: 'TIMETABLE',
  crisis: 'CRISIS_EVENT',
  substitution: 'SUBSTITUTION',
  wellness: 'WELLNESS',
  templates: 'TIMETABLE_TEMPLATE',
  rooms: 'ROOM',
  subjects: 'SUBJECT',
  classes: 'CLASS_GROUP',
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
  'secret',
  'private_key',
  'encryption_key',
  'medicalInfo',
  'medical_info',
]);

// ─── Core Middleware ──────────────────────────────────────────────────────────

export function auditLog(req, res, next) {
  if (!MUTATING_METHODS.has(req.method)) return next();
  if (SKIP_PREFIXES.some((p) => req.path.startsWith(p))) return next();
  if (!req.user?.id || !req.user?.role) return next();

  const requestBodySnapshot = req.body ? { ...req.body } : null;

  res.on('finish', () => {
    if (res.statusCode < 200 || res.statusCode >= 300) return;

    writeAuditLog(req, requestBodySnapshot).catch((err) => {
      logger.error({ err: err.message, path: req.path }, '[Audit] Failed to write');
    });
  });

  next();
}

// ─── Audit Writer ─────────────────────────────────────────────────────────────

async function writeAuditLog(req, requestBody) {
  const { entity, entityId } = inferEntity(req);
  const methodAction = METHOD_ACTION_MAP[req.method] || req.method;
  const action = `${entity || 'UNKNOWN'}_${methodAction}`;
  const ip = extractIp(req);
  const ua = parseUserAgent(req);
  const sanitizedBody = sanitizeForAudit(requestBody);

  await prisma.auditLog.create({
    data: {
      // 🔧 Prisma schema field names (camelCase):
      action,
      severity: 'INFO',
      actorId: req.user.id,
      actorType: req.user.role,
      actorName: req.user.name || null,
      entity: entity || 'OTHER',
      entityId: entityId || null,
      entityLabel: entity ? `${entity} ${entityId || ''}`.trim() : null,
      schoolId: req.schoolId || req.user.schoolId || null,
      ipAddress: ip,
      userAgent: ua.raw || 'unknown',
      device: ua.device || 'Unknown',
      requestId: req.requestId || null,
      sessionId: req.user.sessionId || null,
      newValue: sanitizedBody || undefined,
      metadata: {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        deviceId: req.deviceId || null,
      },
    },
  });
}

// ─── Entity Inference ─────────────────────────────────────────────────────────

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
      const next = segments[i + 1];
      if (next && isUuidLike(next)) {
        entityId = next;
      }
    }
  }

  if (!entityId) {
    entityId =
      req.params?.id ||
      req.params?.studentId ||
      req.params?.teacherId ||
      req.params?.tokenId ||
      req.params?.schoolId ||
      req.params?.timetableId ||
      null;
  }

  return { entity, entityId };
}

// ─── Sanitization ─────────────────────────────────────────────────────────────

function sanitizeForAudit(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeForAudit);

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

function isUuidLike(str) {
  return /^[0-9a-f-]{36}$/i.test(str) || /^[0-9a-f]{24}$/i.test(str);
}

// ─── Manual Audit Logger ──────────────────────────────────────────────────────

export async function manualAudit(req, action, entity, entityId, metadata = {}) {
  try {
    const ip = extractIp(req);
    const ua = parseUserAgent(req);

    await prisma.auditLog.create({
      data: {
        action,
        severity: 'INFO',
        actorId: req.user?.id || 'SYSTEM',
        actorType: req.user?.role || 'SYSTEM',
        actorName: req.user?.name || null,
        entity: entity || 'OTHER',
        entityId: entityId || null,
        schoolId: req.schoolId || req.user?.schoolId || null,
        ipAddress: ip,
        userAgent: ua.raw || 'unknown',
        device: ua.device || 'Unknown',
        requestId: req.requestId || null,
        metadata: { ...metadata, method: req.method, path: req.path },
      },
    });
  } catch (err) {
    logger.error({ err: err.message, action }, '[Audit] Manual audit log failed');
  }
}
