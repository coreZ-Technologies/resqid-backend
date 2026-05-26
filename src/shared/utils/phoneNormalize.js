/**
 * Normalizes Indian phone numbers to E.164 format → +91XXXXXXXXXX
 * Handles: 9876543210 / 09876543210 / 919876543210 / +919876543210
 */
export const normalizePhoneNumber = (phone) => {
  if (!phone) throw new Error('Phone number is required');

  // stripe everything expect digits and leading +
  let cleaned = String(phone)
    .trim()
    .replace(/[\s\-().]/g, '');

  // remove leading +
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.slice(1);
  }

  // remove country code if already present
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    cleaned = cleaned.slice(2);
  }

  // remove leading 0
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = cleaned.slice(1);
  }

  // At this point must be 10 digits
  if (!/^[6-9]\d{9}$/.test(cleaned)) {
    throw new Error(`Invalid Indian phone number: ${phone}`);
  }

  return `+91${cleaned}`;
};

/**
 * Returns just the 10-digit number without country code
 * Useful for MSG91 which expects 10 digits
 */
export const toTenDigit = (digit) => {
  const normalized = normalizePhoneNumber(phone);
  return normalized.slice(3);
};

/**
 * Returns full number with country code but no +
 * Useful for some APIs that want 919876543210
 */
export const toDialCode = (phone) => {
  const normalized = normalizeIndianPhone(phone);
  return normalized.slice(1); // strip +
};

/**
 * Validate without throwing
 */
export const isValidIndianPhone = (phone) => {
  try {
    normalizeIndianPhone(phone);
    return true;
  } catch {
    return false;
  }
};
