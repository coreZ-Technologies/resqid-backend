<<<<<<< HEAD
// src/modules/m5-parents/parent.controller.js
=======
// =============================================================================
// modules/parents/parent.controller.js — RESQID
// =============================================================================

>>>>>>> 29c3ec21ee207f590fb533e851f49fc2e7b35588
import { ApiResponse } from '#shared/response/ApiResponse.js';
import { asyncHandler } from '#shared/response/asyncHandler.js';
<<<<<<< HEAD
import { ParentService } from './parent.service.js';

const service = new ParentService();

// ─── Create Parent ──────────────────────────────────────────────
export const createParent = asyncHandler(async (req, res) => {
  const data = req.body;
  const schoolId = req.user.schoolId;
  const parent = await service.createParent(data, schoolId);
  return ApiResponse.created(res, parent, 'Parent created successfully');
});

// ─── Update Parent ──────────────────────────────────────────────
export const updateParent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const data = req.body;
  const schoolId = req.user.schoolId;
  const updated = await service.updateParent(id, data, schoolId);
  return ApiResponse.ok(res, updated, 'Parent updated');
});

// ─── Delete Parent ──────────────────────────────────────────────
export const deleteParent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const schoolId = req.user.schoolId;
  await service.deleteParent(id, schoolId);
  return ApiResponse.ok(res, null, 'Parent deleted');
});

// ─── Get Parent Details ─────────────────────────────────────────
export const getParent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const schoolId = req.user.schoolId;
  const parent = await service.getParent(id, schoolId);
  return ApiResponse.ok(res, parent);
});

// ─── List Parents (with filters) ────────────────────────────────
export const listParents = asyncHandler(async (req, res) => {
  const query = req.query;
  const schoolId = req.user.schoolId;
  const result = await service.listParents(query, schoolId);
  return ApiResponse.paginated(res, result.items, result.meta);
});

// ─── Link Children ──────────────────────────────────────────────
export const linkChildren = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { studentIds, relation } = req.body;
  const schoolId = req.user.schoolId;
  await service.linkChildren(id, studentIds, relation, schoolId);
  return ApiResponse.ok(res, null, 'Children linked');
});

// ─── Unlink Child ───────────────────────────────────────────────
export const unlinkChild = asyncHandler(async (req, res) => {
  const { parentId, studentId } = req.params;
  const schoolId = req.user.schoolId;
  await service.unlinkChild(parentId, studentId, schoolId);
  return ApiResponse.ok(res, null, 'Child unlinked');
});

// ─── Get Available Students ─────────────────────────────────────
export const getAvailableStudents = asyncHandler(async (req, res) => {
  const schoolId = req.user.schoolId;
  const { parentId } = req.query;
  const students = await service.getAvailableStudents(schoolId, parentId);
  return ApiResponse.ok(res, students);
});

// ─── Stats Dashboard ────────────────────────────────────────────
export const getStats = asyncHandler(async (req, res) => {
  const schoolId = req.user.schoolId;
  const stats = await service.getStats(schoolId);
  return ApiResponse.ok(res, stats);
});

// ─── Export Parents ─────────────────────────────────────────────
export const exportParents = asyncHandler(async (req, res) => {
  const query = req.query;
  const schoolId = req.user.schoolId;
  const result = await service.exportParents(query, schoolId);
  if (result.buffer) {
    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    return res.send(result.buffer);
  }
  return ApiResponse.ok(res, result, 'Export email sent');
});

// ─── Send Message to Parent (Quick Action) ──────────────────────
export const sendMessageToParent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { subject, body, type = 'GENERAL' } = req.body;
  const schoolId = req.user.schoolId;
  const senderId = req.user.id;
  const message = await service.sendMessageToParent(id, subject, body, type, schoolId, senderId);
  return ApiResponse.created(res, message, 'Message sent successfully');
});
=======
import * as service from './parent.service.js';
import {
  createParentSchema,
  updateParentSchema,
  updateOwnProfileSchema,
  parentListQuerySchema,
  parentIdParamsSchema,
  parentExportQuerySchema,
} from './parent.validation.js';

export const list = asyncHandler(async (req, res) => {
  const query = parentListQuerySchema.parse(req.query);
  req.query = query;
  const { parents, total } = await service.list(req);
  ApiResponse.paginated(res, parents, { page: query.page, limit: query.limit, total });
});

export const getOne = asyncHandler(async (req, res) => {
  const { id } = parentIdParamsSchema.parse(req.params);
  const parent = await service.getOne(id, req);
  ApiResponse.ok(res, parent);
});

export const create = asyncHandler(async (req, res) => {
  const parsed = createParentSchema.parse(req.body);
  const parent = await service.create(parsed, req.schoolId);
  ApiResponse.created(res, parent, 'Parent created');
});

export const update = asyncHandler(async (req, res) => {
  const { id } = parentIdParamsSchema.parse(req.params);

  // Use different schema based on role
  const schema = req.user.role === 'PARENT' ? updateOwnProfileSchema : updateParentSchema;
  const parsed = schema.parse(req.body);

  const parent = await service.update(id, parsed, req);
  ApiResponse.ok(res, parent, 'Parent updated');
});

export const remove = asyncHandler(async (req, res) => {
  const { id } = parentIdParamsSchema.parse(req.params);
  await service.remove(id, req.schoolId);
  ApiResponse.ok(res, null, 'Parent removed');
});

export const stats = asyncHandler(async (req, res) => {
  const result = await service.getStats(req.schoolId);
  ApiResponse.ok(res, result);
});

export const exportList = asyncHandler(async (req, res) => {
  const query = parentExportQuerySchema.parse(req.query);
  const data = await service.exportList(req.schoolId, query);

  if (query.format === 'csv') {
    const csv = convertToCSV(data);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=parents-${Date.now()}.csv`);
    return res.send(csv);
  }

  ApiResponse.ok(res, data);
});

// ─── Helper ───────────────────────────────────────────────────────────────────

<<<<<<< HEAD
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

export const getScanHistory = asyncHandler(async (req, res) => {
  const data = await service.getScanHistory(req.user.id, {
    studentId: req.params.studentId,
    page: req.query.page,
    limit: req.query.limit,
    filter: req.query.filter,
  });
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

export const generatePhotoUploadUrl = asyncHandler(async (req, res) => {
  const storage = getStorage();
  const { contentType } = req.body;
  const studentId = req.params.studentId;
  const ext = contentType === 'image/png' ? 'png' : 'jpg';
  const key = `parents/${req.user.id}/students/${studentId}/photo-${Date.now()}.${ext}`;

  const nonce = crypto.randomBytes(16).toString('hex');
  await redis.set(
    `upload:nonce:${nonce}`,
    JSON.stringify({ parentId: req.user.id, studentId, key }),
    'EX',
    300
  );

  const { uploadUrl } = await storage.getPresignedUploadUrl(key, { contentType });
  ApiResponse.ok(res, { uploadUrl, key, nonce });
});

export const confirmPhotoUpload = asyncHandler(async (req, res) => {
  const { key, nonce } = req.body;

  const nonceData = await redis.get(`upload:nonce:${nonce}`);
  if (!nonceData) throw ApiError.badRequest('Upload session expired');

  const { parentId: storedParentId, studentId } = JSON.parse(nonceData);
  if (storedParentId !== req.user.id) throw ApiError.forbidden('Invalid upload');

  const cdnDomain = process.env.AWS_CDN_DOMAIN || 'assets.getresqid.in';
  const photoUrl = `https://${cdnDomain}/${key}`;

  await prisma.student.update({ where: { id: studentId }, data: { photoUrl } });
  await redis.del(`upload:nonce:${nonce}`);

  ApiResponse.ok(res, { photoUrl });
});
>>>>>>> f769c34b07b38ef93f84fb7ec946cdc6fdb91efd
=======
function convertToCSV(data) {
  if (!data?.length) return '';
  const headers = ['First Name', 'Last Name', 'Phone', 'Email', 'City', 'State', 'Children'];
  const rows = data.map((p) => [
    p.firstName,
    p.lastName,
    p.phone,
    p.email || '',
    p.city || '',
    p.state || '',
    p.students
      ?.map((s) => `${s.student?.firstName} (${s.student?.grade}-${s.student?.section})`)
      .join('; ') || '',
  ]);
  return [
    headers.join(','),
    ...rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')),
  ].join('\n');
}
>>>>>>> 29c3ec21ee207f590fb533e851f49fc2e7b35588
