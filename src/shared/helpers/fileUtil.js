// =============================================================================
// fileUtil.js — RESQID
//
// File validation, storage key generation, and utility functions.
// =============================================================================

import { ApiError } from '#shared/response/ApiError.js';
import { ENV } from '#config/env.js';

// ─── Allowed Types ────────────────────────────────────────────────────────────

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_DOC_TYPES = ['application/pdf'];

// ─── Size Limits (from env or defaults) ──────────────────────────────────────

const MAX_IMAGE_SIZE_MB = ENV.MAX_IMAGE_SIZE_MB || 2;
const MAX_DOC_SIZE_MB = ENV.MAX_DOC_SIZE_MB || 5;
const MAX_IMAGE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;
const MAX_DOC_BYTES = MAX_DOC_SIZE_MB * 1024 * 1024;

// ─── Validation ──────────────────────────────────────────────────────────────

/**
 * Validate image file — throws ApiError if invalid
 */
export const validateImage = (file) => {
  if (!file) throw ApiError.badRequest('No file provided');

  if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    throw ApiError.badRequest(
      `Invalid file type. Allowed: ${ALLOWED_IMAGE_TYPES.join(', ')}`,
      [],
      'INVALID_FILE_TYPE'
    );
  }

  if (file.size > MAX_IMAGE_BYTES) {
    throw ApiError.fileTooLarge(`${MAX_IMAGE_SIZE_MB}MB`);
  }
};

/**
 * Validate document (PDF) file
 */
export const validateDocument = (file) => {
  if (!file) throw ApiError.badRequest('No file provided');

  if (!ALLOWED_DOC_TYPES.includes(file.mimetype)) {
    throw ApiError.badRequest('Only PDF files are allowed', [], 'INVALID_FILE_TYPE');
  }

  if (file.size > MAX_DOC_BYTES) {
    throw ApiError.fileTooLarge(`${MAX_DOC_SIZE_MB}MB`);
  }
};

// ─── Key Generation ──────────────────────────────────────────────────────────

/**
 * Sanitize filename for safe storage
 * Prevents path traversal and removes dangerous characters
 */
export const sanitizeFilename = (filename) => {
  return filename
    .replace(/\.\./g, '') // Remove path traversal
    .replace(/[\/\\]/g, '-') // Replace slashes
    .replace(/[^a-zA-Z0-9._-]/g, '-') // Only safe chars
    .replace(/-+/g, '-') // Collapse multiple hyphens
    .replace(/^-|-$/g, '') // Trim leading/trailing hyphens
    .toLowerCase();
};

/**
 * Build R2 object key for organized storage
 *
 * Pattern: {folder}/{schoolId}/{timestamp}-{filename}
 * Example: students/school_abc/1716720000000-profile.jpg
 */
export const buildR2Key = (folder, schoolId, filename) => {
  const sanitized = sanitizeFilename(filename);
  const timestamp = Date.now();
  return `${folder}/${schoolId}/${timestamp}-${sanitized}`;
};

/**
 * Build public R2 URL from key
 */
export const buildR2Url = (key) => {
  const baseUrl = ENV.AWS_CDN_DOMAIN || ENV.AWS_S3_ENDPOINT;
  return `${baseUrl}/${key}`;
};

/**
 * Extract R2 key from full URL (for deletion)
 */
export const extractR2Key = (url) => {
  const baseUrl = ENV.AWS_CDN_DOMAIN || ENV.AWS_S3_ENDPOINT;
  return url.replace(`${baseUrl}/`, '');
};

// ─── MIME Helpers ────────────────────────────────────────────────────────────

/**
 * Get file extension from mimetype
 */
export const mimeToExt = (mimetype) => {
  const map = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'application/pdf': 'pdf',
  };
  return map[mimetype] || 'bin';
};

/**
 * Get mimetype from file extension
 */
export const extToMime = (ext) => {
  const map = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    pdf: 'application/pdf',
  };
  return map[ext.toLowerCase()] || 'application/octet-stream';
};

// ─── Formatting ──────────────────────────────────────────────────────────────

/**
 * Format bytes to human readable
 */
export const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

/**
 * Parse file size string to bytes (e.g. "5mb" → 5242880)
 */
export const parseSizeToBytes = (sizeStr) => {
  const match = sizeStr.toLowerCase().match(/^(\d+)\s*(b|kb|mb|gb)?$/);
  if (!match) return 0;

  const value = parseInt(match[1]);
  const unit = match[2] || 'b';

  const multipliers = { b: 1, kb: 1024, mb: 1024 * 1024, gb: 1024 * 1024 * 1024 };
  return value * (multipliers[unit] || 1);
};
