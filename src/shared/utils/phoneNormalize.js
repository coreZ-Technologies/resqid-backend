// =============================================================================
// phoneNormalize.js — RESQID
//
// Normalizes Indian phone numbers to E.164 format → +91XXXXXXXXXX
// Handles: 9876543210 / 09876543210 / 919876543210 / +919876543210
// =============================================================================

/**
 * Normalize an Indian phone number to E.164 format (+91XXXXXXXXXX).
 *
 * @param {string} phone - Raw phone number input
 * @param {string} [countryCode='91'] - Country code (default India)
 * @returns {string} Normalized phone number (+91XXXXXXXXXX)
 * @throws {Error} If phone is invalid
 */
export const normalizePhoneNumber = (phone, countryCode = '91') => {
  if (!phone) throw new Error('Phone number is required');

  // Strip everything except digits and leading +
  let cleaned = String(phone)
    .trim()
    .replace(/[\s\-().]/g, '');

  // Remove leading +
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.slice(1);
  }

  // Remove country code if already present (91XXXXXXXXXX → XXXXXXXXXX)
  if (cleaned.startsWith(countryCode) && cleaned.length === countryCode.length + 10) {
    cleaned = cleaned.slice(countryCode.length);
  }

  // Remove leading 0 (0XXXXXXXXXX → XXXXXXXXXX)
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = cleaned.slice(1);
  }

  // Must be exactly 10 digits starting with 6-9
  if (!/^[6-9]\d{9}$/.test(cleaned)) {
    throw new Error(`Invalid Indian phone number: ${phone}`);
  }

  return `+${countryCode}${cleaned}`;
};

/**
 * Alias for backward compatibility with SMS adapter.
 */
export const normalizePhone = normalizePhoneNumber;

/**
 * Returns 10-digit number without country code.
 * Useful for MSG91 which expects 10 digits.
 */
export const toTenDigit = (phone) => {
  const normalized = normalizePhoneNumber(phone);
  return normalized.replace(/^\+\d+/, ''); // Remove +91
};

/**
 * Returns full number with country code but no +.
 * Useful for APIs that want 919876543210 format.
 */
export const toDialCode = (phone) => {
  const normalized = normalizePhoneNumber(phone);
  return normalized.slice(1); // Remove +
};

/**
 * Validate phone without throwing.
 */
export const isValidIndianPhone = (phone) => {
  try {
    normalizePhoneNumber(phone);
    return true;
  } catch {
    return false;
  }
};
