/**
 * templates/template.service.js
 * Schools create and update their template (the constraint config)
 * before running the solver.
 */

import * as templateRepository from './template.repository.js';
import { ApiError } from '#shared/response/ApiError.js';
import { logger } from '#config/logger.js';

/**
 * Validate the shape of template input.
 * Throws ApiError with 400 status on bad input.
 */
function validate(data, isUpdate = false) {
  // For create operations, all required fields must be present
  if (!isUpdate) {
    const required = ['name', 'periodsPerDay', 'workingDays', 'classes', 'teachers'];
    for (const key of required) {
      if (data[key] === undefined) {
        throw ApiError.badRequest(`Missing required field: ${key}`);
      }
    }
  }
  
  // Validate periodsPerDay if present
  if (data.periodsPerDay !== undefined) {
    if (typeof data.periodsPerDay !== 'number' || data.periodsPerDay < 1 || data.periodsPerDay > 12) {
      throw ApiError.badRequest('periodsPerDay must be a number between 1 and 12');
    }
  }
  
  // Validate workingDays if present
  if (data.workingDays !== undefined) {
    if (typeof data.workingDays !== 'number' || data.workingDays < 1 || data.workingDays > 7) {
      throw ApiError.badRequest('workingDays must be a number between 1 and 7');
    }
  }
  
  // Validate classes
  if (data.classes !== undefined) {
    if (!Array.isArray(data.classes) || data.classes.length === 0) {
      throw ApiError.badRequest('classes must be a non-empty array');
    }
    
    // Validate each class has required fields
    for (let i = 0; i < data.classes.length; i++) {
      const cls = data.classes[i];
      if (!cls.id || !cls.name) {
        throw ApiError.badRequest(`Class at index ${i} must have id and name`);
      }
    }
  }
  
  // Validate teachers
  if (data.teachers !== undefined) {
    if (!Array.isArray(data.teachers) || data.teachers.length === 0) {
      throw ApiError.badRequest('teachers must be a non-empty array');
    }
    
    // Validate each teacher has required fields
    for (let i = 0; i < data.teachers.length; i++) {
      const teacher = data.teachers[i];
      if (!teacher.id || !teacher.name) {
        throw ApiError.badRequest(`Teacher at index ${i} must have id and name`);
      }
    }
  }
  
  // Validate subjects (optional)
  if (data.subjects !== undefined && !Array.isArray(data.subjects)) {
    throw ApiError.badRequest('subjects must be an array');
  }
  
  // Validate breaks (optional)
  if (data.breaks !== undefined) {
    if (!Array.isArray(data.breaks)) {
      throw ApiError.badRequest('breaks must be an array');
    }
    
    for (let i = 0; i < data.breaks.length; i++) {
      const breakItem = data.breaks[i];
      if (breakItem.start === undefined || breakItem.end === undefined) {
        throw ApiError.badRequest(`Break at index ${i} must have start and end`);
      }
    }
  }
}

export async function createTemplate(schoolId, data) {
  try {
    validate(data, false);
    
    logger.info({ schoolId, templateName: data.name }, 'Creating new template');
    
    const template = await templateRepository.create({ schoolId, ...data });
    
    logger.info({ templateId: template.id, schoolId, name: template.name }, 'Template created successfully');
    
    return template;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error({ error: error.message, schoolId, data }, 'Failed to create template');
    throw ApiError.internal('Failed to create template');
  }
}

export async function getTemplate(templateId, schoolId) {
  try {
    const template = await templateRepository.findById(templateId);
    
    if (!template || template.schoolId !== schoolId) {
      throw ApiError.notFound('Template not found');
    }
    
    return template;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error({ error: error.message, templateId, schoolId }, 'Failed to get template');
    throw ApiError.internal('Failed to fetch template');
  }
}

export async function updateTemplate(templateId, schoolId, data) {
  try {
    // Verify ownership first
    await getTemplate(templateId, schoolId);
    
    // Validate update data (partial updates allowed)
    validate(data, true);
    
    logger.info({ templateId, schoolId, updateFields: Object.keys(data) }, 'Updating template');
    
    const template = await templateRepository.update(templateId, data);
    
    logger.info({ templateId, schoolId, name: template.name }, 'Template updated successfully');
    
    return template;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error({ error: error.message, templateId, schoolId, data }, 'Failed to update template');
    throw ApiError.internal('Failed to update template');
  }
}

export async function deleteTemplate(templateId, schoolId) {
  try {
    // Verify ownership first
    await getTemplate(templateId, schoolId);
    
    logger.info({ templateId, schoolId }, 'Deleting template');
    
    const result = await templateRepository.remove(templateId);
    
    logger.info({ templateId, schoolId }, 'Template deleted successfully');
    
    return result;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error({ error: error.message, templateId, schoolId }, 'Failed to delete template');
    throw ApiError.internal('Failed to delete template');
  }
}

export async function listTemplates(schoolId) {
  try {
    const templates = await templateRepository.findAllBySchool(schoolId);
    
    logger.debug({ schoolId, count: templates.length }, 'Listed templates');
    
    return templates;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error({ error: error.message, schoolId }, 'Failed to list templates');
    throw ApiError.internal('Failed to list templates');
  }
}

/**
 * Duplicate a template (create a copy)
 */
export async function duplicateTemplate(templateId, schoolId, newName) {
  try {
    const original = await getTemplate(templateId, schoolId);
    
    // Remove id and timestamps, add new name
    const { id, createdAt, updatedAt, ...templateData } = original;
    
    const duplicated = await createTemplate(schoolId, {
      ...templateData,
      name: newName || `${original.name} (Copy)`,
    });
    
    logger.info({ 
      originalTemplateId: templateId, 
      newTemplateId: duplicated.id, 
      schoolId 
    }, 'Template duplicated');
    
    return duplicated;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error({ error: error.message, templateId, schoolId }, 'Failed to duplicate template');
    throw ApiError.internal('Failed to duplicate template');
  }
}