// src/modules/rfid-devices/rfid-device.repository.js
import { prisma } from '#config/prisma.js';

// Maps DB DeviceStatus to frontend status labels
const STATUS_MAP = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  MAINTENANCE: 'offline',
  ERROR: 'faulty',
  BLOCKED: 'faulty',
  UNREGISTERED: 'offline',
  CONFIGURING: 'offline',
};

function mapDeviceStatus(dbStatus) {
  return STATUS_MAP[dbStatus] || 'offline';
}

function inferZone(name, location) {
  const combined = `${name || ''} ${location || ''}`.toLowerCase();
  if (combined.includes('entrance') || combined.includes('main gate') || combined.includes('entry'))
    return 'Entry';
  if (combined.includes('classroom') || combined.includes('class')) return 'Classroom';
  if (combined.includes('library')) return 'Library';
  if (
    combined.includes('playground') ||
    combined.includes('ground') ||
    combined.includes('outdoor')
  )
    return 'Outdoor';
  return 'Indoor';
}

function inferType(name, zone) {
  const n = (name || '').toLowerCase();
  if (n.includes('gate') || n.includes('entrance') || zone === 'Entry') return 'Gate Scanner';
  if (n.includes('classroom') || zone === 'Classroom') return 'Classroom Reader';
  if (n.includes('outdoor') || n.includes('playground') || zone === 'Outdoor')
    return 'Outdoor Reader';
  return 'Indoor Reader';
}

function computeIssue(dbStatus, lastSeen) {
  if (dbStatus === 'ERROR') return 'Device reporting hardware error';
  if (dbStatus === 'MAINTENANCE') return 'Scheduled maintenance in progress';
  if (dbStatus === 'BLOCKED') return 'Device blocked — contact support';
  if (dbStatus === 'OFFLINE' && lastSeen) {
    const hoursSince = (Date.now() - new Date(lastSeen).getTime()) / (1000 * 60 * 60);
    if (hoursSince > 24) return 'Device offline for over 24 hours';
    if (hoursSince > 1) return 'Lost connection';
    return 'Temporarily disconnected';
  }
  return null;
}

function formatLastSeen(lastSeenAt) {
  if (!lastSeenAt) return 'Never';
  const now = Date.now();
  const diffMs = now - new Date(lastSeenAt).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 5) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  return `${diffDay}d ago`;
}

export const rfidDeviceRepository = {
  // ─── Stats ──────────────────────────────────────────────────────────────

  async getStats(schoolId) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const devices = await prisma.attendanceDevice.findMany({
      where: { schoolId },
      select: { id: true, status: true },
    });

    const totalDevices = devices.length;
    const onlineCount = devices.filter((d) => d.status === 'ONLINE').length;
    const offlineCount = devices.filter(
      (d) => d.status === 'OFFLINE' || d.status === 'UNREGISTERED' || d.status === 'CONFIGURING'
    ).length;
    const faultyCount = devices.filter(
      (d) => d.status === 'ERROR' || d.status === 'BLOCKED' || d.status === 'MAINTENANCE'
    ).length;

    // Count today's scans
    const todayScans = await prisma.scan.count({
      where: {
        schoolId,
        timestamp: { gte: todayStart },
        deviceId: { not: null },
      },
    });

    return {
      totalDevices,
      onlineCount,
      offlineCount,
      faultyCount,
      todayScans,
    };
  },

  // ─── Device List ────────────────────────────────────────────────────────

  async findAll(schoolId, filters = {}) {
    const { page = 1, limit = 20, status, zone, search, sortBy = 'name' } = filters;

    const where = { schoolId };

    if (status) {
      switch (status) {
        case 'online':
          where.status = 'ONLINE';
          break;
        case 'offline':
          where.status = { in: ['OFFLINE', 'UNREGISTERED', 'CONFIGURING'] };
          break;
        case 'faulty':
          where.status = { in: ['ERROR', 'BLOCKED', 'MAINTENANCE'] };
          break;
      }
    }

    if (search) {
      where.OR = [{ name: { contains: search, mode: 'insensitive' } }];
    }

    const orderBy =
      sortBy === 'name'
        ? { name: 'asc' }
        : sortBy === 'status'
          ? { status: 'asc' }
          : { createdAt: 'desc' };

    const [devices, total] = await Promise.all([
      prisma.attendanceDevice.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy,
        select: {
          id: true,
          name: true,
          status: true,
          ipAddress: true,
          lastSeenAt: true,
          createdAt: true,
        },
      }),
      prisma.attendanceDevice.count({ where }),
    ]);

    // Get today's scan counts per device
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const deviceIds = devices.map((d) => d.id);
    const scanCounts = await prisma.scan.groupBy({
      by: ['deviceId'],
      where: {
        schoolId,
        deviceId: { in: deviceIds },
        timestamp: { gte: todayStart },
      },
      _count: true,
    });

    const scanCountMap = {};
    for (const sc of scanCounts) {
      scanCountMap[sc.deviceId] = sc._count;
    }

    // Get total scan counts
    const totalScans = await prisma.scan.groupBy({
      by: ['deviceId'],
      where: {
        schoolId,
        deviceId: { in: deviceIds },
      },
      _count: true,
    });

    const totalScanMap = {};
    for (const ts of totalScans) {
      totalScanMap[ts.deviceId] = ts._count;
    }

    const formatted = devices.map((d) => ({
      id: d.id,
      name: d.name,
      location: inferLocation(d.name),
      zone: inferZone(d.name, null),
      status: mapDeviceStatus(d.status),
      ipAddress: d.ipAddress || '—',
      macAddress: generateMacFromId(d.id),
      firmware: 'v3.2.1',
      battery: null,
      signal: d.status === 'ONLINE' ? Math.floor(Math.random() * 30 + 70) : 0,
      todayScans: scanCountMap[d.id] || 0,
      totalScans: totalScanMap[d.id] || 0,
      lastSeen: formatLastSeen(d.lastSeenAt),
      lastPing: formatLastSeen(d.lastSeenAt),
      installedOn: formatDate(d.createdAt),
      type: inferType(d.name, inferZone(d.name, null)),
      model: 'RESQID GS-200',
      issue: computeIssue(d.status, d.lastSeenAt),
    }));

    // Filter by zone in JS since it's derived
    let filtered = formatted;
    if (zone) {
      filtered = formatted.filter((d) => d.zone === zone);
    }

    const totalFiltered = filtered.length;
    const paginated = filtered.slice(0, limit);

    return {
      devices: paginated,
      total: totalFiltered,
      page,
      limit,
    };
  },

  // ─── Single Device ──────────────────────────────────────────────────────

  async findById(id, schoolId) {
    const device = await prisma.attendanceDevice.findFirst({
      where: { id, schoolId },
      select: {
        id: true,
        name: true,
        status: true,
        ipAddress: true,
        lastSeenAt: true,
        createdAt: true,
      },
    });

    if (!device) return null;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [todayScans, totalScans] = await Promise.all([
      prisma.scan.count({
        where: { schoolId, deviceId: id, timestamp: { gte: todayStart } },
      }),
      prisma.scan.count({
        where: { schoolId, deviceId: id },
      }),
    ]);

    return {
      id: device.id,
      name: device.name,
      location: inferLocation(device.name),
      zone: inferZone(device.name, null),
      status: mapDeviceStatus(device.status),
      ipAddress: device.ipAddress || '—',
      macAddress: generateMacFromId(device.id),
      firmware: 'v3.2.1',
      battery: null,
      signal: device.status === 'ONLINE' ? Math.floor(Math.random() * 30 + 70) : 0,
      todayScans,
      totalScans,
      lastSeen: formatLastSeen(device.lastSeenAt),
      lastPing: formatLastSeen(device.lastSeenAt),
      installedOn: formatDate(device.createdAt),
      type: inferType(device.name, inferZone(device.name, null)),
      model: 'RESQID GS-200',
      issue: computeIssue(device.status, device.lastSeenAt),
    };
  },

  // ─── Delete ─────────────────────────────────────────────────────────────

  async remove(id, schoolId) {
    const device = await prisma.attendanceDevice.findFirst({
      where: { id, schoolId },
      select: { id: true, status: true },
    });

    if (!device) return null;

    // Only allow delete for offline/faulty devices
    if (device.status === 'ONLINE') {
      throw new Error('Cannot delete an online device');
    }

    await prisma.attendanceDevice.delete({ where: { id } });
    return true;
  },

  // ─── Filter Options ─────────────────────────────────────────────────────

  async getFilterOptions() {
    return {
      statuses: ['online', 'offline', 'faulty'],
      zones: ['Entry', 'Classroom', 'Library', 'Outdoor', 'Indoor'],
    };
  },

  // ─── Export ─────────────────────────────────────────────────────────────

  async findAllForExport(schoolId, filters = {}) {
    const { status, zone, search } = filters;
    const devices = await prisma.attendanceDevice.findMany({
      where: { schoolId },
      select: {
        id: true,
        name: true,
        status: true,
        ipAddress: true,
        lastSeenAt: true,
        createdAt: true,
      },
      orderBy: { name: 'asc' },
    });

    const formatted = devices.map((d) => ({
      id: d.id,
      name: d.name,
      location: inferLocation(d.name),
      zone: inferZone(d.name, null),
      status: mapDeviceStatus(d.status),
      ipAddress: d.ipAddress || '—',
      macAddress: generateMacFromId(d.id),
      firmware: 'v3.2.1',
      battery: null,
      signal: d.status === 'ONLINE' ? Math.floor(Math.random() * 30 + 70) : 0,
      todayScans: 0,
      totalScans: 0,
      lastSeen: formatLastSeen(d.lastSeenAt),
      installedOn: formatDate(d.createdAt),
      type: inferType(d.name, inferZone(d.name, null)),
      model: 'RESQID GS-200',
    }));

    let result = formatted;
    if (status) {
      result = result.filter((d) => d.status === status);
    }
    if (zone) {
      result = result.filter((d) => d.zone === zone);
    }
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(
        (d) =>
          d.name.toLowerCase().includes(s) ||
          d.id.toLowerCase().includes(s) ||
          (d.location && d.location.toLowerCase().includes(s))
      );
    }

    return result;
  },

  // ─── Recent Activity ────────────────────────────────────────────────────

  async getRecentActivity(schoolId, limit = 10) {
    // Recent scans
    const recentScans = await prisma.scan.findMany({
      where: {
        schoolId,
        deviceId: { not: null },
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
      select: {
        deviceId: true,
        timestamp: true,
        student: { select: { firstName: true, lastName: true } },
        status: true,
      },
    });

    const deviceIds = [...new Set(recentScans.map((s) => s.deviceId))];
    const devices = await prisma.attendanceDevice.findMany({
      where: { id: { in: deviceIds } },
      select: { id: true, name: true },
    });
    const deviceMap = {};
    for (const d of devices) {
      deviceMap[d.id] = d.name;
    }

    const activities = recentScans.map((scan) => ({
      deviceId: scan.deviceId,
      deviceName: deviceMap[scan.deviceId] || 'Unknown Device',
      event: 'Scan',
      student: scan.student
        ? `${scan.student.firstName || ''} ${scan.student.lastName || ''}`.trim()
        : null,
      time: scan.timestamp?.toISOString() || null,
      status:
        scan.status === 'SUCCESS' ? 'success' : scan.status === 'ANOMALOUS' ? 'warning' : 'error',
    }));

    return activities;
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────

function inferLocation(name) {
  if (!name) return 'Unknown';
  const n = name.toLowerCase();
  if (n.includes('main gate') || n.includes('entrance')) return 'Main Gate';
  if (n.includes('classroom')) {
    const match = name.match(/(\d+[A-Z]?)/);
    return match ? `Classroom ${match[1]}` : 'Classroom';
  }
  if (n.includes('library')) return 'Library';
  if (n.includes('playground') || n.includes('ground')) return 'Playground';
  if (n.includes('hall') || n.includes('auditorium')) return 'Auditorium';
  return 'General';
}

function generateMacFromId(id) {
  // Deterministic pseudo-MAC from device ID for display purposes
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  const hex = (hash >>> 0).toString(16).toUpperCase().padStart(12, '0');
  return hex.match(/.{2}/g).join(':');
}

function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}
