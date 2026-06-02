// =============================================================================
// modules/m2-emergency/emergency.repository.js — RESQID
// =============================================================================

import { prisma } from '#config/prisma.js';

export const findProfileByStudent = (studentId) =>
  prisma.emergencyProfile.findUnique({
    where: { studentId },
    include: {
      contacts: {
        where: { isActive: true },
        orderBy: { priority: 'asc' },
        select: {
          id: true,
          name: true,
          phone: true,
          relation: true,
          priority: true,
          isPrimary: true,
          callEnabled: true,
          whatsappEnabled: true,
        },
      },
    },
  });

export const upsertProfile = (studentId, data) =>
  prisma.emergencyProfile.upsert({
    where: { studentId },
    create: { studentId, isComplete: true, ...data },
    update: { ...data, isComplete: true },
  });

export const replaceContacts = async (studentId, contacts) => {
  const profile = await prisma.emergencyProfile.findUnique({ where: { studentId } });
  if (!profile) return;

  await prisma.emergencyContact.deleteMany({ where: { profileId: profile.id } });

  if (contacts?.length) {
    await prisma.emergencyContact.createMany({
      data: contacts.map((c) => ({
        profileId: profile.id,
        name: c.name,
        phone: c.phone,
        relation: c.relation || null,
        priority: c.priority,
        isPrimary: c.isPrimary || false,
        callEnabled: c.callEnabled ?? true,
        whatsappEnabled: c.whatsappEnabled ?? true,
      })),
    });
  }
};
