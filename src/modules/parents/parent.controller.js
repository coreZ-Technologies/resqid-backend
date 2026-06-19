<<<<<<< HEAD
// =============================================================================
<<<<<<< HEAD
// modules/parents/parent.controller.js — RESQID
// Thin HTTP wrappers for parent endpoints.
=======
// modules/parents/parent.controller.js — RESQID (streaming export)
>>>>>>> 2486c963b630c5536708957167d372145ac148b4
// =============================================================================

import { ApiResponse } from '#shared/response/ApiResponse.js';
import { ApiError } from '#shared/response/ApiError.js';
=======
// src/modules/m5-parents/parent.controller.js
import { ApiResponse } from '#shared/response/ApiResponse.js';
>>>>>>> fc2f457f3fe5f95777ea9ced16e959883f9d995e
import { asyncHandler } from '#shared/response/asyncHandler.js';
import * as service from './parent.service.js';
import { getStorage } from '#infrastructure/storage/storage.index.js';
import { middlewareRedis as redis } from '#config/redis.js';
<<<<<<< HEAD
import { prisma } from '#config/prisma.js';               // 🔧 Added missing import
import crypto from 'crypto';

// ─── Parent Dashboard ────────────────────────────────────────────────────────
=======
import { prisma } from '#config/prisma.js';
import crypto from 'crypto';

// =============================================================================
// PROFILE
// =============================================================================
>>>>>>> fc2f457f3fe5f95777ea9ced16e959883f9d995e

export const getMe = asyncHandler(async (req, res) => {
  const data = await service.getParentHome(req.user.id);
  if (!data) throw ApiError.notFound('Account not found');
<<<<<<< HEAD
  return ApiResponse.ok(res, data);
});

// ─── Profile Management ──────────────────────────────────────────────────────

export const updateParentProfile = asyncHandler(async (req, res) => {
  const result = await service.updateParentProfile(req.user.id, req.body);
  return ApiResponse.ok(res, result, 'Profile updated');
});

// ─── Card Visibility (for a child) ──────────────────────────────────────────

export const updateVisibility = asyncHandler(async (req, res) => {
  const result = await service.updateVisibility(
    req.user.id,
    req.params.studentId,
    req.body.visibility
  );
  return ApiResponse.ok(res, result, 'Visibility updated');
});

// ─── Notification Preferences ────────────────────────────────────────────────

export const updateNotifications = asyncHandler(async (req, res) => {
  const result = await service.updateNotifications(req.user.id, req.body);
  return ApiResponse.ok(res, result, 'Preferences updated');
});

// ─── Emergency Card Lock ─────────────────────────────────────────────────────

export const lockCard = asyncHandler(async (req, res) => {
  const result = await service.lockCard(req.user.id, req.params.studentId);
  return ApiResponse.ok(res, result, 'Card locked');
});

// ─── Device Token Registration (Push Notifications) ─────────────────────────

export const registerDeviceToken = asyncHandler(async (req, res) => {
  const result = await service.registerDeviceToken(req.user.id, req.body);
  return ApiResponse.ok(res, result, 'Device registered');
});

<<<<<<< HEAD
// ─── Link a Child via RFID Card ──────────────────────────────────────────────

export const linkCard = asyncHandler(async (req, res) => {
  const result = await service.linkCard(req.user.id, req.body);
  return ApiResponse.ok(res, result, 'Child linked');
});

// ─── Set Active Child (for dashboard default) ────────────────────────────────

export const setActiveStudent = asyncHandler(async (req, res) => {
  const result = await service.setActiveStudent(req.user.id, req.body.studentId);
  return ApiResponse.ok(res, result, 'Active child updated');
});

// ─── Scan History for a Child ────────────────────────────────────────────────
=======
  ApiResponse.ok(res, data);
});

export const updateParentProfile = asyncHandler(async (req, res) => {
  const result = await service.updateParentProfile(req.user.id, req.body);
  ApiResponse.ok(res, result, 'Profile updated');
});

export const updateNotifications = asyncHandler(async (req, res) => {
  const result = await service.updateNotifications(req.user.id, req.body);
  ApiResponse.ok(res, result, 'Preferences updated');
});

// =============================================================================
// CHILD MANAGEMENT
// =============================================================================

export const setActiveStudent = asyncHandler(async (req, res) => {
  const result = await service.setActiveStudent(req.user.id, req.body.studentId);
  ApiResponse.ok(res, result, 'Active child updated');
});

export const updateVisibility = asyncHandler(async (req, res) => {
  const result = await service.updateVisibility(
    req.user.id,
    req.params.studentId,
    req.body.visibility
  );
  ApiResponse.ok(res, result, 'Visibility updated');
});

export const lockCard = asyncHandler(async (req, res) => {
  const result = await service.lockCard(req.user.id, req.params.studentId);
  ApiResponse.ok(res, result, 'Card locked');
});

export const linkCard = asyncHandler(async (req, res) => {
  const result = await service.linkCard(req.user.id, req.body);
  ApiResponse.ok(res, result, 'Child linked');
});

// =============================================================================
// SCAN HISTORY
// =============================================================================
>>>>>>> fc2f457f3fe5f95777ea9ced16e959883f9d995e

export const getScanHistory = asyncHandler(async (req, res) => {
  const data = await service.getScanHistory(req.user.id, {
    studentId: req.params.studentId,
    page: req.query.page,
    limit: req.query.limit,
    filter: req.query.filter,
  });
<<<<<<< HEAD
  return ApiResponse.ok(res, data);
});

// ─── Photo Upload (Presigned URL) ───────────────────────────────────────────
=======
  ApiResponse.ok(res, data);
});

// =============================================================================
// DEVICE
// =============================================================================

export const registerDeviceToken = asyncHandler(async (req, res) => {
  const result = await service.registerDeviceToken(req.user.id, req.body);
  ApiResponse.ok(res, result, 'Device registered');
});

// =============================================================================
// PHOTO UPLOAD
// =============================================================================
>>>>>>> fc2f457f3fe5f95777ea9ced16e959883f9d995e

export const generatePhotoUploadUrl = asyncHandler(async (req, res) => {
  const storage = getStorage();
  const { contentType } = req.body;
  const studentId = req.params.studentId;
  const ext = contentType === 'image/png' ? 'png' : 'jpg';
  const key = `parents/${req.user.id}/students/${studentId}/photo-${Date.now()}.${ext}`;

  const nonce = crypto.randomBytes(16).toString('hex');
  await redis.set(
    `upload:nonce:${nonce}`,
<<<<<<< HEAD
    JSON.stringify({
      parentId: req.user.id,
      studentId,
      key,
    }),
=======
    JSON.stringify({ parentId: req.user.id, studentId, key }),
>>>>>>> fc2f457f3fe5f95777ea9ced16e959883f9d995e
    'EX',
    300
  );

  const { uploadUrl } = await storage.getPresignedUploadUrl(key, { contentType });
<<<<<<< HEAD
  return ApiResponse.ok(res, { uploadUrl, key, nonce });
});

// ─── Confirm Photo Upload ────────────────────────────────────────────────────

export const confirmPhotoUpload = asyncHandler(async (req, res) => {
  const { key, nonce } = req.body;
=======
  ApiResponse.ok(res, { uploadUrl, key, nonce });
});

export const confirmPhotoUpload = asyncHandler(async (req, res) => {
  const { key, nonce } = req.body;

>>>>>>> fc2f457f3fe5f95777ea9ced16e959883f9d995e
  const nonceData = await redis.get(`upload:nonce:${nonce}`);
  if (!nonceData) throw ApiError.badRequest('Upload session expired');

  const { parentId: storedParentId, studentId } = JSON.parse(nonceData);
  if (storedParentId !== req.user.id) throw ApiError.forbidden('Invalid upload');

  const cdnDomain = process.env.AWS_CDN_DOMAIN || 'assets.getresqid.in';
  const photoUrl = `https://${cdnDomain}/${key}`;

<<<<<<< HEAD
  await prisma.student.update({
    where: { id: studentId },
    data: { photoUrl },
  });
  await redis.del(`upload:nonce:${nonce}`);

  return ApiResponse.ok(res, { photoUrl });
});
=======
  await prisma.student.update({ where: { id: studentId }, data: { photoUrl } });
  await redis.del(`upload:nonce:${nonce}`);

  ApiResponse.ok(res, { photoUrl });
});
>>>>>>> fc2f457f3fe5f95777ea9ced16e959883f9d995e
=======
// ─── Streaming CSV Export (memory efficient) ────────────────────────────────
export const exportList = asyncHandler(async (req, res) => {
  const query = parentExportQuerySchema.parse(req.query);
  await service.exportCsvStream(req.schoolId, query, res);
});
>>>>>>> 2486c963b630c5536708957167d372145ac148b4
