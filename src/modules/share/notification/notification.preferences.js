// src/modules/share/notification/notification.preferences.js
import { NotificationRepository } from './notification.repository.js';
import { preferencesSchema } from './notification.validation.js';
import { logger } from '#config/logger.js';

/**
 * Get user notification preferences
 * @param {string} userId
 * @returns {Promise<Object>} preferences object
 */
export async function getUserPreferences(userId) {
  const prefs = await NotificationRepository.getUserPreferences(userId);
  if (!prefs) {
    // Return defaults if none exist
    return {
      userId,
      email: { enabled: true, digest: false },
      push: { enabled: true },
      sms: { enabled: true },
      inapp: { enabled: true },
    };
  }
  return prefs;
}

/**
 * Update user notification preferences
 * @param {string} userId
 * @param {Object} updates - partial preferences object
 * @returns {Promise<Object>} updated preferences
 */
export async function updateUserPreferences(userId, updates) {
  // Validate with Joi schema
  const validated = preferencesSchema.parse(updates);
  const updated = await NotificationRepository.upsertUserPreferences(userId, validated);
  logger.info({ userId, updatedFields: Object.keys(validated) }, 'User preferences updated');
  return updated;
}

/**
 * Check if a specific channel is enabled for a user
 * @param {string} userId
 * @param {string} channel - 'email' | 'push' | 'sms' | 'inapp'
 * @returns {Promise<boolean>}
 */
export async function isChannelEnabled(userId, channel) {
  const prefs = await getUserPreferences(userId);
  return prefs[channel]?.enabled === true;
}

/**
 * Get channel-specific contact info (email, phone, device token) from user profile
 * This is a helper – you should implement actual user data fetching
 * @param {string} userId
 * @param {string} channel
 * @returns {Promise<string|null>}
 */
export async function getUserContactForChannel(userId, channel) {
  // This function depends on your User model
  // Example implementation using prisma – adjust as needed
  const { prisma } = await import('#config/prisma.js');
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, phone: true, expoPushToken: true },
  });
  if (!user) return null;
  switch (channel) {
    case 'email': return user.email;
    case 'sms': return user.phone;
    case 'push': return user.expoPushToken;
    default: return null;
  }
}