/**
 * Report data access layer.
 */

import { prisma } from '#config/prisma.js';

export const reportRepository = {
  /**
   * Get timetable with all assignments.
   */
  async getTimetableWithAssignments(timetableId, schoolId) {
    return prisma.timetable.findFirst({
      where: { id: timetableId, schoolId },
      include: {
        assignments: {
          include: {
            classGroup: { select: { grade: true, section: true, label: true } },
            subject: { select: { name: true, code: true } },
            teacher: { select: { name: true } },
            room: { select: { roomNumber: true, roomName: true, type: true } },
          },
        },
        template: {
          select: { name: true, academicYear: true, term: true },
        },
      },
    });
  },

  /**
   * Get validation report for a timetable.
   */
  async getValidationReport(timetableId) {
    return prisma.timetableValidation.findUnique({
      where: { timetableId },
    });
  },

  /**
   * Get school config for room utilization calculation.
   */
  async getSchoolConfig(schoolId) {
    return prisma.schoolTimetableConfig.findUnique({
      where: { schoolId },
    });
  },

  /**
   * Get teacher details.
   */
  async getTeacher(teacherId) {
    return prisma.teacher.findUnique({
      where: { id: teacherId },
      select: { id: true, name: true, email: true, subjects: true },
    });
  },

  /**
   * Get class details.
   */
  async getClassGroup(classId) {
    return prisma.classGroup.findUnique({
      where: { id: classId },
      select: { id: true, grade: true, section: true, label: true, studentCount: true },
    });
  },

  /**
   * Get room details.
   */
  async getRoom(roomId) {
    return prisma.room.findUnique({
      where: { id: roomId },
      select: {
        id: true,
        roomNumber: true,
        roomName: true,
        type: true,
        floor: true,
        capacity: true,
      },
    });
  },
};
