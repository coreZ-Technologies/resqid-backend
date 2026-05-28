// =============================================================================
// modules/m2-emergency/emergency.service.js — RESQID
// =============================================================================

import { ApiError } from '#shared/response/ApiError.js';
import * as repo from './emergency.repository.js';
import { invalidateScanCache } from '#shared/cache/scan.cache.js';

export const getProfile = async (studentId, parentId) => {
  // Verify parent-child link
  const link = await prisma.parentStudent.findUnique({
    where: { parentId_studentId: { parentId, studentId } },
  });
  if (!link) throw ApiError.forbidden('Student not linked to your account');

  const profile = await repo.findProfileByStudent(studentId);
  if (!profile) throw ApiError.notFound('Emergency profile not set up yet');

  return profile;
};

export const updateProfile = async (studentId, parentId, data) => {
  // Verify parent-child link
  const link = await prisma.parentStudent.findUnique({
    where: { parentId_studentId: { parentId, studentId } },
  });
  if (!link) throw ApiError.forbidden('Student not linked to your account');

  const { contacts, ...profileData } = data;

  // Upsert profile
  await repo.upsertProfile(studentId, profileData);

  // Replace contacts if provided
  if (contacts !== undefined) {
    await repo.replaceContacts(studentId, contacts);
  }

  // Invalidate scan cache so QR shows updated info
  await invalidateScanCache(studentId);

  return { success: true };
};
