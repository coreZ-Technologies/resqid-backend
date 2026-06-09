// =============================================================================
// modules/students/student.service.js — RESQID
// =============================================================================

import { prisma } from '#config/prisma.js';
import { ApiError } from '#shared/response/ApiError.js';
import { getPagination, paginateMeta } from '#shared/response/paginate.js';
import { getCache, CacheKey, TTL } from '#infrastructure/cache/cache.index.js';
import { getStorage, StoragePath } from '#infrastructure/storage/storage.index.js';
import { getEmail } from '#infrastructure/email/email.index.js';
import { notificationsQueue } from '#orchestrator/queues/queue.config.js';
import * as repo from './student.repository.js';
import { generateStudentId, generateId } from '#services/IdGenerator.service.js';
import { validateImage, validateDocument } from '#shared/helpers/fileUtil.js';
import { normalizePhoneNumber } from '#shared/utils/phoneNormalize.js';
import { formatDateIST, addDays } from '#shared/helpers/dateTime.js';
import { format } from 'date-fns';
import { parse } from 'csv-parse/sync';
import { ParentRepository } from '../parents/parent.repository.js';

const parentRepo = new ParentRepository();

// ─── Helpers (for create/update) ─────────────────────────────────────────────

async function handleCardVisibility(data, schoolId, studentId = null) {
  if (!data.cardVisibility) return null;
  const visibility = await repo.createCardVisibility(data.cardVisibility);
  return visibility.id;
}

async function handleEmergencyProfile(schoolId, studentId, medicalInfo, emergencyContacts) {
  // Create emergency profile
  const profile = await prisma.emergencyProfile.create({
    data: {
      schoolId,
      studentId,
      bloodGroup: medicalInfo.bloodGroup,
      allergies: medicalInfo.allergies || [],
      conditions: medicalInfo.conditions || [],
      medications: medicalInfo.medications || [],
      doctorName: medicalInfo.doctorName,
      doctorPhone: medicalInfo.doctorPhone,
      doctorSpecialization: medicalInfo.doctorSpecialization,
      doctorClinic: medicalInfo.doctorClinic,
      doctorAddress: medicalInfo.doctorAddress,
      hospitalName: medicalInfo.hospitalName,
      hospitalPhone: medicalInfo.hospitalPhone,
      hospitalAddress: medicalInfo.hospitalAddress,
      insuranceProvider: medicalInfo.insuranceProvider,
      insurancePolicyNumber: medicalInfo.insurancePolicyNumber,
      insuranceValidUntil: medicalInfo.insuranceValidUntil ? new Date(medicalInfo.insuranceValidUntil) : null,
      emergencyInstructions: medicalInfo.emergencyInstructions,
      notes: medicalInfo.notes,
      lastCheckup: medicalInfo.lastCheckup ? new Date(medicalInfo.lastCheckup) : null,
      isComplete: true,
    },
  });

  // Add emergency contacts
  if (emergencyContacts?.length) {
    await prisma.emergencyContact.createMany({
      data: emergencyContacts.map((c) => ({
        emergencyProfileId: profile.id,
        schoolId,
        name: c.name,
        relation: c.relationship || 'Other',
        phone: c.phone,
        priority: c.priority,
        isActive: true,
      })),
    });
  }

  return profile;
}

async function handleParents(studentId, parents, parentIds = []) {
  // Create new parents if they don't exist
  for (const p of parents) {
    let parent = await prisma.parentUser.findFirst({
      where: { phone: p.phone },
    });
    if (!parent) {
      const nameParts = p.name.split(' ');
      parent = await prisma.parentUser.create({
        data: {
          id: generateId('PAR'),
          firstName: nameParts[0],
          lastName: nameParts.slice(1).join(' ') || '',
          phone: p.phone,
          email: p.email,
          canCall: p.canCall,
          canWhatsapp: p.canWhatsapp,
          isActive: true,
        },
      });
    }
    await repo.linkParent(studentId, parent.id, p.relationship, p.isPrimary, 1);
  }

  // Link any existing parentIds (legacy)
  if (parentIds?.length) {
    for (const pid of parentIds) {
      await repo.linkParent(studentId, pid, 'GUARDIAN', false, 1);
    }
  }
}

// ─── Service Methods ─────────────────────────────────────────────────────────

export const list = async (req) => {
  const { role, schoolId, id: userId } = req.user;
  const query = req.query;

  if (role === 'SUPER_ADMIN') {
    if (req.params.schoolId) {
      const { students, total } = await repo.findBySchool(req.params.schoolId, query);
      return { students, total };
    }
    const { students, total } = await repo.findAll(query);
    return { students, total };
  }

  if (role === 'PARENT') {
    const { students, total } = await repo.findByParent(userId, query);
    return { students, total };
  }

  // SCHOOL_ADMIN, TEACHER
  if (!schoolId) throw ApiError.tenantRequired();
  const { students, total } = await repo.findBySchool(schoolId, query);
  return { students, total };
};

export const getOne = async (id, req) => {
  const { role, schoolId } = req.user;
  const student = await repo.findById(id, role === 'SUPER_ADMIN' ? null : schoolId);
  if (!student) throw ApiError.studentNotFound();

  if (role === 'PARENT') {
    const link = await prisma.parentStudent.findFirst({
      where: { parentId: req.user.id, studentId: id, isActive: true },
    });
    if (!link) throw ApiError.forbidden('Student not linked to your account');
  }

  // Enrich with attendance, notifications, etc. (same as HEAD version)
  let emergencyContacts = [];
  if (student.emergencyProfile) {
    const profile = await prisma.emergencyProfile.findUnique({
      where: { id: student.emergencyProfile.id },
      include: { contacts: true },
    });
    emergencyContacts = profile?.contacts || [];
  }

  const parents = (student.parentLinks || []).map((link) => ({
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
  });

  // Attendance summary (last 180 days)
  const today = new Date();
  const startOfTerm = addDays(today, -180);
  const attendanceRecords = await prisma.studentAttendanceRecord.findMany({
    where: {
      studentId: id,
      markedAt: { gte: startOfTerm, lte: today },
    },
  });
  const totalDays = attendanceRecords.length;
  const presentDays = attendanceRecords.filter((r) => r.status === 'PRESENT').length;
  const attendancePercentage = totalDays ? Math.round((presentDays / totalDays) * 100) : 0;

  // Monthly breakdown
  const monthly = {};
  attendanceRecords.forEach((rec) => {
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
  });
  const recentAbsences = recentAbsenceRecords.map((rec) => ({
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
    age: student.dateOfBirth
      ? Math.floor((Date.now() - new Date(student.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : null,
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
    emergencyContacts: emergencyContacts.map((c) => ({
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
      doctor: student.emergencyProfile?.doctorName
        ? {
            name: student.emergencyProfile.doctorName,
            phone: student.emergencyProfile.doctorPhone,
            specialization: student.emergencyProfile.doctorSpecialization,
            clinic: student.emergencyProfile.doctorClinic,
            address: student.emergencyProfile.doctorAddress,
          }
        : null,
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
    documents: documents.map((d) => ({
      id: d.id,
      name: d.name,
      type: d.fileType.toUpperCase(),
      size: `${Math.round(d.fileSize / 1024)} KB`,
      uploadedAt: d.uploadedAt,
    })),
    recentActivity: recentNotifications.map((n) => ({
      action: n.title,
      date: formatDateIST(n.createdAt),
      status: 'Completed',
    })),
    feeDetails: null,
  };
};

export const create = async (data, schoolId, photoFile = null) => {
  // Handle RFID uniqueness
  if (data.rfidTagNumber) {
    const existing = await prisma.student.findUnique({
      where: { rfidTagNumber: data.rfidTagNumber },
    });
    if (existing) throw ApiError.conflict('RFID tag number already in use');
  }

  // Upload photo if provided
  let photoUrl = null;
  if (photoFile) {
    validateImage(photoFile);
    const storage = getStorage();
    const key = StoragePath.studentPhoto(schoolId, 'temp', photoFile.mimetype);
    const upload = await storage.upload(photoFile.buffer, key, { contentType: photoFile.mimetype });
    photoUrl = upload.location;
  }

  // Create card visibility
  let cardVisibilityId = null;
  if (data.cardVisibility) {
    const visibility = await repo.createCardVisibility(data.cardVisibility);
    cardVisibilityId = visibility.id;
  }

  // Generate QR code ID
  const qrCodeId = generateId('QR');

  // Create student record
  const student = await repo.create(schoolId, {
    firstName: data.firstName,
    lastName: data.lastName,
    dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
    gender: data.gender,
    bloodGroup: data.bloodGroup,
    grade: data.grade,
    section: data.section,
    rollNumber: data.rollNumber,
    studentId: qrCodeId,
    allergies: data.medicalInfo?.allergies || [],
    conditions: data.medicalInfo?.conditions || [],
    medications: data.medicalInfo?.medications || [],
    medicalNotes: data.medicalInfo?.notes,
    transportRoute: data.transportRoute,
    transportStop: data.transportStop,
    rfidTagNumber: data.rfidTagNumber,
    photoUrl,
    cardVisibilityId,
    metadata: data.metadata || {},
    status: data.status || 'ACTIVE',
    isActive: true,
  });

  // Create emergency profile + contacts
  if (data.medicalInfo || data.emergencyContacts?.length) {
    await handleEmergencyProfile(schoolId, student.id, data.medicalInfo || {}, data.emergencyContacts || []);
  }

  // Link parents (either from nested `parents` array or legacy `parentIds`)
  if (data.parents?.length || data.parentIds?.length) {
    await handleParents(student.id, data.parents || [], data.parentIds || []);
  }

  await getCache().del(CacheKey.school(schoolId));
  return student;
};

export const update = async (id, data, schoolId, photoFile = null) => {
  const student = await repo.findById(id, schoolId);
  if (!student) throw ApiError.studentNotFound();

  if (data.rfidTagNumber && data.rfidTagNumber !== student.rfidTagNumber) {
    const existing = await prisma.student.findUnique({
      where: { rfidTagNumber: data.rfidTagNumber },
    });
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

  const updated = await repo.update(id, data);
  await getCache().del(CacheKey.school(schoolId));
  await getCache().del(`student:${id}`);
  return updated;
};

export const remove = async (id, schoolId) => {
  const student = await repo.findById(id, schoolId);
  if (!student) throw ApiError.studentNotFound();
  await repo.remove(id);
  await getCache().del(`student:${id}`);
  return { success: true };
};

export const bulkCreate = async (students, schoolId) => {
  const results = { success: 0, failed: 0, errors: [] };
  for (const studentData of students) {
    try {
      await create(studentData, schoolId);
      results.success++;
    } catch (err) {
      results.failed++;
      results.errors.push({ student: `${studentData.firstName} ${studentData.lastName}`, error: err.message });
    }
  }
  return results;
};

export const getStats = async (schoolId) => {
  return repo.getStats(schoolId);
};

// ─── Additional Methods (from HEAD) ─────────────────────────────────────────

export const linkParents = async (studentId, parentIds, schoolId) => {
  const student = await repo.findById(studentId, schoolId);
  if (!student) throw ApiError.studentNotFound();
  for (const pid of parentIds) {
    const parent = await prisma.parentUser.findFirst({
      where: { id: pid, students: { some: { student: { schoolId } } } },
    });
    if (!parent) throw ApiError.notFound(`Parent ${pid} not found in this school`);
    await repo.linkParent(studentId, pid, 'GUARDIAN', false, 1);
  }
  await getCache().del(`student:detail:${studentId}`);
  return { success: true };
};

export const unlinkParent = async (studentId, parentId, schoolId) => {
  const student = await repo.findById(studentId, schoolId);
  if (!student) throw ApiError.studentNotFound();
  await repo.unlinkParent(studentId, parentId);
  await getCache().del(`student:detail:${studentId}`);
  return { success: true };
};

export const updateEmergencyVisibility = async (studentId, visibility, schoolId) => {
  const student = await repo.findById(studentId, schoolId);
  if (!student) throw ApiError.studentNotFound();
  let visibilityId = student.cardVisibilityId;
  if (!visibilityId) {
    const newVis = await repo.createCardVisibility({ visibility });
    visibilityId = newVis.id;
    await repo.update(studentId, { cardVisibilityId: visibilityId });
  } else {
    await repo.updateCardVisibility(visibilityId, { visibility });
  }
  await getCache().del(`student:detail:${studentId}`);
  return { success: true };
};

export const sendMessageToParents = async (studentId, subject, body, type, schoolId, senderId) => {
  const student = await repo.findById(studentId, schoolId);
  if (!student) throw ApiError.studentNotFound();
  const parentLinks = await prisma.parentStudent.findMany({
    where: { studentId, isActive: true },
    include: { parent: true },
  });
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
    await notificationsQueue.add(
      'send-message',
      {
        type: 'MESSAGE',
        messageId: msg.id,
        recipientId: link.parent.id,
        title: subject || `Message about ${student.firstName}`,
        body,
        priority: type === 'EMERGENCY' ? 1 : 5,
        schoolId,
      },
      { priority: type === 'EMERGENCY' ? 1 : 5 }
    );
    messages.push(msg);
  }
  return { sentTo: messages.length };
};

export const exportStudents = async (query, schoolId) => {
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
  const data = students.map((s) => {
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
    const adminEmail = await prisma.schoolUser.findFirst({
      where: { schoolId, role: 'SCHOOL_ADMIN' },
      select: { email: true },
    });
    if (adminEmail?.email) {
      const email = getEmail();
      await email.send({
        to: adminEmail.email,
        subject: `Student Export (${format.toUpperCase()})`,
        html: '<p>Your export file is attached.</p>',
        attachments: [{ filename: `students_export.${format}`, content: buffer }],
      });
    }
    return { success: true, emailedTo: adminEmail?.email };
  }
  return { buffer, mimeType, filename: `students_export.${format}` };
};

export const uploadDocument = async (studentId, file, name, type, schoolId) => {
  validateDocument(file);
  const student = await repo.findById(studentId, schoolId);
  if (!student) throw ApiError.studentNotFound();

  const storage = getStorage();
  const key = `schools/${schoolId}/students/${studentId}/documents/${Date.now()}-${file.originalname}`;
  const upload = await storage.upload(file.buffer, key, { contentType: file.mimetype });

  const doc = await prisma.studentDocument.create({
    data: {
      studentId,
      name: name || file.originalname,
      type: type || 'OTHER',
      fileType: file.mimetype,
      fileSize: file.size,
      fileUrl: upload.location,
    },
  });
  return doc;
};

export const deleteDocument = async (studentId, documentId, schoolId) => {
  const student = await repo.findById(studentId, schoolId);
  if (!student) throw ApiError.studentNotFound();
  await prisma.studentDocument.deleteMany({
    where: { id: documentId, studentId },
  });
  return { success: true };
};

export const bulkUploadStudents = async (file, schoolId) => {
  const results = { success: 0, failed: 0, errors: [] };
  let records;

  try {
    const content = file.buffer.toString('utf-8');
    records = parse(content, { columns: true, skip_empty_lines: true });
  } catch {
    throw ApiError.badRequest('Invalid CSV file format');
  }

  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    try {
      if (!row.firstName || !row.lastName || !row.grade || !row.section) {
        throw new Error('Missing required fields: firstName, lastName, grade, section');
      }

      const parentIds = [];
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
        if (parent) parentIds.push(parent.id);
      }

      await create(
        {
          firstName: row.firstName,
          lastName: row.lastName,
          grade: row.grade,
          section: row.section,
          rollNumber: row.rollNumber,
          gender: row.gender,
          dateOfBirth: row.dateOfBirth,
          bloodGroup: row.bloodGroup,
          parentIds,
        },
        schoolId
      );

      results.success++;
    } catch (err) {
      results.failed++;
      results.errors.push({ row: i + 2, message: err.message });
    }
  }
  return results;
};