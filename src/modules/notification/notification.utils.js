// src/modules/notification/notification.utils.js

import { NOTIFICATION_TYPES, CHANNELS } from './notification.constants.js';

/**
 * Render notification title/body from template and variables
 * (simple placeholder – replace with actual template engine if needed)
 */
export function renderTemplate(template, variables = {}) {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  return result;
}

/**
 * Format channel list for API response (normalize)
 */
export function formatChannels(channels) {
  return channels.map(c => c.toLowerCase()).filter(c => CHANNELS.includes(c));
}

/**
 * Compute delivery stats from array of deliveries
 */
export function computeStats(deliveries) {
  const total = deliveries.length;
  const sent = deliveries.filter(d => d.status !== 'PENDING').length;
  const delivered = deliveries.filter(d => d.status === 'DELIVERED' || d.status === 'READ').length;
  const read = deliveries.filter(d => d.status === 'READ').length;
  const failed = deliveries.filter(d => d.status === 'FAILED').length;
  return { total, sent, delivered, read, failed };
}