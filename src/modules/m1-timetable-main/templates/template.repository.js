/**
 * templates/template.repository.js
 * Prisma data access for timetable templates.
 */

import { prisma } from '#config/prisma.js';
import { logger } from '#config/logger.js';
import { ApiError } from '#shared/response/ApiError.js';

export async function create(data) {
  try {
    const result = await prisma.timetableTemplate.create({ data });
    
    logger.debug({ templateId: result.id, schoolId: data.schoolId }, 'Template created in database');
    return result;
  } catch (error) {
    logger.error({ error: error.message, data }, 'Failed to create template');
    throw ApiError.internal('Failed to create template');
  }
}

export async function findById(id) {
  try {
    const template = await prisma.timetableTemplate.findUnique({ where: { id } });
    
    if (!template) {
      return null; // Return null for not found - service layer handles 404
    }
    
    return template;
  } catch (error) {
    logger.error({ error: error.message, id }, 'Failed to find template by ID');
    throw ApiError.internal('Failed to fetch template');
  }
}

export async function findAllBySchool(schoolId) {
  try {
    const templates = await prisma.timetableTemplate.findMany({
      where: { schoolId },
      orderBy: { createdAt: 'desc' },
    });
    
    logger.debug({ schoolId, count: templates.length }, 'Templates retrieved for school');
    return templates;
  } catch (error) {
    logger.error({ error: error.message, schoolId }, 'Failed to fetch templates for school');
    throw ApiError.internal('Failed to fetch templates');
  }
}

export async function update(id, data) {
  try {
    const result = await prisma.timetableTemplate.update({ where: { id }, data });
    
    logger.debug({ templateId: id, updatedFields: Object.keys(data) }, 'Template updated in database');
    return result;
  } catch (error) {
    if (error.code === 'P2025') {
      logger.warn({ templateId: id }, 'Template not found for update');
      throw ApiError.notFound(`Template not found: ${id}`);
    }
    logger.error({ error: error.message, id, data }, 'Failed to update template');
    throw ApiError.internal('Failed to update template');
  }
}

export async function remove(id) {
  try {
    const result = await prisma.timetableTemplate.delete({ where: { id } });
    
    logger.debug({ templateId: id }, 'Template deleted from database');
    return result;
  } catch (error) {
    if (error.code === 'P2025') {
      logger.warn({ templateId: id }, 'Template not found for deletion');
      throw ApiError.notFound(`Template not found: ${id}`);
    }
    logger.error({ error: error.message, id }, 'Failed to delete template');
    throw ApiError.internal('Failed to delete template');
  }
}

/**
 * Check if template exists and belongs to school
 */
export async function existsAndBelongsToSchool(id, schoolId) {
  try {
    const template = await prisma.timetableTemplate.findFirst({
      where: { id, schoolId },
      select: { id: true },
    });
    return !!template;
  } catch (error) {
    logger.error({ error: error.message, id, schoolId }, 'Failed to check template existence');
    throw ApiError.internal('Failed to verify template');
  }
}

/**
 * Count templates for a school
 */
export async function countBySchool(schoolId) {
  try {
    return await prisma.timetableTemplate.count({
      where: { schoolId },
    });
  } catch (error) {
    logger.error({ error: error.message, schoolId }, 'Failed to count templates');
    throw ApiError.internal('Failed to count templates');
  }
}