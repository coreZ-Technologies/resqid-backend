// =============================================================================
// modules/parents/parent.controller.js — RESQID
// Thin HTTP wrappers for parent endpoints.
// =============================================================================

import { ApiResponse } from '#shared/response/ApiResponse.js';
import { ApiError } from '#shared/response/ApiError.js';
import { asyncHandler } from '#shared/response/asyncHandler.js';
import * as service from './parent.service.js';
import { getStorage } from '#infrastructure/storage/storage.index.js';
import { middlewareRedis as redis } from '#config/redis.js';
import { prisma } from '#config/prisma.js';               // 🔧 Added missing import
import crypto from 'crypto';

// ─── Parent Dashboard ────────────────────────────────────────────────────────

export const getMe = asyncHandler(async (req, res) => {
  const data = await service.getParentHome(req.user.id);
  if (!data) throw ApiError.notFound('Account not found');
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

export const getScanHistory = asyncHandler(async (req, res) => {
  const data = await service.getScanHistory(req.user.id, {
    studentId: req.params.studentId,
    page: req.query.page,
    limit: req.query.limit,
    filter: req.query.filter,
  });
  return ApiResponse.ok(res, data);
});

// ─── Photo Upload (Presigned URL) ───────────────────────────────────────────

export const generatePhotoUploadUrl = asyncHandler(async (req, res) => {
  const storage = getStorage();
  const { contentType } = req.body;
  const studentId = req.params.studentId;
  const ext = contentType === 'image/png' ? 'png' : 'jpg';
  const key = `parents/${req.user.id}/students/${studentId}/photo-${Date.now()}.${ext}`;

  const nonce = crypto.randomBytes(16).toString('hex');
  await redis.set(
    `upload:nonce:${nonce}`,
    JSON.stringify({
      parentId: req.user.id,
      studentId,
      key,
    }),
    'EX',
    300
  );

  const { uploadUrl } = await storage.getPresignedUploadUrl(key, { contentType });
  return ApiResponse.ok(res, { uploadUrl, key, nonce });
});

// ─── Confirm Photo Upload ────────────────────────────────────────────────────

export const confirmPhotoUpload = asyncHandler(async (req, res) => {
  const { key, nonce } = req.body;
  const nonceData = await redis.get(`upload:nonce:${nonce}`);
  if (!nonceData) throw ApiError.badRequest('Upload session expired');

  const { parentId: storedParentId, studentId } = JSON.parse(nonceData);
  if (storedParentId !== req.user.id) throw ApiError.forbidden('Invalid upload');

  const cdnDomain = process.env.AWS_CDN_DOMAIN || 'assets.getresqid.in';
  const photoUrl = `https://${cdnDomain}/${key}`;

  await prisma.student.update({
    where: { id: studentId },
    data: { photoUrl },
  });
  await redis.del(`upload:nonce:${nonce}`);

  return ApiResponse.ok(res, { photoUrl });
});