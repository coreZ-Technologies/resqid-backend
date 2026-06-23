// src/modules/school-admin/card/card.validation.js
import Joi from 'joi';

const cardStatusEnum = ['ACTIVE', 'BLOCKED', 'LOST', 'EXPIRED'];

export const createCardSchema = Joi.object({
  studentId: Joi.string().required(),
  tokenId: Joi.string().optional().allow(null),
  design: Joi.string().optional().max(100),
  expiryDate: Joi.date().iso().greater('now').optional(),
});

export const updateCardSchema = Joi.object({
  status: Joi.string().valid(...cardStatusEnum).optional(),
  design: Joi.string().max(100).optional(),
  expiryDate: Joi.date().iso().optional(),
});

export const renewCardSchema = Joi.object({
  newExpiryDate: Joi.date().iso().greater('now').required(),
});

export const blockCardSchema = Joi.object({
  reason: Joi.string().optional().max(255),
});

export const listCardsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string().valid(...cardStatusEnum).optional(),
  studentId: Joi.string().optional(),
  search: Joi.string().optional(),
});