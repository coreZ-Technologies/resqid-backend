// =============================================================================
// modules/emergency/emergency.repository.js — RESQID
// =============================================================================
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class EmergencyRepository {

  /**
   * Fetch students with emergency profile summary for the list/search panel.
   */
  async findStudents(schoolId, filters) {
    const { search, class: grade, section, risk } = filters;

    const where = {
      schoolId,
      status: 'ACTIVE',
    };
    if (grade) where.grade = grade;
    if (section) where.section = section;
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { studentId: { contains: search, mode: 'insensitive' } },
        { admissionNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    // For risk filtering, we need to check emergency profile conditions.
    // We'll fetch all students first, then filter in service if needed.
    const students = await prisma.student.findMany({
      where,
      select: {
        id: true,
        studentId: true,
        admissionNumber: true,
        firstName: true,
        lastName: true,
        grade: true,
        section: true,
        rollNumber: true,
        photoUrl: true,
        emergencyProfile: {
          select: {
            bloodGroup: true,
            conditions: true,
            allergies: true,
          },
        },
      },
      orderBy: { firstName: 'asc' },
    });

    return students;
  }

  /**
   * Fetch full emergency profile for a single student.
   */
  async getFullEmergencyProfile(studentId, schoolId) {
    return prisma.student.findFirst({
      where: { id: studentId, schoolId },
      include: {
        emergencyProfile: {
          include: {
            contacts: {
              orderBy: { priority: 'asc' },
            },
          },
        },
        parentLinks: {
          include: {
            parent: true,
          },
        },
        tokens: {
          include: {
            scanLogs: {
              orderBy: { scannedAt: 'desc' },
              take: 1,
            },
          },
        },
      },
    });
  }

  /**
   * Get recent incidents, optionally filtered by student.
   */
  async getIncidents(schoolId, filters) {
    const where = { schoolId };
    if (filters.studentId) where.studentId = filters.studentId;
    if (filters.status) where.status = filters.status;
    if (filters.date) {
      const start = new Date(filters.date);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      where.occurredAt = { gte: start, lt: end };
    }

    return prisma.emergencyIncident.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            grade: true,
            section: true,
          },
        },
      },
      orderBy: { occurredAt: 'desc' },
      take: 50,
    });
  }

  /**
   * Create a new incident.
   */
  async createIncident(schoolId, data, reportedById) {
    return prisma.emergencyIncident.create({
      data: {
        studentId: data.studentId,
        profile: { connect: { studentId: data.studentId } }, // assumes one-to-one
        schoolId,
        type: data.type,
        severity: data.severity,
        description: data.description,
        location: data.location,
        actionTaken: data.actionTaken,
        medicationGiven: data.medicationGiven,
        ambulanceCalled: data.ambulanceCalled,
        reportedById,
        parentNotified: false,
        status: 'OPEN',
      },
      include: {
        student: {
          select: {
            firstName: true,
            lastName: true,
            grade: true,
            section: true,
          },
        },
      },
    });
  }

  /**
   * Get overall stats for the dashboard.
   */
  async getStats(schoolId) {
    const totalStudents = await prisma.student.count({
      where: { schoolId, status: 'ACTIVE' },
    });

    const highRiskCount = await prisma.emergencyProfile.count({
      where: {
        schoolId,
        student: { status: 'ACTIVE' },
        conditions: { isEmpty: false },
      },
    });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const incidentsToday = await prisma.emergencyIncident.count({
      where: {
        schoolId,
        occurredAt: { gte: todayStart, lt: todayEnd },
      },
    });

    const resolvedCount = await prisma.emergencyIncident.count({
      where: {
        schoolId,
        status: { in: ['RESOLVED', 'CLOSED'] },
      },
    });

    return { totalStudents, highRiskCount, incidentsToday, resolvedCount };
  }
}

export default new EmergencyRepository();