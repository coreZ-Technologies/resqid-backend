// =============================================================================
// modules/parents/parent.controller.js — RESQID
// Thin HTTP wrappers — all logic in parent.service.js
// =============================================================================

import * as service from './parent.service.js';
import { ApiResponse } from '#shared/response/ApiResponse.js';
import { asyncHandler } from '#shared/response/asyncHandler.js';
import { ApiError } from '#shared/response/ApiError.js';
import { getStorage } from '#infrastructure/storage/storage.index.js';
import { middlewareRedis as redis } from '#config/redis.js';
import crypto from 'crypto';

// ─── GET /me ──────────────────────────────────────────────────────────────────

export const getMe = asyncHandler(async (req, res) => {
  const data = await service.getParentHome(req.user.id);
  if (!data) throw ApiError.notFound('Account not found');
  return ApiResponse.ok(res, data, 'Home data retrieved');
});

// ─── PATCH /me/students/:studentId/emergency ──────────────────────────────────

export const updateProfile = asyncHandler(async (req, res) => {
  const result = await service.updateProfile(req.user.id, {
    studentId: req.params.studentId,
    ...req.body,
  });
  return ApiResponse.ok(res, result, 'Profile updated');
});

// ─── PATCH /me/students/:studentId/visibility ─────────────────────────────────

export const updateVisibility = asyncHandler(async (req, res) => {
  const result = await service.updateVisibility(req.user.id, {
    studentId: req.params.studentId,
    ...req.body,
  });
  return ApiResponse.ok(res, result, 'Visibility updated');
});

// ─── PATCH /me/notifications ──────────────────────────────────────────────────

export const updateNotifications = asyncHandler(async (req, res) => {
  const result = await service.updateNotifications(req.user.id, req.body);
  return ApiResponse.ok(res, result, 'Preferences updated');
});

// ─── POST /me/students/:studentId/lock ────────────────────────────────────────

export const lockCard = asyncHandler(async (req, res) => {
  const result = await service.lockCard(req.user.id, { studentId: req.params.studentId });
  return ApiResponse.ok(res, result, 'Card locked');
});

// ─── POST /me/device ──────────────────────────────────────────────────────────

export const registerDeviceToken = asyncHandler(async (req, res) => {
  const result = await service.registerDeviceToken(req.user.id, req.body);
  return ApiResponse.ok(res, result, 'Device registered');
});

// ─── POST /me/children ────────────────────────────────────────────────────────

export const linkCard = asyncHandler(async (req, res) => {
  const result = await service.linkCard(req.user.id, req.body);
  return ApiResponse.ok(res, result, 'Child linked');
});

// ─── PATCH /me/active-child ───────────────────────────────────────────────────

export const setActiveStudent = asyncHandler(async (req, res) => {
  const result = await service.setActiveStudent(req.user.id, req.body.studentId);
  return ApiResponse.ok(res, result, 'Active child updated');
});

// ─── GET /me/students/:studentId/scans ────────────────────────────────────────

export const getScanHistory = asyncHandler(async (req, res) => {
  const data = await service.getScanHistory(req.user.id, {
    studentId: req.params.studentId,
    ...req.query,
  });
  return ApiResponse.ok(res, data, 'Scan history retrieved');
});

// ─── PATCH /me ────────────────────────────────────────────────────────────────

export const updateParentProfile = asyncHandler(async (req, res) => {
  const result = await service.updateParentProfile(req.user.id, req.body);
  return ApiResponse.ok(res, result, 'Profile updated');
});

// ─── Photo Upload ─────────────────────────────────────────────────────────────

export const generatePhotoUploadUrl = asyncHandler(async (req, res) => {
  const storage = getStorage();
  const { contentType } = req.body;
  const studentId = req.params.studentId;
  const ext = contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpg';
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
  return ApiResponse.ok(res, { uploadUrl, key, nonce }, 'Upload URL generated');
});

export const confirmPhotoUpload = asyncHandler(async (req, res) => {
  const result = await service.confirmPhotoUpload(
    req.user.id,
    req.params.studentId,
    req.body.key,
    req.body.nonce
  );
  return ApiResponse.ok(res, result, 'Photo confirmed');
});
