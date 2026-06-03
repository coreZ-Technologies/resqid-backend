// =============================================================================
// modules/scan/scan.redirect.controller.js — RESQID
// Redirect endpoints for calls and WhatsApp from emergency profile.
// =============================================================================

import { asyncHandler } from '#shared/response/asyncHandler.js';
import { prisma } from '#config/prisma.js';
import { logger } from '#config/logger.js';
import { decodeScanCode } from '#shared/helpers/token.helper.js';

// ─── Token Lookup (shared) ────────────────────────────────────────────────────

/**
 * Find token by UUID or scan code.
 * Returns null if not found or revoked.
 */
const findToken = async (token) => {
  // Try UUID first
  let record = await prisma.token.findUnique({
    where: { id: token },
    select: { id: true, status: true, expiresAt: true, schoolId: true, studentId: true },
  });

  // Try scan code decode (43-char base62)
  if (!record && token.length === 43) {
    try {
      const uuid = decodeScanCode(token);
      record = await prisma.token.findUnique({
        where: { id: uuid },
        select: { id: true, status: true, expiresAt: true, schoolId: true, studentId: true },
      });
    } catch {
      // Invalid scan code — return null
    }
  }

  // Check expiry
  if (record?.expiresAt && new Date(record.expiresAt) < new Date()) {
    return null;
  }

  return record;
};

// ─── Dialer Page Renderer ─────────────────────────────────────────────────────

const renderDialer = (res, phone, title, subtitle, color) => {
  res.send(`
    <!DOCTYPE html><html><head>
      <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
      <title>${title}</title>
      <style>
        body{margin:0;min-height:100vh;background:#0a0f1e;display:flex;align-items:center;justify-content:center;font-family:system-ui,-apple-system,sans-serif}
        .spinner{width:48px;height:48px;border:3px solid rgba(232,69,69,.2);border-top-color:${color};border-radius:50%;animation:spin .8s linear infinite;margin:0 auto 20px}
        @keyframes spin{to{transform:rotate(360deg)}}
        .msg{color:#f1f5f9;font-size:16px;margin-bottom:8px;text-align:center}
        .num{color:${color};font-size:20px;font-weight:600;margin-bottom:20px;text-align:center}
        a{color:${color};text-decoration:none}
      </style></head>
      <body>
        <div style="text-align:center;padding:24px">
          <div class="spinner"></div>
          <div class="msg">${title}</div>
          ${subtitle ? `<div class="msg" style="color:#64748b;font-size:14px">${subtitle}</div>` : ''}
          <div class="num">${phone}</div>
          <a href="tel:${phone}">Tap here if dialer doesn't open</a>
        </div>
        <script>
          window.location.href='tel:${phone}';
          setTimeout(()=>{if(!document.hidden)window.location.href='tel:${phone}';},1000);
        </script>
      </body></html>`);
};

// ─── Redirect Handlers ────────────────────────────────────────────────────────

/**
 * GET /api/scan/call/:contactId/:token
 * Opens phone dialer to call an emergency contact.
 */
export const callContact = asyncHandler(async (req, res) => {
  const { contactId, token } = req.params;

  const tokenRecord = await findToken(token);
  if (!tokenRecord || tokenRecord.status === 'REVOKED') {
    return res.status(404).json({ error: 'Invalid or revoked token' });
  }

  const contact = await prisma.emergencyContact.findUnique({
    where: { id: contactId, isActive: true },
    select: { phone: true, name: true },
  });

  if (!contact?.phone) {
    return res.status(404).json({ error: 'Contact not found' });
  }

  logger.info({ contactId, phone: contact.phone.slice(0, 6) + '…' }, '[scan] Call dialer opened');

  renderDialer(res, contact.phone, `Calling ${contact.name}`, null, '#e84545');
});

/**
 * GET /api/scan/whatsapp/:contactId/:token
 * Opens WhatsApp chat with emergency contact.
 */
export const whatsappContact = asyncHandler(async (req, res) => {
  const { contactId, token } = req.params;

  const tokenRecord = await findToken(token);
  if (!tokenRecord || tokenRecord.status === 'REVOKED') {
    return res.status(404).json({ error: 'Invalid or revoked token' });
  }

  const contact = await prisma.emergencyContact.findUnique({
    where: { id: contactId, isActive: true },
    select: { phone: true },
  });

  if (!contact?.phone) {
    return res.status(404).json({ error: 'Contact not found' });
  }

  logger.info({ contactId }, '[scan] WhatsApp redirect');

  const cleanPhone = contact.phone.replace(/\D/g, '');
  return res.redirect(302, `https://wa.me/${cleanPhone}`);
});

/**
 * GET /api/scan/call-school/:token
 * Opens phone dialer to call the school.
 */
export const callSchool = asyncHandler(async (req, res) => {
  const { token } = req.params;

  const tokenRecord = await findToken(token);
  if (!tokenRecord || tokenRecord.status === 'REVOKED') {
    return res.status(404).json({ error: 'Invalid or revoked token' });
  }

  const school = await prisma.school.findUnique({
    where: { id: tokenRecord.schoolId },
    select: { phone: true, name: true },
  });

  if (!school?.phone) {
    return res.status(404).json({ error: 'School phone not available' });
  }

  logger.info({ schoolId: tokenRecord.schoolId }, '[scan] School dialer opened');

  renderDialer(res, school.phone, `Calling ${school.name}`, null, '#3b82f6');
});

/**
 * GET /api/scan/call-doctor/:token
 * Opens phone dialer to call the student's doctor.
 */
export const callDoctor = asyncHandler(async (req, res) => {
  const { token } = req.params;

  const tokenRecord = await findToken(token);
  if (!tokenRecord || tokenRecord.status === 'REVOKED') {
    return res.status(404).json({ error: 'Invalid or revoked token' });
  }

  const tokenWithStudent = await prisma.token.findUnique({
    where: { id: tokenRecord.id },
    select: {
      student: {
        select: {
          emergencyProfile: {
            select: { doctorPhone: true, doctorName: true },
          },
        },
      },
    },
  });

  const doctorPhone = tokenWithStudent?.student?.emergencyProfile?.doctorPhone;
  const doctorName = tokenWithStudent?.student?.emergencyProfile?.doctorName;

  if (!doctorPhone) {
    return res.status(404).json({ error: 'Doctor phone not available' });
  }

  logger.info({ tokenId: tokenRecord.id }, '[scan] Doctor dialer opened');

  renderDialer(res, doctorPhone, 'Calling Doctor', doctorName, '#10b981');
});
