// src/modules/settings/settings.controller.js
import { asyncHandler } from '#shared/response/asyncHandler.js';
import { ApiResponse } from '#shared/response/ApiResponse.js';
import { SettingsService } from './settings.service.js';
import { s3Adapter } from '#infrastructure/storage/storage.index.js';
import { ApiError } from '#shared/response/ApiError.js';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const service = new SettingsService();

export const getSettings = asyncHandler(async (req, res) => {
  // Pass query params for super admin override
  const user = { ...req.user, querySchoolId: req.query.schoolId };
  const settings = await service.getSettings(user);
  res.json(new ApiResponse(200, settings, 'Settings fetched successfully'));
});

export const updateSettings = asyncHandler(async (req, res) => {
  const settings = await service.updateSettings(req.user, req.body);
  res.json(new ApiResponse(200, settings, 'Settings updated successfully'));
});

export const uploadLogo = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, 'No file uploaded');
  }

  const schoolId = req.user.schoolId;
  const file = req.file;
  const ext = path.extname(file.originalname);
  const key = `schools/${schoolId}/logo${ext}`;

  // Upload to S3/R2 using your existing adapter
  const result = await s3Adapter.upload(file.buffer, key, {
    contentType: file.mimetype,
    cacheControl: 'public, max-age=31536000, immutable',
  });

  // Update settings with the new logo URL
  // We just update the specific nested field
  await service.updateSettings(req.user, { school: { logoUrl: result.location } });

  res.json(new ApiResponse(200, { logoUrl: result.location }, 'Logo uploaded successfully'));
});