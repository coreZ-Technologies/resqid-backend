/**
 * templates/template.service.js
 * Schools create and update their template (the constraint config)
 * before running the solver.
 */

import templateRepository from './template.repository';

export async function createTemplate(schoolId, data) {
  validate(data);
  return templateRepository.create({ schoolId, ...data });
}

export async function getTemplate(templateId, schoolId) {
  const template = await templateRepository.findById(templateId);
  if (!template || template.schoolId !== schoolId) {
    throw Object.assign(new Error('Template not found'), { status: 404 });
  }
  return template;
}

export async function updateTemplate(templateId, schoolId, data) {
  await getTemplate(templateId, schoolId); // ownership check
  validate(data);
  return templateRepository.update(templateId, data);
}

export async function deleteTemplate(templateId, schoolId) {
  await getTemplate(templateId, schoolId);
  return templateRepository.remove(templateId);
}

export async function listTemplates(schoolId) {
  return templateRepository.findAllBySchool(schoolId);
}

/**
 * Validate the shape of template input.
 * Throws with 400 status on bad input.
 */
function validate(data) {
  const required = ['name', 'periodsPerDay', 'workingDays', 'classes', 'teachers'];
  for (const key of required) {
    if (data[key] === undefined) {
      throw Object.assign(new Error(`Missing required field: ${key}`), { status: 400 });
    }
  }
  if (!Array.isArray(data.classes) || data.classes.length === 0) {
    throw Object.assign(new Error('classes must be a non-empty array'), { status: 400 });
  }
  if (!Array.isArray(data.teachers) || data.teachers.length === 0) {
    throw Object.assign(new Error('teachers must be a non-empty array'), { status: 400 });
  }
}
