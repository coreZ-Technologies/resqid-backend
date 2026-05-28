// =============================================================================
// parent.controller.js — RESQID
//
// HTTP layer for the Parent module.
// Extracts req data → calls service → sends ApiResponse.
//
// All methods are wrapped by asyncHandler in routes.
// req.user is attached by authenticate.middleware (PARENT role guaranteed).
// =============================================================================

import { parentService as service } from './parent.service.js';
import { ApiResponse } from '#shared/response/ApiResponse.js';

// =============================================================================
// PROFILE
// =============================================================================

/**
 * GET /api/v1/parents/me
 * Returns the authenticated parent's own profile
 */
const getProfile = async (req, res) => {
  const profile = await service.getProfile(req.user.id);
  ApiResponse.ok(res, profile, 'Profile fetched successfully');
};

/**
 * PATCH /api/v1/parents/me
 * Update name, email, or phone
 */
const updateProfile = async (req, res) => {
  const updated = await service.updateProfile(req.user.id, req.body);
  ApiResponse.ok(res, updated, 'Profile updated successfully');
};

/**
 * DELETE /api/v1/parents/me
 * Soft-delete account after confirmation phrase check
 */
const deleteAccount = async (req, res) => {
  const result = await service.deleteAccount(req.user.id);
  ApiResponse.ok(res, result, 'Account deleted successfully');
};

// =============================================================================
// CHILDREN
// =============================================================================

/**
 * GET /api/v1/parents/me/children
 * List all students linked to this parent
 */
const listChildren = async (req, res) => {
  const { children, pagination } = await service.listChildren(req.user.id, req.query);
  ApiResponse.paginated(res, children, pagination, 'Children fetched successfully');
};

/**
 * GET /api/v1/parents/me/children/:studentId
 * Get full profile of one linked child
 */
const getChild = async (req, res) => {
  const child = await service.getChild(req.user.id, req.params.studentId);
  ApiResponse.ok(res, child, 'Student profile fetched successfully');
};

/**
 * POST /api/v1/parents/me/children
 * Link a child using a one-time school-issued link token
 */
const linkChild = async (req, res) => {
  const link = await service.linkChild(req.user.id, req.body);
  ApiResponse.created(res, link, 'Student linked successfully');
};

/**
 * PATCH /api/v1/parents/me/children/:studentId
 * Update relation type or isPrimary flag
 */
const updateChildLink = async (req, res) => {
  const updated = await service.updateChildLink(
    req.user.id,
    req.params.studentId,
    req.body
  );
  ApiResponse.ok(res, updated, 'Child link updated successfully');
};

/**
 * DELETE /api/v1/parents/me/children/:studentId
 * Unlink a child from this parent's account
 */
const unlinkChild = async (req, res) => {
  const result = await service.unlinkChild(req.user.id, req.params.studentId);
  ApiResponse.ok(res, result, 'Student unlinked successfully');
};

// =============================================================================
// CARD VISIBILITY
// =============================================================================

/**
 * PATCH /api/v1/parents/me/children/:studentId/visibility
 * Set what emergency responders see when scanning the child's QR
 */
const updateCardVisibility = async (req, res) => {
  const result = await service.updateCardVisibility(
    req.user.id,
    req.params.studentId,
    req.body.visibility
  );
  ApiResponse.ok(res, result, 'Card visibility updated successfully');
};

// =============================================================================
// NOTIFICATION PREFERENCES
// =============================================================================

/**
 * GET /api/v1/parents/me/notification-preferences
 */
const getNotificationPreferences = async (req, res) => {
  const prefs = await service.getNotificationPreferences(req.user.id);
  ApiResponse.ok(res, prefs, 'Notification preferences fetched successfully');
};

/**
 * PATCH /api/v1/parents/me/notification-preferences
 */
const updateNotificationPreferences = async (req, res) => {
  const updated = await service.updateNotificationPreferences(req.user.id, req.body);
  ApiResponse.ok(res, updated, 'Notification preferences updated successfully');
};

// =============================================================================
// DEVICES
// =============================================================================

/**
 * GET /api/v1/parents/me/devices
 * List all registered devices for this parent
 */
const listDevices = async (req, res) => {
  const { devices, pagination } = await service.listDevices(req.user.id, req.query);
  ApiResponse.paginated(res, devices, pagination, 'Devices fetched successfully');
};

/**
 * DELETE /api/v1/parents/me/devices/:deviceId
 * Remove a specific device
 */
const removeDevice = async (req, res) => {
  const result = await service.removeDevice(req.user.id, req.params.deviceId);
  ApiResponse.ok(res, result, 'Device removed successfully');
};

// =============================================================================
// SESSIONS
// =============================================================================

/**
 * GET /api/v1/parents/me/sessions
 * List all active sessions
 */
const listSessions = async (req, res) => {
  const { sessions, pagination } = await service.listSessions(req.user.id, req.query);
  ApiResponse.paginated(res, sessions, pagination, 'Sessions fetched successfully');
};

/**
 * DELETE /api/v1/parents/me/sessions/:sessionId
 * Revoke a specific session
 */
const revokeSession = async (req, res) => {
  const result = await service.revokeSession(req.user.id, req.params.sessionId);
  ApiResponse.ok(res, result, 'Session revoked successfully');
};

/**
 * DELETE /api/v1/parents/me/sessions
 * Revoke all sessions except the current one
 */
const revokeAllSessions = async (req, res) => {
  const currentSessionId = req.user.sessionId ?? null;
  const result = await service.revokeAllSessions(req.user.id, currentSessionId);
  ApiResponse.ok(res, result, 'All other sessions revoked successfully');
};

// =============================================================================
// SCAN HISTORY
// =============================================================================

/**
 * GET /api/v1/parents/me/children/:studentId/scans
 * View scan logs for one of the parent's children
 */
const listChildScans = async (req, res) => {
  const { scans, pagination } = await service.listChildScans(
    req.user.id,
    req.params.studentId,
    req.query
  );
  ApiResponse.paginated(res, scans, pagination, 'Scan history fetched successfully');
};

// =============================================================================
// EXPORT
// =============================================================================

export const parentController = {
  // Profile
  getProfile,
  updateProfile,
  deleteAccount,

  // Children
  listChildren,
  getChild,
  linkChild,
  updateChildLink,
  unlinkChild,

  // Card Visibility
  updateCardVisibility,

  // Notification Preferences
  getNotificationPreferences,
  updateNotificationPreferences,

  // Devices
  listDevices,
  removeDevice,

  // Sessions
  listSessions,
  revokeSession,
  revokeAllSessions,

  // Scan History
  listChildScans,
};