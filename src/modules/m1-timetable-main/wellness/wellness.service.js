/**
 * wellness/wellness.service.js
 * Manages sensitive teacher wellness/accommodation data.
 * Access is restricted — only HR-level school admin roles.
 */

import * as wellnessRepository from './wellness.repository.js';
import { ApiError } from '#shared/response/ApiError.js';
import { logger } from '#config/logger.js';

// Allowed fields that can be stored in wellness records
const ALLOWED_FIELDS = [
  'isPregnant',
  'needsAccessibleRoom',
  'isSenior',
  'avoidEarlyMorning',
  'needsCommuteBuffer',
  'burnoutRisk',
  'preferredMaxPerDay',
  'preferredSlots',
  'personalBlocks',
  'notes',
];

/**
 * Sanitize wellness data to only allow known fields
 * @private
 */
function sanitizeWellnessData(data) {
  const sanitized = {};
  for (const key of ALLOWED_FIELDS) {
    if (data[key] !== undefined) {
      sanitized[key] = data[key];
    }
  }
  return sanitized;
}

/**
 * Upsert (create or update) wellness record for a teacher
 */
export async function upsertWellness(teacherId, schoolId, data) {
  try {
    const sanitized = sanitizeWellnessData(data);
    
    logger.debug({ 
      teacherId, 
      schoolId, 
      fields: Object.keys(sanitized) 
    }, 'Upserting wellness record');
    
    const result = await wellnessRepository.upsert(teacherId, schoolId, sanitized);
    
    logger.info({ teacherId, schoolId }, 'Wellness record upserted successfully');
    
    return result;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error({ error: error.message, teacherId, schoolId }, 'Failed to upsert wellness record');
    throw ApiError.internal('Failed to save wellness record');
  }
}

/**
 * Get wellness record for a specific teacher
 * Returns null if not found (not an error)
 */
export async function getWellness(teacherId, schoolId) {
  try {
    const record = await wellnessRepository.findOne(teacherId, schoolId);
    
    if (!record) {
      logger.debug({ teacherId, schoolId }, 'Wellness record not found');
    }
    
    return record;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error({ error: error.message, teacherId, schoolId }, 'Failed to fetch wellness record');
    throw ApiError.internal('Failed to fetch wellness record');
  }
}

/**
 * Delete wellness record for a teacher
 * Throws ApiError.notFound if record doesn't exist
 */
export async function deleteWellness(teacherId, schoolId) {
  try {
    const result = await wellnessRepository.remove(teacherId, schoolId);
    
    logger.info({ teacherId, schoolId }, 'Wellness record deleted successfully');
    
    return result;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error({ error: error.message, teacherId, schoolId }, 'Failed to delete wellness record');
    throw ApiError.internal('Failed to delete wellness record');
  }
}

/**
 * Bulk load all wellness records for a school (used by solver).
 * Returns a map: teacherId → wellnessObject
 */
export async function getWellnessMap(schoolId) {
  try {
    const records = await wellnessRepository.findAllBySchool(schoolId);
    const wellnessMap = Object.fromEntries(records.map((r) => [r.teacherId, r]));
    
    logger.debug({ schoolId, count: records.length }, 'Wellness map loaded');
    
    return wellnessMap;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error({ error: error.message, schoolId }, 'Failed to load wellness map');
    throw ApiError.internal('Failed to load wellness records');
  }
}

/**
 * Check if a teacher has a specific wellness flag
 */
export async function hasWellnessFlag(teacherId, schoolId, flag) {
  const record = await getWellness(teacherId, schoolId);
  return record ? !!record[flag] : false;
}

/**
 * Get burnout risk level for a teacher
 * Returns a normalized value between 0-1
 */
export async function getBurnoutRisk(teacherId, schoolId) {
  const record = await getWellness(teacherId, schoolId);
  if (!record || !record.burnoutRisk) return 0;
  
  // Normalize burnoutRisk (assuming it's stored as number 0-100 or 0-1)
  const risk = typeof record.burnoutRisk === 'number' ? record.burnoutRisk : 0;
  return Math.min(1, Math.max(0, risk / 100));
}

/**
 * Validate wellness data before upsert
 * Returns array of validation errors
 */
export function validateWellnessData(data) {
  const errors = [];
  
  // Validate numeric fields
  if (data.preferredMaxPerDay !== undefined && typeof data.preferredMaxPerDay !== 'number') {
    errors.push('preferredMaxPerDay must be a number');
  }
  
  if (data.burnoutRisk !== undefined) {
    if (typeof data.burnoutRisk !== 'number') {
      errors.push('burnoutRisk must be a number');
    } else if (data.burnoutRisk < 0 || data.burnoutRisk > 100) {
      errors.push('burnoutRisk must be between 0 and 100');
    }
  }
  
  // Validate boolean fields
  const booleanFields = ['isPregnant', 'needsAccessibleRoom', 'isSenior', 'avoidEarlyMorning', 'needsCommuteBuffer'];
  for (const field of booleanFields) {
    if (data[field] !== undefined && typeof data[field] !== 'boolean') {
      errors.push(`${field} must be a boolean`);
    }
  }
  
  // Validate preferredSlots format (if provided)
  if (data.preferredSlots !== undefined && !Array.isArray(data.preferredSlots)) {
    errors.push('preferredSlots must be an array');
  }
  
  // Validate personalBlocks format (if provided)
  if (data.personalBlocks !== undefined && !Array.isArray(data.personalBlocks)) {
    errors.push('personalBlocks must be an array');
  }
  
  return errors;
}