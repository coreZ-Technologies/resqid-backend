// src/modules/settings/settings.validation.js
import Joi from 'joi';

// Recursive partial allows partial updates
const settingsSchema = Joi.object({
  school: Joi.object({
    name: Joi.string().min(2).max(100),
    code: Joi.string().max(20),
    address: Joi.string().max(255),
    phone: Joi.string().pattern(/^[0-9+\-\s]{10,15}$/),
    email: Joi.string().email(),
    logoUrl: Joi.string().uri(),
    timezone: Joi.string().valid('Asia/Kolkata', 'UTC', 'America/New_York'),
    locale: Joi.string(),
    currency: Joi.string().length(3),
  }),
  academic: Joi.object({
    currentSession: Joi.string().pattern(/^\d{4}-\d{4}$/),
    currentTerm: Joi.string(),
    sessionStartDate: Joi.date().iso(),
    sessionEndDate: Joi.date().iso().greater(Joi.ref('sessionStartDate')),
    gradingSystem: Joi.string().valid('PERCENTAGE', 'GPA', 'CGPA'),
  }),
  attendance: Joi.object({
    checkInStartTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    checkInEndTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    gracePeriodMinutes: Joi.number().integer().min(0).max(60),
    autoMarkAbsentAfterMinutes: Joi.number().integer().min(0).max(120),
    allowGeoFencing: Joi.boolean(),
    geoFenceRadiusMeters: Joi.number().integer().min(10).max(500),
    enableQRScan: Joi.boolean(),
    enableRFID: Joi.boolean(),
  }),
  security: Joi.object({
    sessionTimeoutMinutes: Joi.number().integer().min(5).max(1440),
    maxLoginAttempts: Joi.number().integer().min(1).max(20),
    requireTwoFactor: Joi.boolean(),
    passwordMinLength: Joi.number().integer().min(6).max(20),
  }),
  notifications: Joi.object({
    enableEmail: Joi.boolean(),
    enableSMS: Joi.boolean(),
    enablePush: Joi.boolean(),
    attendanceAlertToParents: Joi.boolean(),
    emergencyBroadcastEnabled: Joi.boolean(),
  }),
  modules: Joi.object({
    transport: Joi.boolean(),
    library: Joi.boolean(),
    hostel: Joi.boolean(),
    inventory: Joi.boolean(),
    fees: Joi.boolean(),
  }),
  integrations: Joi.object({
    paymentGateway: Joi.string().valid('RAZORPAY', 'STRIPE', 'NONE'),
    razorpayKeyId: Joi.string().allow(''),
    razorpaySecret: Joi.string().allow(''),
    smsProvider: Joi.string().valid('TWILIO', 'MSG91', 'NONE'),
    smsApiKey: Joi.string().allow(''),
    emailProvider: Joi.string().valid('SENDGRID', 'RESEND', 'NONE'),
    emailApiKey: Joi.string().allow(''),
  }),
  uiPreferences: Joi.object({
    theme: Joi.string().valid('light', 'dark', 'system'),
    primaryColor: Joi.string().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/),
  }),
});

export const updateSettingsValidation = settingsSchema;