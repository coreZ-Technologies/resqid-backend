// src/modules/parents/parent.service.js
import bcrypt from 'bcrypt';
import { ParentRepository } from './parent.repository.js';
import { ApiError } from '#shared/response/ApiError.js';
import { ERROR_CODES } from '#shared/constants/errors.js';
import { auditLog, AUDIT_ACTION } from '#shared/helpers/auditLogger.js';
import { getEmail } from '#infrastructure/email/email.index.js';
import { getSms } from '#infrastructure/sms/sms.index.js';
import { getPush } from '#infrastructure/push/push.index.js';
import { notificationsQueue } from '#orchestrator/queues/queue.config.js';
import WelcomeParentEmail from '#templates/email/welcome-parent.jsx';
import { logger } from '#config/logger.js';

const repo = new ParentRepository();
const SALT_ROUNDS = 12;

export class ParentService {
  async createParent(data, reqUser) {
    // Check email/phone uniqueness
    const existing = await prisma.parentUser.findFirst({
      where: { OR: [{ email: data.email }, { phone: data.phone }] },
    });
    if (existing) {
      throw ApiError.conflict('Parent with this email or phone already exists', 'DUPLICATE_ENTRY');
    }

    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
    const parent = await repo.create({ ...data, passwordHash });

    // Audit log
    await auditLog(reqUser.req, AUDIT_ACTION.PARENT_CREATED, {
      actorId: reqUser.id,
      targetId: parent.id,
      targetType: 'ParentUser',
      metadata: { email: parent.email, linkedChildren: data.childIds?.length || 0 },
    });

    // Send welcome email (async – don't block)
    this._sendWelcomeEmail(parent, data.password).catch(err =>
      logger.error({ err: err.message, parentId: parent.id }, 'Welcome email failed')
    );

    // Queue welcome SMS if enabled
    if (data.notifChannel === 'SMS') {
      await notificationsQueue.add('welcome-sms', {
        phone: parent.phone,
        template: 'welcome-parent',
        vars: { name: `${parent.firstName} ${parent.lastName}` },
      });
    }

    return parent;
  }

  async getParent(id, schoolId = null) {
    const parent = await repo.findById(id, schoolId);
    if (!parent) throw ApiError.notFound('Parent not found', ERROR_CODES.PARENT_NOT_FOUND);
    return this._enrichParent(parent);
  }

  async listParents(query, schoolId) {
    const { parents, total } = await repo.list({ ...query, schoolId });
    const enriched = parents.map(p => this._enrichParent(p));
    return { parents: enriched, total };
  }

  async updateParent(id, data, reqUser, schoolId = null) {
    const existing = await repo.findById(id, schoolId);
    if (!existing) throw ApiError.notFound('Parent not found');

    if (data.email && data.email !== existing.email) {
      const conflict = await prisma.parentUser.findUnique({ where: { email: data.email } });
      if (conflict) throw ApiError.conflict('Email already in use');
    }

    const updated = await repo.update(id, data, schoolId);

    await auditLog(reqUser.req, AUDIT_ACTION.PARENT_UPDATED, {
      actorId: reqUser.id,
      targetId: id,
      metadata: { changes: Object.keys(data) },
    });

    return this._enrichParent(updated);
  }

  async deleteParent(id, reqUser, schoolId = null) {
    const existing = await repo.findById(id, schoolId);
    if (!existing) throw ApiError.notFound('Parent not found');

    await repo.delete(id);

    await auditLog(reqUser.req, AUDIT_ACTION.PARENT_DELETED, {
      actorId: reqUser.id,
      targetId: id,
    });

    return { success: true };
  }

  async getStats(schoolId) {
    return repo.getStats(schoolId);
  }

  async exportParents(query, schoolId) {
    const rawParents = await repo.exportData({ ...query, schoolId });
    // Transform into flat rows for export
    const rows = rawParents.map(p => ({
      name: `${p.firstName} ${p.lastName}`,
      email: p.email,
      phone: p.phone,
      location: p.metadata?.address || '',
      children: p.students.length,
      attendance: this._computeAvgAttendance(p.students),
      engagement: this._computeEngagement(p.lastLoginAt),
      joined: p.createdAt.toLocaleDateString(),
      notifs: 0, // would need notification count
      rfid: p.students.map(s => s.student.rfid).join(', '),
    }));

    // Filter fields based on request
    const selectedFields = query.fields.length ? query.fields : Object.keys(rows[0] || {});
    const filteredRows = rows.map(row => {
      const filtered = {};
      selectedFields.forEach(field => { filtered[field] = row[field]; });
      return filtered;
    });

    // If emailDelivery true, send file via email (queue)
    if (query.emailDelivery) {
      // queue email job
      await notificationsQueue.add('export-ready', {
        format: query.format,
        rows: filteredRows,
        recipientEmail: reqUser.email,
      });
      return { queued: true, message: 'Export will be sent to your email' };
    }

    // Return data directly for JSON; for binary formats we'll handle in controller
    return { rows: filteredRows, format: query.format };
  }

  // ─── Private helpers ────────────────────────────────────────────────────
  _enrichParent(parent) {
    const children = parent.students.map(ps => ({
      id: ps.student.id,
      name: `${ps.student.firstName} ${ps.student.lastName}`,
      class: `${ps.student.grade}${ps.student.section ? `-${ps.student.section}` : ''}`,
      rfid: ps.student.tokens?.[0]?.rfid || 'N/A',
      attendance: 85, // mock; would compute from attendance records
      status: 'present',
    }));

    const lastSession = parent.sessions?.[0];
    const lastSeen = lastSession?.createdAt
      ? this._relativeTime(lastSession.createdAt)
      : 'Never';

    const engagement = this._computeEngagement(parent.lastLoginAt);

    return {
      id: parent.id,
      name: `${parent.firstName} ${parent.lastName}`,
      email: parent.email,
      phone: parent.phone,
      location: parent.metadata?.address || '',
      avatar: `${parent.firstName?.[0]}${parent.lastName?.[0]}`,
      avatarColor: 'bg-blue-500', // random? keep static
      children,
      lastSeen,
      engagement,
      notifications: 0,
      joinedDate: parent.createdAt.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
    };
  }

  _computeEngagement(lastLoginAt) {
    if (!lastLoginAt) return 'low';
    const days = (Date.now() - new Date(lastLoginAt)) / (1000 * 60 * 60 * 24);
    if (days < 7) return 'high';
    if (days < 30) return 'medium';
    return 'low';
  }

  _computeAvgAttendance(students) {
    if (!students.length) return '0%';
    const sum = students.reduce((acc, s) => acc + (s.student.attendanceRecords?.[0]?.percentage || 0), 0);
    return `${Math.round(sum / students.length)}%`;
  }

  _relativeTime(date) {
    const seconds = Math.floor((Date.now() - new Date(date)) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
  }

  async _sendWelcomeEmail(parent, plainPassword) {
    const email = getEmail();
    await email.sendReactTemplate(WelcomeParentEmail, {
      firstName: parent.firstName,
      lastName: parent.lastName,
      email: parent.email,
      password: plainPassword,
      loginUrl: `${process.env.FRONTEND_URL}/login`,
    }, {
      to: parent.email,
      subject: 'Welcome to RESQID – Parent Portal Access',
    });
  }
}