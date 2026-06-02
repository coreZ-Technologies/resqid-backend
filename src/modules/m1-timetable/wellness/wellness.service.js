/**
 * Wellness service — business logic.
 */

import { wellnessRepository } from './wellness.repository.js';
import { ApiError } from '#shared/response/ApiError.js';

const ALLOWED_FIELDS = [
  'isPregnant',
  'dueDate',
  'needsGroundFloor',
  'needsAccessibleRoom',
  'mobilityAid',
  'medicalConditions',
  'isSenior',
  'preferredMaxPerDay',
  'preferredMaxPerWeek',
  'avoidEarlyMorning',
  'avoidLateEvening',
  'needsCommuteBuffer',
  'commuteDistance',
  'commuteTime',
  'preferredSlots',
  'personalBlocks',
  'burnoutRisk',
  'burnoutScore',
  'wellnessNotes',
  'emergencyContact',
  'emergencyPhone',
  'isConfidential',
];

export const wellnessService = {
  /**
   * Create or update wellness record.
   */
  async upsertWellness(teacherId, schoolId, data) {
    // Sanitize input
    const sanitized = {};
    for (const key of ALLOWED_FIELDS) {
      if (data[key] !== undefined) {
        sanitized[key] = data[key];
      }
    }

    return wellnessRepository.upsert(teacherId, schoolId, sanitized);
  },

  /**
   * Get wellness record for a teacher.
   */
  async getWellness(teacherId, schoolId) {
    return wellnessRepository.findByTeacher(teacherId, schoolId);
  },

  /**
   * Delete wellness record.
   */
  async deleteWellness(teacherId, schoolId) {
    return wellnessRepository.remove(teacherId, schoolId);
  },

  /**
   * Verify teacher belongs to school.
   */
  async verifyTeacher(teacherId, schoolId) {
    const teacher = await wellnessRepository.verifyTeacher(teacherId, schoolId);
    if (!teacher) {
      throw new ApiError(404, 'Teacher not found in this school');
    }
    return teacher;
  },

  /**
   * Get wellness map for solver (all teachers in school).
   */
  async getWellnessMap(schoolId) {
    const records = await wellnessRepository.findAllBySchool(schoolId);
    return Object.fromEntries(records.map((r) => [r.teacherId, r]));
  },

  /**
   * Get burnout risk teachers.
   */
  async getBurnoutRisks(schoolId) {
    return wellnessRepository.findBurnoutRisks(schoolId);
  },

  /**
   * Get teachers needing accessibility.
   */
  async getAccessibilityNeeds(schoolId) {
    return wellnessRepository.findAccessibilityNeeds(schoolId);
  },
};
