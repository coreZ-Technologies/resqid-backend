// src/modules/share/notification/notification.validation.js
import Joi from 'joi';

const channelEnum = ['email', 'push', 'sms', 'inapp'];
const priorityEnum = ['low', 'medium', 'high', 'critical'];

export const sendNotificationSchema = Joi.object({
  userId: Joi.string().required(),
  channel: Joi.string().valid(...channelEnum).required(),
  title: Joi.string().max(200).required(),
  body: Joi.string().max(2000).required(),
  data: Joi.object().optional(),
  priority: Joi.string().valid(...priorityEnum).default('medium'),
  template: Joi.string().optional(),
  templateData: Joi.object().optional(),
  expiresAt: Joi.date().iso().optional(),
});

export const bulkSendSchema = Joi.array().items(sendNotificationSchema).min(1).max(1000);

export const preferencesSchema = Joi.object({
  email: Joi.object({
    enabled: Joi.boolean().default(true),
    digest: Joi.boolean().default(false),
  }).default(),
  push: Joi.object({
    enabled: Joi.boolean().default(true),
  }).default(),
  sms: Joi.object({
    enabled: Joi.boolean().default(true),
  }).default(),
  inapp: Joi.object({
    enabled: Joi.boolean().default(true),
  }).default(),
});

export const queryLogsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  userId: Joi.string().optional(),
  channel: Joi.string().valid(...channelEnum).optional(),
  status: Joi.string().valid('pending', 'sent', 'failed', 'retry').optional(),
});