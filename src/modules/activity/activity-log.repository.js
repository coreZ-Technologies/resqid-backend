// src/modules/activity-logs/activity-log.repository.js
import { prisma } from '#config/prisma.js';

// Maps Prisma AuditActorType to frontend role labels
const ROLE_MAP = {
  SUPER_ADMIN: 'School Admin',
  SCHOOL_ADMIN: 'School Admin',
  TEACHER: 'Teacher',
  SYSTEM: 'System',
  API: 'System',
  PARENT: 'System',
  ANONYMOUS: 'System',
};

// Maps frontend type filter to audit action patterns
const TYPE_ACTION_MAP = {
  create: ['CREATED', 'ADDED', 'REGISTERED', 'ONBOARDED', 'GENERATED', 'ISSUED', 'SENT'],
  update: ['UPDATED', 'CHANGED', 'MODIFIED', 'REVIEWED'],
  delete: ['DELETED', 'REMOVED', 'REVOKED', 'CANCELLED'],
  export: ['EXPORTED', 'DOWNLOADED'],
  login: ['LOGIN', 'LOGGED_IN', 'OTP_SENT', 'OTP_VERIFIED'],
  logout: ['LOGOUT', 'LOGGED_OUT', 'SESSION_REVOKED'],
  view: ['VIEWED', 'ACCESSED', 'SCANNED', 'READ'],
  system: ['SYSTEM', 'MAINTENANCE', 'STARTUP', 'SHUTDOWN', 'WORKER'],
};

// Maps audit entity to frontend module labels
const ENTITY_MODULE_MAP = {
  SCHOOL: 'Settings',
  USER: 'Auth',
  TEACHER: 'Students',
  STUDENT: 'Students',
  PARENT: 'Parents',
  TIMETABLE: 'Timetable',
  TIMETABLE_TEMPLATE: 'Timetable',
  CLASS_GROUP: 'Timetable',
  SUBJECT: 'Timetable',
  ROOM: 'Timetable',
  SUBSTITUTION: 'Timetable',
  CRISIS_EVENT: 'Timetable',
  WELLNESS: 'Timetable',
  CONSTRAINT_PRESET: 'Timetable',
  BULK_UPLOAD: 'Timetable',
  ATTENDANCE: 'Attendance',
  SCAN: 'Attendance',
  NOTIFICATION: 'Notifications',
  FEATURE_FLAG: 'Settings',
  SUBSCRIPTION: 'Billing',
  OTHER: 'System',
};

function inferActionType(action) {
  if (!action) return 'system';
  const upper = action.toUpperCase();
  for (const [type, patterns] of Object.entries(TYPE_ACTION_MAP)) {
    if (patterns.some((p) => upper.includes(p))) return type;
  }
  return 'system';
}

function inferModule(entity) {
  return ENTITY_MODULE_MAP[entity] || 'System';
}

function inferSeverity(dbSeverity) {
  if (!dbSeverity) return 'info';
  const s = dbSeverity.toLowerCase();
  if (s === 'critical') return 'critical';
  if (s === 'warning' || s === 'error') return 'warning';
  return 'info';
}

function inferDevice(userAgent) {
  if (!userAgent) return 'server';
  const ua = userAgent.toLowerCase();
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) return 'mobile';
  if (ua.includes('resqid') || ua.includes('capacitor')) return 'mobile';
  if (ua.includes('mozilla') || ua.includes('chrome') || ua.includes('safari')) return 'desktop';
  return 'server';
}

function inferStatus(severity) {
  const s = severity?.toLowerCase();
  if (s === 'error' || s === 'critical') return 'failed';
  return 'success';
}

export const activityLogRepository = {
  async findAll(schoolId, filters = {}) {
    const { page = 1, limit = 10, search, type, status, role, fromDate, toDate } = filters;

    const where = { schoolId };

    // Search across actor name, action, entity
    if (search) {
      where.OR = [
        { actorName: { contains: search, mode: 'insensitive' } },
        { action: { contains: search, mode: 'insensitive' } },
        { entity: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Role filter — map frontend label back to DB enum
    if (role) {
      const dbRoles = Object.entries(ROLE_MAP)
        .filter(([, label]) => label === role)
        .map(([dbRole]) => dbRole);
      if (dbRoles.length > 0) {
        where.actorType = { in: dbRoles };
      }
    }

    // Date range
    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = new Date(`${fromDate}T00:00:00.000Z`);
      if (toDate) where.createdAt.lte = new Date(`${toDate}T23:59:59.999Z`);
    }

    // Fetch all matching (type/status filtered in JS since they're derived)
    const [allLogs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          action: true,
          severity: true,
          actorName: true,
          actorType: true,
          entity: true,
          ipAddress: true,
          userAgent: true,
          createdAt: true,
          metadata: true,
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    // Format and filter in JS for derived fields
    let formatted = allLogs.map(formatLogEntry);

    // Type filter
    if (type) {
      formatted = formatted.filter((l) => l.type === type);
    }

    // Status filter
    if (status) {
      formatted = formatted.filter((l) => l.status === status);
    }

    // Paginate after filtering
    const totalFiltered = formatted.length;
    const start = (page - 1) * limit;
    const paginated = formatted.slice(start, start + limit);

    return {
      data: paginated,
      total: totalFiltered,
      page,
      limit,
    };
  },

  async getStats(schoolId) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [allLogs, todayLogs] = await Promise.all([
      prisma.auditLog.findMany({
        where: { schoolId },
        select: { actorName: true, severity: true },
      }),
      prisma.auditLog.findMany({
        where: {
          schoolId,
          createdAt: { gte: todayStart },
        },
        select: { actorName: true, severity: true },
      }),
    ]);

    const criticalCount = allLogs.filter((l) => l.severity === 'CRITICAL').length;
    const failedCount = allLogs.filter(
      (l) => l.severity === 'ERROR' || l.severity === 'CRITICAL'
    ).length;
    const uniqueActors = new Set(allLogs.map((l) => l.actorName).filter(Boolean)).size;

    return {
      totalEvents: allLogs.length,
      todayEvents: todayLogs.length,
      uniqueActors,
      criticalCount,
      failedCount,
    };
  },

  async getFilterOptions() {
    return {
      types: ['create', 'update', 'delete', 'export', 'login', 'logout', 'view', 'system'],
      statuses: ['success', 'failed'],
      roles: ['School Admin', 'Teacher', 'System'],
      modules: [
        'Auth',
        'Attendance',
        'Students',
        'Reports',
        'Notifications',
        'Timetable',
        'Settings',
        'System',
        'Parents',
        'Billing',
      ],
    };
  },

  async findAllForExport(schoolId, filters = {}) {
    const { search, type, status, role, fromDate, toDate } = filters;

    const where = { schoolId };

    if (search) {
      where.OR = [
        { actorName: { contains: search, mode: 'insensitive' } },
        { action: { contains: search, mode: 'insensitive' } },
        { entity: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role) {
      const dbRoles = Object.entries(ROLE_MAP)
        .filter(([, label]) => label === role)
        .map(([dbRole]) => dbRole);
      if (dbRoles.length > 0) where.actorType = { in: dbRoles };
    }

    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = new Date(`${fromDate}T00:00:00.000Z`);
      if (toDate) where.createdAt.lte = new Date(`${toDate}T23:59:59.999Z`);
    }

    const allLogs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        action: true,
        severity: true,
        actorName: true,
        actorType: true,
        entity: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
      },
    });

    let formatted = allLogs.map(formatLogEntry);
    if (type) formatted = formatted.filter((l) => l.type === type);
    if (status) formatted = formatted.filter((l) => l.status === status);

    return formatted;
  },
};

function formatLogEntry(log) {
  const actionType = inferActionType(log.action);
  const module = inferModule(log.entity);
  const device = inferDevice(log.userAgent);
  const severity = inferSeverity(log.severity);
  const status = inferStatus(log.severity);

  // Avatar initials from actor name
  const actorName = log.actorName || 'System';
  const avatar = actorName
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return {
    id: log.id,
    actor: actorName,
    role: ROLE_MAP[log.actorType] || 'System',
    avatar,
    action: formatAction(log.action, log.entity, log.metadata),
    module,
    type: actionType,
    severity,
    ip: log.ipAddress || 'internal',
    device,
    time: log.createdAt?.toISOString() || null,
    status,
  };
}

function formatAction(action, entity, metadata) {
  // Return human-readable action description
  const label = metadata?.entityLabel || entity || '';
  if (action?.includes('CREATED')) return `Created ${label}`;
  if (action?.includes('UPDATED')) return `Updated ${label}`;
  if (action?.includes('DELETED')) return `Deleted ${label}`;
  if (action?.includes('LOGIN')) return 'Logged in';
  if (action?.includes('LOGOUT')) return 'Logged out';
  if (action?.includes('EXPORTED')) return `Exported ${label.toLowerCase()} report`;
  if (action?.includes('VIEWED')) return `Viewed ${label}`;
  if (action?.includes('SENT')) return `Sent ${label.toLowerCase()}`;
  return action || 'System action';
}
