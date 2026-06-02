// src/modules/school-admin/tokens/token.validation.js
import Joi from 'joi';

const tokenStatusEnum = ['UNREGISTERED', 'ISSUED', 'ACTIVE', 'INACTIVE', 'REVOKED', 'LOST', 'EXPIRED'];
const tokenTypeEnum = ['RFID', 'QR', 'NFC', 'COMBO'];
const qrFormatEnum = ['PNG', 'SVG', 'PDF'];

export const createTokenSchema = Joi.object({
  studentId: Joi.string().optional().allow(null),
  type: Joi.string().valid(...tokenTypeEnum).default('QR'),
  label: Joi.string().optional().max(100),
  notes: Joi.string().optional().max(500),
  expiresAt: Joi.date().iso().greater('now').optional(),
});

export const assignTokenSchema = Joi.object({
  studentId: Joi.string().required(),
});

export const unassignTokenSchema = Joi.object({
  reason: Joi.string().optional().max(255),
});

export const updateTokenSchema = Joi.object({
  status: Joi.string().valid(...tokenStatusEnum).optional(),
  label: Joi.string().optional().max(100),
  notes: Joi.string().optional().max(500),
  expiresAt: Joi.date().iso().optional(),
});

export const renewTokenSchema = Joi.object({
  newExpiryDate: Joi.date().iso().greater('now').required(),
});

export const revokeTokenSchema = Joi.object({
  reason: Joi.string().required().max(255),
});

export const regenerateQrSchema = Joi.object({
  format: Joi.string().valid(...qrFormatEnum).optional(),
  width: Joi.number().integer().min(128).max(2048).optional(),
  height: Joi.number().integer().min(128).max(2048).optional(),
  foregroundColor: Joi.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  backgroundColor: Joi.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  logoUrl: Joi.string().uri().optional().allow(null),
  errorCorrection: Joi.string().valid('L', 'M', 'Q', 'H').optional(),
});

export const listTokensQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string().valid(...tokenStatusEnum).optional(),
  type: Joi.string().valid(...tokenTypeEnum).optional(),
  studentId: Joi.string().optional(),
  search: Joi.string().optional(),
});