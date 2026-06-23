// src/modules/m6-students/student.service.js
import { prisma } from '#config/prisma.js';
import { ApiError } from '#shared/response/ApiError.js';
import { getPagination, paginateMeta } from '#shared/response/paginate.js';
import { getCache, CacheKey, TTL } from '#infrastructure/cache/cache.index.js';
import { getStorage, StoragePath } from '#infrastructure/storage/storage.index.js';
import { getEmail } from '#infrastructure/email/email.index.js';
import { notificationsQueue } from '#orchestrator/queues/queue.config.js';
import { StudentRepository } from './student.repository.js';
import { generateStudentId, generateId } from '#services/IdGenerator.service.js';
import { validateImage, validateDocument } from '#shared/helpers/fileUtil.js';
import { normalizePhoneNumber } from '#shared/utils/phoneNormalize.js';
import { formatDateIST, addDays } from '#shared/helpers/dateTime.js';
import { format } from 'date-fns';
import { parse } from 'csv-parse/sync';
import { ParentRepository } from '../m5-parents/parent.repository.js';

const repo = new StudentRepository();
const parentRepo = new ParentRepository();

export class StudentService {
  // ─── Create Student (with QR code generation) ─────────────────
  async createStudent(data, schoolId, photoFile = null) {
    if (data.rfidTagNumber) {
      const existing = await repo.findStudentByRFID(data.rfidTagNumber);
      if (existing) throw ApiError.conflict('RFID tag number already in use');
    }

    let photoUrl = null;
    if (photoFile) {
      validateImage(photoFile);
      const storage = getStorage();
      const key = StoragePath.studentPhoto(schoolId, 'temp', photoFile.mimetype);
      const upload = await storage.upload(photoFile.buffer, key, { contentType: photoFile.mimetype });
      photoUrl = upload.location;
    }

    let cardVisibilityId = null;
    if (data.cardVisibility) {
      const visibility = await repo.createCardVisibility(data.cardVisibility);
      cardVisibilityId = visibility.id;
    }

    // Generate a unique QR code ID (stored in studentId field)
    const qrCodeId = generateId('QR');

    const student = await repo.createStudent({
      id: generateStudentId(),
      schoolId,
      firstName: data.firstName,
      lastName: data.lastName,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
      gender: data.gender,
      bloodGroup: data.bloodGroup,
      grade: data.grade,
      section: data.section,
      rollNumber: data.rollNumber,
      studentId: qrCodeId,
      allergies: data.allergies || [],
      conditions: data.conditions || [],
      medications: data.medications || [],
      medicalNotes: data.medicalNotes,
      transportRoute: data.transportRoute,
      transportStop: data.transportStop,
      rfidTagNumber: data.rfidTagNumber,
      photoUrl,
      cardVisibilityId,
      metadata: data.metadata || {},
      status: 'ACTIVE',
      isActive: true,
    });

    if (data.parentIds?.length) {
      for (const parentId of data.parentIds) {
        await repo.linkParent(student.id, parentId, 'GUARDIAN', false, 1);
      }
    }

    await getCache().del(CacheKey.school(schoolId));
    return student;
  }

  // ─── Update Student ────────────────────────────────────────────
  async updateStudent(id, data, schoolId, photoFile = null) {
    const student = await repo.findStudentById(id, schoolId);
    if (!student) throw ApiError.notFound('Student not found');

    if (data.rfidTagNumber && data.rfidTagNumber !== student.rfidTagNumber) {
      const existing = await repo.findStudentByRFID(data.rfidTagNumber);
      if (existing) throw ApiError.conflict('RFID tag number already in use');
    }

    let photoUrl = student.photoUrl;
    if (photoFile) {
      validateImage(photoFile);
      const storage = getStorage();
      const key = StoragePath.studentPhoto(schoolId, id, photoFile.mimetype);
      const upload = await storage.upload(photoFile.buffer, key, { contentType: photoFile.mimetype });
      photoUrl = upload.location;
      data.photoUrl = photoUrl;
    }

    if (data.cardVisibility && student.cardVisibilityId) {
      await repo.updateCardVisibility(student.cardVisibilityId, data.cardVisibility);
      delete data.cardVisibility;
    }

    const updated = await repo.updateStudent(id, data);
    await getCache().del(CacheKey.school(schoolId));
    await getCache().del(`student:${id}`);
    return updated;
  }

  // ─── Delete Student ────────────────────────────────────────────
  async deleteStudent(id, schoolId) {
    const student = await repo.findStudentById(id, schoolId);
    if (!student) throw ApiError.notFound('Student not found');
    await repo.deleteStudent(id);
    await getCache().del(`student:${id}`);
    return { success: true };
  }

  // ─── Get Student Details (full profile) ───────────────────────
  async getStudent(id, schoolId) {
    const cache = getCache();
    const cacheKey = `student:detail:${id}`;
    let student = await cache.get(cacheKey);
    if (!student) {
      student = await repo.findStudentById(id, schoolId);
      if (!student) throw ApiError.notFound('Student not found');
      await cache.set(cacheKey, student, TTL.MEDIUM);
    }

    // Load emergency contacts
    let emergencyContacts = [];
    if (student.emergencyProfileId) {
      const profile = await prisma.emergencyProfile.findUnique({
        where: { id: student.emergencyProfileId },
        include: { contacts: true }
      });
      emergencyContacts = profile?.contacts || [];
    }

    const parents = (student.parentLinks || []).map(link => ({
      id: link.parent.id,
      name: `${link.parent.firstName || ''} ${link.parent.lastName || ''}`.trim(),
      relationship: link.relation,
      phone: link.parent.phone,
      email: link.parent.email,
      isPrimary: link.isPrimary,
      canCall: link.parent.canCall,
      canWhatsapp: link.parent.canWhatsapp,
    }));

    const recentNotifications = await prisma.notification.findMany({
      where: { studentId: id, status: 'DELIVERED' },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { title: true, body: true, createdAt: true, category: true },
    });

    // Attendance summary (last 180 days)
    const today = new Date();
    const startOfTerm = addDays(today, -180);
    const attendanceRecords = await repo.getAttendanceSummary(id, startOfTerm, today);
    const totalDays = attendanceRecords.length;
    const presentDays = attendanceRecords.filter(r => r.status === 'PRESENT').length;
    const attendancePercentage = totalDays ? Math.round((presentDays / totalDays) * 100) : 0;

    // Monthly breakdown
    const monthly = {};
    attendanceRecords.forEach(rec => {
      const month = format(rec.markedAt, 'MMM');
      if (!monthly[month]) monthly[month] = { present: 0, total: 0 };
      monthly[month].total++;
      if (rec.status === 'PRESENT') monthly[month].present++;
    });
    const monthlyBreakdown = Object.entries(monthly).map(([month, data]) => ({
      month,
      present: data.present,
      total: data.total,
      percentage: Math.round((data.present / data.total) * 100),
    }));

    // Recent absences
    const recentAbsenceRecords = await prisma.studentAttendanceRecord.findMany({
      where: { studentId: id, status: 'ABSENT' },
      orderBy: { markedAt: 'desc' },
      take: 5,
      select: { markedAt: true, reason: true },
    });
    const recentAbsences = recentAbsenceRecords.map(rec => ({
      date: rec.markedAt,
      reason: rec.reason || 'Absent',
      approved: true,
    }));

    const documents = student.documents || [];

    return {
      id: student.id,
      name: `${student.firstName} ${student.lastName}`,
      firstName: student.firstName,
      lastName: student.lastName,
      gender: student.gender,
      dateOfBirth: student.dateOfBirth,
      age: student.dateOfBirth ? Math.floor((Date.now() - new Date(student.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null,
      bloodGroup: student.bloodGroup,
      rollNumber: student.rollNumber,
      class: student.grade,
      section: student.section,
      admissionYear: student.enrolledAt ? new Date(student.enrolledAt).getFullYear() : null,
      enrollmentDate: student.enrolledAt,
      status: student.status,
      qrCodeId: student.studentId,
      emergencyVisibility: student.cardVisibility?.visibility || 'PUBLIC',
      email: null,
      phone: null,
      address: null,
      parents,
      emergencyContacts: emergencyContacts.map(c => ({
        id: c.id,
        name: c.name,
        relationship: c.relation,
        phone: c.phone,
        priority: c.priority,
      })),
      medicalInfo: {
        bloodGroup: student.bloodGroup,
        allergies: student.allergies,
        conditions: student.conditions,
        medications: student.medications,
        notes: student.medicalNotes,
        doctor: student.emergencyProfile?.doctorName ? {
          name: student.emergencyProfile.doctorName,
          phone: student.emergencyProfile.doctorPhone,
          specialization: student.emergencyProfile.doctorSpecialization,
          clinic: student.emergencyProfile.doctorClinic,
          address: student.emergencyProfile.doctorAddress,
        } : null,
        insurance: {
          provider: student.emergencyProfile?.insuranceProvider,
          policyNumber: student.emergencyProfile?.insurancePolicyNumber,
          validUntil: student.emergencyProfile?.insuranceValidUntil,
        },
        emergencyInstructions: student.emergencyProfile?.emergencyInstructions,
        lastCheckup: student.emergencyProfile?.updatedAt,
      },
      academicInfo: {
        subjects: [],
        previousSchool: null,
        transferCertificate: null,
        achievements: [],
        remarks: null,
      },
      attendance: {
        present: presentDays,
        total: totalDays,
        percentage: attendancePercentage,
        monthly: monthlyBreakdown,
        recentAbsences,
      },
      documents: documents.map(d => ({
        id: d.id,
        name: d.name,
        type: d.fileType.toUpperCase(),
        size: `${Math.round(d.fileSize / 1024)} KB`,
        uploadedAt: d.uploadedAt,
      })),
      recentActivity: recentNotifications.map(n => ({
        action: n.title,
        date: formatDateIST(n.createdAt),
        status: 'Completed',
      })),
      feeDetails: null,
    };
  }

  // ─── List Students (with pagination and filters) ──────────────
  async listStudents(query, schoolId) {
    const { page, limit, skip } = getPagination(query);
    const where = { schoolId, isActive: true };
    if (query.search) {
      where.OR = [
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
        { studentId: { contains: query.search } },
        { rollNumber: { contains: query.search } },
        { parentLinks: { some: { parent: { firstName: { contains: query.search, mode: 'insensitive' } } } } },
      ];
    }
    if (query.class) where.grade = query.class;
    if (query.section) where.section = query.section;
    if (query.status) where.status = query.status;
    if (query.fromDate) where.enrolledAt = { gte: new Date(query.fromDate) };
    if (query.toDate) where.enrolledAt = { lte: new Date(query.toDate) };

    const { items, total } = await repo.listStudents(where, skip, limit);
    const enriched = items.map(s => ({
      id: s.id,
      name: `${s.firstName} ${s.lastName}`,
      rollNumber: s.rollNumber,
      class: s.grade,
      section: s.section,
      parentName: s.parentLinks[0]?.parent?.firstName 
        ? `${s.parentLinks[0].parent.firstName} ${s.parentLinks[0].parent.lastName || ''}`.trim()
        : 'Not linked',
      parentPhone: s.parentLinks[0]?.parent?.phone || '',
      email: null,
      status: s.status,
      photo: s.photoUrl,
      avatarInitials: `${s.firstName[0]}${s.lastName[0]}`,
    }));
    const meta = paginateMeta(total, page, limit);
    return { items: enriched, meta };
  }

  // ─── Link Parents to Student ───────────────────────────────────
  async linkParents(studentId, parentIds, schoolId) {
    const student = await repo.findStudentById(studentId, schoolId);
    if (!student) throw ApiError.notFound('Student not found');
    for (const parentId of parentIds) {
      const parent = await prisma.parentUser.findFirst({
        where: { id: parentId, students: { some: { student: { schoolId } } } }
      });
      if (!parent) throw ApiError.notFound(`Parent ${parentId} not found in this school`);
      await repo.linkParent(studentId, parentId, 'GUARDIAN', false, 1);
    }
    await getCache().del(`student:detail:${studentId}`);
    return { success: true };
  }

  // ─── Unlink Parent from Student ────────────────────────────────
  async unlinkParent(studentId, parentId, schoolId) {
    const student = await repo.findStudentById(studentId, schoolId);
    if (!student) throw ApiError.notFound('Student not found');
    await repo.unlinkParent(studentId, parentId);
    await getCache().del(`student:detail:${studentId}`);
    return { success: true };
  }

  // ─── Update Emergency Visibility ───────────────────────────────
  async updateEmergencyVisibility(studentId, visibility, schoolId) {
    const student = await repo.findStudentById(studentId, schoolId);
    if (!student) throw ApiError.notFound('Student not found');
    let visibilityId = student.cardVisibilityId;
    if (!visibilityId) {
      const newVis = await repo.createCardVisibility({ visibility });
      visibilityId = newVis.id;
      await repo.updateStudent(studentId, { cardVisibilityId: visibilityId });
    } else {
      await repo.updateCardVisibility(visibilityId, { visibility });
    }
    await getCache().del(`student:detail:${studentId}`);
    return { success: true };
  }

  // ─── Send Message to Parents ───────────────────────────────────
  async sendMessageToParents(studentId, subject, body, type, schoolId, senderId) {
    const student = await repo.findStudentById(studentId, schoolId);
    if (!student) throw ApiError.notFound('Student not found');
    const parentLinks = await repo.getLinkedParents(studentId);
    if (!parentLinks.length) throw ApiError.badRequest('No parents linked to this student');

    const messages = [];
    for (const link of parentLinks) {
      const msg = await prisma.message.create({
        data: {
          id: generateId('MSG'),
          schoolId,
          senderId,
          parentId: link.parent.id,
          studentId,
          subject: subject || `Message about ${student.firstName}`,
          body,
          type,
          direction: 'SCHOOL_TO_PARENT',
          status: 'SENT',
          channels: ['PUSH', 'EMAIL'],
        },
      });
      await notificationsQueue.add('send-message', {
        type: 'MESSAGE',
        messageId: msg.id,
        recipientId: link.parent.id,
        title: subject || `Message about ${student.firstName}`,
        body,
        priority: type === 'EMERGENCY' ? 1 : 5,
        schoolId,
      }, { priority: type === 'EMERGENCY' ? 1 : 5 });
      messages.push(msg);
    }
    return { sentTo: messages.length };
  }

  // ─── Stats Dashboard ───────────────────────────────────────────
  async getStats(schoolId) {
    return repo.getStats(schoolId);
  }

  // ─── Export Students (CSV/JSON) ────────────────────────────────
  async exportStudents(query, schoolId) {
    const { format, class: className, section, status, fields, emailDelivery } = query;
    const where = { schoolId, isActive: true };
    if (className) where.grade = className;
    if (section) where.section = section;
    if (status) where.status = status;
    const students = await prisma.student.findMany({
      where,
      include: { parentLinks: { include: { parent: true } } },
    });
    const exportFields = fields || ['name', 'class', 'section', 'rollNumber', 'parentName', 'parentPhone'];
    const data = students.map(s => {
      const row = {};
      if (exportFields.includes('name')) row.name = `${s.firstName} ${s.lastName}`;
      if (exportFields.includes('class')) row.class = s.grade;
      if (exportFields.includes('section')) row.section = s.section;
      if (exportFields.includes('rollNumber')) row.rollNumber = s.rollNumber;
      if (exportFields.includes('parentName')) row.parentName = s.parentLinks[0]?.parent?.firstName || '';
      if (exportFields.includes('parentPhone')) row.parentPhone = s.parentLinks[0]?.parent?.phone || '';
      return row;
    });
    let buffer, mimeType;
    if (format === 'csv') {
      const { Parser } = await import('json2csv');
      const parser = new Parser({ fields: exportFields });
      buffer = Buffer.from(parser.parse(data));
      mimeType = 'text/csv';
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
          subject: `Student Export (${format.toUpperCase()})`,
          html: `<p>Your export file is attached.</p>`,
          attachments: [{ filename: `students_export.${format}`, content: buffer }],
        });
      }
      return { success: true, emailedTo: adminEmail?.email };
    }
    return { buffer, mimeType, filename: `students_export.${format}` };
  }

  // ─── Upload Document ───────────────────────────────────────────
  async uploadDocument(studentId, file, name, type, schoolId) {
    validateDocument(file);
    const student = await repo.findStudentById(studentId, schoolId);
    if (!student) throw ApiError.notFound('Student not found');
    const storage = getStorage();
    const key = `schools/${schoolId}/students/${studentId}/documents/${Date.now()}-${file.originalname}`;
    const upload = await storage.upload(file.buffer, key, { contentType: file.mimetype });
    const doc = await repo.createDocument({
      studentId,
      name: name || file.originalname,
      type: type || 'OTHER',
      fileType: file.mimetype,
      fileSize: file.size,
      fileUrl: upload.location,
    });
    return doc;
  }

  // ─── Delete Document ───────────────────────────────────────────
  async deleteDocument(studentId, documentId, schoolId) {
    const student = await repo.findStudentById(studentId, schoolId);
    if (!student) throw ApiError.notFound('Student not found');
    await repo.deleteDocument(documentId, studentId);
    return { success: true };
  }

  // ─── Bulk Upload Students (CSV) ────────────────────────────────
  async bulkUploadStudents(file, schoolId) {
    const results = { success: 0, failed: 0, errors: [] };
    let records;

    try {
      const content = file.buffer.toString('utf-8');
      records = parse(content, { columns: true, skip_empty_lines: true });
    } catch (err) {
      throw ApiError.badRequest('Invalid CSV file format');
    }

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      try {
        if (!row.firstName || !row.lastName || !row.grade || !row.section) {
          throw new Error('Missing required fields: firstName, lastName, grade, section');
        }

        let parentIds = [];
        if (row.parentPhone) {
          const phone = normalizePhoneNumber(row.parentPhone);
          let parent = await parentRepo.findParentByPhone(phone);
          if (!parent && row.parentName) {
            const [firstName, ...lastNameParts] = row.parentName.split(' ');
            parent = await parentRepo.createParent({
              id: generateId('PAR'),
              firstName,
              lastName: lastNameParts.join(' '),
              phone,
              email: row.parentEmail,
              isActive: true,
            });
          }
          if (parent) parentIds = [parent.id];
        }

        await this.createStudent({
          firstName: row.firstName,
          lastName: row.lastName,
          grade: row.grade,
          section: row.section,
          rollNumber: row.rollNumber,
          gender: row.gender,
          dateOfBirth: row.dateOfBirth,
          bloodGroup: row.bloodGroup,
          parentIds,
        }, schoolId);

        results.success++;
      } catch (err) {
        results.failed++;
        results.errors.push({ row: i + 2, message: err.message });
      }
    }
    return results;
  }
}
