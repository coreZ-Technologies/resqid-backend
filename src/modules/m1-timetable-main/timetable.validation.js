/**
 * timetable.validation.js
 * Input validation for timetable API endpoints.
 * Using plain JS validation — swap for Zod if you add it later.
 */

import { ApiError } from '#shared/response/ApiError.js';
import { logger } from '#config/logger.js';

export function validateGenerateInput(body) {
  const errors = [];
  if (!body.templateId) errors.push('templateId is required');
  if (body.opts?.timeoutMs && typeof body.opts.timeoutMs !== 'number') {
    errors.push('opts.timeoutMs must be a number');
  }
  return errors;
}

export function validateCrisisInput(body) {
  const errors = [];
  const validTypes = ['TEACHER_ABSENT', 'ROOM_UNAVAILABLE', 'PARTIAL_RESCHEDULE'];
  if (!body.type) errors.push('type is required');
  if (!validTypes.includes(body.type)) errors.push(`type must be one of: ${validTypes.join(', ')}`);
  if (!body.payload) errors.push('payload is required');

  if (body.type === 'TEACHER_ABSENT') {
    if (!body.payload.teacherId) errors.push('payload.teacherId required for TEACHER_ABSENT');
    if (!body.payload.date) errors.push('payload.date required for TEACHER_ABSENT');
    if (!body.payload.timetableId) errors.push('payload.timetableId required for TEACHER_ABSENT');
  }
  if (body.type === 'ROOM_UNAVAILABLE') {
    if (!body.payload.roomId) errors.push('payload.roomId required for ROOM_UNAVAILABLE');
    if (!body.payload.timetableId) errors.push('payload.timetableId required for ROOM_UNAVAILABLE');
  }
  if (body.type === 'PARTIAL_RESCHEDULE') {
    if (!Array.isArray(body.payload.moves))
      errors.push('payload.moves must be an array for PARTIAL_RESCHEDULE');
  }

  return errors;
}

export function validateTemplateInput(body) {
  const errors = [];
  if (!body.name) errors.push('name is required');
  if (!body.periodsPerDay || typeof body.periodsPerDay !== 'number')
    errors.push('periodsPerDay must be a number');
  if (!body.workingDays || typeof body.workingDays !== 'number')
    errors.push('workingDays must be a number');
  if (!Array.isArray(body.classes) || body.classes.length === 0)
    errors.push('classes must be a non-empty array');
  if (!Array.isArray(body.teachers) || body.teachers.length === 0)
    errors.push('teachers must be a non-empty array');
  return errors;
}

/**
 * Express middleware factory.
 * Throws ApiError if validation fails instead of sending response directly.
 */
export function validate(validatorFn) {
  return (req, res, next) => {
    const errors = validatorFn(req.body);
    
    if (errors.length > 0) {
      logger.warn({ 
        path: req.path, 
        method: req.method, 
        errors,
        body: req.body 
      }, 'Validation failed');
      
      throw ApiError.badRequest('Validation failed', errors);
    }
    
    next();
  };
}

/**
 * Async validation wrapper for use with asyncHandler.
 * Useful when validation itself needs to be async (e.g., DB checks).
 */
export function validateAsync(validatorFn) {
  return async (req, res, next) => {
    try {
      const errors = await validatorFn(req.body, req);
      
      if (errors && errors.length > 0) {
        logger.warn({ 
          path: req.path, 
          method: req.method, 
          errors 
        }, 'Async validation failed');
        
        throw ApiError.badRequest('Validation failed', errors);
      }
      
      next();
    } catch (error) {
      if (error instanceof ApiError) {
        next(error);
      } else {
        logger.error({ error: error.message }, 'Async validation error');
        next(ApiError.badRequest('Validation error'));
      }
    }
  };
}

/**
 * Validate required fields in request body.
 * Returns array of missing field names.
 */
export function validateRequired(body, requiredFields) {
  const missing = [];
  for (const field of requiredFields) {
    const value = body[field];
    if (value === undefined || value === null || value === '') {
      missing.push(field);
    }
  }
  return missing;
}

/**
 * Validate enum value.
 * Returns error message if invalid, null if valid.
 */
export function validateEnum(value, allowedValues, fieldName = 'value') {
  if (!allowedValues.includes(value)) {
    return `${fieldName} must be one of: ${allowedValues.join(', ')}`;
  }
  return null;
}

/**
 * Validate number range.
 * Returns error message if invalid, null if valid.
 */
export function validateNumberRange(value, min, max, fieldName = 'value') {
  if (typeof value !== 'number') {
    return `${fieldName} must be a number`;
  }
  if (value < min || value > max) {
    return `${fieldName} must be between ${min} and ${max}`;
  }
  return null;
}

/**
 * Sanitize validation errors into consistent format for ApiError.
 */
export function formatValidationErrors(errors) {
  if (Array.isArray(errors) && errors.length > 0 && typeof errors[0] === 'string') {
    // Simple string array format
    return errors.map((error) => ({ message: error }));
  }
  
  if (Array.isArray(errors) && errors.length > 0 && typeof errors[0] === 'object') {
    // Already in field-error format
    return errors;
  }
  
  // Default fallback
  return [{ message: 'Validation failed' }];
}