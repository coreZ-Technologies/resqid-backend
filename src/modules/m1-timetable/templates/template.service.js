/**
 * Template service — business logic.
 */

import { templateRepository } from './template.repository.js';
import { ApiError } from '#shared/response/ApiError.js';

export const templateService = {
  /**
   * Create a new template.
   */
  async createTemplate(schoolId, data) {
    // Build config snapshot
    const configSnapshot = {
      periodsPerDay: data.config?.periodsPerDay || 8,
      periodDuration: data.config?.periodDuration || 45,
      startTime: data.config?.startTime || '08:00',
      endTime: data.config?.endTime || '15:00',
      workingDays: data.config?.workingDays || [1, 2, 3, 4, 5, 6],
      breakAfterPeriods: data.config?.breakAfterPeriods || [2, 4, 6],
      breakDurations: data.config?.breakDurations || [15, 30, 10],
      lunchAfterPeriod: data.config?.lunchAfterPeriod || 4,
      lunchDuration: data.config?.lunchDuration || 30,
      morningPeriodsEnd: data.config?.morningPeriodsEnd || 4,
    };

    const constraintsSnapshot = {
      maxConsecutivePeriods: data.constraints?.maxConsecutivePeriods || 3,
      minGapBetweenSubjects: data.constraints?.minGapBetweenSubjects || 1,
      maxSameSubjectPerDay: data.constraints?.maxSameSubjectPerDay || 2,
      allowSubstitution: data.constraints?.allowSubstitution ?? true,
      maxSubstitutionsPerDay: data.constraints?.maxSubstitutionsPerDay || 3,
    };

    return templateRepository.create({
      schoolId,
      name: data.name,
      description: data.description,
      academicYear: data.academicYear,
      term: data.term,
      configSnapshot,
      constraintsSnapshot,
      basedOnTemplateId: data.basedOnTemplateId,
      createdBy: data.createdBy,
      classes: data.classes || [],
      teachers: data.teachers || [],
      subjects: data.subjects || [],
      rooms: data.rooms || [],
    });
  },

  /**
   * Get template by ID.
   */
  async getTemplate(templateId, schoolId) {
    const template = await templateRepository.findById(templateId, schoolId);
    if (!template) throw new ApiError(404, 'Template not found');
    return template;
  },

  /**
   * List templates for a school.
   */
  async listTemplates(schoolId, filters = {}) {
    return templateRepository.findAllBySchool(schoolId, filters);
  },

  /**
   * Update a template.
   */
  async updateTemplate(templateId, schoolId, data) {
    await this.getTemplate(templateId, schoolId); // Verify ownership
    return templateRepository.update(templateId, data);
  },

  /**
   * Delete a template.
   */
  async deleteTemplate(templateId, schoolId) {
    await this.getTemplate(templateId, schoolId); // Verify ownership
    return templateRepository.remove(templateId);
  },

  /**
   * Set template as active.
   */
  async activateTemplate(templateId, schoolId) {
    await this.getTemplate(templateId, schoolId);
    return templateRepository.setActive(templateId, schoolId);
  },

  /**
   * Duplicate a template.
   */
  async duplicateTemplate(templateId, schoolId, newName) {
    await this.getTemplate(templateId, schoolId);
    return templateRepository.duplicate(templateId, newName);
  },

  /**
   * Archive a template.
   */
  async archiveTemplate(templateId, schoolId) {
    await this.getTemplate(templateId, schoolId);
    return templateRepository.archive(templateId);
  },
};
