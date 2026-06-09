// =============================================================================
// modules/scan/scan.redirect.controller.js — RESQID
// Redirect endpoints for calls and WhatsApp from emergency QR scans.
// =============================================================================

import { asyncHandler } from '#shared/response/asyncHandler.js';
import { prisma } from '#config/prisma.js';
import { logger } from '#config/logger.js';
import { decodeScanCode } from '#shared/helpers/token.helper.js';
import { ApiError } from '#shared/response/ApiError.js';

// ─── Constants ───────────────────────────────────────────────────────────────
const EMERGENCY_VALID_STATUSES = new Set(['ACTIVE', 'ISSUED']);

/**
 * Find token by various identifiers (UUID, scan code, QR code, RFID)
 */
const findToken = async (token) => {
  if (!token) return null;

  // Try UUID first
  let record = await prisma.token.findUnique({
    where: { id: token },
    select: { 
      id: true, 
      status: true, 
      expiresAt: true, 
      schoolId: true, 
      studentId: true,
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  // Try QR code
  if (!record) {
    record = await prisma.token.findFirst({
      where: { qrCode: token },
      select: { 
        id: true, 
        status: true, 
        expiresAt: true, 
        schoolId: true, 
        studentId: true,
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  // Try RFID UID
  if (!record) {
    record = await prisma.token.findFirst({
      where: { rfidUid: token },
      select: { 
        id: true, 
        status: true, 
        expiresAt: true, 
        schoolId: true, 
        studentId: true,
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  // Try scan code decode (encrypted)
  if (!record && token.length === 43) {
    try {
      const uuid = decodeScanCode(token);
      record = await prisma.token.findUnique({
        where: { id: uuid },
        select: { 
          id: true, 
          status: true, 
          expiresAt: true, 
          schoolId: true, 
          studentId: true,
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });
    } catch (err) {
      logger.debug({ err: err.message, token: token.slice(0, 10) }, 'Invalid scan code');
    }
  }

  return record;
};

/**
 * Check if token is valid for emergency actions
 */
const isValidTokenForEmergency = (tokenRecord) => {
  if (!tokenRecord) return false;
  if (!EMERGENCY_VALID_STATUSES.has(tokenRecord.status)) return false;
  if (tokenRecord.expiresAt && new Date(tokenRecord.expiresAt) < new Date()) return false;
  return true;
};

/**
 * Render HTML dialer page for phone calls
 */
const renderDialer = (res, phone, title, subtitle, color, studentName = null) => {
  const displayTitle = title || (studentName ? `Emergency Contact for ${studentName}` : 'Emergency Call');
  
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
        <title>${escapeHtml(displayTitle)}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            margin: 0;
            min-height: 100vh;
            background: linear-gradient(135deg, #0a0f1e 0%, #0f1424 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            padding: 20px;
          }
          .container {
            text-align: center;
            padding: 32px 24px;
            background: rgba(255,255,255,0.03);
            border-radius: 32px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.1);
            max-width: 400px;
            width: 100%;
          }
          .spinner {
            width: 56px;
            height: 56px;
            border: 3px solid rgba(232, 69, 69, 0.2);
            border-top-color: ${color};
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            margin: 0 auto 24px;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          .title {
            color: #f1f5f9;
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 8px;
          }
          .subtitle {
            color: #64748b;
            font-size: 14px;
            margin-bottom: 20px;
          }
          .phone-number {
            color: ${color};
            font-size: 24px;
            font-weight: 700;
            margin-bottom: 24px;
            letter-spacing: 1px;
          }
          .fallback-link {
            display: inline-block;
            color: ${color};
            text-decoration: none;
            font-size: 14px;
            padding: 10px 20px;
            border: 1px solid ${color};
            border-radius: 50px;
            transition: all 0.3s ease;
          }
          .fallback-link:hover {
            background: ${color};
            color: white;
          }
          .student-name {
            color: #94a3b8;
            font-size: 13px;
            margin-top: 20px;
            padding-top: 16px;
            border-top: 1px solid rgba(255,255,255,0.1);
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="spinner"></div>
          <div class="title">${escapeHtml(displayTitle)}</div>
          ${subtitle ? `<div class="subtitle">${escapeHtml(subtitle)}</div>` : ''}
          <div class="phone-number">${escapeHtml(phone)}</div>
          <a href="tel:${escapeHtml(phone)}" class="fallback-link">Tap if dialer doesn't open</a>
          ${studentName ? `<div class="student-name">Student: ${escapeHtml(studentName)}</div>` : ''}
        </div>
        <script>
          window.location.href = 'tel:${escapeHtml(phone)}';
          setTimeout(() => {
            if (!document.hidden) {
              window.location.href = 'tel:${escapeHtml(phone)}';
            }
          }, 1000);
        </script>
      </body>
    </html>
  `);
};

/**
 * Basic HTML escaping to prevent XSS
 */
const escapeHtml = (str) => {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

// =============================================================================
// CONTACT ENDPOINTS
// =============================================================================

/**
 * GET /s/call/:contactId/:token
 * Initiate a phone call to an emergency contact
 */
export const callContact = asyncHandler(async (req, res) => {
  const { contactId, token } = req.params;

  const tokenRecord = await findToken(token);
  if (!isValidTokenForEmergency(tokenRecord)) {
    logger.warn({ contactId, tokenPrefix: token?.slice(0, 10) }, 'Invalid token for call contact');
    return res.status(404).json({ error: 'Invalid or expired token' });
  }

  const contact = await prisma.emergencyContact.findUnique({
    where: { id: contactId, isActive: true },
    select: { phone: true, name: true, relationship: true },
  });

  if (!contact?.phone) {
    return res.status(404).json({ error: 'Contact not found or has no phone number' });
  }

  const studentName = tokenRecord.student 
    ? `${tokenRecord.student.firstName} ${tokenRecord.student.lastName}`
    : null;

  renderDialer(
    res, 
    contact.phone, 
    `Calling ${contact.name}`, 
    contact.relationship ? `(${contact.relationship})` : null,
    '#e84545',
    studentName
  );
});

/**
 * GET /s/whatsapp/:contactId/:token
 * Redirect to WhatsApp chat with emergency contact
 */
export const whatsappContact = asyncHandler(async (req, res) => {
  const { contactId, token } = req.params;

  const tokenRecord = await findToken(token);
  if (!isValidTokenForEmergency(tokenRecord)) {
    logger.warn({ contactId, tokenPrefix: token?.slice(0, 10) }, 'Invalid token for WhatsApp');
    return res.status(404).json({ error: 'Invalid or expired token' });
  }

  const contact = await prisma.emergencyContact.findUnique({
    where: { id: contactId, isActive: true },
    select: { phone: true, name: true },
  });

  if (!contact?.phone) {
    return res.status(404).json({ error: 'Contact not found' });
  }

  const cleanPhone = contact.phone.replace(/\D/g, '');
  logger.info({ contactId, phone: cleanPhone.slice(0, 6) + '...' }, 'WhatsApp redirect');
  
  res.redirect(302, `https://wa.me/${cleanPhone}`);
});

// =============================================================================
// SCHOOL ENDPOINTS
// =============================================================================

/**
 * GET /s/call/school/:token
 * Initiate a phone call to the school
 */
export const callSchool = asyncHandler(async (req, res) => {
  const { token } = req.params;

  const tokenRecord = await findToken(token);
  if (!isValidTokenForEmergency(tokenRecord)) {
    logger.warn({ tokenPrefix: token?.slice(0, 10) }, 'Invalid token for call school');
    return res.status(404).json({ error: 'Invalid or expired token' });
  }

  const school = await prisma.school.findUnique({
    where: { id: tokenRecord.schoolId },
    select: { phone: true, name: true },
  });

  if (!school?.phone) {
    return res.status(404).json({ error: 'School phone number not available' });
  }

  const studentName = tokenRecord.student 
    ? `${tokenRecord.student.firstName} ${tokenRecord.student.lastName}`
    : null;

  renderDialer(
    res, 
    school.phone, 
    `Calling ${school.name}`, 
    'School Administration',
    '#3b82f6',
    studentName
  );
});

// =============================================================================
// DOCTOR ENDPOINTS
// =============================================================================

/**
 * GET /s/call/doctor/:token
 * Initiate a phone call to the student's registered doctor
 */
export const callDoctor = asyncHandler(async (req, res) => {
  const { token } = req.params;

  // Fetch token with emergency profile in one query
  const tokenWithDoctor = await prisma.token.findFirst({
    where: {
      OR: [
        { id: token },
        { qrCode: token },
        { rfidUid: token },
        ...(token.length === 43 ? [{ id: { equals: token } }] : []),
      ],
    },
    select: {
      id: true,
      status: true,
      expiresAt: true,
      schoolId: true,
      studentId: true,
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          emergencyProfile: {
            select: {
              doctorPhone: true,
              doctorName: true,
            },
          },
        },
      },
    },
  });

  // If not found by direct fields, try decoding scan code
  let tokenRecord = tokenWithDoctor;
  if (!tokenRecord && token.length === 43) {
    try {
      const uuid = decodeScanCode(token);
      tokenRecord = await prisma.token.findUnique({
        where: { id: uuid },
        select: {
          id: true,
          status: true,
          expiresAt: true,
          schoolId: true,
          studentId: true,
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              emergencyProfile: {
                select: {
                  doctorPhone: true,
                  doctorName: true,
                },
              },
            },
          },
        },
      });
    } catch (err) {
      logger.debug({ err: err.message }, 'Invalid scan code for doctor call');
    }
  }

  if (!isValidTokenForEmergency(tokenRecord)) {
    logger.warn({ tokenPrefix: token?.slice(0, 10) }, 'Invalid token for call doctor');
    return res.status(404).json({ error: 'Invalid or expired token' });
  }

  const phone = tokenRecord?.student?.emergencyProfile?.doctorPhone;
  const doctorName = tokenRecord?.student?.emergencyProfile?.doctorName;
  const studentName = tokenRecord?.student 
    ? `${tokenRecord.student.firstName} ${tokenRecord.student.lastName}`
    : null;

  if (!phone) {
    return res.status(404).json({ error: 'Doctor contact not available for this student' });
  }

  renderDialer(
    res,
    phone,
    doctorName ? `Calling Dr. ${doctorName}` : 'Calling Doctor',
    doctorName ? 'Registered Medical Professional' : 'Emergency Medical Contact',
    '#10b981',
    studentName
  );
});

// =============================================================================
// UTILITY ENDPOINTS
// =============================================================================

/**
 * GET /s/status/:token
 * Check token validity (for frontend to verify before showing emergency actions)
 */
export const checkTokenStatus = asyncHandler(async (req, res) => {
  const { token } = req.params;

  const tokenRecord = await findToken(token);
  const isValid = isValidTokenForEmergency(tokenRecord);
  
  let statusInfo = null;
  if (tokenRecord) {
    statusInfo = {
      status: tokenRecord.status,
      expiresAt: tokenRecord.expiresAt,
      isExpired: tokenRecord.expiresAt ? new Date(tokenRecord.expiresAt) < new Date() : false,
    };
  }

  res.json({
    success: true,
    data: {
      isValid,
      status: statusInfo,
      student: isValid && tokenRecord.student ? {
        id: tokenRecord.student.id,
        name: `${tokenRecord.student.firstName} ${tokenRecord.student.lastName}`,
      } : null,
      schoolId: isValid ? tokenRecord.schoolId : null,
    },
  });
});

/**
 * GET /s/contacts/:token
 * Get all emergency contacts for a token (for frontend to display)
 */
export const getEmergencyContacts = asyncHandler(async (req, res) => {
  const { token } = req.params;

  const tokenRecord = await findToken(token);
  if (!isValidTokenForEmergency(tokenRecord)) {
    throw ApiError.unauthorized('Invalid or expired token');
  }

  const student = await prisma.student.findUnique({
    where: { id: tokenRecord.studentId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      emergencyProfile: {
        select: {
          doctorName: true,
          doctorPhone: true,
          bloodGroup: true,
          allergies: true,
          conditions: true,
        },
      },
      parentLinks: {
        where: { isEmergency: true },
        include: {
          parent: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              isEmergencyContact: true,
            },
          },
        },
      },
    },
  });

  if (!student) {
    throw ApiError.notFound('Student not found');
  }

  const contacts = [];

  for (const link of student.parentLinks) {
    if (link.parent.phone) {
      contacts.push({
        id: link.parent.id,
        name: `${link.parent.firstName} ${link.parent.lastName}`.trim(),
        phone: link.parent.phone,
        type: 'parent',
        relationship: link.relation,
        priority: link.priority,
      });
    }
  }

  if (student.emergencyProfile?.doctorPhone) {
    contacts.push({
      id: 'doctor',
      name: student.emergencyProfile.doctorName || 'Family Doctor',
      phone: student.emergencyProfile.doctorPhone,
      type: 'doctor',
      relationship: 'Family Doctor',
      priority: 2,
    });
  }

  contacts.sort((a, b) => (a.priority || 99) - (b.priority || 99));

  res.json({
    success: true,
    data: {
      student: {
        id: student.id,
        name: `${student.firstName} ${student.lastName}`.trim(),
        bloodGroup: student.emergencyProfile?.bloodGroup,
        allergies: student.emergencyProfile?.allergies || [],
        conditions: student.emergencyProfile?.conditions || [],
      },
      contacts,
    },
  });
});