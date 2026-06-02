// wellness.repository.js
import { prisma } from '#config/prisma.js';
import { logger } from '#config/logger.js';
import { ApiError } from '#shared/response/ApiError.js';

export async function upsert(teacherId, schoolId, data) {
  try {
    const result = await prisma.teacherWellness.upsert({
      where: { teacherId_schoolId: { teacherId, schoolId } },
      create: { teacherId, schoolId, ...data },
      update: data,
    });
    
    logger.debug({ teacherId, schoolId, data }, 'Wellness record upserted');
    return result;
  } catch (error) {
    logger.error({ error: error.message, teacherId, schoolId }, 'Failed to upsert wellness record');
    throw ApiError.internal('Failed to save wellness record');
  }
}

export async function findOne(teacherId, schoolId) {
  try {
    return await prisma.teacherWellness.findUnique({
      where: { teacherId_schoolId: { teacherId, schoolId } },
    });
  } catch (error) {
    logger.error({ error: error.message, teacherId, schoolId }, 'Failed to find wellness record');
    throw ApiError.internal('Failed to fetch wellness record');
  }
}

export async function findAllBySchool(schoolId) {
  try {
    return await prisma.teacherWellness.findMany({ 
      where: { schoolId } 
    });
  } catch (error) {
    logger.error({ error: error.message, schoolId }, 'Failed to fetch wellness records for school');
    throw ApiError.internal('Failed to fetch wellness records');
  }
}

export async function remove(teacherId, schoolId) {
  try {
    return await prisma.teacherWellness.delete({
      where: { teacherId_schoolId: { teacherId, schoolId } },
    });
  } catch (error) {
    if (error.code === 'P2025') {
      logger.warn({ teacherId, schoolId }, 'Wellness record not found for deletion');
      throw ApiError.notFound(`Wellness record not found for teacher: ${teacherId}`);
    }
    logger.error({ error: error.message, teacherId, schoolId }, 'Failed to delete wellness record');
    throw ApiError.internal('Failed to delete wellness record');
  }
}