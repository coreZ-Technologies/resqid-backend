/**
 * wellness/wellness.service.js
 * Manages sensitive teacher wellness/accommodation data.
 * Access is restricted — only HR-level school admin roles.
 */

import wellnessRepository from './wellness.repository';

export async function upsertWellness(teacherId, schoolId, data) {
  // Sanitise — only store known fields
  const allowed = [
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
  const sanitised = {};
  for (const key of allowed) {
    if (data[key] !== undefined) sanitised[key] = data[key];
  }

  return wellnessRepository.upsert(teacherId, schoolId, sanitised);
}

export async function getWellness(teacherId, schoolId) {
  return wellnessRepository.findOne(teacherId, schoolId);
}

export async function deleteWellness(teacherId, schoolId) {
  return wellnessRepository.remove(teacherId, schoolId);
}

/**
 * Bulk load all wellness records for a school (used by solver).
 * Returns a map: teacherId → wellnessObject
 */
export async function getWellnessMap(schoolId) {
  const records = await wellnessRepository.findAllBySchool(schoolId);
  return Object.fromEntries(records.map((r) => [r.teacherId, r]));
}
