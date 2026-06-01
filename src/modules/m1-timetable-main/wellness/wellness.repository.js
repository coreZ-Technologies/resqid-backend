import { getPrisma } from '../../config/prisma';

function prisma() {
  return getPrisma();
}

export async function upsert(teacherId, schoolId, data) {
  return prisma().teacherWellness.upsert({
    where: { teacherId_schoolId: { teacherId, schoolId } },
    create: { teacherId, schoolId, ...data },
    update: data,
  });
}

export async function findOne(teacherId, schoolId) {
  return prisma().teacherWellness.findUnique({
    where: { teacherId_schoolId: { teacherId, schoolId } },
  });
}

export async function findAllBySchool(schoolId) {
  return prisma().teacherWellness.findMany({ where: { schoolId } });
}

export async function remove(teacherId, schoolId) {
  return prisma().teacherWellness.delete({
    where: { teacherId_schoolId: { teacherId, schoolId } },
  });
}
