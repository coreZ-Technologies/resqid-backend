// =============================================================================
// token.helpers.js — RESQID
// Pure utility functions for token + card + scan code generation.
// No DB calls, no side effects — only crypto and transforms.
// =============================================================================

import crypto from 'crypto';
import { ENV } from '#config/env.js';
import { PLAN_IDS } from '#shared/constants/plans.js';

// =============================================================================
// CONSTANTS
// =============================================================================

const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const SCAN_CODE_LENGTH = 43; // AES-SIV output = 32 bytes → 43 base62 chars
const TOKEN_BYTE_LENGTH = 32; // 256-bit tokens

// =============================================================================
// KEY DERIVATION — split SCAN_CODE_SECRET into K_MAC + K_ENC
// =============================================================================

const deriveScanCodeKeys = () => {
  const secret = ENV.SCAN_CODE_SECRET;

  if (!secret || typeof secret !== 'string' || !/^[0-9a-fA-F]{128}$/.test(secret)) {
    throw new Error(
      `SCAN_CODE_SECRET must be exactly 128 hex characters (64 bytes). ` +
        `Generate: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
    );
  }

  const keyBuf = Buffer.from(secret, 'hex');
  return { K_MAC: keyBuf.subarray(0, 32), K_ENC: keyBuf.subarray(32, 64) };
};

const { K_MAC, K_ENC } = deriveScanCodeKeys();

// =============================================================================
// TOKEN GENERATION
// =============================================================================

/**
 * Generate a cryptographically secure raw token (256-bit).
 * Returned ONCE to super admin — NEVER stored in DB.
 */
export const generateRawToken = () => {
  return crypto.randomBytes(TOKEN_BYTE_LENGTH).toString('hex').toUpperCase();
};

/**
 * Hash raw token using HMAC-SHA256 with TOKEN_HASH_SECRET.
 * Only this hash is stored in DB.
 */
export const hashRawToken = (rawToken) => {
  if (!rawToken || typeof rawToken !== 'string') {
    throw new TypeError('hashRawToken: rawToken must be a non-empty string');
  }
  return crypto.createHmac('sha256', ENV.TOKEN_HASH_SECRET).update(rawToken).digest('hex');
};

// =============================================================================
// QR TYPE
// =============================================================================

export const toQrTypeEnum = (qrType) => {
  if (typeof qrType === 'string' && qrType.includes('PRE_DETAILS')) return 'PRE_DETAILS';
  return 'BLANK';
};

// =============================================================================
// SCAN CODE — AES-SIV (Synthetic IV Mode)
// Deterministic, 128-bit auth tag, UUID fully concealed.
// =============================================================================

// ── UUID ↔ Buffer ─────────────────────────────────────────────────────────────

const uuidToBuffer = (uuid) => {
  const hex = uuid.replace(/-/g, '');
  if (hex.length !== 32 || !/^[0-9a-fA-F]{32}$/.test(hex)) {
    throw new ScanCodeError('DECODE_FAILED');
  }
  return Buffer.from(hex, 'hex');
};

const bufferToUuid = (buf) => {
  const hex = buf.toString('hex');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
};

// ── Base62 ────────────────────────────────────────────────────────────────────

const base62Encode = (buf, width) => {
  let num = BigInt('0x' + buf.toString('hex'));
  let result = '';
  while (num > 0n) {
    result = BASE62[Number(num % 62n)] + result;
    num /= 62n;
  }
  return result.padStart(width, '0');
};

const base62Decode = (str, byteLength) => {
  let num = 0n;
  for (const char of str) {
    const idx = BASE62.indexOf(char);
    if (idx === -1) throw new ScanCodeError('MALFORMED');
    num = num * 62n + BigInt(idx);
  }
  const hex = num.toString(16).padStart(byteLength * 2, '0');
  return Buffer.from(hex, 'hex');
};

// ── AES-CTR ───────────────────────────────────────────────────────────────────

const sivToCtrIv = (siv) => {
  const ctrIv = Buffer.from(siv);
  ctrIv[3] &= 0x7f;
  ctrIv[7] &= 0x7f;
  return ctrIv;
};

const aesCtr = (key, iv, input) => {
  const cipher = crypto.createCipheriv('aes-256-ctr', key, iv);
  return Buffer.concat([cipher.update(input), cipher.final()]);
};

const computeSiv = (uuidBytes) =>
  crypto.createHmac('sha256', K_MAC).update(uuidBytes).digest().subarray(0, 16);

// ── Public API ────────────────────────────────────────────────────────────────

export const generateScanCode = (tokenId) => {
  const uuidBytes = uuidToBuffer(tokenId);
  const siv = computeSiv(uuidBytes);
  const ctrIv = sivToCtrIv(siv);
  const ciphertext = aesCtr(K_ENC, ctrIv, uuidBytes);
  return base62Encode(Buffer.concat([siv, ciphertext]), SCAN_CODE_LENGTH);
};

export const decodeScanCode = (code) => {
  if (
    !code ||
    typeof code !== 'string' ||
    code.length !== SCAN_CODE_LENGTH ||
    !/^[0-9A-Za-z]+$/.test(code)
  ) {
    throw new ScanCodeError('MALFORMED');
  }

  let combined;
  try {
    combined = base62Decode(code, 32);
  } catch (err) {
    throw err instanceof ScanCodeError ? err : new ScanCodeError('MALFORMED');
  }

  const siv = combined.subarray(0, 16);
  const ciphertext = combined.subarray(16, 32);
  const ctrIv = sivToCtrIv(siv);

  let uuidBytes;
  try {
    uuidBytes = aesCtr(K_ENC, ctrIv, ciphertext);
  } catch {
    throw new ScanCodeError('DECODE_FAILED');
  }

  const expectedSiv = computeSiv(uuidBytes);
  if (!crypto.timingSafeEqual(siv, expectedSiv)) {
    throw new ScanCodeError('INVALID_SIGNATURE');
  }

  try {
    return bufferToUuid(uuidBytes);
  } catch {
    throw new ScanCodeError('DECODE_FAILED');
  }
};

export class ScanCodeError extends Error {
  constructor(reason) {
    super(`Invalid scan code: ${reason}`);
    this.reason = reason;
  }
}

// =============================================================================
// SCAN URL
// =============================================================================

export const buildScanUrl = (tokenId) => `${ENV.SCAN_BASE_URL}/${generateScanCode(tokenId)}`;

// =============================================================================
// CARD NUMBER
// =============================================================================

/**
 * Generate one crypto-random physical card number.
 * Format: RQ-{4-digit serial}-{8 HEX CHARS}
 * Example: RQ-0042-C0C3B7F4
 */
export const generateCardNumber = (schoolSerial) => {
  const serial = String(schoolSerial).padStart(4, '0');
  const hex = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `RQ-${serial}-${hex}`;
};

/**
 * Generate N unique card numbers for a school.
 * Uses Set to guarantee no duplicates in the batch.
 */
export const batchGenerateCardNumbers = (schoolSerial, count) => {
  const numbers = new Set();
  while (numbers.size < count) {
    numbers.add(generateCardNumber(schoolSerial));
  }
  return Array.from(numbers);
};

/**
 * Generate a blank card number (no school assigned yet).
 * Format: RQ-BLANK-{8 HEX CHARS}
 */
export const generateBlankCardNumber = () => {
  const hex = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `RQ-BLANK-${hex}`;
};

// =============================================================================
// EXPIRY
// =============================================================================

/**
 * Calculate token expiry date. Anchors to 1st to prevent month overflow.
 */
export const calculateExpiry = (validityMonths = 12) => {
  const expiry = new Date();
  const currentDay = expiry.getDate();
  expiry.setDate(1);
  expiry.setMonth(expiry.getMonth() + validityMonths);
  const maxDay = new Date(expiry.getFullYear(), expiry.getMonth() + 1, 0).getDate();
  expiry.setDate(Math.min(currentDay, maxDay));
  return expiry;
};

// =============================================================================
// BRANDING
// =============================================================================

/**
 * Resolve card branding based on school subscription plan.
 */
export const resolveBranding = (school) => {
  const paidPlans = [
    PLAN_IDS.MODULE_EMERGENCY,
    PLAN_IDS.MODULE_ATTENDANCE,
    PLAN_IDS.BUNDLE_SAFETY,
    PLAN_IDS.BUNDLE_OPS,
    PLAN_IDS.BUNDLE_CONNECT,
    PLAN_IDS.RESQID_COMPLETE,
  ];

  const isPaid = paidPlans.includes(school.subscriptions?.[0]?.plan);

  return {
    logoUrl: isPaid && school.logo_url ? school.logo_url : null,
    showSchoolName: isPaid,
  };
};
