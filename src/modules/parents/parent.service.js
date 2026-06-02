// src/modules/m5-parents/parent.service.js
import bcrypt from 'bcrypt';
import { prisma } from '#config/prisma.js';
import { ApiError } from '#shared/response/ApiError.js';
import { getPagination, paginateMeta } from '#shared/response/paginate.js';
import { getCache, CacheKey, TTL } from '#infrastructure/cache/cache.index.js';
import { getEmail } from '#infrastructure/email/email.index.js';
import { getSms } from '#infrastructure/sms/sms.index.js';
import { getPush } from '#infrastructure/push/push.index.js';
import { pushSSE } from '#infrastructure/sse/sse.service.js';
import { ParentRepository } from './parent.repository.js';
import { generateParentId, generateId } from '#services/IdGenerator.service.js';
import { normalizePhoneNumber } from '#shared/utils/phoneNormalize.js';
import { formatDistanceToNow, differenceInDays, format } from 'date-fns';
import { notificationsQueue } from '#orchestrator/queues/queue.config.js';

const repo = new ParentRepository();

// Helper: convert timestamp to relative time string
function getRelativeTime(date) {
  if (!date) return null;
  const now = new Date();
  const diffDays = differenceInDays(now, new Date(date));
  if (diffDays === 0) return formatDistanceToNow(new Date(date), { addSuffix: true });
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return format(new Date(date), 'dd MMM yyyy');
}

export class ParentService {
  // ─── Create Parent ────────────────────────────────────────────
  async createParent(data, schoolId) {
    // Check uniqueness
    const existingPhone = await repo.findParentByPhone(data.phone);
    if (existingPhone) throw ApiError.conflict('Phone number already registered');
    if (data.email) {
      const existingEmail = await repo.findParentByEmail(data.email);
      if (existingEmail) throw ApiError.conflict('Email already registered');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Create parent
    const parent = await repo.createParent({
      id: generateParentId(),
      firstName: data.firstName,
      lastName: data.lastName,
      phone: normalizePhoneNumber(data.phone),
      email: data.email,
      address: data.address,
      passwordHash: hashedPassword,
      isActive: true,
    });

    // Link children if provided
    if (data.studentIds?.length) {
      for (const studentId of data.studentIds) {
        await repo.linkStudent(parent.id, studentId, data.relation || 'GUARDIAN', false, 1);
      }
    }

    // Create notification preferences
    const defaultPrefs = {
      smsEnabled: data.preferences?.notifyAttendance ?? true,
      emailEnabled: data.preferences?.notifChannel === 'EMAIL',
      pushEnabled: data.preferences?.notifChannel === 'PUSH',
      inAppEnabled: true,
      onAttendance: data.preferences?.notifyAttendance ?? true,
      onAbsent: data.preferences?.notifyAbsent ?? true,
      onLate: data.preferences?.notifyLate ?? false,
      onEmergency: data.preferences?.notifyEmergency ?? true,
      onAnnouncement: true,
      weeklyReport: data.preferences?.weeklyReport ?? false,
    };
    await repo.updatePreferences(parent.id, defaultPrefs);

    // Invalidate cache for stats
    const cache = getCache();
    await cache.del(CacheKey.school(schoolId));

    return parent;
  }

  // ─── Update Parent ────────────────────────────────────────────
  async updateParent(id, data, schoolId) {
    const parent = await repo.findParentById(id, schoolId);
    if (!parent) throw ApiError.notFound('Parent not found');

    if (data.phone) {
      data.phone = normalizePhoneNumber(data.phone);
      const existing = await repo.findParentByPhone(data.phone);
      if (existing && existing.id !== id) throw ApiError.conflict('Phone already in use');
    }
    if (data.email) {
      const existing = await repo.findParentByEmail(data.email);
      if (existing && existing.id !== id) throw ApiError.conflict('Email already in use');
    }
    if (data.password) {
      data.passwordHash = await bcrypt.hash(data.password, 10);
      delete data.password;
    }

    const updated = await repo.updateParent(id, data);
    await getCache().del(CacheKey.parentProfile(id));
    return updated;
  }

  // ─── Delete Parent ────────────────────────────────────────────
  async deleteParent(id, schoolId) {
    const parent = await repo.findParentById(id, schoolId);
    if (!parent) throw ApiError.notFound('Parent not found');
    await repo.deleteParent(id);
    await getCache().del(CacheKey.parentProfile(id));
    return { success: true };
  }

  // ─── Get Parent Details ───────────────────────────────────────
  async getParent(id, schoolId) {
    const cache = getCache();
    const cacheKey = CacheKey.parentProfile(id);
    let parent = await cache.get(cacheKey);
    if (!parent) {
      parent = await repo.findParentById(id, schoolId);
      if (!parent) throw ApiError.notFound('Parent not found');
      await cache.set(cacheKey, parent, TTL.MEDIUM);
    }

    // Compute children with attendance
    const children = await Promise.all(parent.students.map(async (s) => {
      const avg = await this.getAvgAttendance(s.student.id);
      return {
        id: s.student.id,
        name: `${s.student.firstName} ${s.student.lastName}`,
        class: `${s.student.grade}${s.student.section ? '-' + s.student.section : ''}`,
        rfid: s.student.rfidTagNumber,
        attendance: Math.round(avg),
        status: 'present', // Placeholder – compute today's status if needed
      };
    }));

    const engagement = await this.computeEngagement(parent);
    const unreadNotifications = await prisma.notification.count({
      where: { parentId: id, isRead: false, status: 'DELIVERED' },
    });

    // Get recent notifications (last 5)
    const recentNotifs = await prisma.notification.findMany({
      where: { parentId: id, status: 'DELIVERED' },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { message: true, createdAt: true, category: true },
    });

    return {
      id: parent.id,
      firstName: parent.firstName,
      lastName: parent.lastName,
      email: parent.email,
      phone: parent.phone,
      relation: parent.students?.[0]?.relation || null,
      address: parent.address,
      preferences: await this.getParentPreferences(id),
      children,
      notifications: unreadNotifications,
      recentNotifications: recentNotifs.map(n => ({
        message: n.message,
        time: n.createdAt,
        type: n.category.toLowerCase(),
      })),
      lastSeen: getRelativeTime(parent.lastLoginAt),
      joinedDate: format(parent.createdAt, 'MMM yyyy'),
      engagement,
    };
  }

  // ─── List Parents (with filters, pagination, engagement) ──────
  async listParents(query, schoolId) {
    const { page, limit, skip } = getPagination(query);
    const where = { students: { some: { student: { schoolId } } }, isActive: true };
    if (query.search) {
      where.OR = [
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search } },
      ];
    }
    if (query.fromDate) where.createdAt = { gte: new Date(query.fromDate) };
    if (query.toDate) where.createdAt = { lte: new Date(query.toDate) };
    const { items, total } = await repo.listParents(where, skip, limit);

    const enriched = await Promise.all(items.map(async p => {
      const avgAttendance = await this.getAvgAttendanceForParent(p);
      const engagement = await this.computeEngagement(p);
      return {
        id: p.id,
        name: `${p.firstName} ${p.lastName}`,
        email: p.email,
        phone: p.phone,
        avatar: `${p.firstName?.[0]}${p.lastName?.[0]}`.toUpperCase(),
        avatarColor: this.getAvatarColor(p.id),
        lastSeen: getRelativeTime(p.lastLoginAt),
        engagement,
        notifications: p._count?.notifications || 0,
        joinedDate: format(p.createdAt, 'MMM yyyy'),
        children: p.students.map(s => ({
          name: `${s.student.firstName} ${s.student.lastName}`,
          class: `${s.student.grade}${s.student.section ? '-' + s.student.section : ''}`,
          rfid: s.student.rfidTagNumber,
          attendance: Math.round(avgAttendance / (p.students.length || 1)),
          status: 'present', // Placeholder
        })),
      };
    }));

    if (query.engagement) {
      const filtered = enriched.filter(p => p.engagement === query.engagement);
      const meta = paginateMeta(filtered.length, page, limit);
      return { items: filtered.slice(skip, skip + limit), meta };
    }
    const meta = paginateMeta(total, page, limit);
    return { items: enriched, meta };
  }

  // ─── Link Children ────────────────────────────────────────────
  async linkChildren(parentId, studentIds, relation, schoolId) {
    const parent = await repo.findParentById(parentId, schoolId);
    if (!parent) throw ApiError.notFound('Parent not found');
    for (const studentId of studentIds) {
      const student = await prisma.student.findFirst({ where: { id: studentId, schoolId } });
      if (!student) throw ApiError.studentNotFound();
      await repo.linkStudent(parentId, studentId, relation || 'GUARDIAN', false, 1);
    }
    await getCache().del(CacheKey.parentChildren(parentId));
    return { success: true };
  }

  // ─── Unlink Child ─────────────────────────────────────────────
  async unlinkChild(parentId, studentId, schoolId) {
    const parent = await repo.findParentById(parentId, schoolId);
    if (!parent) throw ApiError.notFound('Parent not found');
    await repo.unlinkStudent(parentId, studentId);
    await getCache().del(CacheKey.parentChildren(parentId));
    return { success: true };
  }

  // ─── Get Available Students ───────────────────────────────────
  async getAvailableStudents(schoolId, parentId = null) {
    return repo.getAvailableStudents(schoolId, parentId);
  }

  // ─── Stats Dashboard ──────────────────────────────────────────
  async getStats(schoolId) {
    const { total, totalChildren, parents } = await repo.getStats(schoolId);
    const highEngagement = parents.filter(p => p.lastLoginAt && (Date.now() - new Date(p.lastLoginAt)) < 7 * 24 * 60 * 60 * 1000).length;
    const pendingNotifs = await prisma.notification.count({
      where: { parent: { students: { some: { student: { schoolId } } } }, isRead: false },
    });
    let totalAttendance = 0;
    let attendanceCount = 0;
    for (const parent of parents) {
      for (const link of parent.students) {
        const avg = await this.getAvgAttendance(link.studentId);
        totalAttendance += avg;
        attendanceCount++;
      }
    }
    const avgAttendance = attendanceCount ? Math.round(totalAttendance / attendanceCount) : 0;
    return {
      total,
      totalChildren,
      highEngagement,
      pendingNotifs,
      avgAttendance: `${avgAttendance}%`,
    };
  }

  // ─── Export Parents ───────────────────────────────────────────
  async exportParents(query, schoolId) {
    const { format, dateRange, engagement, fields, emailDelivery } = query;
    const where = { students: { some: { student: { schoolId } } }, isActive: true };
    if (dateRange !== 'all') {
      const now = new Date();
      let startDate;
      if (dateRange === 'this_month') startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      else if (dateRange === 'last_month') startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      else if (dateRange === 'this_year') startDate = new Date(now.getFullYear(), 0, 1);
      else if (dateRange === 'last_quarter') startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      if (startDate) where.createdAt = { gte: startDate };
    }
    const parents = await prisma.parentUser.findMany({
      where,
      include: { students: { include: { student: true } } },
    });
    const exportFields = fields || ['name', 'email', 'phone', 'children', 'attendance', 'engagement', 'joined'];
    const data = [];
    for (const p of parents) {
      const avgAttendance = await this.getAvgAttendanceForParent(p);
      const engagementLevel = await this.computeEngagement(p);
      const row = {};
      if (exportFields.includes('name')) row.name = `${p.firstName} ${p.lastName}`;
      if (exportFields.includes('email')) row.email = p.email;
      if (exportFields.includes('phone')) row.phone = p.phone;
      if (exportFields.includes('children')) row.children = p.students.length;
      if (exportFields.includes('attendance')) row.attendance = `${Math.round(avgAttendance)}%`;
      if (exportFields.includes('engagement')) row.engagement = engagementLevel;
      if (exportFields.includes('joined')) row.joined = format(p.createdAt, 'MMM yyyy');
      data.push(row);
    }
    let buffer, mimeType;
    if (format === 'csv') {
      const { Parser } = await import('json2csv');
      const parser = new Parser({ fields: exportFields });
      buffer = Buffer.from(parser.parse(data));
      mimeType = 'text/csv';
    } else if (format === 'json') {
      buffer = Buffer.from(JSON.stringify(data, null, 2));
      mimeType = 'application/json';
    } else {
      buffer = Buffer.from(JSON.stringify(data, null, 2));
      mimeType = 'application/json';
    }
    if (emailDelivery) {
      const adminEmail = await prisma.schoolUser.findFirst({ where: { schoolId, role: 'SCHOOL_ADMIN' }, select: { email: true } });
      if (adminEmail?.email) {
        const email = getEmail();
        await email.send({
          to: adminEmail.email,
          subject: `Parent Export (${format.toUpperCase()})`,
          html: `<p>Your export file is attached.</p>`,
          attachments: [{ filename: `parents_export.${format}`, content: buffer }],
        });
      }
      return { success: true, emailedTo: adminEmail?.email };
    }
    return { buffer, mimeType, filename: `parents_export.${format}` };
  }

  // ─── Send Message to Parent (Quick Action) ────────────────────
  async sendMessageToParent(parentId, subject, body, type, schoolId, senderId) {
    const parent = await repo.findParentById(parentId, schoolId);
    if (!parent) throw ApiError.notFound('Parent not found');

    const message = await prisma.message.create({
      data: {
        id: generateId('MSG'),
        schoolId,
        senderId,
        parentId,
        subject: subject || 'Message from school',
        body,
        type,
        direction: 'SCHOOL_TO_PARENT',
        status: 'SENT',
        channels: ['PUSH', 'EMAIL'],
      },
    });

    // Queue push/email notification
    await notificationsQueue.add('send-message', {
      type: 'MESSAGE',
      messageId: message.id,
      recipientId: parentId,
      title: subject || 'New message from school',
      body,
      priority: 5,
      schoolId,
    }, { priority: 5 });

    // If parent has active SSE connection, push real-time event
    pushSSE(parentId, { type: 'NEW_MESSAGE', data: { message } });

    return message;
  }

  // ─── Get Parent Notification Preferences ──────────────────────
  async getParentPreferences(parentId) {
    const prefs = await repo.getPreferences(parentId);
    return {
      notifyAttendance: prefs.onAttendance,
      notifyAbsent: prefs.onAbsent,
      notifyLate: prefs.onLate,
      notifyEmergency: prefs.onEmergency,
      weeklyReport: prefs.weeklyReport,
      notifChannel: prefs.pushEnabled ? 'PUSH' : prefs.smsEnabled ? 'SMS' : prefs.emailEnabled ? 'EMAIL' : 'APP',
    };
  }

  // ─── Helpers ─────────────────────────────────────────────────
  async computeEngagement(parent) {
    if (!parent.lastLoginAt) return 'low';
    const daysSinceLogin = (Date.now() - new Date(parent.lastLoginAt)) / (1000 * 60 * 60 * 24);
    if (daysSinceLogin < 7) return 'high';
    if (daysSinceLogin < 30) return 'medium';
    return 'low';
  }

  async getAvgAttendance(studentId) {
    const records = await prisma.studentAttendanceRecord.aggregate({
      where: { studentId },
      _avg: { attendance_percentage: true },
    });
    return records._avg.attendance_percentage || 0;
  }

  async getAvgAttendanceForParent(parent) {
    let total = 0, count = 0;
    for (const link of parent.students) {
      total += await this.getAvgAttendance(link.studentId);
      count++;
    }
    return count ? total / count : 0;
  }

  getAvatarColor(id) {
    const colors = ['bg-blue-500', 'bg-violet-500', 'bg-emerald-500', 'bg-rose-500', 'bg-amber-500', 'bg-cyan-500'];
    const hash = id.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    return colors[hash % colors.length];
  }
}