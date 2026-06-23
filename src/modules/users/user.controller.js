

// src/modules/users/user.controller.js
import { userService } from './user.service.js';
import {
  userIdParamsSchema,
  createUserSchema,
  updateUserSchema,
  changePasswordSchema,
  resetPasswordSchema,
  userListQuerySchema,
  exportQuerySchema,
} from './user.validation.js';
import { ApiResponse } from '#shared/response/ApiResponse.js';
import { asyncHandler } from '#shared/response/asyncHandler.js';

export const getStats = asyncHandler(async (req, res) => {
  const stats = await userService.getStats(req.schoolId);
  ApiResponse.ok(res, stats);
});

export const list = asyncHandler(async (req, res) => {
  const query = userListQuerySchema.parse(req.query);
  const result = await userService.list(req.schoolId, query);
  ApiResponse.ok(res, result);
});

export const getOne = asyncHandler(async (req, res) => {
  const { id } = userIdParamsSchema.parse(req.params);
  const user = await userService.getOne(id, req.schoolId);
  ApiResponse.ok(res, user);
});

export const create = asyncHandler(async (req, res) => {
  const data = createUserSchema.parse(req.body);
  const result = await userService.create(req.schoolId, data);
  ApiResponse.created(res, result, 'User created');
});

export const update = asyncHandler(async (req, res) => {
  const { id } = userIdParamsSchema.parse(req.params);
  const data = updateUserSchema.parse(req.body);
  const result = await userService.update(id, req.schoolId, data);
  ApiResponse.ok(res, result, 'User updated');
});

export const remove = asyncHandler(async (req, res) => {
  const { id } = userIdParamsSchema.parse(req.params);
  await userService.remove(id, req.schoolId);
  ApiResponse.ok(res, null, 'User deactivated');
});

export const reactivate = asyncHandler(async (req, res) => {
  const { id } = userIdParamsSchema.parse(req.params);
  await userService.reactivate(id, req.schoolId);
  ApiResponse.ok(res, null, 'User reactivated');
});

export const changePassword = asyncHandler(async (req, res) => {
  const { id } = userIdParamsSchema.parse(req.params);
  const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
  // For own profile change, the user can be themselves. For admin, they can change any user's password with reset instead.
  if (req.user.id !== id && req.user.role === 'SCHOOL_ADMIN') {
    // Admin cannot change user's password without knowing current – use resetPassword instead.
    throw ApiError.forbidden('Use reset password endpoint for other users');
  }
  await userService.changePassword(id, req.schoolId, currentPassword, newPassword);
  ApiResponse.ok(res, null, 'Password changed');
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { id } = userIdParamsSchema.parse(req.params);
  const { newPassword } = resetPasswordSchema.parse(req.body);
  // Only admin can reset another user's password
  if (req.user.role !== 'SCHOOL_ADMIN' && req.user.id !== id) {
    throw ApiError.forbidden('Only school admin can reset passwords');
  }
  await userService.resetPassword(id, req.schoolId, newPassword);
  ApiResponse.ok(res, null, 'Password reset successfully');
});

export const exportUsers = asyncHandler(async (req, res) => {
  const query = exportQuerySchema.parse(req.query);
  const data = await userService.exportUsers(req.schoolId, query);

  const headers = ['id', 'name', 'email', 'phone', 'role', 'status', 'lastLogin', 'createdAt'];
  const csv = [
    headers.join(','),
    ...data.map((row) =>
      headers.map((h) => `"${row[h] ?? ''}"`).join(',')
    ),
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="users.csv"');
  res.send(csv);
});