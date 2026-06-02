// school-admin/dashboard/dashboard.repository.js
import { prisma } from '#config/prisma.js';
import { todayRangeUTC, addDays } from '#shared/helpers/dateTime.js';

export class DashboardRepository {
  async getTotalStudents(schoolId) {
    return prisma.student.count({ where: { schoolId, isActive: true } });
  }

  async getTotalTeachers(schoolId) {
    return prisma.schoolUser.count({
      where: { schoolId, role: 'TEACHER', isActive: true },
    });
  }

  async getParentsLinked(schoolId) {
    return prisma.parentUser.count({
      where: {
        students: { some: { student: { schoolId, isActive: true } } },
        isActive: true,
      },
    });
  }

  async getTodayAttendanceByClass(schoolId) {
    const { start, end } = todayRangeUTC();
    const records = await prisma.studentAttendanceRecord.findMany({
      where: {
        student: { schoolId, isActive: true },
        markedAt: { gte: start, lte: end },
      },
      include: { student: { select: { grade: true, section: true } } },
    });
    const classMap = new Map();
    for (const rec of records) {
      const grade = rec.student.grade || 'Unknown';
      const section = rec.student.section || '';
      const key = `${grade}-${section}`;
      if (!classMap.has(key)) {
        classMap.set(key, { className: key, total: 0, present: 0 });
      }
      const classData = classMap.get(key);
      classData.total++;
      if (rec.status === 'PRESENT') classData.present++;
    }
    const studentsByClass = await prisma.student.groupBy({
      by: ['grade', 'section'],
      where: { schoolId, isActive: true },
      _count: { id: true },
    });
    const result = [];
    for (const cls of studentsByClass) {
      const grade = cls.grade || 'Unknown';
      const section = cls.section || '';
      const key = `${grade}-${section}`;
      const total = cls._count.id;
      const present = classMap.get(key)?.present || 0;
      const absent = total - present;
      result.push({
        className: `${grade}${section ? '-' + section : ''}`,
        total,
        present,
        absent,
      });
    }
    return result;
  }

  async getWeeklyTrend(schoolId) {
    const today = new Date();
    const dates = [];
    for (let i = 6; i >= 0; i--) {
      dates.push(addDays(today, -i));
    }
    const trend = [];
    for (const date of dates) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      const records = await prisma.studentAttendanceRecord.findMany({
        where: {
          student: { schoolId, isActive: true },
          markedAt: { gte: start, lte: end },
        },
        select: { status: true },
      });
      const total = records.length;
      const present = records.filter(r => r.status === 'PRESENT').length;
      const percentage = total ? (present / total) * 100 : 0;
      const dayName = date.toLocaleDateString('en-IN', { weekday: 'short' });
      trend.push({ day: dayName, percentage: Math.round(percentage * 10) / 10 });
    }
    return trend;
  }

  async getRecentActivity(schoolId, type, limit) {
    // For 'late' type, we query StudentAttendanceRecord instead of ScanLog
    if (type === 'late') {
      const { start, end } = todayRangeUTC();
      const lateRecords = await prisma.studentAttendanceRecord.findMany({
        where: {
          student: { schoolId, isActive: true },
          markedAt: { gte: start, lte: end },
          status: 'LATE',
        },
        include: { student: true },
        orderBy: { markedAt: 'desc' },
        take: limit,
      });
      return lateRecords.map(rec => {
        const student = rec.student;
        const name = `${student.firstName} ${student.lastName}`;
        const className = `${student.grade || ''}${student.section ? '-' + student.section : ''}`;
        const initials = name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
        return {
          id: rec.id,
          name,
          className,
          rfid: student.rfidTagNumber || 'N/A',
          type: 'late',
          time: rec.markedAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
          avatar: initials,
          avatarColor: 'bg-amber-500',
        };
      });
    }

    const where = { schoolId };
    if (type !== 'all') {
      const resultMap = {
        check_in: 'SUCCESS',
        absent: 'ABSENT',
      };
      // 'late' is already handled above, so we only map check_in and absent
      if (resultMap[type]) {
        where.result = resultMap[type];
      }
    }
    const logs = await prisma.scanLog.findMany({
      where,
      orderBy: { scannedAt: 'desc' },
      take: limit,
      include: { token: { include: { student: true } } },
    });
    return logs.map(log => {
      let studentName = log.studentName;
      let studentClass = log.studentClass;
      let studentSection = log.studentSection;
      if (!studentName && log.token?.student) {
        studentName = `${log.token.student.firstName} ${log.token.student.lastName}`;
        studentClass = log.token.student.grade;
        studentSection = log.token.student.section;
      }
      const className = studentClass ? `${studentClass}${studentSection ? '-' + studentSection : ''}` : '';
      const initials = studentName ? studentName.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase() : '??';
      return {
        id: log.id,
        name: studentName || 'Unknown',
        className,
        rfid: log.token?.rfidUid || log.tokenId || 'N/A',
        type: log.result === 'SUCCESS' ? 'check_in' : 'absent',
        time: log.scannedAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        avatar: initials,
        avatarColor: 'bg-blue-500',
      };
    });
  }

  async getLowAttendanceStudents(schoolId, threshold = 80, limit = 5) {
    const startDate = addDays(new Date(), -180);
    const students = await prisma.student.findMany({
      where: { schoolId, isActive: true },
      include: {
        attendanceRecords: {
          where: { markedAt: { gte: startDate } },
          select: { status: true },
        },
      },
    });
    const result = [];
    for (const student of students) {
      const total = student.attendanceRecords.length;
      const present = student.attendanceRecords.filter(r => r.status === 'PRESENT').length;
      const percent = total ? (present / total) * 100 : 100;
      if (percent < threshold) {
        result.push({
          name: `${student.firstName} ${student.lastName}`,
          className: `${student.grade || ''}${student.section ? '-' + student.section : ''}`,
          attendancePercent: Math.round(percent),
          absentsCount: total - present,
          avatar: `${student.firstName[0]}${student.lastName[0]}`.toUpperCase(),
          avatarColor: 'bg-rose-500',
        });
      }
    }
    result.sort((a, b) => a.attendancePercent - b.attendancePercent);
    return result.slice(0, limit);
  }

  async getNotifications(schoolId, limit = 5) {
    return prisma.notification.findMany({
      where: { schoolId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        category: true,
        title: true,
        body: true,
        createdAt: true,
        isRead: true,
      },
    });
  }

  async getTodayTimetable(schoolId, className, section) {
    // TODO: Replace with actual timetable query when timetable module is ready.
    // For now, return static mock as placeholder.
    return [
      { period: 'P1', time: '8:00–8:45', subject: 'Mathematics', teacher: 'Mr. S. Kumar', status: 'done' },
      { period: 'P2', time: '8:45–9:30', subject: 'English', teacher: 'Ms. P. Nair', status: 'done' },
      { period: 'P3', time: '9:45–10:30', subject: 'Science', teacher: 'Mr. A. Das', status: 'ongoing' },
      { period: 'P4', time: '10:30–11:15', subject: 'History', teacher: 'Ms. S. Roy', status: 'upcoming' },
      { period: 'P5', time: '11:45–12:30', subject: 'Comp. Sci.', teacher: 'Mr. R. Sen', status: 'upcoming' },
    ];
  }

  async getSubscriptionPlan(schoolId) {
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      include: { plan: { select: { name: true } } }, // assumes Plan model has a `name` field
    });
    let plan = school?.plan?.name?.toLowerCase() || 'basic';
    // Normalize plan names if needed (e.g., 'Standard' -> 'standard')
    return { plan };
  }
}