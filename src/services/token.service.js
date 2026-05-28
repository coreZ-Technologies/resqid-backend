// =============================================================================
// token.service.js — RESQID
// Token service — scan resolution and token state validation.
// All crypto helpers re-exported from token.helpers.js
// =============================================================================

import { prisma } from '#config/prisma.js';
import { logger } from '#config/logger.js';
import { decrypt } from '#shared/security/encryption.js';
import { ApiError } from '#shared/response/ApiError.js';
import { SCAN_RESULT, TOKEN_STATUS } from '#shared/constants/status.js';

// Re-export all helpers as authoritative source
export {
  generateRawToken,
  hashRawToken,
  generateCardNumber,
  batchGenerateCardNumbers,
  generateBlankCardNumber,
  buildScanUrl,
  generateScanCode,
  decodeScanCode,
  calculateExpiry,
  resolveBranding,
  toQrTypeEnum,
  ScanCodeError,
} from '#shared/helpers/token.helper.js';

import { decodeScanCode, ScanCodeError } from '#shared/helpers/token.helper.js';

// =============================================================================
// SCAN RESOLUTION (Public scan API)
// =============================================================================

/**
 * Resolve a scan code to token, student, and emergency profile data.
 * Cryptographic verification happens BEFORE any DB query.
 *
 * @param {string} scanCode — 43-char base62 code from URL
 * @returns {Promise<Object>} Token, school, student, and emergency data
 */
export const resolveScanCode = async (scanCode) => {
  // 1. Decode + verify scan code (AES-SIV) — throws ScanCodeError if invalid
  let tokenId;
  try {
    tokenId = decodeScanCode(scanCode);
  } catch (err) {
    if (err instanceof ScanCodeError) {
      throw ApiError.badRequest('Invalid or expired QR code', [], 'QR_INVALID');
    }
    throw err;
  }

  // 2. Fetch token with only needed fields
  const token = await prisma.token.findUnique({
    where: { id: tokenId },
    select: {
      id: true,
      status: true,
      expires_at: true,
      school: {
        select: { id: true, name: true, logo_url: true, phone: true, address: true },
      },
      student: {
        select: {
          id: true,
          first_name: true,
          last_name: true,
          photo_url: true,
          class: true,
          section: true,
          cardVisibility: { select: { visibility: true } },
          emergency: {
            select: {
              blood_group: true,
              allergies: true,
              conditions: true,
              medications: true,
              notes: true,
              contacts: {
                where: { is_active: true },
                orderBy: { priority: 'asc' },
                select: {
                  name: true,
                  relationship: true,
                  priority: true,
                  phone_encrypted: true,
                  call_enabled: true,
                  whatsapp_enabled: true,
                },
              },
              doctor_name: true,
              doctor_phone_encrypted: true,
            },
          },
        },
      },
    },
  });

  if (!token) {
    throw ApiError.notFound('Token not found', 'CARD_NOT_FOUND');
  }

  // 3. Validate token state
  const validation = validateTokenState(token);
  if (!validation.valid) {
    throw ApiError.badRequest(validation.reason, [], validation.code);
  }

  // 4. Build response with visibility rules
  const profile = buildEmergencyProfile(token.student);

  return {
    token: {
      id: token.id,
      status: token.status,
      expires_at: token.expires_at,
    },
    school: token.school
      ? {
          name: token.school.name,
          logo_url: token.school.logo_url,
          phone: token.school.phone,
          address: token.school.address,
        }
      : null,
    student: token.student
      ? {
          name: `${token.student.first_name ?? ''} ${token.student.last_name ?? ''}`.trim(),
          photo_url: token.student.photo_url,
          class: token.student.class,
          section: token.student.section,
        }
      : null,
    emergency: profile,
  };
};

// =============================================================================
// TOKEN STATE VALIDATION
// =============================================================================

/**
 * Validate token state before returning scan data.
 */
const validateTokenState = (token) => {
  if (!token) return { valid: false, reason: 'Token not found', code: 'CARD_NOT_FOUND' };

  switch (token.status) {
    case TOKEN_STATUS.REVOKED:
      return { valid: false, reason: 'Card has been revoked', code: 'CARD_REVOKED' };
    case TOKEN_STATUS.INACTIVE:
      return { valid: false, reason: 'Card is not active', code: 'CARD_INACTIVE' };
    case TOKEN_STATUS.LOST:
      return { valid: false, reason: 'Card reported lost', code: 'CARD_LOST_REPORTED' };
    case TOKEN_STATUS.UNREGISTERED:
      return { valid: false, reason: 'Card not registered', code: 'CARD_UNREGISTERED' };
  }

  if (token.status !== TOKEN_STATUS.ACTIVE) {
    return { valid: false, reason: 'Invalid card', code: 'CARD_INVALID' };
  }

  if (token.expires_at && new Date(token.expires_at) < new Date()) {
    return { valid: false, reason: 'Card has expired', code: 'CARD_EXPIRED' };
  }

  return { valid: true, reason: null, code: null };
};

// =============================================================================
// EMERGENCY PROFILE BUILDER
// =============================================================================

/**
 * Build emergency profile with visibility rules applied.
 *
 * PUBLIC  → Full profile: blood group, allergies, all contacts, doctor
 * MINIMAL → Name + primary contact only
 * HIDDEN  → No data returned
 */
const buildEmergencyProfile = (student) => {
  if (!student) return null;

  const emergency = student.emergency;
  const visibility = student.cardVisibility?.visibility ?? 'PUBLIC';

  if (visibility === 'HIDDEN') {
    return {
      visibility: 'HIDDEN',
      message: 'Emergency information is hidden by parent',
    };
  }

  const profile = {
    visibility,
    name: `${student.first_name ?? ''} ${student.last_name ?? ''}`.trim(),
    photo_url: student.photo_url,
    class: student.class,
    section: student.section,
  };

  if (visibility === 'PUBLIC' && emergency) {
    profile.blood_group = formatBloodGroup(emergency.blood_group);
    profile.allergies = emergency.allergies;
    profile.conditions = emergency.conditions;
    profile.medications = emergency.medications;
    profile.notes = emergency.notes;

    if (emergency.contacts?.length) {
      profile.contacts = emergency.contacts.map((c) => ({
        name: c.name,
        relationship: c.relationship,
        phone: safeDecrypt(c.phone_encrypted),
        priority: c.priority,
        call_enabled: c.call_enabled,
        whatsapp_enabled: c.whatsapp_enabled,
      }));
    }

    if (emergency.doctor_name) {
      profile.doctor = {
        name: emergency.doctor_name,
        phone: safeDecrypt(emergency.doctor_phone_encrypted),
      };
    }
  }

  if (visibility === 'MINIMAL' && emergency?.contacts?.length) {
    const primary = emergency.contacts.find((c) => c.priority === 1) ?? emergency.contacts[0];
    profile.primary_contact = {
      name: primary.name,
      relationship: primary.relationship,
      phone: safeDecrypt(primary.phone_encrypted),
    };
  }

  return profile;
};

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Format blood group from DB enum to display format.
 * B_POS → B+, AB_NEG → AB-
 */
const formatBloodGroup = (bg) => {
  if (!bg) return null;
  return bg.replace('_POS', '+').replace('_NEG', '-');
};

/**
 * Safe decrypt — returns null on failure instead of throwing.
 */
const safeDecrypt = (encrypted) => {
  if (!encrypted) return null;
  try {
    return decrypt(encrypted);
  } catch (err) {
    logger.warn({ err: err.message }, 'Failed to decrypt field');
    return null;
  }
};
