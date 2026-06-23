<<<<<<< HEAD
<<<<<<< HEAD
=======
// =============================================================================
>>>>>>> 989f84374cc56136e3a7e027fd44e5110bf99e81
=======
// =============================================================================
>>>>>>> e1eb068325d908062de8f8336fd7958f7fb3ca37
// infrastructure/storage/storage.paths.js — RESQID
//
// Provider-agnostic path builder.
// Keys are pure paths — no domain, no bucket name.
// Switch R2 → S3 by changing CDN_BASE_URL and credentials only.
// =============================================================================

import crypto from 'crypto';
import { ENV } from '#config/env.js';

// Helpers
const year = () => new Date().getFullYear().toString();
const ts = () => Date.now();
<<<<<<< HEAD
<<<<<<< HEAD
const hex = (n = 4) => crypto.randomBytes(n).toString('hex');
const ext = (contentType) => {
  const map = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
  return map[contentType] ?? 'jpg';
=======
=======
>>>>>>> e1eb068325d908062de8f8336fd7958f7fb3ca37
const hex = (n = 6) => crypto.randomBytes(n).toString('hex');

const MIME_MAP = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'application/pdf': 'pdf',
  'application/json': 'json',
  'text/csv': 'csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-excel': 'xls',
<<<<<<< HEAD
>>>>>>> 989f84374cc56136e3a7e027fd44e5110bf99e81
=======
>>>>>>> e1eb068325d908062de8f8336fd7958f7fb3ca37
};

const ext = (contentType) => MIME_MAP[contentType] || 'bin';

// Path Builders
export const StoragePath = {
  // Student
  /**
   * Student profile photo
   * → schools/{schoolId}/students/{studentId}/photo/{year}/{ts}-{hex}.jpg
   */
  studentPhoto: (schoolId, studentId, contentType) =>
    `schools/${schoolId}/students/${studentId}/photo/${year()}/${ts()}-${hex()}.${ext(contentType)}`,

  /**
   * Student QR code image
   * → schools/{schoolId}/students/{studentId}/qr/{year}/{tokenId}.png
   */
  studentQr: (schoolId, studentId, tokenId) =>
    `schools/${schoolId}/students/${studentId}/qr/${year()}/${tokenId}.png`,

  /**
   * Student ID card PDF
   * → schools/{schoolId}/students/{studentId}/card/{year}/{cardNumber}.pdf
   */
  studentCard: (schoolId, studentId, cardNumber) =>
    `schools/${schoolId}/students/${studentId}/card/${year()}/${cardNumber}.pdf`,

  /**
   * Student document (birth certificate, transfer certificate, etc.)
   * → schools/{schoolId}/students/{studentId}/documents/{year}/{documentType}/{ts}-{hex}.pdf
   */
  studentDocument: (schoolId, studentId, documentType, contentType) =>
    `schools/${schoolId}/students/${studentId}/documents/${year()}/${documentType}/${ts()}-${hex()}.${ext(contentType)}`,

  // Bulk Orders

  /**
   * Bulk card PDF for an order
   * → schools/{schoolId}/bulk/{year}/{orderId}/cards-batch.pdf
   */
  bulkCards: (schoolId, orderId) => `schools/${schoolId}/bulk/${year()}/${orderId}/cards-batch.pdf`,

  /**
   * Bulk order manifest JSON
   * → schools/{schoolId}/bulk/{year}/{orderId}/manifest.json
   */
  bulkManifest: (schoolId, orderId) =>
    `schools/${schoolId}/bulk/${year()}/${orderId}/manifest.json`,

  // School Assets
  /**
   * School logo
   * → schools/{schoolId}/assets/logo.{ext}
   */
  schoolLogo: (schoolId, contentType) => `schools/${schoolId}/assets/logo.${ext(contentType)}`,

  /**
   * School banner/branding image
   * → schools/{schoolId}/assets/banner.{ext}
   */
  schoolBanner: (schoolId, contentType) => `schools/${schoolId}/assets/banner.${ext(contentType)}`,

  // Parent

  /**
   * Parent profile avatar
   * → schools/{schoolId}/parents/{parentId}/avatar/{year}/{ts}-{hex}.jpg
   */
  parentAvatar: (schoolId, parentId, contentType) =>
    `schools/${schoolId}/parents/${parentId}/avatar/${year()}/${ts()}-${hex()}.${ext(contentType)}`,

  // Teacher
  /**
   * Teacher profile photo
   * → schools/{schoolId}/teachers/{teacherId}/photo/{year}/{ts}-{hex}.jpg
   */
  teacherPhoto: (schoolId, teacherId, contentType) =>
    `schools/${schoolId}/teachers/${teacherId}/photo/${year()}/${ts()}-${hex()}.${ext(contentType)}`,

  // Timetable
  /**
   * Generated timetable export (PDF/Excel)
   * → schools/{schoolId}/timetables/{timetableId}/export.{ext}
   */
  timetableExport: (schoolId, timetableId, format = 'pdf') =>
    `schools/${schoolId}/timetables/${timetableId}/timetable.${format}`,

  /**
   * Bulk upload file (original Excel)
   * → schools/{schoolId}/uploads/{year}/{uploadType}/{ts}-{hex}.{ext}
   */
  bulkUpload: (schoolId, uploadType, fileName) => {
    const fileExt = fileName?.split('.').pop() || 'xlsx';
    return `schools/${schoolId}/uploads/${year()}/${uploadType}/${ts()}-${hex()}.${fileExt}`;
  },

  // Emergency
  /**
   * Emergency incident attachment
   * → schools/{schoolId}/emergency/{incidentId}/{ts}-{hex}.{ext}
   */
  emergencyAttachment: (schoolId, incidentId, contentType) =>
    `schools/${schoolId}/emergency/${incidentId}/${ts()}-${hex()}.${ext(contentType)}`,

  // General

  /**
   * Temporary upload (auto-cleaned after 24h)
   * → temp/{year}/{userId}/{ts}-{hex}.{ext}
   */
  temp: (userId, contentType) => `temp/${year()}/${userId}/${ts()}-${hex()}.${ext(contentType)}`,
};

// URL Resolver

/**
 * Resolve a stored key or legacy full URL to a full public URL.
 * @param {string|null} keyOrUrl - Storage key or full URL
 * @returns {string|null} Full public URL
 */
export function resolveAssetUrl(keyOrUrl) {
  if (!keyOrUrl) return null;
<<<<<<< HEAD
<<<<<<< HEAD
  if (keyOrUrl.startsWith('http')) return keyOrUrl; // legacy full URL, return as-is
  return `${process.env.CDN_BASE_URL}/${keyOrUrl}`;
}
=======
=======
>>>>>>> e1eb068325d908062de8f8336fd7958f7fb3ca37
  if (keyOrUrl.startsWith('http')) return keyOrUrl; // Legacy full URL

  const cdnBase = ENV.R2_CDN_DOMAIN || ENV.CDN_BASE_URL || process.env.CDN_BASE_URL;

  if (cdnBase) {
    const base = cdnBase.replace(/\/$/, '');
    return `${base}/${keyOrUrl}`;
  }

  // Fallback: construct S3 URL
  const bucket = ENV.R2_BUCKET || process.env.AWS_S3_BUCKET;
  const region = ENV.R2_REGION || process.env.AWS_REGION || 'auto';
  return `https://${bucket}.s3.${region}.amazonaws.com/${keyOrUrl}`;
}

/**
 * Parse a storage key from a full URL (reverse of resolveAssetUrl).
 * @param {string} url - Full URL
 * @returns {string|null} Storage key
 */
export function parseKeyFromUrl(url) {
  if (!url) return null;
  if (!url.startsWith('http')) return url; // Already a key

  try {
    const urlObj = new URL(url);
    return urlObj.pathname.replace(/^\//, '');
  } catch {
    return null;
  }
}

/**
 * Check if a key is a temporary upload (should be auto-cleaned).
 */
export function isTempKey(key) {
  return key?.startsWith('temp/');
}
<<<<<<< HEAD
>>>>>>> 989f84374cc56136e3a7e027fd44e5110bf99e81
=======
>>>>>>> e1eb068325d908062de8f8336fd7958f7fb3ca37
