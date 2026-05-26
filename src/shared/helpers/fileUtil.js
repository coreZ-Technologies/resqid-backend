// src/helpers/fileUtil.js
import { ApiError } from '../utils/apiError.js';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_DOC_TYPES = ['application/pdf'];
const MAX_IMAGE_SIZE_MB = 2;
const MAX_DOC_SIZE_MB = 5;
const MAX_IMAGE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;
const MAX_DOC_BYTES = MAX_DOC_SIZE_MB * 1024 * 1024;

/**
 * Validate image file — throws ApiError if invalid
 */
export const validateImage = (file) => {
  if (!file) throw ApiError.badRequest('No file provided');

  if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    throw ApiError.badRequest(`Invalid file type. Allowed: ${ALLOWED_IMAGE_TYPES.join(', ')}`);
  }

  if (file.size > MAX_IMAGE_BYTES) {
    throw ApiError.badRequest(`Image must be under ${MAX_IMAGE_SIZE_MB}MB`);
  }
};

/**
 * Validate document (PDF) file
 */
export const validateDocument = (file) => {
  if (!file) throw ApiError.badRequest('No file provided');

  if (!ALLOWED_DOC_TYPES.includes(file.mimetype)) {
    throw ApiError.badRequest('Only PDF files are allowed');
  }

  if (file.size > MAX_DOC_BYTES) {
    throw ApiError.badRequest(`Document must be under ${MAX_DOC_SIZE_MB}MB`);
  }
};

/**
 * Build R2 object key for organized storage
 *
 * Pattern: {folder}/{schoolId}/{timestamp}-{filename}
 * Example: students/school_abc/1716720000000-profile.jpg
 */
export const buildR2Key = (folder, schoolId, filename) => {
  const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, '-').toLowerCase();
  const timestamp = Date.now();
  return `${folder}/${schoolId}/${timestamp}-${sanitized}`;
};

/**
 * Build public R2 URL from key
 */
export const buildR2Url = (key) => {
  const baseUrl = process.env.R2_PUBLIC_URL; // e.g. https://assets.getresqid.in
  return `${baseUrl}/${key}`;
};

/**
 * Extract R2 key from full URL (for deletion)
 */
export const extractR2Key = (url) => {
  const baseUrl = process.env.R2_PUBLIC_URL;
  return url.replace(`${baseUrl}/`, '');
};

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
 * Format bytes to human readable
 */
export const formatBytes = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
