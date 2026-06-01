/**
 * templates/template.repository.js
 * Prisma data access for timetable templates.
 */

import { prisma } from '#config/prisma';

export async function create(data) {
  return prisma.timetableTemplate.create({ data });
}

export async function findById(id) {
  return prisma.timetableTemplate.findUnique({ where: { id } });
}

export async function findAllBySchool(schoolId) {
  return prisma.timetableTemplate.findMany({
    where: { schoolId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function update(id, data) {
  return prisma.timetableTemplate.update({ where: { id }, data });
}

export async function remove(id) {
  return prisma.timetableTemplate.delete({ where: { id } });
}
