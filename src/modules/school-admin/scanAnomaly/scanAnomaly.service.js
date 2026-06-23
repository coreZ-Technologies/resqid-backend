// school-admin/scanAnomaly/scanAnomaly.service.js
import { prisma } from '#config/prisma.js';
import { ApiError } from '#shared/response/ApiError.js';
import { getPagination, paginateMeta } from '#shared/response/paginate.js';
import { getEmail } from '#infrastructure/email/email.index.js';
import { ScanAnomalyRepository } from './scanAnomaly.repository.js';
import { formatDateIST } from '#shared/helpers/dateTime.js';

const repo = new ScanAnomalyRepository();

export class ScanAnomalyService {
  async listAnomalies(query, schoolId) {
    // 1. Get all anomalies matching severity & search (no pagination yet)
    const allItems = await repo.getAllMatching(schoolId, {
      severity: query.severity,
      search: query.search,
    });
    // 2. Derive status and filter by requested status
    let filtered = allItems.map(anomaly => {
      const status = anomaly.metadata?.status || (anomaly.resolvedAt ? 'resolved' : 'open');
      return { ...anomaly, derivedStatus: status };
    });
    if (query.status) {
      filtered = filtered.filter(a => a.derivedStatus === query.status);
    }
    // 3. Paginate manually
    const { page, limit, skip } = getPagination(query);
    const total = filtered.length;
    const paginated = filtered.slice(skip, skip + limit);
    // 4. Transform for frontend
    const transformed = paginated.map(anomaly => {
      const student = anomaly.student;
      return {
        id: anomaly.id,
        type: anomaly.type,
        severity: anomaly.severity.toLowerCase(),
        status: anomaly.derivedStatus,
        student: student ? `${student.firstName} ${student.lastName}` : 'Unknown',
        studentId: student?.id || null,
        class: student ? `${student.grade || ''}${student.section ? '-' + student.section : ''}` : '—',
        avatar: student ? `${student.firstName[0]}${student.lastName[0]}`.toUpperCase() : '?',
        avatarColor: this._getAvatarColor(student?.id),
        description: anomaly.description,
        // TODO: Replace with actual human-readable location (store in scan or anomaly)
        location: anomaly.scan?.locationLat && anomaly.scan?.locationLng 
          ? `${anomaly.scan.locationLat},${anomaly.scan.locationLng}` 
          : 'Unknown',
        time: formatDateIST(anomaly.detectedAt),
        date: this._getRelativeDate(anomaly.detectedAt),
        detectedBy: anomaly.scan?.initiatedBy || 'Auto-detection',
      };
    });
    const meta = paginateMeta(total, page, limit);
    return { items: transformed, meta };
  }

  async getAnomalyDetails(id, schoolId) {
    const anomaly = await repo.findById(id, schoolId);
    if (!anomaly) throw ApiError.notFound('Anomaly not found');
    const status = anomaly.metadata?.status || (anomaly.resolvedAt ? 'resolved' : 'open');
    const student = anomaly.student;
    return {
      id: anomaly.id,
      type: anomaly.type,
      severity: anomaly.severity.toLowerCase(),
      status,
      student: student ? `${student.firstName} ${student.lastName}` : 'Unknown',
      studentId: student?.id || null,
      class: student ? `${student.grade || ''}${student.section ? '-' + student.section : ''}` : '—',
      avatar: student ? `${student.firstName[0]}${student.lastName[0]}`.toUpperCase() : '?',
      avatarColor: this._getAvatarColor(student?.id),
      description: anomaly.description,
      location: anomaly.scan?.locationLat && anomaly.scan?.locationLng 
        ? `${anomaly.scan.locationLat},${anomaly.scan.locationLng}` 
        : 'Unknown',
      time: formatDateIST(anomaly.detectedAt),
      date: this._getRelativeDate(anomaly.detectedAt),
      detectedBy: anomaly.scan?.initiatedBy || 'Auto-detection',
    };
  }

  async updateAnomalyStatus(id, status, resolution, schoolId, resolvedBy) {
    const anomaly = await repo.findById(id, schoolId);
    if (!anomaly) throw ApiError.notFound('Anomaly not found');
    await repo.updateStatus(id, status, resolution, resolvedBy);
    return { success: true };
  }

  async getStats(schoolId) {
    return repo.getStats(schoolId);
  }

  async exportAnomalies(query, schoolId) {
    const { format, status, severity, search, emailDelivery } = query;
    // Get all matching severity & search
    const allItems = await repo.getAllMatching(schoolId, { severity, search });
    // Apply status filter
    let filtered = allItems;
    if (status) {
      filtered = allItems.filter(a => {
        const s = a.metadata?.status || (a.resolvedAt ? 'resolved' : 'open');
        return s === status;
      });
    }
    const exportData = filtered.map(a => ({
      id: a.id,
      type: a.type,
      severity: a.severity.toLowerCase(),
      status: a.metadata?.status || (a.resolvedAt ? 'resolved' : 'open'),
      student: a.student ? `${a.student.firstName} ${a.student.lastName}` : 'Unknown',
      description: a.description,
      location: a.scan?.locationLat && a.scan?.locationLng 
        ? `${a.scan.locationLat},${a.scan.locationLng}` 
        : 'Unknown',
      detectedAt: formatDateIST(a.detectedAt),
      detectedBy: a.scan?.initiatedBy || 'Auto-detection',
    }));
    let buffer, mimeType;
    if (format === 'csv') {
      const { Parser } = await import('json2csv');
      const parser = new Parser({ fields: Object.keys(exportData[0] || {}) });
      buffer = Buffer.from(parser.parse(exportData));
      mimeType = 'text/csv';
    } else {
      buffer = Buffer.from(JSON.stringify(exportData, null, 2));
      mimeType = 'application/json';
    }
    if (emailDelivery) {
      const adminEmail = await prisma.schoolUser.findFirst({ where: { schoolId, role: 'SCHOOL_ADMIN' }, select: { email: true } });
      if (adminEmail?.email) {
        const email = getEmail();
        await email.send({
          to: adminEmail.email,
          subject: `Anomalies Export (${format.toUpperCase()})`,
          html: `<p>Your anomaly report is attached.</p>`,
          attachments: [{ filename: `anomalies_export.${format}`, content: buffer }],
        });
      }
      return { success: true, emailedTo: adminEmail?.email };
    }
    return { buffer, mimeType, filename: `anomalies_export.${format}` };
  }

  // ─── Helpers ─────────────────────────────────────────────────
  _getRelativeDate(date) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const target = new Date(date);
    const targetDate = new Date(target.getFullYear(), target.getMonth(), target.getDate());
    const diffDays = Math.floor((today - targetDate) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return target.toLocaleDateString('en-IN');
  }

  _getAvatarColor(studentId) {
    const colors = ['bg-blue-500', 'bg-violet-500', 'bg-emerald-500', 'bg-rose-500', 'bg-amber-500', 'bg-cyan-500'];
    const hash = studentId ? studentId.split('').reduce((a, b) => a + b.charCodeAt(0), 0) : 0;
    return colors[hash % colors.length];
  }
}