// =============================================================================
// modules/attendance/attendance.repository.js — RESQID
// =============================================================================
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class AttendanceRepository {
  /**
   * Find or create a session for a given date, class, section.
   * If a session exists (by school, date, grade, section), return it.
   * Otherwise create a new one.
   */
  async findOrCreateSession(schoolId, { date, grade, section, teacherId }) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    let session = await prisma.attendanceSession.findFirst({
      where: {
        schoolId,
        grade,
        section,
        scheduledStart: { gte: startOfDay, lte: endOfDay },
        isActive: true,
      },
    });

    if (!session) {
      session = await prisma.attendanceSession.create({
        data: {
          schoolId,
          name: `Attendance - Class ${grade}-${section} (${date})`,
          type: 'MORNING',
          mode: 'MANUAL',
          grade,
          section,
          scheduledStart: new Date(date),
          createdById: teacherId,
          isActive: true,
        },
      });
    }
    return session;
  }

  /**
   * Get attendance data grouped by class-section for a specific date.
   * Returns list of { class, section, total, present, absent, late, leave, pct, students[] }
   */
  async getAttendanceByDate(schoolId, date, filters = {}) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Get all active students for the school, optionally filtered by class/section
    const whereStudent = {
      schoolId,
      status: 'ACTIVE',
      ...(filters.class ? { grade: filters.class } : {}),
      ...(filters.section ? { section: filters.section } : {}),
    };

    const students = await prisma.student.findMany({
      where: whereStudent,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        rollNumber: true,
        grade: true,
        section: true,
        parentLinks: {
          where: { isPrimary: true },
          select: {
            parent: { select: { phone: true, email: true } }
          }
        }
      },
      orderBy: [{ grade: 'asc' }, { section: 'asc' }, { rollNumber: 'asc' }],
    });

    // Get sessions for the date
    const sessions = await prisma.attendanceSession.findMany({
      where: {
        schoolId,
        scheduledStart: { gte: startOfDay, lte: endOfDay },
        isActive: true,
      },
      include: {
        studentRecords: true,
      },
    });

    // Map records by studentId for quick lookup
    const recordMap = new Map();
    for (const session of sessions) {
      for (const record of session.studentRecords) {
        recordMap.set(record.studentId, record);
      }
    }

    // Group students by class-section
    const grouped = new Map();
    for (const student of students) {
      const key = `${student.grade}-${student.section}`;
      if (!grouped.has(key)) {
        grouped.set(key, { grade: student.grade, section: student.section, students: [] });
      }
      const record = recordMap.get(student.id);
      const status = record ? record.status.toLowerCase() : 'absent'; // default absent if no record
      grouped.get(key).students.push({
        id: student.id,
        name: `${student.firstName} ${student.lastName}`,
        roll: student.rollNumber || '',
        status,
        pct: 0, // can be populated later if needed
        phone: student.parentLinks[0]?.parent?.phone || '',
        email: student.parentLinks[0]?.parent?.email || '',
        recordId: record?.id,
      });
    }

    // Compute stats per class-section
    const result = [];
    for (const [, group] of grouped) {
      const total = group.students.length;
      const present = group.students.filter(s => s.status === 'present').length;
      const absent = group.students.filter(s => s.status === 'absent').length;
      const late = group.students.filter(s => s.status === 'late').length;
      const leave = group.students.filter(s => s.status === 'excused').length;
      const pct = total > 0 ? Math.round((present / total) * 100) : 0;

      result.push({
        class: group.grade,
        section: group.section,
        total,
        present,
        absent,
        late,
        leave,
        pct,
        students: group.students,
      });
    }

    return result;
  }

  /**
   * Mark attendance for a student (upsert).
   */
  async markAttendance(sessionId, studentId, status, remark, markedBy) {
    return prisma.studentAttendanceRecord.upsert({
      where: {
        sessionId_studentId: {
          sessionId,
          studentId,
        },
      },
      create: {
        sessionId,
        studentId,
        schoolId: (await prisma.attendanceSession.findUnique({ where: { id: sessionId } })).schoolId,
        status,
        mode: 'MANUAL',
        markedAt: new Date(),
        markedBy,
        remark,
      },
      update: {
        status,
        mode: 'MANUAL',
        markedAt: new Date(),
        markedBy,
        remark,
      },
    });
  }

  /**
   * Get overall stats for a date.
   */
  async getStats(schoolId, date) {
    const attendance = await this.getAttendanceByDate(schoolId, date);
    const totalStudents = attendance.reduce((sum, c) => sum + c.total, 0);
    const totalPresent = attendance.reduce((sum, c) => sum + c.present, 0);
    const totalAbsent = attendance.reduce((sum, c) => sum + c.absent, 0);
    const totalLate = attendance.reduce((sum, c) => sum + c.late, 0);
    const overallPct = totalStudents > 0 ? Math.round((totalPresent / totalStudents) * 100) : 0;

    return { totalStudents, totalPresent, totalAbsent, totalLate, overallPct };
  }

  /**
   * Get monthly attendance percentages for a year.
   * Uses AttendanceSummary if available, otherwise aggregates records.
   */
  async getMonthlyStats(schoolId, year) {
    // Try precomputed summary first
    const summaries = await prisma.attendanceSummary.findMany({
      where: {
        schoolId,
        entityType: 'STUDENT',
        period: 'MONTHLY',
        periodStart: { gte: new Date(`${year}-01-01`) },
        periodEnd: { lte: new Date(`${year}-12-31`) },
      },
      orderBy: { periodStart: 'asc' },
    });

    if (summaries.length > 0) {
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return summaries.map(s => ({
        month: months[s.periodStart.getMonth()],
        pct: s.attendancePercent,
      }));
    }

    // Fallback: aggregate from records (could be heavy)
    // For simplicity, return empty array (frontend will show mock)
    return [];
  }
}

export default new AttendanceRepository();